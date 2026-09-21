// Phase 4 — running-inventory simulation.
//
// A temporary, in-memory model of the kitchen across the planning period. It
// NEVER touches the real pantry and is discarded with the draft.
//
// Walks the plan chronologically. For each meal:
//   1. scale the recipe's ingredients to the servings the plan needs
//   2. consume compatible existing quantities first (soonest expiry first,
//      real pantry before previously purchased packs)
//   3. whatever remains is a purchase; packs are only rounded when a real pack
//      size is known (never invented)
//   4. the unused part of a purchased pack stays in the simulated inventory so
//      later meals can consume it without buying again
//
// Reuses the existing ingredient engine (lib/grocery) for name normalisation
// and unit conversion, and the Phase 1 price resolver for every number. No
// second pricing system, no arithmetic by the AI.

import {
  convertQuantity,
  inferCategory,
  normalizeIngredientName,
  normalizeUnit,
  type UnitType,
} from "@/lib/grocery";
import { daysUntilExpiry } from "@/lib/pantry";
import { ingredientIdentityKey } from "@/lib/cost/sources";
import { applyPenalty, CONFIDENCE_PENALTY, weightedConfidence } from "@/lib/cost/confidence";
import { toBasisQuantity } from "@/lib/cost/units";
import type { PriceResolver } from "@/lib/cost/resolver";
import type { PriceEstimate, PriceSource } from "@/lib/cost/types";

/* ------------------------------------------------------------------ inputs */

export type SimIngredient = {
  name: string;
  amount: number | null;
  unit: string | null;
  optional?: boolean;
};

export type SimMeal = {
  slotId: string;
  date: string;
  mealType: string;
  title: string;
  /** Servings this meal must produce. */
  servings: number;
  /** Servings the source recipe yields (for scaling). */
  recipeServings: number | null;
  ingredients: SimIngredient[];
};

export type SimPantryItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  expiresOn?: string | null;
};

export type SimulateOptions = {
  currency: string;
  resolver: PriceResolver;
  includeOptional?: boolean;
  /** Pantry items expiring within this many days are "at risk". */
  expiringWithinDays?: number;
};

/* ------------------------------------------------------------------ output */

export type AllocationOrigin = "pantry" | "purchased_earlier" | "purchased_now";

export type Allocation = {
  name: string;
  quantity: number;
  unit: UnitType | null;
  origin: AllocationOrigin;
  /** True only when a genuinely at-risk pantry quantity was actually used. */
  rescued: boolean;
  /** For reused packs: the meal the pack was first bought for. */
  fromMeal?: string;
};

export type MealCost = {
  slotId: string;
  title: string;
  /** New shopping spend this meal adds, given everything before it. */
  purchaseSpend: number;
  /** Ingredients this meal needs that no source could price. */
  unpricedNames: string[];
  allocations: Allocation[];
};

export type PurchaseLine = {
  identityKey: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: UnitType | null;
  cost: number | null;
  source: PriceSource | null;
  confidence: number;
  packRounded: boolean;
  notes: string[];
};

export type RemainingLine = {
  name: string;
  quantity: number;
  unit: UnitType | null;
  /** Estimated worth — already part of shopping spend, not an extra cost. */
  value: number | null;
};

export type MissingRequirement = {
  identityKey: string;
  name: string;
  quantity: number;
  unit: UnitType | null;
};

export type SimulationSummary = {
  currency: string;
  /** The figure a budget is compared against. */
  estimatedPurchaseSpend: number;
  /** Worth of everything the plan consumes (pantry + purchased). */
  estimatedConsumedValue: number;
  /** Worth of the pantry quantities used. Never spend. */
  estimatedPantryValueUsed: number;
  /** Purchased quantities still unused at the end of the period. */
  purchasedRemainingCount: number;
  estimatedPurchasedRemainingValue: number;
  /** Distinct pantry ingredients the plan actually consumes. */
  pantryIngredientsUsed: number;
  /** Distinct at-risk pantry ingredients actually allocated to a meal. */
  expiringIngredientsRescued: number;
  /** Distinct ingredients reused from a pack bought earlier in the plan. */
  reusedPurchasedIngredients: number;
  unpricedItemCount: number;
  unpricedNames: string[];
  totalServings: number;
  estimatedCostPerServing: number | null;
  /** Cost-weighted 0–1. Coarse labels live in cost/confidence.ts. */
  confidence: number;
};

