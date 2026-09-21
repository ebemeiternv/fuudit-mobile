// Phase 3 — client-side generation pipeline.
//
// 1. Retrieve REAL recipe candidates through the existing catalogue flow
//    (byIngredients + search, both intolerance-filtered server-side).
// 2. Compute measurable signals per candidate (scoring.ts) and validate
//    allergies/diet in code — a violating candidate never reaches the AI.
// 3. The edge function selects/ranks a coherent whole-period plan.
// 4. Assignments are validated again in code (ids must exist; allergies and
//    diet re-checked) and mapped to a temporary draft. Unresolved slots stay
//    unresolved — a failed slot never invalidates the rest of the draft.

import { supabase } from "@/integrations/supabase/client";
import { spoonacularRepository } from "@/repositories/spoonacular";
import type { PantryItem } from "@/repositories/pantry";
import type { SpoonSearchHit, SpoonByIngredientsHit } from "@/lib/spoonacular";
import {
  computeSignals,
  isEligible,
  rankCandidates,
  type CandidateIngredientSignal,
  type PantrySignalItem,
  type RankedCandidate,
} from "./scoring";
import type { DraftMeal, PlanSlot } from "./draft";

export type GenerateConstraints = {
  servings: number;
  diets: string[];
  allergies: string[];
  maxCookingMinutes: number | null;
  prioritizePantry: boolean;
  prioritizeExpiring: boolean;
  nutritionStyles: string[];
  /** Recipe ids already used in this draft — never suggested twice. */
  excludeRecipeIds?: number[];
};

export type GenerateResult = {
  meals: DraftMeal[];
  unresolved: PlanSlot[];
  notes: string | null;
  requestId: string | null;
};

export class GenerateError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/* -------------------------------------------------- candidate retrieval */

const toIngredientSignals = (r: unknown): CandidateIngredientSignal[] => {
  const rec = r as {
    extendedIngredients?: { name?: string; amount?: number; unit?: string }[];
    ingredients?: { name?: string; amount?: number; unit?: string }[];
    usedIngredients?: { name?: string; amount?: number; unit?: string }[];
    missedIngredients?: { name?: string; amount?: number; unit?: string }[];
  };
  const from = (l?: { name?: string; amount?: number; unit?: string }[]) =>
    (l ?? [])
      .map((i) => ({
        name: String(i.name ?? "").trim(),
        amount: typeof i.amount === "number" ? i.amount : null,
        unit: i.unit ? String(i.unit) : null,
      }))
      .filter((i) => i.name);
  const direct = from(rec.extendedIngredients).concat(from(rec.ingredients));
  return direct.length ? direct : from(rec.usedIngredients).concat(from(rec.missedIngredients));
};

const MEAL_QUERY: Record<string, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snack",
};

const MAX_CANDIDATES_SENT = 24;

/** Retrieve + validate + rank candidates for the requested meal types. */
export const fetchCandidates = async (args: {
  mealTypes: string[];
  pantry: PantryItem[];
  constraints: GenerateConstraints;
}): Promise<RankedCandidate[]> => {
  const { mealTypes, pantry, constraints } = args;
  const dietParam = constraints.diets.join(",") || undefined;
  const intoleranceParam = constraints.allergies.join(",") || undefined;

  const pantrySignalItems: PantrySignalItem[] = pantry.map((p) => ({
    name: p.name,
    quantity: p.quantity,
    unit: p.unit,
    expiresOn: p.expires_on,
  }));

  const byId = new Map<number, Omit<RankedCandidate, "signals">>();

  // Pantry-first pool: real recipes using what's already at home.
  if (constraints.prioritizePantry && pantry.length) {
    const names = pantry
      .slice()
      .sort((a, b) => String(a.expires_on ?? "9999").localeCompare(String(b.expires_on ?? "9999")))
      .map((p) => p.name)
      .slice(0, 12);
    try {
      const { results } = await spoonacularRepository.byIngredients({
        ingredients: names,
        number: 12,
        ranking: 1,
      });
      for (const r of results as SpoonByIngredientsHit[]) {
        byId.set(r.id, {
          id: r.id,
          title: r.title,
          image: r.image ?? null,
          readyMinutes: null, // findByIngredients omits it
          servings: null,
          diets: [],
          ingredients: toIngredientSignals(r),
          missedIngredientCount: r.missedIngredientCount ?? null,
        });
      }
    } catch {
      // A failed candidate source must not block generation entirely.
    }
  }

  // One catalogue search per meal type, server-side filtered by diet +
  // intolerances, with ingredient lists returned for in-code validation.
  const uniqueMeals = Array.from(new Set(mealTypes));
  await Promise.all(
    uniqueMeals.map(async (m) => {
      try {
        const { results } = await spoonacularRepository.search({
          query: MEAL_QUERY[m] ?? m,
          number: 8,
          diet: dietParam,
          intolerances: intoleranceParam,
          fillIngredients: true,
        });
        for (const r of results as SpoonSearchHit[]) {
          const existing = byId.get(r.id);
          const ingredients = toIngredientSignals(r);
          byId.set(r.id, {
            id: r.id,
            title: r.title,
            image: r.image ?? existing?.image ?? null,
            readyMinutes: r.readyInMinutes ?? existing?.readyMinutes ?? null,
            servings: r.servings ?? existing?.servings ?? null,
            diets: r.diets ?? existing?.diets ?? [],
            ingredients: ingredients.length ? ingredients : (existing?.ingredients ?? []),
            missedIngredientCount:
              existing && "missedIngredientCount" in existing
                ? (existing as { missedIngredientCount?: number | null }).missedIngredientCount ?? null
                : null,
          });
        }
      } catch {
        // keep going with whatever other sources returned
      }
    }),
  );

  const opts = {
    maxCookingMinutes: constraints.maxCookingMinutes,
    diets: constraints.diets,
    allergies: constraints.allergies,
    expiringWithinDays: 4,
  };
  const excluded = new Set(constraints.excludeRecipeIds ?? []);

  const ranked = rankCandidates(
    [...byId.values()]
      .filter((c) => !excluded.has(c.id))
      .map((c) => ({ ...c, signals: computeSignals(c, pantrySignalItems, opts) })),
    {
      prioritizePantry: constraints.prioritizePantry,
      prioritizeExpiring: constraints.prioritizeExpiring,
    },
  );

  // Hard in-code validation: allergy violations and known diet conflicts are
  // removed before the AI ever sees the list.
  return ranked.filter(isEligible).slice(0, MAX_CANDIDATES_SENT);
};

