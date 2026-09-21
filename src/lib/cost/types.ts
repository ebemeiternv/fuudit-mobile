// Phase 1 — Budget-aware planning: cost layer types.
//
// Everything here is pure data. No IO, no React, no Supabase calls, so the
// cost engine stays testable and reusable from both the client and (later)
// an edge function.
//
// Key distinction enforced throughout this layer:
//   * consumed value  — worth of the quantity a recipe actually uses (80 g spinach)
//   * purchase cost   — what must actually be spent to obtain it (a 200 g bag)
// Budget compliance is always based on purchase cost, never consumed value.

import type { UnitType } from "@/lib/grocery";

/**
 * Where a price estimate came from. Resolution priority is the order below.
 * `local_estimate` is intentionally supported but has NO data in the MVP —
 * the slot exists so regional/retailer data can be added later without
 * touching any caller. We never invent placeholder local prices.
 */
export type PriceSource =
  | "personal"
  | "local_estimate"
  | "external_estimate"
  | "category_fallback";

export const PRICE_SOURCE_PRIORITY: PriceSource[] = [
  "personal",
  "local_estimate",
  "external_estimate",
  "category_fallback",
];

/** Unit the price is expressed per. `piece` covers countable items. */
export type UnitBasis = "kg" | "l" | "piece";

/** A resolved price estimate for one ingredient. */
export type PriceEstimate = {
  /** Stable ingredient identity key (see productIdentity.buildIdentityKey). */
  identityKey: string;
  /** Display name as matched. */
  name: string;
  /** Price per one `basis` unit, in `currency`. */
  pricePerBasis: number;
  currency: string;
  basis: UnitBasis;
  source: PriceSource;
  /** 0–1. See lib/cost/confidence.ts for how this is derived. */
  confidence: number;
  /** When the underlying observation was made, when known. */
  observedAt?: string | null;
  /** Typical retail pack size, only when genuinely known — never invented. */
  packSize?: { quantity: number; unit: UnitType } | null;
};

/** Candidate price offered by one source before priority resolution. */
export type PriceCandidate = Omit<PriceEstimate, "identityKey" | "name"> & {
  identityKey?: string;
  name?: string;
};

/** A source able to answer price questions for an ingredient. */
export type PriceSourceProvider = {
  source: PriceSource;
  lookup: (query: PriceQuery) => PriceCandidate | null;
};

export type PriceQuery = {
  identityKey: string;
  name: string;
  category: string | null;
  /** Quantity needed, already normalized where possible. */
  quantity: number | null;
  unit: UnitType | null;
  currency: string;
};

/** One ingredient line required by the plan, after consolidation. */
export type RequiredLine = {
  identityKey: string;
  name: string;
  category: string | null;
  /** Total quantity the plan needs. Null when the recipe gave no amount. */
  quantity: number | null;
  unit: UnitType | null;
  /** Recipe titles / meal references contributing to this line. */
  sources: string[];
};

/** Result of pricing one line: what we have, what to buy, what it costs. */
export type PricedLine = {
  identityKey: string;
  name: string;
  category: string | null;
  requiredQuantity: number | null;
  requiredUnit: UnitType | null;

  /** Covered from pantry / simulated leftovers — never counted as spend. */
  availableQuantity: number;
  /** Still to be bought. */
  missingQuantity: number | null;

  /** Estimated worth of what the plan consumes (pantry + purchased). */
  consumedValue: number | null;
  /** Estimated worth of the pantry quantity used (informational only). */
  pantryValue: number | null;
  /**
   * Estimated actual spend for this line. When a pack size is known this is
   * whole packs; otherwise a proportional estimate with reduced confidence.
   */
  purchaseCost: number | null;
  /** Quantity actually acquired (>= missingQuantity when buying packs). */
  purchasedQuantity: number | null;
  /** Purchased but unused within the plan — waste risk signal. */
  leftoverQuantity: number;

  currency: string;
  priceSource: PriceSource | null;
  confidence: number;
  /** True when no source could price this line. */
  unpriced: boolean;
  /** Human-readable caveats (unit mismatch, missing amount, proportional pack). */
  notes: string[];
};

export type PlanCostSummary = {
  currency: string;
  /** Sum of purchaseCost across lines — the figure compared to a budget. */
  estimatedShoppingCost: number;
  /** Worth of pantry quantities consumed. Not spend. */
  estimatedPantryValueUsed: number;
  /** Purchased-but-unused worth at the end of the period. */
  estimatedLeftoverValue: number;
  totalServings: number;
  estimatedCostPerServing: number | null;
  pantryIngredientsUsed: number;
  expiringIngredientsRescued: number;
  unpricedLineCount: number;
  /** Mean confidence weighted by purchase cost. */
  overallConfidence: number;
};

export type PlanCostResult = {
  lines: PricedLine[];
  summary: PlanCostSummary;
};
