// Slice 6 — ingredient normalization, unit conversion and pantry subtraction
// helpers. Deliberately conservative: when in doubt we keep ingredients apart
// and refuse to combine quantities.
import { UNITS, CATEGORIES, type Category } from "@/lib/pantry";
import type { Database } from "@/integrations/supabase/types";

export type UnitType = Database["public"]["Enums"]["unit_type"];

type Family = "mass" | "volume" | "piece" | "tbsp" | "tsp" | "cup" | "unknown";

const UNIT_FAMILY: Record<
  UnitType,
  { family: Family; toBase: number; base: UnitType }
> = {
  g: { family: "mass", toBase: 1, base: "g" },
  kg: { family: "mass", toBase: 1000, base: "g" },
  ml: { family: "volume", toBase: 1, base: "ml" },
  l: { family: "volume", toBase: 1000, base: "ml" },
  piece: { family: "piece", toBase: 1, base: "piece" },
  tbsp: { family: "tbsp", toBase: 1, base: "tbsp" },
  tsp: { family: "tsp", toBase: 1, base: "tsp" },
  cup: { family: "cup", toBase: 1, base: "cup" },
};

// Wide alias map for units coming from recipe data (Spoonacular etc.).
// Anything not listed here becomes null → "unknown unit" and is preserved as-is
// rather than silently coerced.
const UNIT_ALIASES: Record<string, UnitType> = {
  g: "g", gram: "g", grams: "g", gr: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp", tbs: "tbsp", tbl: "tbsp", tbsps: "tbsp",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp",
  cup: "cup", cups: "cup",
  piece: "piece", pieces: "piece", pc: "piece", pcs: "piece", each: "piece",
  unit: "piece", units: "piece", whole: "piece",
  clove: "piece", cloves: "piece", slice: "piece", slices: "piece",
  can: "piece", cans: "piece", jar: "piece", jars: "piece", bunch: "piece", bunches: "piece",
};

export const normalizeUnit = (u: string | null | undefined): UnitType | null => {
  if (!u) return null;
  const key = String(u).trim().toLowerCase();
  if (!key) return null;
  if ((UNITS as readonly string[]).includes(key)) return key as UnitType;
  return UNIT_ALIASES[key] ?? null;
};

export const unitFamily = (u: UnitType | null | undefined): Family => {
  if (!u) return "unknown";
  return UNIT_FAMILY[u]?.family ?? "unknown";
};

/**
 * Convert `amount` from unit `from` to unit `to`. Returns null when the units
 * are in different families or unknown. Never assumes cross-family equivalence
 * (e.g. cups ↔ ml requires density and is not supported).
 */
export const convertQuantity = (
  amount: number,
  from: UnitType | null | undefined,
  to: UnitType | null | undefined,
): number | null => {
  if (from == null && to == null) return amount;
  if (from == null || to == null) return null;
  if (from === to) return amount;
  const a = UNIT_FAMILY[from];
  const b = UNIT_FAMILY[to];
  if (!a || !b || a.family !== b.family) return null;
  return (amount * a.toBase) / b.toBase;
};

/** Conservative ingredient-name normalization for equality matching. */
export const normalizeIngredientName = (raw: string | null | undefined): string => {
  let s = String(raw ?? "").toLowerCase().trim();
  if (!s) return "";
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = s.split(" ").map((t) => {
    if (t.length > 3 && t.endsWith("ies")) return t.slice(0, -3) + "y";
    if (t.length > 3 && t.endsWith("es") && !t.endsWith("ses")) return t.slice(0, -2);
    if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") && !t.endsWith("us"))
      return t.slice(0, -1);
    return t;
  });
  return tokens.join(" ").trim();
};

/**
 * Two ingredient names refer to the same thing only when their fully
 * normalized forms are identical. This intentionally keeps "cream" vs "sour
 * cream" and "chicken" vs "chicken stock" separate.
 */
export const ingredientsMatch = (a: string, b: string): boolean => {
  const na = normalizeIngredientName(a);
  const nb = normalizeIngredientName(b);
  return na.length > 0 && na === nb;
};

/** Lightweight category inference from a name. Falls back to "Other". */
const CATEGORY_HINTS: [Category, string[]][] = [
  ["Dairy", ["milk","cheese","yogurt","yoghurt","cream","butter","feta","mozzarella","parmesan","ricotta","kefir"]],
  ["Produce", ["tomato","onion","garlic","spinach","lettuce","pepper","carrot","potato","apple","banana","lemon","lime","basil","parsley","cilantro","kale","cucumber","zucchini","broccoli","mushroom","avocado","celery","ginger","berry","strawberry","blueberry","raspberry","cabbage","eggplant","chili","chile"]],
  ["Meat & Fish", ["chicken","beef","pork","turkey","lamb","fish","salmon","tuna","shrimp","prawn","bacon","sausage","ham"]],
  ["Bakery", ["bread","bun","bagel","tortilla","pita","baguette","roll","croissant"]],
  ["Grains & Pasta", ["pasta","spaghetti","penne","rice","noodle","couscous","quinoa","oat","oats","barley","flour"]],
  ["Pantry Staples", ["oil","olive oil","vinegar","salt","pepper","sugar","honey","soy sauce","stock","broth","tomato paste","tomato sauce","mustard","mayo","ketchup","yeast","baking"]],
  ["Beverages", ["juice","wine","beer","water","tea","coffee"]],
  ["Frozen", ["frozen"]],
  ["Snacks", ["chocolate","chip","cracker","cookie","biscuit"]],
];

export const inferCategory = (name: string): Category => {
  const n = normalizeIngredientName(name);
  if (!n) return "Other";
  const tokens = n.split(" ");
  for (const [cat, keys] of CATEGORY_HINTS) {
    for (const k of keys) {
      if (n === k) return cat;
      if (tokens.includes(k)) return cat;
    }
  }
  return "Other";
};

/** Format a quantity for display. */
export const formatQuantity = (q: number | null | undefined): string => {
  if (q == null || !Number.isFinite(q)) return "";
  if (q >= 10) return String(Math.round(q));
  return String(Math.round(q * 100) / 100);
};

/** Compact "1.5 kg" or "2" when unit is null. */
export const formatQuantityUnit = (
  q: number | null | undefined,
  u: UnitType | null | undefined,
): string => {
  const qs = formatQuantity(q);
  if (!qs) return u ?? "";
  return u ? `${qs} ${u}` : qs;
};

export { CATEGORIES };
