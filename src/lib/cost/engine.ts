// Phase 1 — deterministic cost engine.
//
// The AI never does arithmetic. This module owns every number:
//   1. expand recipe ingredients and scale to the required servings
//   2. consolidate identical ingredients across the WHOLE plan
//   3. subtract pantry quantities (safe unit conversion only)
//   4. price the missing quantities through the resolver
//   5. model purchase cost (packs) separately from consumed value
//   6. simulate a running inventory so pack remainders feed later meals
//   7. total up and compare against a budget envelope
//
// Reuses the existing ingredient engine from lib/grocery.ts for name
// normalization, unit conversion and pantry matching. Nothing is duplicated.

import {
  convertQuantity,
  inferCategory,
  ingredientsMatch,
  normalizeIngredientName,
  normalizeUnit,
  type UnitType,
} from "@/lib/grocery";
import { daysUntilExpiry } from "@/lib/pantry";
import { ingredientIdentityKey } from "./sources";
import { applyPenalty, CONFIDENCE_PENALTY, weightedConfidence } from "./confidence";
import { basisForUnit, toBasisQuantity, fromBasisQuantity } from "./units";
import type { PriceResolver } from "./resolver";
import type {
  PlanCostResult,
  PricedLine,
  PriceEstimate,
  RequiredLine,
} from "./types";

/* ------------------------------------------------------------------- inputs */

export type PlanIngredient = {
  name: string;
  amount: number | null;
  unit: string | null;
  optional?: boolean;
};

export type PlanMeal = {
  id: string;
  /** ISO date (YYYY-MM-DD). Drives running-inventory order. */
  date: string;
  mealType: string;
  title: string;
  /** Servings this meal must produce. */
  servings: number;
  /** Servings the source recipe yields (for scaling). */
  recipeServings: number | null;
  ingredients: PlanIngredient[];
};

export type PantrySnapshotItem = {
  name: string;
  quantity: number | null;
  unit: UnitType | null;
  category?: string | null;
  expiresOn?: string | null;
};

export type CostEngineOptions = {
  currency: string;
  resolver: PriceResolver;
  includeOptional?: boolean;
  /** Items expiring within this many days count as "rescued". */
  expiringWithinDays?: number;
};

/* ----------------------------------------------------- 1 + 2: consolidation */

type Need = {
  identityKey: string;
  name: string;
  category: string | null;
  /** Needs per unit bucket; buckets that cannot be safely merged stay apart. */
  buckets: Map<UnitType | "__none", number>;
  /** Ingredient lines with no usable amount. */
  amountlessCount: number;
  sources: Set<string>;
  /** Chronological meal order in which the need arises. */
  mealNeeds: { mealId: string; date: string; unit: UnitType | null; quantity: number | null }[];
};

const scaleFor = (meal: PlanMeal): number => {
  const rs = meal.recipeServings ?? 0;
  if (rs > 0 && meal.servings > 0) return meal.servings / rs;
  return 1;
};

