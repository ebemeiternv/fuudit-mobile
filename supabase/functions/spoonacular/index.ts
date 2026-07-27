// Spoonacular gateway edge function.
// The API key lives in SPOONACULAR_API_KEY on the server; the client never sees it.
// Actions:
//   POST { action: "search", query, number?, diet?, intolerances?, cuisine? }
//   POST { action: "byIngredients", ingredients: string[], number?, ranking? }
//   POST { action: "detail", id: number|string }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SPOON_KEY = Deno.env.get("SPOONACULAR_API_KEY");
const BASE = "https://api.spoonacular.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errCode = (r: Response) => {
  if (r.status === 402) return "rate_limited"; // Spoonacular signals quota with 402
  if (r.status === 429) return "rate_limited";
  if (r.status === 401 || r.status === 403) return "unauthorized";
  if (r.status === 404) return "not_found";
  return "upstream_error";
};

async function spoonGet(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) url.searchParams.set(k, String(v));
  }
  url.searchParams.set("apiKey", SPOON_KEY!);
  const r = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    return { ok: false as const, status: r.status, code: errCode(r), text };
  }
  return { ok: true as const, data: await r.json() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!SPOON_KEY) {
    return json(
      { error: "service_unavailable", code: "missing_api_key", message: "Recipe service is not configured." },
      503,
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const action = String(body?.action ?? "");

  try {
    if (action === "search") {
      const query = typeof body.query === "string" ? body.query.trim() : "";
      const number = clampNumber(body.number, 1, 20, 12);
      const diet = safeStr(body.diet);
      const intolerances = safeStr(body.intolerances);
      const cuisine = safeStr(body.cuisine);
      const r = await spoonGet("/recipes/complexSearch", {
        query: query || undefined,
        number,
        diet,
        intolerances,
        cuisine,
        addRecipeInformation: "true",
        addRecipeNutrition: "false",
        instructionsRequired: "true",
      });
      if (!r.ok) return json({ error: "upstream", code: r.code }, r.status === 402 || r.status === 429 ? 429 : 502);
      return json({ results: r.data.results ?? [] });
    }

    if (action === "byIngredients") {
      const ingredients = Array.isArray(body.ingredients)
        ? (body.ingredients as unknown[]).map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
        : [];
      if (ingredients.length === 0) return json({ results: [] });
      const number = clampNumber(body.number, 1, 20, 12);
      // ranking: 1 = maximize used pantry ingredients, 2 = minimize missing.
      const ranking = body.ranking === 2 ? 2 : 1;
      const r = await spoonGet("/recipes/findByIngredients", {
        ingredients: ingredients.join(","),
        number,
        ranking,
        ignorePantry: "true",
      });
      if (!r.ok) return json({ error: "upstream", code: r.code }, r.status === 402 || r.status === 429 ? 429 : 502);
      return json({ results: r.data ?? [] });
    }

    if (action === "detail") {
      const rawId = body.id;
      const id = typeof rawId === "number" ? rawId : parseInt(String(rawId ?? ""), 10);
      if (!Number.isFinite(id) || id <= 0) return json({ error: "invalid_id" }, 400);
      const r = await spoonGet(`/recipes/${id}/information`, { includeNutrition: "true" });
      if (!r.ok) {
        if (r.code === "not_found") return json({ error: "not_found" }, 404);
        return json({ error: "upstream", code: r.code }, r.status === 402 || r.status === 429 ? 429 : 502);
      }
      return json({ recipe: r.data });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("spoonacular fn error", e);
    return json({ error: "internal_error" }, 500);
  }
});

function clampNumber(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
function safeStr(v: unknown) {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}
