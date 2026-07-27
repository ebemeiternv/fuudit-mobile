// Barcode → product lookup gateway.
// Queries Open Food Facts (community-sourced open database, ODbL) and returns a
// normalized product shape. The client never queries OFF directly so that we
// can centralize timeouts, user-agent identification, error handling and any
// future provider switching.
//
// Attribution: product data © Open Food Facts contributors, ODbL 1.0.
// See https://world.openfoodfacts.org/data
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Open Food Facts asks integrators to identify themselves via User-Agent.
const USER_AGENT = "Fuudit/1.0 (+https://fuudit.com; contact: hello@fuudit.com)";
const TIMEOUT_MS = 6000;

// EAN-13 / EAN-8 / UPC-A / UPC-E — digits only, 8–14 length is a safe superset.
const isValidBarcode = (s: string) => /^[0-9]{6,14}$/.test(s);

type OFFProduct = {
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  generic_name_en?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  quantity?: string;
  categories?: string;
  categories_tags?: string[];
  ingredients_text?: string;
  ingredients_text_en?: string;
  allergens?: string;
  allergens_tags?: string[];
};

type OFFResponse = {
  status?: number;
  status_verbose?: string;
  code?: string;
  product?: OFFProduct;
};

// Parse "500 g", "1.5 L", "6 x 33 cl" → { quantity, unit } best-effort.
const UNIT_ALIASES: Record<string, string> = {
  g: "g", gr: "g", gram: "g", grams: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  mg: "g", // convert below
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  cl: "ml", // convert below
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
};
function parseQuantity(raw?: string): { quantity: number | null; unit: string | null } {
  if (!raw) return { quantity: null, unit: null };
  const m = raw.match(/([\d]+(?:[.,]\d+)?)\s*([a-zA-Zµ]+)/);
  if (!m) return { quantity: null, unit: null };
  let n = Number(m[1].replace(",", "."));
  const rawUnit = m[2].toLowerCase();
  let unit = UNIT_ALIASES[rawUnit] ?? null;
  if (!unit) return { quantity: null, unit: null };
  if (rawUnit === "mg") { n = n / 1000; unit = "g"; }
  if (rawUnit === "cl") { n = n * 10; unit = "ml"; }
  if (!Number.isFinite(n) || n <= 0) return { quantity: null, unit: null };
  return { quantity: Math.round(n * 100) / 100, unit };
}

function normalize(barcode: string, p: OFFProduct) {
  const name =
    (p.product_name_en || p.product_name || p.generic_name_en || p.generic_name || "")
      .toString()
      .trim() || null;
  const genericName = (p.generic_name_en || p.generic_name || "").toString().trim() || null;
  const brand = (p.brands || "").toString().split(",")[0]?.trim() || null;
  const image = (p.image_front_url || p.image_url || "").toString().trim() || null;
  const { quantity, unit } = parseQuantity(p.quantity);
  const categories = Array.isArray(p.categories_tags) ? p.categories_tags.slice(0, 20) : [];
  const ingredientsText = (p.ingredients_text_en || p.ingredients_text || "").toString().trim() || null;
  const allergens = Array.isArray(p.allergens_tags) ? p.allergens_tags.slice(0, 20) : [];
  return {
    barcode,
    name,
    genericName,
    brand,
    imageUrl: image,
    packageQuantity: quantity,
    packageUnit: unit,
    categories,
    ingredientsText,
    allergens,
    source: "openfoodfacts",
    sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
    attribution:
      "Product data © Open Food Facts contributors, licensed under ODbL 1.0.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { barcode?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const barcode = String(body?.barcode ?? "").trim();
  if (!isValidBarcode(barcode)) {
    return json({ error: "invalid_barcode", message: "Barcode must be 6–14 digits." }, 400);
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      barcode,
    )}.json?fields=product_name,product_name_en,generic_name,generic_name_en,brands,image_front_url,image_url,quantity,categories,categories_tags,ingredients_text,ingredients_text_en,allergens,allergens_tags`;
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    if (r.status === 429) return json({ error: "rate_limited" }, 429);
    if (!r.ok) return json({ error: "upstream_error", status: r.status }, 502);
    const data = (await r.json()) as OFFResponse;
    if (data.status !== 1 || !data.product) {
      return json({ found: false, barcode });
    }
    return json({ found: true, product: normalize(barcode, data.product) });
  } catch (e) {
    const aborted = (e as { name?: string })?.name === "AbortError";
    return json(
      { error: aborted ? "timeout" : "upstream_error", message: aborted ? "Lookup timed out." : "Product lookup failed." },
      aborted ? 504 : 502,
    );
  } finally {
    clearTimeout(t);
  }
});