export type SimulationResult = {
  meals: MealCost[];
  purchases: PurchaseLine[];
  remaining: RemainingLine[];
  /** Pre-pack requirement still missing after pantry + reuse — for reconciliation. */
  missing: MissingRequirement[];
  summary: SimulationSummary;
};

/* ------------------------------------------------------------------- lots */

type Lot = {
  quantity: number;
  unit: UnitType | null;
  origin: "pantry" | "purchased";
  expiresOn: string | null;
  /** Estimated worth of one `unit`, when known. */
  unitValue: number | null;
  atRisk: boolean;
  fromMeal?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const sortLots = (lots: Lot[]): Lot[] =>
  [...lots].sort((a, b) => {
    // Soonest expiry first; unknown expiry last.
    const ae = a.expiresOn ?? "9999-12-31";
    const be = b.expiresOn ?? "9999-12-31";
    if (ae !== be) return ae.localeCompare(be);
    // Then real pantry stock before packs bought inside the plan.
    if (a.origin !== b.origin) return a.origin === "pantry" ? -1 : 1;
    return 0;
  });

/* --------------------------------------------------------------- simulate */

export const simulatePlan = (
  meals: SimMeal[],
  pantry: SimPantryItem[],
  opts: SimulateOptions,
): SimulationResult => {
  const includeOptional = opts.includeOptional ?? true;
  const horizon = opts.expiringWithinDays ?? 4;
  const currency = opts.currency;

  // Starting inventory: the real pantry, keyed exactly the way the grocery
  // layer matches ingredients (identical normalised names).
  const lots = new Map<string, Lot[]>();
  const displayName = new Map<string, string>();
  for (const item of pantry) {
    const key = normalizeIngredientName(item.name);
    if (!key) continue;
    displayName.set(key, item.name);
    if (item.quantity == null || !(item.quantity > 0)) continue;
    const days = daysUntilExpiry(item.expiresOn ?? null);
    const list = lots.get(key) ?? [];
    list.push({
      quantity: item.quantity,
      unit: normalizeUnit(item.unit),
      origin: "pantry",
      expiresOn: item.expiresOn ?? null,
      unitValue: null,
      atRisk: days != null && days <= horizon,
    });
    lots.set(key, list);
  }

  const ordered = [...meals].sort(
    (a, b) => a.date.localeCompare(b.date) || a.slotId.localeCompare(b.slotId),
  );

  const mealCosts: MealCost[] = [];
  const purchases: PurchaseLine[] = [];
  const missing = new Map<string, MissingRequirement>();
  const unpriced = new Set<string>();
  const pantryUsedKeys = new Set<string>();
  const rescuedKeys = new Set<string>();
  const reusedKeys = new Set<string>();
  const estimateCache = new Map<string, PriceEstimate | null>();

  let spend = 0;
  let consumedValue = 0;
  let pantryValue = 0;

  const resolve = (
    identityKey: string,
    name: string,
    category: string | null,
    quantity: number | null,
    unit: UnitType | null,
  ): PriceEstimate | null => {
    const cacheKey = `${identityKey}|${unit ?? "none"}`;
    if (estimateCache.has(cacheKey)) return estimateCache.get(cacheKey) ?? null;
    let est: PriceEstimate | null = null;
    try {
      est = opts.resolver.resolve({ identityKey, name, category, quantity, unit, currency });
    } catch {
      est = null; // a broken source must never break a plan
    }
    estimateCache.set(cacheKey, est);
    return est;
  };

  for (const meal of ordered) {
    const rs = meal.recipeServings ?? 0;
    const scale = rs > 0 && meal.servings > 0 ? meal.servings / rs : 1;
    const allocations: Allocation[] = [];
    const mealUnpriced: string[] = [];
    let mealSpend = 0;

    for (const ing of meal.ingredients ?? []) {
      if (!includeOptional && ing.optional) continue;
      const rawName = (ing.name ?? "").trim();
      const key = normalizeIngredientName(rawName);
      if (!key) continue;
      if (!displayName.has(key)) displayName.set(key, rawName);
      const identityKey = ingredientIdentityKey(key);
      const unit = normalizeUnit(ing.unit);
      const category = inferCategory(rawName);

      // No stated amount: nothing can be consumed or priced honestly.
      if (ing.amount == null || !Number.isFinite(ing.amount) || ing.amount <= 0) {
        mealUnpriced.push(rawName);
        unpriced.add(key);
        continue;
      }
      let need = ing.amount * scale;

      // ---- 1. consume from existing inventory (expiry first) ----
      const existing = lots.get(key);
      if (existing?.length) {
        for (const lot of sortLots(existing)) {
          if (need <= 0) break;
          if (lot.quantity <= 0) continue;
          const availableInNeedUnit = convertQuantity(lot.quantity, lot.unit, unit);
          if (availableInNeedUnit == null || availableInNeedUnit <= 0) continue;
          const take = Math.min(availableInNeedUnit, need);
          const takeInLotUnit = convertQuantity(take, unit, lot.unit);
          if (takeInLotUnit == null) continue;
          lot.quantity = round2(lot.quantity - takeInLotUnit);
          need = round2(need - take);
          allocations.push({
            name: displayName.get(key) ?? rawName,
            quantity: round2(take),
            unit,
            origin: lot.origin === "pantry" ? "pantry" : "purchased_earlier",
            rescued: lot.origin === "pantry" && lot.atRisk,
            fromMeal: lot.fromMeal,
          });
          if (lot.origin === "pantry") {
            pantryUsedKeys.add(key);
            if (lot.atRisk) rescuedKeys.add(key);
            if (lot.unitValue != null) pantryValue += lot.unitValue * take;
          } else {
            reusedKeys.add(key);
          }
          if (lot.unitValue != null) consumedValue += lot.unitValue * take;
        }
        lots.set(
          key,
          existing.filter((l) => l.quantity > 0.0001),
        );
      }

      if (need <= 0.0001) continue;

      // ---- 2. buy what is still missing ----
      const prior = missing.get(`${identityKey}|${unit ?? "none"}`);
      if (prior) prior.quantity = round2(prior.quantity + need);
      else
        missing.set(`${identityKey}|${unit ?? "none"}`, {
          identityKey,
          name: displayName.get(key) ?? rawName,
          quantity: round2(need),
          unit,
        });

      const estimate = resolve(identityKey, rawName, category, need, unit);
      const notes: string[] = [];

      // Value of one needed unit through the estimate's basis.
      //
      // A line with no unit at all ("2.5 black beans") is NOT reliably
      // countable — recipe sources often drop cups/cans/ounces. Pricing it as
      // pieces would invent a number, so it stays explicitly unpriced.
      let unitValue: number | null = null;
      let confidence = 0;
      if (unit == null) {
        notes.push("No unit stated — can't estimate a price");
      } else if (estimate) {
        const oneInBasis = toBasisQuantity(1, unit, estimate.basis);
        if (oneInBasis == null) {
          notes.push("Unit can't be compared with the price estimate");
          confidence = applyPenalty(estimate.confidence, CONFIDENCE_PENALTY.unitMismatch);
        } else {
          unitValue = estimate.pricePerBasis * oneInBasis;
          confidence = estimate.confidence;
        }
      }

      if (unitValue == null) {
        // Never zero, never guessed — reported as unpriced.
        mealUnpriced.push(rawName);
        unpriced.add(key);
        purchases.push({
          identityKey,
          name: displayName.get(key) ?? rawName,
          category,
          quantity: round2(need),
          unit,
          cost: null,
          source: estimate?.source ?? null,
          confidence,
          packRounded: false,
          notes: notes.length ? notes : ["No usable price estimate"],
        });
        continue;
      }

      // Pack rounding only with a genuinely known pack size.
      let buyQuantity = need;
      let cost = unitValue * need;
      let packRounded = false;
      const pack = estimate?.packSize ?? null;
      if (pack && pack.quantity > 0) {
        const packInUnit = convertQuantity(pack.quantity, pack.unit, unit);
        if (packInUnit != null && packInUnit > 0) {
          const packs = Math.ceil(need / packInUnit);
          buyQuantity = packs * packInUnit;
          cost = unitValue * buyQuantity;
          packRounded = true;
        }
      }
      if (!packRounded) {
        notes.push("Pack size unknown — proportional estimate");
        confidence = applyPenalty(confidence, CONFIDENCE_PENALTY.proportionalPack);
      }

      cost = round2(cost);
      mealSpend += cost;
      spend += cost;
      consumedValue += unitValue * need;

      purchases.push({
        identityKey,
        name: displayName.get(key) ?? rawName,
        category,
        quantity: round2(buyQuantity),
        unit,
        cost,
        source: estimate?.source ?? null,
        confidence,
        packRounded,
        notes,
      });

      allocations.push({
        name: displayName.get(key) ?? rawName,
        quantity: round2(need),
        unit,
        origin: "purchased_now",
        rescued: false,
      });

      // Unused part of the pack stays available for later meals.
      const leftover = round2(buyQuantity - need);
      if (leftover > 0.0001) {
        const list = lots.get(key) ?? [];
        list.push({
          quantity: leftover,
          unit,
          origin: "purchased",
          expiresOn: null, // never invented
          unitValue,
          atRisk: false,
          fromMeal: meal.title,
        });
        lots.set(key, list);
      }
    }

    mealCosts.push({
      slotId: meal.slotId,
      title: meal.title,
      purchaseSpend: round2(mealSpend),
      unpricedNames: Array.from(new Set(mealUnpriced)),
      allocations,
    });
  }

  // What was bought but never used inside the plan.
  const remaining: RemainingLine[] = [];
  let remainingValue = 0;
  for (const [key, list] of lots) {
    for (const lot of list) {
      if (lot.origin !== "purchased" || lot.quantity <= 0.0001) continue;
      const value = lot.unitValue != null ? round2(lot.unitValue * lot.quantity) : null;
      if (value != null) remainingValue += value;
      remaining.push({
        name: displayName.get(key) ?? key,
        quantity: round2(lot.quantity),
        unit: lot.unit,
        value,
      });
    }
  }

  const totalServings = ordered.reduce((s, m) => s + (m.servings || 0), 0);

  return {
    meals: mealCosts,
    purchases,
    remaining,
    missing: Array.from(missing.values()),
    summary: {
      currency,
      estimatedPurchaseSpend: round2(spend),
      estimatedConsumedValue: round2(consumedValue),
      estimatedPantryValueUsed: round2(pantryValue),
      purchasedRemainingCount: remaining.length,
      estimatedPurchasedRemainingValue: round2(remainingValue),
      pantryIngredientsUsed: pantryUsedKeys.size,
      expiringIngredientsRescued: rescuedKeys.size,
      reusedPurchasedIngredients: reusedKeys.size,
      unpricedItemCount: unpriced.size,
      unpricedNames: Array.from(unpriced).map((k) => displayName.get(k) ?? k),
      totalServings,
      estimatedCostPerServing: totalServings > 0 ? round2(spend / totalServings) : null,
      confidence: weightedConfidence(
        purchases.map((p) => ({ confidence: p.confidence, weight: p.cost ?? 0 })),
      ),
    },
  };
};
