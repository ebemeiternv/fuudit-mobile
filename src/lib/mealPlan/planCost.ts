// Phase 4 — glue between a draft plan and the Phase 1/2 pricing layer.
//
// One resolver, one simulation, one set of numbers. The UI only ever reads what
// this module returns; it never computes money itself.

import { createPriceResolver } from "@/lib/cost/resolver";
import {
  createCategoryFallbackSource,
  createLocalEstimateSource,
  createPersonalPriceSource,
} from "@/lib/cost/sources";
import { pantryRowsToPersonalObservations } from "@/lib/cost/personalPrices";
import { confidenceLabel } from "@/lib/cost/confidence";
import type { PantryItem } from "@/repositories/pantry";
import { simulatePlan, type SimMeal, type SimPantryItem, type SimulationResult } from "./inventory";
import { evaluateBudget, type BudgetStatus, type PlanningBudget } from "./budget";
import { planMetrics, type PlanMetrics } from "./objective";
import type { DraftMeal } from "./draft";

/**
 * Price sources for this user, in resolution order:
 *   personal (their own recorded purchases) → local estimate (deliberately
 *   empty in the MVP — no invented local pricing) → coarse category fallback.
 */
export const createPlanResolver = (pantry: PantryItem[], currency: string) =>
  createPriceResolver([
    createPersonalPriceSource(pantryRowsToPersonalObservations(pantry)),
    createLocalEstimateSource(),
    createCategoryFallbackSource({ currency }),
  ]);

export const draftToSimMeals = (meals: DraftMeal[]): SimMeal[] =>
  meals.map((m) => ({
    slotId: m.slotId,
    date: m.date,
    mealType: m.mealType,
    title: m.title,
    servings: m.servings,
    recipeServings: m.recipeServings,
    ingredients: m.ingredients ?? [],
  }));

export const toSimPantry = (pantry: PantryItem[]): SimPantryItem[] =>
  pantry
    .filter((p) => p.status === "active")
    .map((p) => ({
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      expiresOn: p.expires_on,
    }));

export type DraftCost = {
  sim: SimulationResult;
  status: BudgetStatus;
  metrics: PlanMetrics;
  confidenceLabel: ReturnType<typeof confidenceLabel>;
  /** Comparable disagreements with the shared grocery reference, if any. */
  groceryDifferences: ReconcileDifference[];
};

/** Whole-plan evaluation. Called again after every change to the draft. */
export const evaluateDraft = (
  meals: DraftMeal[],
  pantry: PantryItem[],
  budget: PlanningBudget | null,
  currency: string,
): DraftCost => {
  const simMeals = draftToSimMeals(meals);
  const simPantry = toSimPantry(pantry);
  const resolver = createPlanResolver(pantry, currency);
  const sim = simulatePlan(simMeals, simPantry, { currency, resolver });
  const status = evaluateBudget(sim, budget);
  // Cross-check against the shared grocery/cost reference. This never produces
  // a second shopping calculation — it only reports comparable disagreements.
  const groceryDifferences = reconcileWithGrocery(sim, simMeals, simPantry, {
    currency,
    resolver,
  });
  return {
    sim,
    status,
    metrics: planMetrics(sim, status, new Set(meals.map((m) => m.spoonId)).size),
    confidenceLabel: confidenceLabel(sim.summary.confidence),
    groceryDifferences,
  };
};

/* ------------------------------------------------------- per-meal reasons */

/** Short, human reasons for why a meal helps the plan. Max 3 per meal. */
export const mealReasons = (
  sim: SimulationResult,
  slotId: string,
  currency: string,
): string[] => {
  const meal = sim.meals.find((m) => m.slotId === slotId);
  if (!meal) return [];
  const out: string[] = [];

  const rescued = meal.allocations.filter((a) => a.rescued).map((a) => a.name);
  if (rescued.length) out.push(`Rescues ${rescued.slice(0, 2).join(" and ")}`);

  const pantryNames = meal.allocations
    .filter((a) => a.origin === "pantry" && !a.rescued)
    .map((a) => a.name);
  if (pantryNames.length) out.push(`Uses ${pantryNames.slice(0, 2).join(" and ")} you have`);

  const reused = meal.allocations.filter((a) => a.origin === "purchased_earlier");
  if (reused.length) {
    const from = reused[0].fromMeal;
    out.push(
      from
        ? `Uses ${reused[0].name} bought for ${from}`
        : `Uses ${reused[0].name} already on the list`,
    );
  }

  if (meal.purchaseSpend > 0) out.push(`~${Math.round(meal.purchaseSpend)} ${currency} to buy`);
  else if (!out.length && !meal.unpricedNames.length) out.push("Nothing new to buy");
  if (meal.unpricedNames.length) {
    out.push(
      `${meal.unpricedNames.length} ingredient${meal.unpricedNames.length === 1 ? "" : "s"} we can't price`,
    );
  }
  return out.slice(0, 3);
};