export const consolidatePlan = (
  meals: PlanMeal[],
  opts: { includeOptional?: boolean } = {},
): { needs: Map<string, Need>; orderedMeals: PlanMeal[] } => {
  const includeOptional = opts.includeOptional ?? true;
  const orderedMeals = [...meals].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const needs = new Map<string, Need>();

  for (const meal of orderedMeals) {
    const scale = scaleFor(meal);
    for (const ing of meal.ingredients ?? []) {
      if (!includeOptional && ing.optional) continue;
      const rawName = (ing.name ?? "").trim();
      const norm = normalizeIngredientName(rawName);
      if (!norm) continue;

      const key = ingredientIdentityKey(norm);
      let need = needs.get(key);
      if (!need) {
        need = {
          identityKey: key,
          name: rawName,
          category: inferCategory(rawName),
          buckets: new Map(),
          amountlessCount: 0,
          sources: new Set(),
          mealNeeds: [],
        };
        needs.set(key, need);
      }
      need.sources.add(meal.title);

      const unit = normalizeUnit(ing.unit);
      const qty = ing.amount != null && Number.isFinite(ing.amount) ? ing.amount * scale : null;
      need.mealNeeds.push({ mealId: meal.id, date: meal.date, unit, quantity: qty });

      if (qty == null) {
        need.amountlessCount += 1;
        continue;
      }

      // Merge into an existing bucket when a safe conversion exists.
      let merged = false;
      for (const [existing] of need.buckets) {
        if (existing === "__none") continue;
        const converted = unit ? convertQuantity(qty, unit, existing as UnitType) : null;
        if (converted != null) {
          need.buckets.set(existing, (need.buckets.get(existing) ?? 0) + converted);
          merged = true;
          break;
        }
      }
      if (!merged) {
        const bucket: UnitType | "__none" = unit ?? "__none";
        need.buckets.set(bucket, (need.buckets.get(bucket) ?? 0) + qty);
      }
    }
  }

  return { needs, orderedMeals };
};

/** Flatten consolidated needs into plain required lines (one per unit bucket). */
export const toRequiredLines = (needs: Map<string, Need>): RequiredLine[] => {
  const out: RequiredLine[] = [];
  for (const need of needs.values()) {
    const sources = Array.from(need.sources);
    if (!need.buckets.size) {
      out.push({
        identityKey: need.identityKey,
        name: need.name,
        category: need.category,
        quantity: null,
        unit: null,
        sources,
      });
      continue;
    }
    for (const [bucket, quantity] of need.buckets) {
      out.push({
        identityKey: need.identityKey,
        name: need.name,
        category: need.category,
        quantity,
        unit: bucket === "__none" ? null : (bucket as UnitType),
        sources,
      });
    }
  }
  return out;
};

/* ------------------------------------------- 3–6: pantry, pricing, purchases */

const round2 = (n: number) => Math.round(n * 100) / 100;

type PantryMatch = {
  available: number | null;
  unit: UnitType | null;
  expiringSoon: boolean;
  unitMismatch: boolean;
};

const matchPantry = (
  line: RequiredLine,
  pantry: PantrySnapshotItem[],
  expiringWithinDays: number,
): PantryMatch => {
  const item = pantry.find((p) => ingredientsMatch(p.name, line.name));
  if (!item) return { available: 0, unit: line.unit, expiringSoon: false, unitMismatch: false };

  const days = daysUntilExpiry(item.expiresOn ?? null);
  const expiringSoon = days != null && days <= expiringWithinDays;

  if (item.quantity == null) {
    return { available: null, unit: item.unit, expiringSoon, unitMismatch: false };
  }
  const converted = convertQuantity(item.quantity, item.unit, line.unit);
  if (converted == null) {
    return { available: null, unit: item.unit, expiringSoon, unitMismatch: true };
  }
  return { available: converted, unit: line.unit, expiringSoon, unitMismatch: false };
};

/**
 * Purchase model. Distinguishes consumed value from actual spend:
 *   need 80 g spinach, known 200 g pack at 24 SEK →
 *   purchasedQuantity 200 g, purchaseCost 24, consumedValue ~9.6, leftover 120 g
 * With no known pack size we fall back to a proportional estimate and lower
 * the confidence rather than inventing a pack.
 */
