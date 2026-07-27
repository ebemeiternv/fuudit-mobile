import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  pantryRepository,
  type PantryItemInsert,
  type PantryItemUpdate,
} from "@/repositories/pantry";
import type { PantryItemStatus } from "@/lib/pantry";
import { queryKeys } from "./keys";

export const usePantryItems = (userId: string | undefined) =>
  useQuery({
    queryKey: userId ? queryKeys.pantry.all(userId) : ["pantry", "anon"],
    queryFn: () => pantryRepository.listActive(userId!),
    enabled: !!userId,
  });

const invalidate = (qc: ReturnType<typeof useQueryClient>, userId: string) =>
  qc.invalidateQueries({ queryKey: queryKeys.pantry.all(userId) });

export const useCreatePantryItem = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<PantryItemInsert, "user_id">) =>
      pantryRepository.create({ ...input, user_id: userId! }),
    onSuccess: () => userId && invalidate(qc, userId),
  });
};

export const useUpdatePantryItem = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PantryItemUpdate }) =>
      pantryRepository.update(id, patch),
    onSuccess: () => userId && invalidate(qc, userId),
  });
};

export const useDeletePantryItem = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pantryRepository.remove(id),
    onSuccess: () => userId && invalidate(qc, userId),
  });
};

export const useSetPantryItemStatus = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PantryItemStatus }) =>
      pantryRepository.setStatus(id, status),
    onSuccess: () => userId && invalidate(qc, userId),
  });
};
