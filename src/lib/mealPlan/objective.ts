// Phase 4 — what makes one valid plan better than another.
//
// Deliberately NOT a single weighted score: adding kronor to grams to item
// counts would be arbitrary and could produce trade-offs no one can explain.
// Instead the comparison is a documented, ordered list of priorities, each with
// its own tolerance, so the reason one plan won can always be stated in words.
//
// Hard constraints (allergy safety, dietary requirements, servings) are NOT
// part of this comparison — plans that break them never get here.

import type { BudgetStatus } from "./budget";
import type { SimulationResult } from "./inventory";

export type PlanMetrics = {
  /** At-risk pantry ingredients actually used by a meal. Higher is better. */
  rescued: number;
  /** Estimated new shopping spend. Lower is better. */
  spend: number;
  /** How far over the budget we are; 0 = fits, null = not determinable. */
  budgetGap: number | null;
  /** Ingredients reused from a pack bought earlier in the plan. Higher better. */
  reused: number;
  /** Value of purchased quantities left unused. Lower is better. */
  remainingValue: number;
  /** Distinct pantry ingredients used. Higher is better. */
  pantryUsed: number;
  /** Distinct recipes / meals — guards against a week of the same cheap dish. */
  variety: number;
  unpriced: number;
};

export const planMetrics = (
  sim: SimulationResult,
  status: BudgetStatus,
  distinctRecipes: number,
): PlanMetrics => {
  const s = sim.summary;
  const budgetGap =
    status.kind === "complete"
      ? Math.max(0, Math.round((status.spend - status.budget) * 100) / 100)
      : status.kind === "incomplete"
        ? status.exceedsOnKnownPrices
          ? Math.round((status.spend - status.budget) * 100) / 100
          : null // priced part fits, but coverage is incomplete — no claim
        : null;
  return {
    rescued: s.expiringIngredientsRescued,
    spend: s.estimatedPurchaseSpend,
    budgetGap,
    reused: s.reusedPurchasedIngredients,
    remainingValue: s.estimatedPurchasedRemainingValue,
    pantryUsed: s.pantryIngredientsUsed,
    variety: sim.meals.length > 0 ? distinctRecipes / sim.meals.length : 0,
    unpriced: s.unpricedItemCount,
  };
};

/**
 * Ordered priorities, applied one after another:
 *  1. budget fit  — a plan that fits beats one that doesn't; if both miss, the
 *                   smaller miss wins (ignoring differences under 1 unit)
 *  2. rescue      — more genuinely at-risk pantry food actually used
 *  3. spend       — less new shopping spend (differences under 2 % are a tie)
 *  4. reuse       — more ingredients shared between meals
 *  5. waste       — less purchased quantity left unused
 *  6. pantry use  — more of the pantry put to work
 *  7. variety     — fewer repeated recipes across the week
 *
 * Returns > 0 when `a` is the better plan.
 */
export const comparePlans = (a: PlanMetrics, b: PlanMetrics): number => {
  // 1. budget
  const ga = a.budgetGap;
  const gb = b.budgetGap;
  if (ga != null && gb != null) {
    const aFits = ga <= 0;
    const bFits = gb <= 0;
    if (aFits !== bFits) return aFits ? 1 : -1;
    if (!aFits && Math.abs(ga - gb) > 1) return gb - ga;
  } else if (ga != null || gb != null) {
    // One plan is determinable and over budget, the other isn't determinable.
    if (ga != null && ga > 0) return -1;
    if (gb != null && gb > 0) return 1;
  }
  // 2. rescue
  if (a.rescued !== b.rescued) return a.rescued - b.rescued;
  // 3. spend (2 % tolerance so noise doesn't flip the choice)
  const tol = Math.max(1, Math.max(a.spend, b.spend) * 0.02);
  if (Math.abs(a.spend - b.spend) > tol) return b.spend - a.spend;
  // 4. reuse
  if (a.reused !== b.reused) return a.reused - b.reused;
  // 5. unused purchased quantity
  if (Math.abs(a.remainingValue - b.remainingValue) > 1) {
    return b.remainingValue - a.remainingValue;
  }
  // 6. pantry use
  if (a.pantryUsed !== b.pantryUsed) return a.pantryUsed - b.pantryUsed;
  // 7. variety
  if (Math.abs(a.variety - b.variety) > 0.01) return a.variety - b.variety;
  return 0;
};

/** Plain-language reasons, in the same priority order, for logs and support. */
export const explainMetrics = (m: PlanMetrics): string[] => {
  const out: string[] = [];
  if (m.budgetGap != null) {
    out.push(m.budgetGap <= 0 ? "fits the budget" : `over budget by ~${m.budgetGap}`);
  }
  out.push(`${m.rescued} at-risk pantry item${m.rescued === 1 ? "" : "s"} used`);
  out.push(`~${m.spend} estimated shopping`);
  if (m.reused) out.push(`${m.reused} ingredient${m.reused === 1 ? "" : "s"} shared between meals`);
  if (m.remainingValue) out.push(`~${m.remainingValue} of purchased food left unused`);
  out.push(`${m.pantryUsed} pantry ingredient${m.pantryUsed === 1 ? "" : "s"} used`);
  if (m.unpriced) out.push(`${m.unpriced} unpriced item${m.unpriced === 1 ? "" : "s"}`);
  return out;
};
