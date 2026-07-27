// Product identity helpers for the Adaptive Learning layer.
//
// A stable "identity_key" lets Fuudit remember what the user usually enters
// for the same product across sessions, whether they scanned a barcode or
// typed the name by hand. Keys are namespaced so future sources (OCR,
// receipts, camera recognition, household sharing) can plug in without
// collisions:
//
//   barcode:<digits>   preferred when a retail barcode exists
//   name:<slug>        fallback derived from the product name
//
// Learning is always per-user. Identity keys are stored under user_id in
// the product_intelligence table, so slugs never leak across accounts.

/** Strip diacritics, punctuation, extra whitespace and lowercase. */
const normalizeName = (raw: string): string =>
  raw
    .normalize("NFKD")
    // Remove combining marks (accents)
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Very conservative English singularization for common food-name plurals. */
const singularize = (word: string): string => {
  if (word.length < 4) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("zes"))
    return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
};

export const nameSlug = (name: string): string => {
  const norm = normalizeName(name);
  if (!norm) return "";
  return norm.split(" ").map(singularize).filter(Boolean).join("-");
};

const digitsOnly = (v: string): string => v.replace(/[^0-9]/g, "");

/** Build the canonical identity_key. Prefers barcode when supplied. */
export const buildIdentityKey = (opts: {
  barcode?: string | null;
  name?: string | null;
}): string | null => {
  const bc = opts.barcode ? digitsOnly(opts.barcode) : "";
  if (bc && bc.length >= 6) return `barcode:${bc}`;
  const slug = opts.name ? nameSlug(opts.name) : "";
  if (!slug) return null;
  return `name:${slug}`;
};

export type ConfidenceTier = "none" | "low" | "medium" | "high";

/**
 * Derived confidence tier — never exposed as a percentage per product spec.
 * "medium" means we're willing to suggest a default; "high" means we're
 * willing to surface a soft hint in ambient UI (like Home).
 */
export const confidenceTier = (observations: number): ConfidenceTier => {
  if (observations <= 0) return "none";
  if (observations < 5) return "low";
  if (observations < 20) return "medium";
  return "high";
};
