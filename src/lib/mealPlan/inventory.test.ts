import { describe, expect, it } from "bun:test";
import { simulatePlan, type SimMeal, type SimPantryItem } from "./inventory";
import { createPriceResolver } from "@/lib/cost/resolver";
import { createPersonalPriceSource, createCategoryFallbackSource } from "@/lib/cost/sources";
import { derivePlanningBudget, evaluateBudget, needsCheaperPlan } from "./budget";
import { comparePlans, planMetrics } from "./objective";
import { optimizePlan } from "./optimize";
import { reconcileWithGrocery } from "./reconcile";

const CURRENCY = "SEK";

// A user who has recorded a real purchase: 500 g pasta for 20 SEK.
const personal = createPersonalPriceSource([
  {
    identityKey: "name:pasta",
    name: "pasta",
    paidAmount: 20,
    currency: CURRENCY,
    packQuantity: 500,
    packUnit: "g",
    observedAt: null,
  },
]);

const resolver = createPriceResolver([personal, createCategoryFallbackSource({ currency: CURRENCY })]);
const bareResolver = createPriceResolver([personal]);

const meal = (over: Partial<SimMeal> & { slotId: string }): SimMeal => ({
  date: "2026-09-07",
  mealType: "dinner",
  title: "Meal",
  servings: 2,
  recipeServings: 2,
  ingredients: [],
  ...over,
});

describe("running inventory", () => {
  it("consumes pantry stock before buying anything", () => {
    const pantry: SimPantryItem[] = [
      { name: "pasta", quantity: 400, unit: "g", expiresOn: null },
    ];
    const sim = simulatePlan(
      [meal({ slotId: "a", ingredients: [{ name: "pasta", amount: 300, unit: "g" }] })],
      pantry,
      { currency: CURRENCY, resolver },
    );
    expect(sim.summary.estimatedPurchaseSpend).toBe(0);
    expect(sim.summary.pantryIngredientsUsed).toBe(1);
    expect(sim.missing.length).toBe(0);
  });

  it("uses the quantity expiring soonest first and only claims a real rescue", () => {
    const pantry: SimPantryItem[] = [
      { name: "spinach", quantity: 200, unit: "g", expiresOn: "2099-01-01" },
      { name: "spinach", quantity: 100, unit: "g", expiresOn: new Date().toISOString().slice(0, 10) },
    ];
    const sim = simulatePlan(
      [meal({ slotId: "a", ingredients: [{ name: "spinach", amount: 80, unit: "g" }] })],
      pantry,
      { currency: CURRENCY, resolver },
    );
    expect(sim.summary.expiringIngredientsRescued).toBe(1);
    expect(sim.meals[0].allocations[0].rescued).toBe(true);
  });

  it("does not claim a rescue when the at-risk item is never used", () => {
    const pantry: SimPantryItem[] = [
      { name: "mushrooms", quantity: 250, unit: "g", expiresOn: new Date().toISOString().slice(0, 10) },
    ];
    const sim = simulatePlan(
      [meal({ slotId: "a", ingredients: [{ name: "pasta", amount: 200, unit: "g" }] })],
      pantry,
      { currency: CURRENCY, resolver },
    );
    expect(sim.summary.expiringIngredientsRescued).toBe(0);
  });

  it("buys whole packs and carries the remainder to later meals", () => {
    const sim = simulatePlan(
      [
        meal({
          slotId: "mon",
          date: "2026-09-07",
          title: "Monday pasta",
          ingredients: [{ name: "pasta", amount: 200, unit: "g" }],
        }),
        meal({
          slotId: "tue",
          date: "2026-09-08",
          title: "Tuesday pasta",
          ingredients: [{ name: "pasta", amount: 200, unit: "g" }],
        }),
      ],
      [],
      { currency: CURRENCY, resolver },
    );
    // One 500 g pack at 20 SEK covers both meals.
    expect(sim.summary.estimatedPurchaseSpend).toBe(20);
    expect(sim.meals[1].purchaseSpend).toBe(0);
    expect(sim.summary.reusedPurchasedIngredients).toBe(1);
    expect(sim.remaining[0].quantity).toBe(100);
    expect(sim.meals[1].allocations[0].origin).toBe("purchased_earlier");
    expect(sim.meals[1].allocations[0].fromMeal).toBe("Monday pasta");
  });

  it("never invents an expiry date for purchased quantities", () => {
    const sim = simulatePlan(
      [meal({ slotId: "a", ingredients: [{ name: "pasta", amount: 200, unit: "g" }] })],
      [],
      { currency: CURRENCY, resolver },
    );
    expect(sim.remaining[0].value).toBe(12);
    expect(sim.summary.estimatedPurchasedRemainingValue).toBe(12);
  });

  it("reports unpriced ingredients instead of treating them as free", () => {
    const sim = simulatePlan(
      [
        meal({
          slotId: "a",
          ingredients: [
            { name: "pasta", amount: 200, unit: "g" },
            { name: "saffron threads", amount: 1, unit: "pinch" },
          ],
        }),
      ],
      [],
      { currency: CURRENCY, resolver: bareResolver },
    );
    expect(sim.summary.unpricedItemCount).toBe(1);
    expect(sim.summary.unpricedNames).toContain("saffron threads");
    expect(sim.purchases.find((p) => p.cost == null)?.name).toBe("saffron threads");
  });

  it("never prices a line that states no unit at all", () => {
    const sim = simulatePlan(
      [
        meal({
          slotId: "a",
          ingredients: [
            { name: "pasta", amount: 200, unit: "g" },
            { name: "black beans", amount: 7.5, unit: null },
          ],
        }),
      ],
      [],
      { currency: CURRENCY, resolver: bareResolver },
    );
    const beans = sim.purchases.find((p) => p.name === "black beans");
    expect(beans?.cost).toBeNull();
    expect(sim.summary.unpricedNames).toContain("black beans");
  });
});

