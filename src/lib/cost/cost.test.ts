// Phase 1 tests — run with `bun test src/lib/cost`.
import { describe, expect, test } from "bun:test";

import { createPriceResolver } from "./resolver";
import {
  createCategoryFallbackSource,
  createExternalEstimateSource,
  createLocalEstimateSource,
  createPersonalPriceSource,
  ingredientIdentityKey,
} from "./sources";
import {
  compareWithBudget,
  consolidatePlan,
  evaluatePlanCost,
  toRequiredLines,
  type PlanMeal,
} from "./engine";
import { confidenceLabel, personalConfidence } from "./confidence";
import { basisForUnit, toBasisQuantity } from "./units";

const spinachKey = ingredientIdentityKey("spinach");

const personal = createPersonalPriceSource([
  {
    identityKey: spinachKey,
    name: "Spinach",
    paidAmount: 24,
    currency: "SEK",
    packQuantity: 200,
    packUnit: "g",
    observedAt: new Date().toISOString(),
  },
]);

const resolver = createPriceResolver([
  personal,
  createLocalEstimateSource(),
  createExternalEstimateSource([]),
  createCategoryFallbackSource({ currency: "SEK" }),
]);

const meal = (over: Partial<PlanMeal> & { id: string; date: string }): PlanMeal => ({
  mealType: "dinner",
  title: "Test meal",
  servings: 2,
  recipeServings: 2,
  ingredients: [],
  ...over,
});

describe("units", () => {
  test("maps units onto a price basis", () => {
    expect(basisForUnit("g")).toBe("kg");
    expect(basisForUnit("ml")).toBe("l");
    expect(basisForUnit("piece")).toBe("piece");
    expect(basisForUnit("cup")).toBeNull();
  });

  test("normalizes quantities onto the basis and refuses unsafe conversions", () => {
    expect(toBasisQuantity(200, "g", "kg")).toBeCloseTo(0.2);
    expect(toBasisQuantity(1, "cup", "kg")).toBeNull();
  });
});

describe("resolver priority", () => {
  test("personal data beats category fallback", () => {
    const est = resolver.resolve({
      identityKey: spinachKey,
      name: "spinach",
      category: "Produce",
      quantity: 80,
      unit: "g",
      currency: "SEK",
    });
    expect(est?.source).toBe("personal");
    expect(est?.pricePerBasis).toBeCloseTo(120); // 24 SEK / 0.2 kg
    expect(est?.packSize).toEqual({ quantity: 200, unit: "g" });
  });

  test("falls back to category when nothing personal exists", () => {
    const est = resolver.resolve({
      identityKey: ingredientIdentityKey("kale"),
      name: "kale",
      category: "Produce",
      quantity: 100,
      unit: "g",
      currency: "SEK",
    });
    expect(est?.source).toBe("category_fallback");
  });

  test("local_estimate is a supported slot with no MVP data", () => {
    expect(createLocalEstimateSource().lookup({
      identityKey: spinachKey,
      name: "spinach",
      category: "Produce",
      quantity: 1,
      unit: "g",
      currency: "SEK",
    })).toBeNull();
  });

  test("external estimates are refused across currencies without an explicit rate", () => {
    const ext = createExternalEstimateSource([
      { identityKey: spinachKey, name: "spinach", pricePerBasis: 10, currency: "USD", basis: "kg" },
    ]);
    const q = {
      identityKey: spinachKey,
      name: "spinach",
      category: "Produce",
      quantity: 100,
      unit: "g" as const,
      currency: "SEK",
    };
    expect(ext.lookup(q)).toBeNull();
    const withRate = createExternalEstimateSource(
      [{ identityKey: spinachKey, name: "spinach", pricePerBasis: 10, currency: "USD", basis: "kg" }],
      { conversion: { from: "USD", to: "SEK", rate: 10 } },
    );
    expect(withRate.lookup(q)?.pricePerBasis).toBeCloseTo(100);
  });
});

describe("consolidation", () => {
  test("merges the same ingredient across meals and scales by servings", () => {
    const meals: PlanMeal[] = [
      meal({
        id: "b",
        date: "2026-09-23",
        ingredients: [{ name: "spinach", amount: 100, unit: "g" }],
      }),
      meal({
        id: "a",
        date: "2026-09-21",
        servings: 4,
        recipeServings: 2,
        ingredients: [{ name: "Spinach", amount: 100, unit: "g" }],
      }),
    ];
    const { needs, orderedMeals } = consolidatePlan(meals);
    expect(orderedMeals.map((m) => m.id)).toEqual(["a", "b"]);
    const lines = toRequiredLines(needs);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBeCloseTo(300); // 200 (scaled) + 100
    expect(lines[0].unit).toBe("g");
  });

  test("keeps incompatible units in separate buckets", () => {
    const { needs } = consolidatePlan([
      meal({
        id: "a",
        date: "2026-09-21",
        recipeServings: 2,
        ingredients: [
          { name: "olive oil", amount: 2, unit: "tbsp" },
          { name: "olive oil", amount: 100, unit: "ml" },
        ],
      }),
    ]);
    const lines = toRequiredLines(needs);
    expect(lines).toHaveLength(2);
  });
});

