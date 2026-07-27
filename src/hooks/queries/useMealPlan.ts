import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mealPlanRepository,
  type MealPlanEntryInsert,
  type MealPlanEntryUpdate,
} from "@/repositories/mealPlan";
import { recipesRepository } from "@/repositories/recipes";
import { spoonacularRepository } from "@/repositories/spoonacular";
import { normalizeSpoonRecipe } from "@/lib/spoonacular";
import { queryKeys } from "./keys";
import type { Database } from "@/integrations/supabase/types";

type MealType = Database["public"]["Enums"]["meal_type"];

export const useMealPlan = (userId: string | undefined, from: string, to: string) =>
  useQuery({
    queryKey: userId ? queryKeys.mealPlan.range(userId, from, to) : ["mealPlan", "anon"],
    queryFn: () => mealPlanRepository.listRange(userId!, from, to),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

const invalidateAll = (qc: ReturnType<typeof useQueryClient>, userId: string) =>
  qc.invalidateQueries({ queryKey: ["mealPlan", userId] });

export const useCreateMealPlanEntry = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<MealPlanEntryInsert, "user_id">) =>
      mealPlanRepository.create({ ...input, user_id: userId! }),
    onSuccess: () => userId && invalidateAll(qc, userId),
  });
};

export const useUpdateMealPlanEntry = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MealPlanEntryUpdate }) =>
      mealPlanRepository.update(id, patch),
    onSuccess: () => userId && invalidateAll(qc, userId),
  });
};

export const useDeleteMealPlanEntry = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mealPlanRepository.remove(id),
    onSuccess: () => userId && invalidateAll(qc, userId),
  });
};

/**
 * Unified "add to meal plan" flow. Accepts recipes coming from any surface
 * (local id, Spoonacular id, or custom title) and ensures the recipe is cached
 * locally before creating the meal-plan entry.
 */
export type AddToMealPlanPayload =
  | { kind: "recipe"; recipeId: string }
  | { kind: "spoon"; spoonId: number | string; hint?: { title: string; image?: string | null } }
  | { kind: "custom"; customTitle: string };

export const useAddToMealPlan = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      payload: AddToMealPlanPayload;
      date: string;
      mealType: MealType;
      servings: number;
      notes?: string | null;
    }) => {
      if (!userId) throw new Error("Not signed in");

      let recipeId: string | null = null;
      let customTitle: string | null = null;

      if (args.payload.kind === "recipe") {
        recipeId = args.payload.recipeId;
      } else if (args.payload.kind === "spoon") {
        const existing = await recipesRepository.findBySourceId(String(args.payload.spoonId));
        if (existing) {
          recipeId = existing.id;
        } else {
          const { recipe } = await spoonacularRepository.detail(args.payload.spoonId);
          const cached = await recipesRepository.upsertFromSpoonacular(
            normalizeSpoonRecipe(recipe),
          );
          recipeId = cached.id;
        }
      } else {
        customTitle = args.payload.customTitle.trim();
        if (!customTitle) throw new Error("Custom meal needs a title");
      }

      return mealPlanRepository.create({
        user_id: userId,
        date: args.date,
        meal_type: args.mealType,
        recipe_id: recipeId,
        custom_title: customTitle,
        servings: args.servings,
        notes: args.notes ?? null,
      });
    },
    onSuccess: () => userId && invalidateAll(qc, userId),
  });
};