describe("budget envelope", () => {
  it("scales a weekly budget to the days planned and subtracts the buffer", () => {
    const b = derivePlanningBudget(
      { amount: 1400, currency: CURRENCY, period: "weekly", customDays: null, bufferPercent: 10 },
      { days: ["2026-09-07", "2026-09-08", "2026-09-09"], todayIso: "2026-09-07" },
    );
    expect(b?.amount).toBe(540); // 1400 * 3/7 * 0.9
  });

  it("treats a monthly budget as the days actually left in the month", () => {
    const b = derivePlanningBudget(
      { amount: 6000, currency: CURRENCY, period: "monthly", customDays: null, bufferPercent: 0 },
      { days: ["2026-09-24", "2026-09-25"], todayIso: "2026-09-24" },
    );
    // 7 days remain in September from the 24th → 2/7 of the envelope.
    expect(b?.periodDaysRemaining).toBe(7);
    expect(b?.amount).toBe(1714.29);
  });
});

describe("budget status honesty", () => {
  const budget = { amount: 100, currency: CURRENCY, planDays: 1, periodDaysRemaining: 7, bufferPercent: 0, period: "weekly" as const, note: "" };

  it("gives a definitive remaining only when every purchase is priced", () => {
    const sim = simulatePlan(
      [meal({ slotId: "a", ingredients: [{ name: "pasta", amount: 200, unit: "g" }] })],
      [],
      { currency: CURRENCY, resolver },
    );
    const status = evaluateBudget(sim, budget);
    expect(status.kind).toBe("complete");
    if (status.kind === "complete") expect(status.remaining).toBe(80);
  });

  it("falls back to an incomplete estimate when something is unpriced", () => {
    const sim = simulatePlan(
      [
        meal({
          slotId: "a",
          ingredients: [
            { name: "pasta", amount: 200, unit: "g" },
            { name: "saffron threads", amount: 1, unit: "pinch" },
          ],
        }),
      ],
      [],
      { currency: CURRENCY, resolver: bareResolver },
    );
    const status = evaluateBudget(sim, budget);
    expect(status.kind).toBe("incomplete");
    if (status.kind === "incomplete") {
      expect(status.unpricedCount).toBe(1);
      expect(status.exceedsOnKnownPrices).toBe(false);
      expect(status.knownPriceHeadroom).toBe(80);
    }
    expect(needsCheaperPlan(status)).toBe(false);
  });
});