const priceMissing = (
  line: RequiredLine,
  missing: number | null,
  estimate: PriceEstimate | null,
): {
  purchaseCost: number | null;
  purchasedQuantity: number | null;
  leftover: number;
  consumedValueForMissing: number | null;
  unitValue: number | null; // value per one `line.unit`
  confidence: number;
  notes: string[];
} => {
  const notes: string[] = [];
  if (!estimate) {
    return {
      purchaseCost: null,
      purchasedQuantity: missing,
      leftover: 0,
      consumedValueForMissing: null,
      unitValue: null,
      confidence: 0,
      notes: ["No price estimate available"],
    };
  }

  // Value of one line-unit, via the estimate's basis.
  const oneInBasis =
    line.unit == null && estimate.basis === "piece"
      ? 1
      : toBasisQuantity(1, line.unit, estimate.basis);
  if (oneInBasis == null) {
    notes.push("Unit cannot be compared with the price basis — estimate is rough");
    return {
      purchaseCost: null,
      purchasedQuantity: missing,
      leftover: 0,
      consumedValueForMissing: null,
      unitValue: null,
      confidence: applyPenalty(estimate.confidence, CONFIDENCE_PENALTY.unitMismatch),
      notes,
    };
  }
  const unitValue = estimate.pricePerBasis * oneInBasis;

  if (missing == null) {
    notes.push("Recipe gives no amount — cost not estimated for this line");
    return {
      purchaseCost: null,
      purchasedQuantity: null,
      leftover: 0,
      consumedValueForMissing: null,
      unitValue,
      confidence: applyPenalty(estimate.confidence, CONFIDENCE_PENALTY.missingAmount),
      notes,
    };
  }
  if (missing <= 0) {
    return {
      purchaseCost: 0,
      purchasedQuantity: 0,
      leftover: 0,
      consumedValueForMissing: 0,
      unitValue,
      confidence: estimate.confidence,
      notes,
    };
  }

  // Known pack size → buy whole packs.
  const pack = estimate.packSize;
  if (pack && pack.quantity > 0) {
    const packInLineUnit = convertQuantity(pack.quantity, pack.unit, line.unit);
    if (packInLineUnit != null && packInLineUnit > 0) {
      const packs = Math.ceil(missing / packInLineUnit);
      const purchasedQuantity = packs * packInLineUnit;
      const packInBasis = toBasisQuantity(pack.quantity, pack.unit, estimate.basis);
      const packCost =
        packInBasis != null ? estimate.pricePerBasis * packInBasis : unitValue * packInLineUnit;
      return {
        purchaseCost: round2(packs * packCost),
        purchasedQuantity,
        leftover: round2(purchasedQuantity - missing),
        consumedValueForMissing: round2(unitValue * missing),
        unitValue,
        confidence: estimate.confidence,
        notes,
      };
    }
  }

  // No usable pack size → proportional estimate, flagged.
  notes.push("Pack size unknown — proportional estimate");
  return {
    purchaseCost: round2(unitValue * missing),
    purchasedQuantity: missing,
    leftover: 0,
    consumedValueForMissing: round2(unitValue * missing),
    unitValue,
    confidence: applyPenalty(estimate.confidence, CONFIDENCE_PENALTY.proportionalPack),
    notes,
  };
};

/* ----------------------------------------------------------- public entry point */

