import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { savedRecipesRepository } from "@/repositories/savedRecipes";
import { queryKeys } from "./keys";

export const useSavedRecipes = (userId: string | undefined) =>
  useQuery({
    queryKey: userId ? queryKeys.savedRecipes.all(userId) : ["savedRecipes", "anon"],
    queryFn: () => savedRecipesRepository.list(userId!),
    enabled: !!userId,
  });

export const useSaveRecipe = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => savedRecipesRepository.save(userId!, recipeId),
    onSuccess: () =>
      userId && qc.invalidateQueries({ queryKey: queryKeys.savedRecipes.all(userId) }),
  });
};

export const useUnsaveRecipe = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => savedRecipesRepository.remove(userId!, recipeId),
    onSuccess: () =>
      userId && qc.invalidateQueries({ queryKey: queryKeys.savedRecipes.all(userId) }),
  });
};
