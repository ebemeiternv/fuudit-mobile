// Fuudit-created recipes for meal-plan slots the catalogue couldn't fill.
//
// This is deliberately a SEPARATE path from meal-plan-generate: recipes here are
// written by the model, clearly labelled as Fuudit-created, and never mixed into
// the shared Spoonacular cache. The model must return a fully structured recipe
// (ingredients with amounts/units + steps) so the existing detail, meal-plan and
// grocery flows keep working. It never does pricing or budget arithmetic.
//
// POST { slots, constraints, pantry }
// -> { requestId, recipes: [{ slotId, title, readyMinutes, servings, summary,
//                             ingredients, steps, why, twist }] }
// -> failure: { error: <code>, requestId, message }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const RESPONSES_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";
const MAX_SLOTS = 8;

type ErrCode =
  | "unauthenticated"
  | "invalid_request"
  | "model_unavailable"
  | "gateway_rate_limited"
  | "gateway_credits_exhausted"
  | "gateway_upstream"
  | "invalid_model_response"
  | "unknown_error";

const httpStatusFor: Record<ErrCode, number> = {
  unauthenticated: 401,
  invalid_request: 400,
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
  model_unavailable: "Fuudit's kitchen is temporarily unavailable. Try again in a moment.",
  gateway_rate_limited: "Fuudit is a bit busy — try again in a moment.",
  gateway_credits_exhausted: "AI credits ran out. Please add credits to continue.",
  gateway_upstream: "Fuudit's kitchen is temporarily unavailable. Try again in a moment.",
  invalid_model_response: "I couldn't write a usable recipe. Please try again.",
  unknown_error: "Something went wrong on our side. Please try again.",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (code: ErrCode, requestId: string) =>
  json({ error: code, requestId, message: userMessageFor[code] }, httpStatusFor[code]);

const logStage = (requestId: string, stage: string, data: Record<string, unknown> = {}) => {
  // Never log pantry contents, allergies or prompts.
  console.log(JSON.stringify({ ts: new Date().toISOString(), requestId, stage, ...data }));
};

const RECIPE_SCHEMA = {
  type: "json_schema",
  name: "invented_recipes",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      recipes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            slotId: { type: "string" },
            title: { type: "string" },
            readyMinutes: { type: ["number", "null"] },
            servings: { type: "number" },
            summary: { type: ["string", "null"] },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  amount: { type: ["number", "null"] },
                  unit: { type: ["string", "null"] },
                },
                required: ["name", "amount", "unit"],
              },
            },
            steps: { type: "array", items: { type: "string" } },
            why: { type: ["string", "null"] },
            twist: { type: ["string", "null"] },
          },
          required: [
            "slotId",
            "title",
            "readyMinutes",
            "servings",
            "summary",
            "ingredients",
            "steps",
            "why",
            "twist",
          ],
        },
      },
    },
    required: ["recipes"],
  },
} as const;

