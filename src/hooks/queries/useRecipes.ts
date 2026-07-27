import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { spoonacularRepository, type SpoonError } from "@/repositories/spoonacular";
import { recipesRepository } from "@/repositories/recipes";
import { savedRecipesRepository } from "@/repositories/savedRecipes";
import { normalizeSpoonRecipe } from "@/lib/spoonacular";
import type { SpoonSearchHit, SpoonByIngredientsHit } from "@/lib/spoonacular";
import { queryKeys } from "./keys";

export type { SpoonError };

const KEYS = {
  search: (q: string, diet?: string, intol?: string) =>
    ["recipes", "search", q, diet ?? "", intol ?? ""] as const,
  byIngredients: (ings: string[], diet?: string, intol?: string) =>
    ["recipes", "byIngredients", ings.join("|"), diet ?? "", intol ?? ""] as const,
  detail: (spoonId: number | string) => ["recipes", "detail", String(spoonId)] as const,
};

export const useRecipeSearch = (args: {
  query: string;
  diet?: string;
  intolerances?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: KEYS.search(args.query, args.diet, args.intolerances),
    queryFn: () =>
      spoonacularRepository
        .search({
          query: args.query,
          diet: args.diet,
          intolerances: args.intolerances,
          number: 12,
        })
        .then((r) => r.results),
    enabled: args.enabled !== false && args.query.trim().length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

export const useRecipesByIngredients = (args: {
  ingredients: string[];
  diet?: string;
  intolerances?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: KEYS.byIngredients(args.ingredients, args.diet, args.intolerances),
    queryFn: () =>
      spoonacularRepository
        .byIngredients({ ingredients: args.ingredients, number: 12, ranking: 1 })
        .then((r) => r.results),
    enabled: args.enabled !== false && args.ingredients.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

/**
 * Fetch a recipe's full detail. Prefer the local cache; on cache-miss OR when the client
 * only knows the spoonacular id, fetch from Spoonacular and upsert into the cache.
 * `input` is either { localId: uuid } or { spoonId: number|string }.
 */
export const useRecipeDetail = (
  input:
    | { kind: "local"; localId: string }
    | { kind: "spoon"; spoonId: number | string }
    | null,
) =>
  useQuery({
    queryKey: input
      ? input.kind === "local"
        ? ["recipes", "local", input.localId]
        : KEYS.detail(input.spoonId)
      : ["recipes", "detail", "none"],
    queryFn: async () => {
      if (!input) throw new Error("no input");
      if (input.kind === "local") {
        const local = await recipesRepository.getById(input.localId);
        if (!local) throw new Error("not_found");
        // Re-hydrate from Spoonacular in the background if we're missing steps/nutrition — fire and forget.
        return local;
      }
      // Spoonacular-first: cache-hit shortcut, else fetch + upsert.
      const cached = await recipesRepository.findBySourceId(String(input.spoonId));
      if (cached && cached.ingredients && Array.isArray((cached.data as any)?.steps)) {
        return cached;
      }
      const { recipe } = await spoonacularRepository.detail(input.spoonId);
      const normalized = normalizeSpoonRecipe(recipe);
      return recipesRepository.upsertFromSpoonacular(normalized);
    },
    enabled: !!input,
    retry: false,
    staleTime: 30 * 60 * 1000,
  });

/**
 * Save a Spoonacular result. Upserts the recipe locally first, then inserts a saved_recipes row.
 * Safe to call twice — saved_recipes has a unique (user_id, recipe_id) constraint.
 */
export const useSaveSpoonacularRecipe = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hit: SpoonSearchHit | SpoonByIngredientsHit) => {
      if (!userId) throw new Error("Not signed in");
      // If we don't yet have the full detail cached, fetch it so saved list is offline-viewable.
      let local = await recipesRepository.findBySourceId(String(hit.id));
      if (!local) {
        const { recipe } = await spoonacularRepository.detail(hit.id);
        local = await recipesRepository.upsertFromSpoonacular(normalizeSpoonRecipe(recipe));
      }
      try {
        return await savedRecipesRepository.save(userId, local.id);
      } catch (e: any) {
        // Ignore duplicate-key racing saves
        if (e?.code === "23505") return null;
        throw e;
      }
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: queryKeys.savedRecipes.all(userId) });
    },
  });
};