describe("purchase cost vs consumed value", () => {
  test("buys a whole pack, consumes part, leaves the rest for later meals", () => {
    const result = evaluatePlanCost(
      [
        meal({
          id: "mon",
          date: "2026-09-21",
          ingredients: [{ name: "spinach", amount: 80, unit: "g" }],
        }),
      ],
      [],
      { currency: "SEK", resolver },
    );
    const line = result.lines[0];
    expect(line.purchaseCost).toBeCloseTo(24); // one 200 g pack
    expect(line.purchasedQuantity).toBeCloseTo(200);
    expect(line.leftoverQuantity).toBeCloseTo(120);
    expect(line.consumedValue).toBeCloseTo(9.6); // 80 g of value, not spend
    expect(result.summary.estimatedShoppingCost).toBeCloseTo(24);
  });

  test("a second meal reuses the leftover instead of buying again", () => {
    const result = evaluatePlanCost(
      [
        meal({ id: "mon", date: "2026-09-21", ingredients: [{ name: "spinach", amount: 80, unit: "g" }] }),
        meal({ id: "wed", date: "2026-09-23", ingredients: [{ name: "spinach", amount: 120, unit: "g" }] }),
      ],
      [],
      { currency: "SEK", resolver },
    );
    // 200 g total needed → still exactly one pack, no second purchase.
    expect(result.summary.estimatedShoppingCost).toBeCloseTo(24);
    expect(result.lines[0].leftoverQuantity).toBeCloseTo(0);
  });

  test("pantry quantities are never counted as new spend", () => {
    const result = evaluatePlanCost(
      [meal({ id: "mon", date: "2026-09-21", ingredients: [{ name: "spinach", amount: 80, unit: "g" }] })],
      [{ name: "Spinach", quantity: 150, unit: "g", expiresOn: null }],
      { currency: "SEK", resolver },
    );
    const line = result.lines[0];
    expect(line.missingQuantity).toBe(0);
    expect(line.purchaseCost).toBe(0);
    expect(line.availableQuantity).toBeCloseTo(80);
    expect(result.summary.estimatedShoppingCost).toBe(0);
    expect(result.summary.pantryIngredientsUsed).toBe(1);
  });

  test("counts expiring pantry items as rescued", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const iso = soon.toISOString().slice(0, 10);
    const result = evaluatePlanCost(
      [meal({ id: "mon", date: "2026-09-21", ingredients: [{ name: "spinach", amount: 50, unit: "g" }] })],
      [{ name: "spinach", quantity: 200, unit: "g", expiresOn: iso }],
      { currency: "SEK", resolver },
    );
    expect(result.summary.expiringIngredientsRescued).toBe(1);
  });

  test("falls back to a proportional estimate with lower confidence when pack size is unknown", () => {
    const result = evaluatePlanCost(
      [meal({ id: "mon", date: "2026-09-21", ingredients: [{ name: "kale", amount: 500, unit: "g" }] })],
      [],
      { currency: "SEK", resolver },
    );
    const line = result.lines[0];
    expect(line.priceSource).toBe("category_fallback");
    expect(line.purchaseCost).toBeCloseTo(22.5); // 0.5 kg at 45 SEK/kg
    expect(line.notes.join(" ")).toContain("Pack size unknown");
    expect(line.confidence).toBeLessThan(0.25);
  });

  test("reports unpriced lines instead of guessing", () => {
    const emptyResolver = createPriceResolver([]);
    const result = evaluatePlanCost(
      [meal({ id: "mon", date: "2026-09-21", ingredients: [{ name: "saffron", amount: 1, unit: "g" }] })],
      [],
      { currency: "SEK", resolver: emptyResolver },
    );
    expect(result.lines[0].unpriced).toBe(true);
    expect(result.lines[0].purchaseCost).toBeNull();
    expect(result.summary.unpricedLineCount).toBe(1);
  });

  test("handles ingredients with no stated amount", () => {
    const result = evaluatePlanCost(
      [meal({ id: "mon", date: "2026-09-21", ingredients: [{ name: "salt", amount: null, unit: null }] })],
      [],
      { currency: "SEK", resolver },
    );
    expect(result.lines[0].requiredQuantity).toBeNull();
    expect(result.summary.estimatedShoppingCost).toBe(0);
  });
});

describe("budget comparison", () => {
  test("compares deterministically and names the costliest lines", () => {
    const result = evaluatePlanCost(
      [
        meal({
          id: "mon",
          date: "2026-09-21",
          ingredients: [
            { name: "beef", amount: 800, unit: "g" },
            { name: "kale", amount: 200, unit: "g" },
          ],
        }),
      ],
      [],
      { currency: "SEK", resolver },
    );
    const cmp = compareWithBudget(result, 200);
    expect(cmp.estimatedShoppingCost).toBeGreaterThan(0);
    expect(cmp.withinBudget).toBe(cmp.remaining >= 0);
    expect(cmp.costliestLines[0].name).toBe("beef");

    const tight = compareWithBudget(result, 10);
    expect(tight.withinBudget).toBe(false);
    expect(tight.overBy).toBeGreaterThan(0);
  });

  test("cost per serving uses total plan servings", () => {
    const result = evaluatePlanCost(
      [meal({ id: "mon", date: "2026-09-21", servings: 4, recipeServings: 4, ingredients: [{ name: "spinach", amount: 200, unit: "g" }] })],
      [],
      { currency: "SEK", resolver },
    );
    expect(result.summary.totalServings).toBe(4);
    expect(result.summary.estimatedCostPerServing).toBeCloseTo(6);
  });
});

describe("confidence", () => {
  test("more observations raise confidence, age lowers it", () => {
    const fresh = personalConfidence({ observations: 5, ageDays: 0 });
    const single = personalConfidence({ observations: 1, ageDays: 0 });
    const old = personalConfidence({ observations: 5, ageDays: 800 });
    expect(fresh).toBeGreaterThan(single);
    expect(fresh).toBeGreaterThan(old);
  });

  test("labels stay coarse", () => {
    expect(confidenceLabel(0)).toBe("unknown");
    expect(confidenceLabel(0.2)).toBe("rough");
    expect(confidenceLabel(0.5)).toBe("fair");
    expect(confidenceLabel(0.85)).toBe("good");
  });
});
