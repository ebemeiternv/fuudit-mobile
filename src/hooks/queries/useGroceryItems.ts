import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  groceryRepository,
  type GroceryItemInsert,
  type GroceryItemUpdate,
} from "@/repositories/grocery";
import { queryKeys } from "./keys";

export const useGroceryItems = (userId: string | undefined) =>
  useQuery({
    queryKey: userId ? queryKeys.grocery.all(userId) : ["grocery", "anon"],
    queryFn: () => groceryRepository.list(userId!),
    enabled: !!userId,
  });

const invalidate = (qc: ReturnType<typeof useQueryClient>, userId: string) =>
  qc.invalidateQueries({ queryKey: queryKeys.grocery.all(userId) });

export const useCreateGroceryItem = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<GroceryItemInsert, "user_id">) =>
      groceryRepository.create({ ...input, user_id: userId! }),
    onSuccess: () => userId && invalidate(qc, userId),
  });
};

export const useUpdateGroceryItem = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: GroceryItemUpdate }) =>
      groceryRepository.update(id, patch),
    onSuccess: () => userId && invalidate(qc, userId),
  });
};

export const useDeleteGroceryItem = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groceryRepository.remove(id),
    onSuccess: () => userId && invalidate(qc, userId),
  });
};