describe("optimisation", () => {
  const pricey = meal({
    slotId: "mon",
    title: "Pricey",
    ingredients: [{ name: "pasta", amount: 2000, unit: "g" }],
  });
  const cheap = meal({
    slotId: "mon",
    title: "Cheap",
    ingredients: [{ name: "pasta", amount: 200, unit: "g" }],
  });

  const withId = (m: SimMeal, spoonId: number) => ({ ...m, spoonId });

  it("swaps the costliest slot and stops once the plan fits", async () => {
    const budget = derivePlanningBudget(
      { amount: 60, currency: CURRENCY, period: "daily", customDays: null, bufferPercent: 0 },
      { days: ["2026-09-07"], todayIso: "2026-09-07" },
    )!;
    const simulate = (ms: (SimMeal & { spoonId: number })[]) =>
      simulatePlan(ms, [], { currency: CURRENCY, resolver });

    const before = evaluateBudget(simulate([withId(pricey, 1)]), budget);
    expect(needsCheaperPlan(before)).toBe(true);

    const result = await optimizePlan([withId(pricey, 1)], budget, {
      simulate,
      substitute: async () => [withId(cheap, 2)],
    });
    expect(result.rounds).toBe(1);
    expect(result.stillOverBudget).toBe(false);
    expect(result.sim.summary.estimatedPurchaseSpend).toBe(20);
  });

  it("keeps the best valid plan and reports the gap when it cannot fit", async () => {
    const budget = derivePlanningBudget(
      { amount: 5, currency: CURRENCY, period: "daily", customDays: null, bufferPercent: 0 },
      { days: ["2026-09-07"], todayIso: "2026-09-07" },
    )!;
    const result = await optimizePlan([withId(pricey, 1)], budget, {
      simulate: (ms) => simulatePlan(ms, [], { currency: CURRENCY, resolver }),
      substitute: async () => [withId(cheap, 2)],
    });
    expect(result.stillOverBudget).toBe(true);
    expect(result.sim.summary.estimatedPurchaseSpend).toBe(20); // best found
    if (result.status.kind === "complete") expect(result.status.overBy).toBe(15);
  });

  it("prefers rescuing at-risk food over a marginally cheaper plan", () => {
    const a = planMetrics(
      { ...emptySim, summary: { ...emptySim.summary, expiringIngredientsRescued: 2, estimatedPurchaseSpend: 100 } },
      { kind: "no_budget" },
      1,
    );
    const b = planMetrics(
      { ...emptySim, summary: { ...emptySim.summary, expiringIngredientsRescued: 0, estimatedPurchaseSpend: 98 } },
      { kind: "no_budget" },
      1,
    );
    expect(comparePlans(a, b)).toBeGreaterThan(0);
  });
});

describe("reconciliation with the shared grocery reference", () => {
  it("agrees on missing quantities when no pack rounding is involved", () => {
    const meals = [
      meal({ slotId: "a", ingredients: [{ name: "tomato", amount: 3, unit: "piece" }] }),
    ];
    const sim = simulatePlan(meals, [{ name: "tomato", quantity: 1, unit: "piece", expiresOn: null }], {
      currency: CURRENCY,
      resolver,
    });
    const diffs = reconcileWithGrocery(
      sim,
      meals,
      [{ name: "tomato", quantity: 1, unit: "piece", expiresOn: null }],
      { currency: CURRENCY, resolver },
    );
    expect(sim.missing[0].quantity).toBe(2);
    expect(diffs).toEqual([]);
  });
});

const emptySim = simulatePlan([], [], { currency: CURRENCY, resolver });
