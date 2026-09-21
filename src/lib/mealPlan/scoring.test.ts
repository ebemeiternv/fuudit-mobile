// Phase 3 tests — deterministic candidate signals and ranking.
import { describe, expect, it } from "bun:test";
import {
  computeSignals,
  detectAllergyViolations,
  isDietCompatible,
  isEligible,
  rankCandidates,
  type PantrySignalItem,
  type RankedCandidate,
} from "./scoring";

const pantry = (over: Partial<PantrySignalItem> = {}): PantrySignalItem => ({
  name: "Spinach",
  quantity: 200,
  unit: "g",
  expiresOn: null,
  ...over,
});

const candidate = (
  over: Partial<Omit<RankedCandidate, "signals">> & { missedIngredientCount?: number | null } = {},
): Omit<RankedCandidate, "signals"> & { missedIngredientCount?: number | null } => ({
  id: 1,
  title: "Spinach omelette",
  image: null,
  readyMinutes: 20,
  servings: 2,
  diets: ["vegetarian", "gluten free"],
  ingredients: [
    { name: "spinach", amount: 100, unit: "g" },
    { name: "egg", amount: 3, unit: "piece" },
  ],
  ...over,
});

const baseOpts = {
  todayIso: "2026-09-21",
  expiringWithinDays: 4,
  maxCookingMinutes: 30,
  diets: ["vegetarian"],
  allergies: [] as string[],
};

const scored = (
  c = candidate(),
  p: PantrySignalItem[] = [pantry()],
  opts = baseOpts,
): RankedCandidate => ({ ...c, signals: computeSignals(c, p, opts) });

describe("allergy detection", () => {
  it("finds common allergy spellings in ingredient names", () => {
    expect(
      detectAllergyViolations(
        [
          { name: "eggs", amount: 2, unit: "piece" },
          { name: "unsalted butter", amount: 10, unit: "g" },
        ],
        ["egg", "dairy"],
      ).sort(),
    ).toEqual(["dairy", "egg"]);
  });

  it("does not match partial words", () => {
    expect(
      detectAllergyViolations(
        [{ name: "eggplant", amount: 1, unit: "piece" }],
        ["egg"],
      ),
    ).toEqual([]);
  });

  it("maps tree nuts to their common recipe spellings", () => {
    expect(
      detectAllergyViolations(
        [{ name: "toasted almonds", amount: 30, unit: "g" }],
        ["tree nut"],
      ),
    ).toEqual(["tree nut"]);
  });
});

describe("diet compatibility", () => {
  it("accepts matching diets, including synonyms", () => {
    expect(isDietCompatible(["gluten free"], ["Gluten Free"])).toBe(true);
    expect(isDietCompatible(["pescetarian"], ["pescatarian"])).toBe(true);
    expect(isDietCompatible(["vegan"], ["vegetarian"])).toBe(false);
  });

  it("returns null when the source carries no diet info", () => {
    expect(isDietCompatible(["vegan"], null)).toBeNull();
    expect(isDietCompatible([], null)).toBe(true);
  });
});

describe("pantry signals", () => {
  it("marks quantity-compatible matches via safe unit conversion", () => {
    const c = scored();
    expect(c.signals.pantryOverlap).toEqual(["Spinach"]);
    expect(c.signals.quantityCompatible).toEqual(["Spinach"]); // 200g >= 100g
  });

  it("does not mark quantity compatibility when the pantry runs short", () => {
    const c = scored(candidate(), [pantry({ quantity: 50 })]);
    expect(c.signals.quantityCompatible).toEqual([]);
  });

  it("counts only items expiring inside the horizon as expiring", () => {
    const c = scored(candidate(), [pantry({ expiresOn: "2026-09-24" })]);
    expect(c.signals.expiringOverlap).toEqual(["Spinach"]);
    const later = scored(candidate(), [pantry({ expiresOn: "2026-10-10" })]);
    expect(later.signals.expiringOverlap).toEqual([]);
  });

  it("flags cooking time only when known", () => {
    expect(scored(candidate({ readyMinutes: 45 })).signals.fitsCookingTime).toBe(false);
    expect(scored(candidate({ readyMinutes: 15 })).signals.fitsCookingTime).toBe(true);
    expect(scored(candidate({ readyMinutes: null })).signals.fitsCookingTime).toBeNull();
  });
});

describe("eligibility and ranking", () => {
  it("a candidate with an allergy hit is never eligible", () => {
    const bad = scored(candidate(), [pantry()], { ...baseOpts, allergies: ["egg"] });
    expect(bad.signals.allergyViolations).toEqual(["egg"]);
    expect(isEligible(bad)).toBe(false);
  });

  it("prefers expiring-overlap recipes when prioritised", () => {
    const rescuer = scored(
      candidate({ id: 2, title: "Rescue", ingredients: [{ name: "spinach", amount: 100, unit: "g" }] }),
      [pantry({ expiresOn: "2026-09-23" })],
    );
    const plain = scored(
      candidate({ id: 3, title: "Plain", ingredients: [{ name: "rice", amount: 100, unit: "g" }] }),
      [pantry()],
    );
    const ranked = rankCandidates([plain, rescuer], {
      prioritizePantry: true,
      prioritizeExpiring: true,
    });
    expect(ranked[0].title).toBe("Rescue");
  });

  it("eligible candidates always outrank ineligible ones", () => {
    const bad = scored(
      candidate({ id: 4, title: "Allergen" }),
      [pantry({ expiresOn: "2026-09-22" })],
      { ...baseOpts, allergies: ["egg"] },
    );
    const good = scored(candidate({ id: 5, title: "Safe" }), []);
    const ranked = rankCandidates([bad, good], {
      prioritizePantry: true,
      prioritizeExpiring: true,
    });
    expect(ranked[0].title).toBe("Safe");
  });
});