const SYSTEM_PROMPT = `You are Tilda, Fuudit's kitchen assistant. You write original, simple, Scandinavian-leaning home recipes for specific meal slots when the recipe catalogue had nothing suitable.

Rules:
- Write exactly one recipe per requested slotId, reusing the slotId verbatim.
- Every recipe must be COMPLETE and cookable: a clear title, a realistic total time, the requested number of servings, an ingredient list where each line has a plain ingredient name plus a numeric amount and a metric unit (g, ml, tbsp, tsp, piece), and ordered, practical steps.
- Use metric units. Prefer "g", "ml", "tbsp", "tsp" or "piece". Never leave the amount null unless the ingredient is truly to-taste (salt, pepper).
- Allergy safety is absolute: never include an allergen listed in allergies, in any form or derivative. Respect dietary requirements fully. If you cannot write a safe recipe for a slot, omit that slot entirely rather than compromise.
- Respect the cooking-time limit when one is given, and lean on the pantry ingredients listed — especially ones marked as expiring soon.
- "why" is one short warm sentence explaining why this fits the person's week (e.g. which pantry or expiring ingredient it uses).
- "twist" is optional: one short suggestion for a swap or addition using something they already have.
- Keep recipes honest and everyday. Do not invent nutrition figures, prices or brand names, and never do cost or budget arithmetic.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  if (req.method !== "POST") return errorResponse("invalid_request", requestId);

  if (!LOVABLE_API_KEY) {
    logStage(requestId, "config_error", { missing: "LOVABLE_API_KEY" });
    return errorResponse("model_unavailable", requestId);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return errorResponse("unauthenticated", requestId);

  const sbUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error: userErr } = await sbUser.auth.getUser();
  if (userErr || !userRes.user) return errorResponse("unauthenticated", requestId);

  let body: {
    slots?: { slotId: string; date: string; mealType: string }[];
    constraints?: {
      servings?: number;
      diets?: string[];
      allergies?: string[];
      maxCookingMinutes?: number | null;
      nutritionStyles?: string[];
    };
    pantry?: { name: string; expiringSoon?: boolean }[];
  };
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", requestId);
  }

  const slots = Array.isArray(body?.slots) ? body.slots.slice(0, MAX_SLOTS) : [];
  const constraints = body?.constraints;
  if (!slots.length || !constraints || typeof constraints.servings !== "number") {
    return errorResponse("invalid_request", requestId);
  }
  if (slots.some((s) => !s?.slotId || !s?.date || !s?.mealType)) {
    return errorResponse("invalid_request", requestId);
  }

  const pantry = (Array.isArray(body?.pantry) ? body.pantry : [])
    .filter((p) => p && typeof p.name === "string" && p.name.trim())
    .slice(0, 30)
    .map((p) => ({ name: p.name.trim(), expiringSoon: !!p.expiringSoon }));

  const userPayload = {
    task: "Write one original recipe for each meal slot.",
    slots,
    pantry,
    constraints: {
      servingsPerMeal: constraints.servings,
      dietaryRequirements: constraints.diets ?? [],
      allergies: constraints.allergies ?? [],
      maxCookingMinutes: constraints.maxCookingMinutes ?? null,
      nutritionStyles: constraints.nutritionStyles ?? [],
    },
  };

  logStage(requestId, "invent_start", { slots: slots.length, pantry: pantry.length });

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
        input: `Write these recipes. Reply with the requested JSON object only.\n\n${JSON.stringify(userPayload)}`,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: RECIPE_SCHEMA },
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
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

  let text = "";
  try {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
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
            /* partial frame */
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    logStage(requestId, "stream_error");
    return errorResponse("invalid_model_response", requestId);
  }

  let parsed: { recipes?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    logStage(requestId, "parse_error", { length: text.length });
    return errorResponse("invalid_model_response", requestId);
  }

  const validSlots = new Set(slots.map((s) => s.slotId));
  const seen = new Set<string>();
  const recipes: unknown[] = [];
  for (const r of Array.isArray(parsed?.recipes) ? parsed.recipes : []) {
    const rec = r as Record<string, unknown>;
    const slotId = typeof rec?.slotId === "string" ? rec.slotId : "";
    const title = typeof rec?.title === "string" ? rec.title.trim() : "";
    const ingredients = Array.isArray(rec?.ingredients) ? rec.ingredients : [];
    const steps = (Array.isArray(rec?.steps) ? rec.steps : []).filter(
      (s: unknown) => typeof s === "string" && s.trim(),
    );
    if (!validSlots.has(slotId) || seen.has(slotId)) continue;
    // A usable recipe needs a title, real ingredient lines and steps.
    if (!title || ingredients.length < 2 || steps.length < 2) continue;
    seen.add(slotId);
    recipes.push({
      slotId,
      title,
      readyMinutes: typeof rec.readyMinutes === "number" ? rec.readyMinutes : null,
      servings: typeof rec.servings === "number" ? rec.servings : constraints.servings,
      summary: typeof rec.summary === "string" ? rec.summary : null,
      ingredients: ingredients
        .map((i: Record<string, unknown>) => ({
          name: typeof i?.name === "string" ? i.name.trim() : "",
          amount: typeof i?.amount === "number" ? i.amount : null,
          unit: typeof i?.unit === "string" && i.unit.trim() ? i.unit.trim() : null,
        }))
        .filter((i: { name: string }) => i.name),
      steps,
      why: typeof rec.why === "string" ? rec.why : null,
      twist: typeof rec.twist === "string" ? rec.twist : null,
    });
  }

  logStage(requestId, "invent_done", { requested: slots.length, written: recipes.length });
  return json({ requestId, recipes });
});
