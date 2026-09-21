// Phase 3 — draft plan types.
//
// A generated plan is a temporary, in-memory draft only. Nothing is written
// to the database until the user accepts, and acceptance goes through the
// existing add-to-meal-plan path so accepted meals are ordinary
// meal_plan_entries rows afterwards.

import type { Database } from "@/integrations/supabase/types";
import type { MealPlanEntryWithRecipe } from "@/repositories/mealPlan";

export type MealType = Database["public"]["Enums"]["meal_type"];

/** One date + meal slot the generator was asked to fill. */
export type PlanSlot = {
  /** Stable id shared with the edge function: `${date}|${mealType}`. */
  slotId: string;
  date: string;
  mealType: MealType;
  /** An already-planned meal occupying this slot, when there is one. */
  occupiedBy: MealPlanEntryWithRecipe | null;
};

export const slotId = (date: string, mealType: MealType): PlanSlot["slotId"] =>
  `${date}|${mealType}`;

/** Build the slot list for the chosen days/meals, marking occupied slots. */
export const buildSlots = (
  days: string[],
  meals: MealType[],
  entries: MealPlanEntryWithRecipe[],
): PlanSlot[] => {
  const byKey = new Map<string, MealPlanEntryWithRecipe>();
  for (const e of entries) byKey.set(slotId(e.date, e.meal_type), e);
  const out: PlanSlot[] = [];
  for (const date of days) {
    for (const mealType of meals) {
      out.push({ slotId: slotId(date, mealType), date, mealType, occupiedBy: byKey.get(slotId(date, mealType)) ?? null });
    }
  }
  return out;
};

/** One proposed meal in the draft. Always a real catalogue recipe. */
export type DraftMeal = {
  slotId: string;
  date: string;
  mealType: MealType;
  /** Spoonacular id — the existing cache flow fetches full detail on accept. */
  spoonId: number;
  title: string;
  image: string | null;
  readyMinutes: number | null;
  servings: number;
  /** Pantry item names this recipe uses (measurable signal). */
  pantryUsed: string[];
  /** Pantry items expiring soon that this recipe uses. */
  expiringUsed: string[];
};

export type DraftPlan = {
  meals: DraftMeal[];
  /** Slots the generator could not fill safely — left for manual planning. */
  unresolved: PlanSlot[];
  /** Occupied slots the user chose to keep (never touched). */
  kept: PlanSlot[];
};

/** What one generation run is asked to produce. */
export type GenerationRequest = {
  slots: PlanSlot[];
  servings: number;
  maxCookingMinutes: number | null;
  prioritizePantry: boolean;
  prioritizeExpiring: boolean;
  nutritionStyles: string[];
};