export const evaluatePlanCost = (
  meals: PlanMeal[],
  pantry: PantrySnapshotItem[],
  opts: CostEngineOptions,
): PlanCostResult => {
  const currency = opts.currency;
  const expiringWithinDays = opts.expiringWithinDays ?? 4;
  const { needs } = consolidatePlan(meals, { includeOptional: opts.includeOptional });
  const lines = toRequiredLines(needs);

  const priced: PricedLine[] = [];
  let pantryIngredientsUsed = 0;
  let expiringIngredientsRescued = 0;

  for (const line of lines) {
    const match = matchPantry(line, pantry, expiringWithinDays);
    const notes: string[] = [];

    // Pantry subtraction — plan-wide, so a pack bought for Monday is already
    // shared with later meals through the consolidated quantity.
    let available = 0;
    let missing: number | null = line.quantity;
    if (match.unitMismatch) {
      notes.push("Pantry item uses a different unit — please check");
    } else if (match.available == null && match.unit != null) {
      notes.push("Pantry quantity unknown — assumed none available");
    } else if (match.available != null && line.quantity != null) {
      available = Math.min(match.available, line.quantity);
      missing = Math.max(0, line.quantity - match.available);
    }
    if (available > 0) {
      pantryIngredientsUsed += 1;
      if (match.expiringSoon) expiringIngredientsRescued += 1;
    }

    const estimate = opts.resolver.resolve({
      identityKey: line.identityKey,
      name: line.name,
      category: line.category,
      quantity: missing,
      unit: line.unit,
      currency,
    });

    const p = priceMissing(line, missing, estimate);
    const pantryValue = p.unitValue != null ? round2(p.unitValue * available) : null;
    const consumedValue =
      p.unitValue != null && line.quantity != null
        ? round2(p.unitValue * line.quantity)
        : null;

    priced.push({
      identityKey: line.identityKey,
      name: line.name,
      category: line.category,
      requiredQuantity: line.quantity,
      requiredUnit: line.unit,
      availableQuantity: round2(available),
      missingQuantity: missing,
      consumedValue,
      pantryValue,
      purchaseCost: p.purchaseCost,
      purchasedQuantity: p.purchasedQuantity,
      leftoverQuantity: p.leftover,
      currency,
      priceSource: estimate?.source ?? null,
      confidence: p.confidence,
      unpriced: p.purchaseCost == null && (missing == null || missing > 0),
      notes: [...notes, ...p.notes],
    });
  }

  const estimatedShoppingCost = round2(
    priced.reduce((s, l) => s + (l.purchaseCost ?? 0), 0),
  );
  const estimatedPantryValueUsed = round2(
    priced.reduce((s, l) => s + (l.pantryValue ?? 0), 0),
  );
  const estimatedLeftoverValue = round2(
    priced.reduce((s, l) => {
      if (!l.leftoverQuantity || l.consumedValue == null || l.requiredQuantity == null) return s;
      const perUnit = l.consumedValue / l.requiredQuantity;
      return s + perUnit * l.leftoverQuantity;
    }, 0),
  );
  const totalServings = meals.reduce((s, m) => s + (m.servings || 0), 0);

  return {
    lines: priced,
    summary: {
      currency,
      estimatedShoppingCost,
      estimatedPantryValueUsed,
      estimatedLeftoverValue,
      totalServings,
      estimatedCostPerServing:
        totalServings > 0 ? round2(estimatedShoppingCost / totalServings) : null,
      pantryIngredientsUsed,
      expiringIngredientsRescued,
      unpricedLineCount: priced.filter((l) => l.unpriced).length,
      overallConfidence: weightedConfidence(
        priced.map((l) => ({ confidence: l.confidence, weight: l.purchaseCost ?? 0 })),
      ),
    },
  };
};

/* --------------------------------------------- budget comparison (deterministic) */

export type BudgetComparison = {
  budget: number;
  currency: string;
  estimatedShoppingCost: number;
  remaining: number;
  withinBudget: boolean;
  overBy: number;
  /** Lines to target first when asking the AI for cheaper substitutions. */
  costliestLines: { name: string; purchaseCost: number }[];
};

export const compareWithBudget = (
  result: PlanCostResult,
  budget: number,
  opts: { topLines?: number } = {},
): BudgetComparison => {
  const cost = result.summary.estimatedShoppingCost;
  const remaining = round2(budget - cost);
  return {
    budget,
    currency: result.summary.currency,
    estimatedShoppingCost: cost,
    remaining,
    withinBudget: remaining >= 0,
    overBy: remaining < 0 ? round2(-remaining) : 0,
    costliestLines: result.lines
      .filter((l) => (l.purchaseCost ?? 0) > 0)
      .sort((a, b) => (b.purchaseCost ?? 0) - (a.purchaseCost ?? 0))
      .slice(0, opts.topLines ?? 5)
      .map((l) => ({ name: l.name, purchaseCost: l.purchaseCost as number })),
  };
};

export { fromBasisQuantity, basisForUnit };
