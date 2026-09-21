// Phase 2 tests — personal price capture + planning defaults parsing.
import { describe, expect, it } from "bun:test";
import { pantryRowsToPersonalObservations } from "./personalPrices";
import { createPersonalPriceSource, createCategoryFallbackSource } from "./sources";
import { createPriceResolver } from "./resolver";
import {
  EMPTY_PLANNING_DEFAULTS,
  mergePlanningDefaults,
  parsePlanningDefaults,
} from "@/lib/planningDefaults";

const row = (over: Record<string, unknown> = {}) => ({
  name: "Spinach",
  price_paid: 24,
  price_currency: "SEK",
  package_quantity: 200,
  package_unit: "g",
  purchased_on: "2026-09-01",
  ...over,
});

describe("pantry rows → personal observations", () => {
  it("accepts a complete priced row", () => {
    const [obs] = pantryRowsToPersonalObservations([row()]);
    expect(obs.paidAmount).toBe(24);
    expect(obs.packQuantity).toBe(200);
    expect(obs.packUnit).toBe("g");
    expect(obs.currency).toBe("SEK");
  });

  it("skips rows with no price, zero, or negative price", () => {
    expect(
      pantryRowsToPersonalObservations([
        row({ price_paid: null }),
        row({ price_paid: 0 }),
        row({ price_paid: -5 }),
      ]),
    ).toHaveLength(0);
  });

  it("skips non-ISO currency strings", () => {
    expect(pantryRowsToPersonalObservations([row({ price_currency: "kr" })])).toHaveLength(0);
  });

  it("falls back to stocked quantity when no pack size is recorded", () => {
    const [obs] = pantryRowsToPersonalObservations([
      row({ package_quantity: null, package_unit: null, quantity: 500, unit: "g" }),
    ]);
    expect(obs.packQuantity).toBe(500);
  });

  it("derives no unit price when the unit has no safe basis", () => {
    expect(
      pantryRowsToPersonalObservations([
        row({ package_quantity: null, package_unit: null, quantity: 2, unit: "cup" }),
      ]),
    ).toHaveLength(0);
  });

  it("feeds the resolver and beats the category fallback", () => {
    const observations = pantryRowsToPersonalObservations([row()]);
    const resolver = createPriceResolver([
      createPersonalPriceSource(observations, new Date("2026-09-10")),
      createCategoryFallbackSource(),
    ]);
    const estimate = resolver.resolve({
      identityKey: observations[0].identityKey,
      name: "Spinach",
      category: "Produce",
      quantity: 80,
      unit: "g",
      currency: "SEK",
    });
    expect(estimate?.source).toBe("personal");
    expect(estimate?.basis).toBe("kg");
    // 24 SEK for 0.2 kg → 120 SEK/kg
    expect(estimate?.pricePerBasis).toBeCloseTo(120, 5);
    expect(estimate?.packSize).toEqual({ quantity: 200, unit: "g" });
  });
});

describe("planning defaults parser", () => {
  it("handles null, undefined and garbage", () => {
    for (const v of [null, undefined, 42, "x", []]) {
      expect(parsePlanningDefaults(v)).toEqual(EMPTY_PLANNING_DEFAULTS);
    }
  });

  it("ignores malformed values and clamps ranges", () => {
    const p = parsePlanningDefaults({
      budget: { amount: "abc", currency: "kr", period: "yearly", bufferPercent: 900 },
      meals: ["dinner", "brunch"],
      maxCookingMinutes: -5,
      prioritizePantry: "yes",
      nutritionStyles: "high_protein",
    });
    expect(p.budget.amount).toBeNull();
    expect(p.budget.currency).toBe("SEK");
    expect(p.budget.period).toBe("weekly");
    expect(p.budget.bufferPercent).toBe(50);
    expect(p.meals).toEqual(["dinner"]);
    expect(p.maxCookingMinutes).toBeNull();
    expect(p.prioritizePantry).toBe(true);
    expect(p.nutritionStyles).toEqual([]);
  });

  it("keeps valid values, including numeric strings", () => {
    const p = parsePlanningDefaults({
      budget: { amount: "1200", currency: "EUR", period: "custom", customDays: 10 },
      maxCookingMinutes: 30,
      prioritizeExpiring: false,
    });
    expect(p.budget.amount).toBe(1200);
    expect(p.budget.currency).toBe("EUR");
    expect(p.budget.customDays).toBe(10);
    expect(p.maxCookingMinutes).toBe(30);
    expect(p.prioritizeExpiring).toBe(false);
  });

  it("preserves unknown / future keys when saving one setting", () => {
    const stored = {
      version: 99,
      futureThing: { keepMe: true },
      budget: { amount: 500, currency: "SEK", retailerHint: "ica" },
    };
    const next = parsePlanningDefaults(stored);
    const merged = mergePlanningDefaults(stored, { ...next, meals: ["breakfast"] });
    expect(merged.futureThing).toEqual({ keepMe: true });
    expect((merged.budget as Record<string, unknown>).retailerHint).toBe("ica");
    expect(merged.meals).toEqual(["breakfast"]);
  });
});
