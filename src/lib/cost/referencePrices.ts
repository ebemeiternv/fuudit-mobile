// Phase 1 — category fallback reference prices.
//
// Last-resort magnitudes so a plan can always produce a number. These are
// deliberately coarse, shipped in code, and always surface as
// `category_fallback` with low confidence.
//
// Base currency is SEK (Fuudit's primary market). Other currencies are handled
// by the resolver's currency policy: we only ever use a fallback price when the
// requested currency matches the reference currency, or a conversion rate is
// explicitly supplied by the caller. We never silently convert.

import type { UnitBasis } from "./types";

export const REFERENCE_CURRENCY = "SEK";

type Reference = { basis: UnitBasis; pricePerBasis: number };

/** Typical price per kg / l / piece by pantry category. */
export const CATEGORY_REFERENCE: Record<string, Reference> = {
  Produce: { basis: "kg", pricePerBasis: 45 },
  Dairy: { basis: "kg", pricePerBasis: 95 },
  "Meat & Fish": { basis: "kg", pricePerBasis: 150 },
  Bakery: { basis: "kg", pricePerBasis: 70 },
  "Grains & Pasta": { basis: "kg", pricePerBasis: 35 },
  "Pantry Staples": { basis: "kg", pricePerBasis: 80 },
  Beverages: { basis: "l", pricePerBasis: 25 },
  Frozen: { basis: "kg", pricePerBasis: 90 },
  Snacks: { basis: "kg", pricePerBasis: 140 },
  Other: { basis: "kg", pricePerBasis: 80 },
};

/** Reference prices for countable items, used when the plan counts pieces. */
export const CATEGORY_PIECE_REFERENCE: Record<string, number> = {
  Produce: 8,
  Dairy: 20,
  "Meat & Fish": 45,
  Bakery: 25,
  "Grains & Pasta": 15,
  "Pantry Staples": 20,
  Beverages: 15,
  Frozen: 30,
  Snacks: 20,
  Other: 15,
};

export const referenceFor = (
  category: string | null,
  wantPiece: boolean,
): Reference | null => {
  const key = category && CATEGORY_REFERENCE[category] ? category : "Other";
  if (wantPiece) {
    const price = CATEGORY_PIECE_REFERENCE[key];
    return price == null ? null : { basis: "piece", pricePerBasis: price };
  }
  return CATEGORY_REFERENCE[key] ?? null;
};
