// Meal-plan generation edge function — Phase 3.
//
// Picks a coherent set of meals for a set of date/slot targets from REAL
// recipe candidates the client already retrieved through the existing
// catalogue flow. The model selects and ranks only; deterministic signals
// (pantry overlap, quantity compatibility, expiry, cooking time, diet and
// allergy checks) are computed client-side and passed in. It never invents
// recipes and never does pricing or budget arithmetic.
//
// POST { slots, candidates, constraints }
// -> { requestId, assignments: [{ slotId, candidateId }], notes: string }
// -> failure: { error: <code>, requestId, message }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RESPONSES_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

const MAX_SLOTS = 21;
const MAX_CANDIDATES = 30;

type ErrCode =
  | "unauthenticated"
  | "invalid_request"
  | "no_candidates"
  | "model_unavailable"
  | "gateway_rate_limited"
  | "gateway_credits_exhausted"
  | "gateway_upstream"
  | "invalid_model_response"
  | "unknown_error";

const httpStatusFor: Record<ErrCode, number> = {
  unauthenticated: 401,
  invalid_request: 400,
  no_candidates: 200, // soft failure — the client offers manual planning
  model_unavailable: 503,
  gateway_rate_limited: 429,
  gateway_credits_exhausted: 402,
  gateway_upstream: 502,
  invalid_model_response: 502,
  unknown_error: 500,
};

const userMessageFor: Record<ErrCode, string> = {
  unauthenticated: "Your session has expired. Please sign in again.",
  invalid_request: "That request didn't look right. Please try again.",
  no_candidates: "I couldn't find safe recipes for those meals. You can plan them manually.",
  model_unavailable: "The planner is temporarily unavailable. Try again in a moment.",
  gateway_rate_limited: "The planner is a bit busy — try again in a moment.",
  gateway_credits_exhausted: "AI credits ran out. Please add credits to continue.",
  gateway_upstream: "The planner is temporarily unavailable. Try again in a moment.",
  invalid_model_response: "I couldn't read the plan. Please try again.",
  unknown_error: "Something went wrong on our side. Please try again.",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (code: ErrCode, requestId: string) =>
  json({ error: code, requestId, message: userMessageFor[code] }, httpStatusFor[code]);

function logStage(requestId: string, stage: string, data: Record<string, unknown> = {}) {
  // Structured single-line JSON; never log prompts, pantry contents or allergies.
  console.log(JSON.stringify({ ts: new Date().toISOString(), requestId, stage, ...data }));
}

/* ------------------------------------------------------------- types */

type Slot = { slotId: string; date: string; mealType: string };

type Candidate = {
  id: number;
  title: string;
  readyMinutes: number | null;
  servings: number | null;
  diets: string[];
  ingredients: string[];
  signals: {
    pantryOverlap: string[];
    quantityCompatible: string[];
    expiringOverlap: string[];
    missedCount: number | null;
    fitsCookingTime: boolean | null;
    dietCompatible: boolean | null;
  };
};

type Constraints = {
  servings: number;
  diets: string[];
  allergies: string[];
  maxCookingMinutes: number | null;
  prioritizePantry: boolean;
  prioritizeExpiring: boolean;
  nutritionStyles: string[];
};

/* -------------------------------------------------- structured output */

// Strict-compatible: object root, every property required, nullable notes.
const PLAN_SCHEMA = {
  type: "json_schema",
  name: "meal_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      assignments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            slotId: { type: "string" },
            candidateId: { type: "number" },
            why: { type: ["string", "null"] },
            twist: { type: ["string", "null"] },
          },
          required: ["slotId", "candidateId", "why", "twist"],
        },
      },
      notes: { type: ["string", "null"] },
    },
    required: ["assignments", "notes"],
  },
} as const;

