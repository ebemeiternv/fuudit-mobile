import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  groceryRepository,
  type GroceryItem,
  type GroceryItemInsert,
  type GroceryItemUpdate,
} from "@/repositories/grocery";
import { queryKeys } from "./keys";

export const useGroceryItems = (userId: string | undefined) =>
  useQuery({
    queryKey: userId ? queryKeys.grocery.all(userId) : ["grocery", "anon"],
    queryFn: () => groceryRepository.list(userId!),
    enabled: !!userId,
    staleTime: 15 * 1000,
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

/**
 * Toggle the purchased state with an optimistic update — a checkbox tap is the
 * hottest interaction on this screen and blocking on network latency feels bad.
 * Rolls back on error and re-invalidates on settle to reconcile.
 */
export const useToggleGroceryPurchased = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      groceryRepository.update(id, { checked }),
    onMutate: async ({ id, checked }) => {
      if (!userId) return {};
      const key = queryKeys.grocery.all(userId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<GroceryItem[]>(key);
      if (prev) {
        qc.setQueryData<GroceryItem[]>(
          key,
          prev.map((i) => (i.id === id ? { ...i, checked } : i)),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (!userId || !ctx?.prev) return;
      qc.setQueryData(queryKeys.grocery.all(userId), ctx.prev);
    },
    onSettled: () => userId && invalidate(qc, userId),
  });
};

export const useClearPurchasedGrocery = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => groceryRepository.clearPurchased(userId!),
    onSuccess: () => userId && invalidate(qc, userId),
  });
};

export const useBulkAddGrocery = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Omit<GroceryItemInsert, "user_id">[]) =>
      groceryRepository.bulkInsert(userId!, rows),
    onSuccess: () => userId && invalidate(qc, userId),
  });
};
