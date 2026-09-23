// Phase 4 — bounded, deterministic optimisation loop.
//
// The AI is only ever asked "give me a different recipe for these slots".
// Every number, every comparison and every accept/reject decision is made here
// with the simulation's own figures. Allergy and dietary validation stays in
// the Phase 3 eligibility check — this loop can never relax it, and it never
// reduces servings to reach a budget.

import { comparePlans, planMetrics, type PlanMetrics } from "./objective";
import { evaluateBudget, needsCheaperPlan, type BudgetStatus, type PlanningBudget } from "./budget";
import type { SimulationResult } from "./inventory";

export const MAX_OPTIMISE_ROUNDS = 3;

export type SlotHint = {
  slotId: string;
  title: string;
  /** New shopping spend this meal adds, from the simulation. */
  purchaseSpend: number;
};

export type SubstitutionRequest = {
  slots: SlotHint[];
  /** Deterministic figures handed back to the planner, never invented by it. */
  overBy: number | null;
  spend: number;
  budget: number;
  currency: string;
  /** Ingredients already paid for that later meals could use. */
  reusableIngredients: string[];
  /** Recipe ids already in the plan or already rejected. */
  excludeRecipeIds: number[];
};

export type OptimizeDeps<M extends PlanMeal> = {
  simulate: (meals: M[]) => SimulationResult;
  /** Ask the planner for replacements. Missing slots simply stay as they are. */
  substitute: (req: SubstitutionRequest) => Promise<M[]>;
  maxRounds?: number;
  /** How many slots to target per round. */
  slotsPerRound?: number;
};

export type OptimizeResult<M> = {
  meals: M[];
  sim: SimulationResult;
  status: BudgetStatus;
  metrics: PlanMetrics;
  rounds: number;
  /** True when the loop gave up while still over budget. */
  stillOverBudget: boolean;
};

type PlanMeal = { slotId: string; spoonId: number | null };

const distinctRecipes = <M extends PlanMeal>(meals: M[]): number =>
  new Set(meals.map((m) => m.spoonId ?? `slot:${m.slotId}`)).size;

const evaluate = <M extends PlanMeal>(
  meals: M[],
  budget: PlanningBudget | null,
  simulate: (meals: M[]) => SimulationResult,
) => {
  const sim = simulate(meals);
  const status = evaluateBudget(sim, budget);
  const metrics = planMetrics(sim, status, distinctRecipes(meals));
  return { sim, status, metrics };
};

export const optimizePlan = async <M extends PlanMeal>(
  meals: M[],
  budget: PlanningBudget | null,
  deps: OptimizeDeps<M>,
): Promise<OptimizeResult<M>> => {
  const maxRounds = deps.maxRounds ?? MAX_OPTIMISE_ROUNDS;
  const slotsPerRound = deps.slotsPerRound ?? 2;

  let best = { meals, ...evaluate(meals, budget, deps.simulate) };
  let rounds = 0;
  const tried = new Set<number>(
    meals.map((m) => m.spoonId).filter((id): id is number => id != null),
  );

  // No budget, or already within it → nothing to optimise.
  while (budget && needsCheaperPlan(best.status) && rounds < maxRounds) {
    rounds += 1;

    const costliest = [...best.sim.meals]
      .sort((a, b) => b.purchaseSpend - a.purchaseSpend)
      .filter((m) => m.purchaseSpend > 0)
      .slice(0, slotsPerRound);
    if (!costliest.length) break;

    const reusable = [
      ...best.sim.remaining.map((r) => r.name),
      ...best.sim.meals.flatMap((m) =>
        m.allocations.filter((a) => a.origin !== "purchased_now").map((a) => a.name),
      ),
    ];

    let replacements: M[] = [];
    try {
      replacements = await deps.substitute({
        slots: costliest.map((m) => ({
          slotId: m.slotId,
          title: m.title,
          purchaseSpend: m.purchaseSpend,
        })),
        overBy:
          best.status.kind === "complete"
            ? best.status.overBy
            : best.status.kind === "incomplete"
              ? Math.round((best.status.spend - best.status.budget) * 100) / 100
              : null,
        spend: best.sim.summary.estimatedPurchaseSpend,
        budget: budget.amount,
        currency: budget.currency,
        reusableIngredients: Array.from(new Set(reusable)).slice(0, 12),
        excludeRecipeIds: Array.from(tried),
      });
    } catch {
      break; // a failed substitution round never invalidates a valid plan
    }
    if (!replacements.length) break;

    const bySlot = new Map(replacements.map((r) => [r.slotId, r]));
    for (const r of replacements) if (r.spoonId != null) tried.add(r.spoonId);
    const nextMeals = best.meals.map((m) => bySlot.get(m.slotId) ?? m);

    // Whole plan is recalculated — one swap changes shared ingredients.
    const candidate = { meals: nextMeals, ...evaluate(nextMeals, budget, deps.simulate) };
    if (comparePlans(candidate.metrics, best.metrics) > 0) {
      best = candidate;
    } else {
      break; // no improvement → stop rather than churn
    }
  }

  return {
    meals: best.meals,
    sim: best.sim,
    status: best.status,
    metrics: best.metrics,
    rounds,
    stillOverBudget: needsCheaperPlan(best.status),
  };
};