const SYSTEM_PROMPT = `You are Fuudit's meal planner. You receive a set of meal slots (date + meal type) and a list of real, pre-validated recipe candidates with measurable signals.

Your job is SELECTION ONLY. Rules:
- Assign at most one candidate to each slot, and only by the exact candidateId given. Never invent recipes or ids.
- Build a coherent plan for the whole period, not isolated meals: vary proteins and cuisines, avoid repeating the same recipe, and prefer reusing shared ingredients across meals.
- Prefer candidates whose signals show expiringOverlap (food that would otherwise be wasted), then quantityCompatible / pantryOverlap, when the user asks for pantry/expiry prioritisation.
- Respect cooking-time preferences via the fitsCookingTime signal when set.
- Never assign a candidate to a slot if doing so would conflict with the user's dietary requirements. Allergy safety is absolute — all candidates given to you already passed a strict allergy filter; do not reason beyond them.
- It is always acceptable to leave a slot unassigned when no candidate fits well — a partial plan is a good plan.
- Keep "notes" to one or two short sentences about the plan as a whole (e.g. which expiring ingredients it uses).
- For every assignment write "why": ONE short warm sentence, addressed to the person, explaining why you picked this recipe for them — reference their pantry, expiring food, cooking time or the rest of the week. Never mention scores, signals or ids. Never invent facts that the signals don't show.
- "twist" is optional (use null when you have nothing useful): one short suggestion for a swap or addition using something the signals show they already have, without changing what the recipe fundamentally is.


NEVER do arithmetic and never judge whether a plan fits a budget. All costs, quantities and budget comparisons are calculated deterministically outside this call. If "guidance" is present, the plan was measured as too expensive and you are being asked for cheaper REPLACEMENTS for the listed slots only: prefer candidates that lean on the listed reusableIngredients and on pantry/expiring signals, and prefer simpler, less ingredient-heavy dishes. Never compensate by changing servings, and never relax dietary requirements.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  if (req.method !== "POST") return errorResponse("invalid_request", requestId);

  if (!LOVABLE_API_KEY) {
    logStage(requestId, "config_error", { missing: "LOVABLE_API_KEY" });
    return errorResponse("model_unavailable", requestId);
  }

  // ---- Auth ----
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return errorResponse("unauthenticated", requestId);

  const sbUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error: userErr } = await sbUser.auth.getUser();
  if (userErr || !userRes.user) return errorResponse("unauthenticated", requestId);
  const userId = userRes.user.id;

  // ---- Body ----
  let body: {
    slots?: Slot[];
    candidates?: Candidate[];
    constraints?: Constraints;
    /** Deterministic cost figures from the client's simulation (Phase 4). */
    guidance?: Record<string, unknown> | null;
  };
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", requestId);
  }

  const slots = Array.isArray(body?.slots) ? body.slots : [];
  const candidates = Array.isArray(body?.candidates) ? body.candidates : [];
  const constraints = body?.constraints;
  if (
    !slots.length || slots.length > MAX_SLOTS ||
    !constraints || typeof constraints.servings !== "number"
  ) {
    return errorResponse("invalid_request", requestId);
  }
  if (slots.some((s) => !s.slotId || !s.date || !s.mealType)) {
    return errorResponse("invalid_request", requestId);
  }

  const usable = candidates.slice(0, MAX_CANDIDATES);
  if (!usable.length) {
    logStage(requestId, "no_candidates", { user: userId.slice(0, 8), slots: slots.length });
    return errorResponse("no_candidates", requestId);
  }

  // ---- Prompt ----
  const guidance = body?.guidance ?? null;
  const userPayload = {
    task: guidance
      ? "Suggest cheaper replacement recipes for these meal slots."
      : "Assign real recipes to these meal slots.",
    slots,
    guidance,
    constraints: {
      servingsPerMeal: constraints.servings,
      dietaryRequirements: constraints.diets ?? [],
      allergies: constraints.allergies ?? [],
      maxCookingMinutes: constraints.maxCookingMinutes,
      prioritizePantry: !!constraints.prioritizePantry,
      prioritizeExpiring: !!constraints.prioritizeExpiring,
      nutritionStyles: constraints.nutritionStyles ?? [],
    },
    candidates: usable.map((c) => ({
      id: c.id,
      title: c.title,
      readyMinutes: c.readyMinutes,
      servings: c.servings,
      diets: c.diets,
      mainIngredients: (c.ingredients ?? []).slice(0, 10),
      signals: c.signals,
    })),
  };

  // ---- Gateway call (Responses API, always streamed, consumed here) ----
  logStage(requestId, "generate_start", {
    user: userId.slice(0, 8),
    slots: slots.length,
    candidates: usable.length,
  });

  let res: Response;
  try {
    res = await fetch(RESPONSES_URL, {
      method: "POST",
      signal: req.signal ?? undefined,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM_PROMPT,
        input: `Plan these meals. Reply with the requested JSON object only.\n\n${JSON.stringify(userPayload)}`,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: PLAN_SCHEMA },
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      logStage(requestId, "client_aborted");
      return new Response(null, { status: 499 });
    }
    logStage(requestId, "gateway_network_error");
    return errorResponse("gateway_upstream", requestId);
  }

  if (!res.ok) {
    const status = res.status;
    await res.text().catch(() => "");
    logStage(requestId, "gateway_error", { status });
    if (status === 429) return errorResponse("gateway_rate_limited", requestId);
    if (status === 402) return errorResponse("gateway_credits_exhausted", requestId);
    if (status >= 500) return errorResponse("gateway_upstream", requestId);
    return errorResponse("model_unavailable", requestId);
  }

  // Accumulate streamed output text (SSE) — no buffering deadline; reasoning
  // runs are normal and must not be cut short.
  let text = "";
  try {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              text += evt.delta;
            } else if (evt.type === "response.completed") {
              const out = evt.response?.output_text;
              if (typeof out === "string" && out.length > text.length) text = out;
            }
          } catch {
            /* partial frame — keep reading */
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      logStage(requestId, "client_aborted");
      return new Response(null, { status: 499 });
    }
    logStage(requestId, "stream_error");
    return errorResponse("invalid_model_response", requestId);
  }

  // ---- Parse + validate ----
  let plan: {
    assignments: { slotId: string; candidateId: number; why?: string | null; twist?: string | null }[];
    notes: string | null;
  };
  try {
    plan = JSON.parse(text);
  } catch {
    logStage(requestId, "parse_error", { length: text.length });
    return errorResponse("invalid_model_response", requestId);
  }

  const validSlotIds = new Set(slots.map((s) => s.slotId));
  const validCandidateIds = new Set(usable.map((c) => c.id));
  const seenSlots = new Set<string>();
  const assignments: {
    slotId: string;
    candidateId: number;
    why: string | null;
    twist: string | null;
  }[] = [];
  for (const a of Array.isArray(plan?.assignments) ? plan.assignments : []) {
    if (typeof a?.slotId !== "string" || typeof a?.candidateId !== "number") continue;
    if (!validSlotIds.has(a.slotId) || !validCandidateIds.has(a.candidateId)) continue;
    if (seenSlots.has(a.slotId)) continue;
    seenSlots.add(a.slotId);
    assignments.push({
      slotId: a.slotId,
      candidateId: a.candidateId,
      why: typeof a.why === "string" && a.why.trim() ? a.why.trim() : null,
      twist: typeof a.twist === "string" && a.twist.trim() ? a.twist.trim() : null,
    });
  }

  logStage(requestId, "generate_done", {
    requested: slots.length,
    assigned: assignments.length,
  });

  return json({
    requestId,
    assignments,
    notes: typeof plan?.notes === "string" ? plan.notes : null,
  });
});
