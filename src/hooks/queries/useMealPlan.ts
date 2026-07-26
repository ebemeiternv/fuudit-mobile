import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mealPlanRepository,
  type MealPlanEntryInsert,
  type MealPlanEntryUpdate,
} from "@/repositories/mealPlan";
import { queryKeys } from "./keys";

export const useMealPlan = (userId: string | undefined, from: string, to: string) =>
  useQuery({
    queryKey: userId ? queryKeys.mealPlan.range(userId, from, to) : ["mealPlan", "anon"],
    queryFn: () => mealPlanRepository.listRange(userId!, from, to),
    enabled: !!userId,
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