/* ------------------------------------------------------- generation call */

export const generateMealPlan = async (args: {
  slots: PlanSlot[];
  candidates: RankedCandidate[];
  constraints: GenerateConstraints;
  /**
   * Phase 4: deterministic figures from the cost simulation, handed back to the
   * planner when asking for cheaper replacements. The planner never calculates
   * money itself — it only reads these.
   */
  guidance?: {
    reason: "budget";
    estimatedSpend: number;
    budget: number;
    currency: string;
    overBy: number | null;
    reusableIngredients: string[];
    costliestMeals: { slotId: string; title: string; purchaseSpend: number }[];
  } | null;
}): Promise<GenerateResult> => {
  const { slots, candidates, constraints } = args;

  const { data, error } = await supabase.functions.invoke("meal-plan-generate", {
    body: {
      guidance: args.guidance ?? null,
      slots: slots.map((s) => ({ slotId: s.slotId, date: s.date, mealType: s.mealType })),
      candidates: candidates.map((c) => ({
        id: c.id,
        title: c.title,
        readyMinutes: c.readyMinutes,
        servings: c.servings,
        diets: c.diets,
        ingredients: c.ingredients.map((i) => i.name).slice(0, 12),
        signals: {
          pantryOverlap: c.signals.pantryOverlap,
          quantityCompatible: c.signals.quantityCompatible,
          expiringOverlap: c.signals.expiringOverlap,
          missedCount: c.signals.missedCount,
          fitsCookingTime: c.signals.fitsCookingTime,
          dietCompatible: c.signals.dietCompatible,
        },
      })),
      constraints: {
        servings: constraints.servings,
        diets: constraints.diets,
        allergies: constraints.allergies,
        maxCookingMinutes: constraints.maxCookingMinutes,
        prioritizePantry: constraints.prioritizePantry,
        prioritizeExpiring: constraints.prioritizeExpiring,
        nutritionStyles: constraints.nutritionStyles,
      },
    },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    throw new GenerateError(
      status === 429
        ? "gateway_rate_limited"
        : status === 402
          ? "gateway_credits_exhausted"
          : status === 401
            ? "unauthenticated"
            : "unknown_error",
      error.message,
    );
  }
  if (data?.error) {
    throw new GenerateError(String(data.error), String(data.message ?? "Generation failed"));
  }

  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const slotById = new Map(slots.map((s) => [s.slotId, s]));
  const meals: DraftMeal[] = [];
  const assigned = new Set<string>();

  for (const a of data?.assignments ?? []) {
    const slot = slotById.get(a.slotId);
    const cand = candidateById.get(a.candidateId);
    if (!slot || !cand) continue;
    // Final in-code validation — nothing the model says can bypass it.
    if (!isEligible(cand)) continue;
    assigned.add(slot.slotId);
    meals.push({
      slotId: slot.slotId,
      date: slot.date,
      mealType: slot.mealType,
      spoonId: cand.id,
      title: cand.title,
      image: cand.image,
      readyMinutes: cand.readyMinutes,
      servings: constraints.servings,
      recipeServings: cand.servings,
      ingredients: cand.ingredients.map((i) => ({
        name: i.name,
        amount: i.amount,
        unit: i.unit,
      })),
      pantryUsed: cand.signals.pantryOverlap,
      expiringUsed: cand.signals.expiringOverlap,
    });
  }

  return {
    meals,
    unresolved: slots.filter((s) => !assigned.has(s.slotId)),
    notes: typeof data?.notes === "string" ? data.notes : null,
    requestId: typeof data?.requestId === "string" ? data.requestId : null,
  };
};
