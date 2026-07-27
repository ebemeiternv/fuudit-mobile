// Normalized product shape returned from the barcode-lookup edge function,
// plus category mapping into Fuudit's Pantry categories. Deliberately
// conservative: when tags do not confidently match, we return "Other" and
// let the user override.
import { CATEGORIES, type Category } from "@/lib/pantry";

export type NormalizedProduct = {
  barcode: string;
  name: string | null;
  genericName: string | null;
  brand: string | null;
  imageUrl: string | null;
  packageQuantity: number | null;
  packageUnit: string | null;
  categories: string[];
  ingredientsText: string | null;
  allergens: string[];
  source: string;
  sourceUrl: string;
  attribution: string;
};

// EAN-13 / EAN-8 / UPC-A / UPC-E format check used by both scanner and manual entry.
export const isValidBarcodeFormat = (s: string): boolean =>
  /^[0-9]{6,14}$/.test(s.trim());

// Ordered list — first match wins. Tag matching is done with `endsWith`
// against Open Food Facts hierarchical tags such as "en:milks".
const CATEGORY_RULES: [Category, string[]][] = [
  ["Dairy", ["milks", "yogurts", "cheeses", "butters", "creams", "dairies", "fermented-milk-products"]],
  ["Meat & Fish", ["meats", "poultries", "sausages", "hams", "fishes", "seafood", "cured-meats"]],
  ["Produce", ["fruits", "vegetables", "fresh-vegetables", "fresh-fruits", "salads", "herbs"]],
  ["Bakery", ["breads", "buns", "baguettes", "tortillas", "flatbreads", "bakery"]],
  ["Grains & Pasta", ["pastas", "rices", "cereals", "noodles", "grains", "flours"]],
  ["Beverages", ["beverages", "waters", "juices", "sodas", "teas", "coffees", "beers", "wines"]],
  ["Frozen", ["frozen-foods"]],
  ["Snacks", ["snacks", "biscuits", "chocolates", "confectioneries", "chips"]],
  ["Pantry Staples", ["condiments", "sauces", "oils", "vinegars", "spices", "salts", "sugars", "canned-foods", "preserves"]],
];

export const mapCategory = (tags: string[] | undefined | null): Category | "" => {
  if (!tags?.length) return "";
  const norm = tags.map((t) => t.toLowerCase());
  for (const [cat, needles] of CATEGORY_RULES) {
    for (const n of needles) {
      if (norm.some((t) => t.endsWith(`:${n}`) || t === n)) return cat;
    }
  }
  return "Other";
};

export const productDisplayName = (p: NormalizedProduct): string => {
  return p.name || p.genericName || p.brand || `Barcode ${p.barcode}`;
};

// Type guard used by the sheet: is any of the extra fields worth showing?
export const productHasDetails = (p: NormalizedProduct): boolean =>
  !!(p.name || p.brand || p.imageUrl || p.packageQuantity);

export { CATEGORIES };
