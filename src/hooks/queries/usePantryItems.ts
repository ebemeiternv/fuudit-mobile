import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  pantryRepository,
  type PantryItem,
  type PantryItemInsert,
  type PantryItemUpdate,
} from "@/repositories/pantry";
import {
  pantryEventsRepository,
  type PantryEventType,
} from "@/repositories/pantryEvents";
import type { PantryItemStatus, PantryLocation, UnitType } from "@/lib/pantry";
import {
  recordAdded,
  recordUpdated,
  recordConsumed,
  recordDiscarded,
} from "@/lib/productIntelligence";
import { queryKeys } from "./keys";

export const usePantryItems = (userId: string | undefined) =>
  useQuery({
    queryKey: userId ? queryKeys.pantry.all(userId) : ["pantry", "anon"],
    queryFn: () => pantryRepository.listActive(userId!),
    enabled: !!userId,
  });

export const usePantryEvents = (userId: string | undefined) =>
  useQuery({
    queryKey: userId ? queryKeys.pantry.events(userId) : ["pantry", "events", "anon"],
    queryFn: () => pantryEventsRepository.list(userId!),
    enabled: !!userId,
  });

const invalidate = (qc: ReturnType<typeof useQueryClient>, userId: string) => {
  qc.invalidateQueries({ queryKey: queryKeys.pantry.all(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.pantry.events(userId) });
  qc.invalidateQueries({ queryKey: ["productIntelligence", userId] });
};

const logEvent = async (
  userId: string,
  item: Pick<PantryItem, "id" | "name" | "category" | "quantity" | "unit">,
  event_type: PantryEventType,
  pantry_item_id: string | null = item.id
) => {
  try {
    await pantryEventsRepository.log({
      user_id: userId,
      pantry_item_id,
      event_type,
      item_name: item.name,
      category: item.category ?? null,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
    });
  } catch (e) {
    // Never block user actions on event-log failure.
    console.error("pantry_events log failed", e);
  }
};

export const useCreatePantryItem = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<PantryItemInsert, "user_id">) => {
      const item = await pantryRepository.create({ ...input, user_id: userId! });
      await logEvent(userId!, item, "added");
      // Feed the learning layer with the confirmed values.
      await recordAdded({
        userId: userId!,
        name: item.name,
        barcode: item.barcode ?? null,
        category: item.category ?? null,
        location: item.location as PantryLocation,
        quantity: item.quantity != null ? Number(item.quantity) : null,
        unit: (item.unit as UnitType | null) ?? null,
        package_quantity:
          item.package_quantity != null ? Number(item.package_quantity) : null,
        package_unit: (item.package_unit as UnitType | null) ?? null,
        expires_on: item.expires_on,
        purchased_on: item.purchased_on,
        created_at: item.created_at,
      });
      return item;
    },
    onSuccess: () => userId && invalidate(qc, userId),
  });
};

export const useUpdatePantryItem = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PantryItemUpdate }) => {
      const item = await pantryRepository.update(id, patch);
      await recordUpdated({
        userId: userId!,
        name: item.name,
        barcode: item.barcode ?? null,
        category: item.category ?? null,
        location: item.location as PantryLocation,
        quantity: item.quantity != null ? Number(item.quantity) : null,
        unit: (item.unit as UnitType | null) ?? null,
        package_quantity:
          item.package_quantity != null ? Number(item.package_quantity) : null,
        package_unit: (item.package_unit as UnitType | null) ?? null,
        expires_on: item.expires_on,
        purchased_on: item.purchased_on,
        itemCreatedAt: item.created_at,
      });
      return item;
    },
    onSuccess: () => userId && invalidate(qc, userId),
  });
};

export const useDeletePantryItem = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: PantryItem) => {
      await pantryRepository.remove(item.id);
      // pantry_item_id set to null since the row is gone.
      await logEvent(userId!, item, "deleted", null);
    },
    onSuccess: () => userId && invalidate(qc, userId),
  });
};

export const useSetPantryItemStatus = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      item,
      status,
    }: {
      item: PantryItem;
      status: PantryItemStatus;
    }) => {
      // Idempotency: only log an event when status actually transitions.
      const willTransition = item.status !== status;
      const updated = await pantryRepository.setStatus(item.id, status);
      if (willTransition && (status === "consumed" || status === "discarded")) {
        await logEvent(userId!, updated, status);
        const outcomeInput = {
          userId: userId!,
          item: {
            name: updated.name,
            barcode: updated.barcode ?? null,
            created_at: updated.created_at,
            purchased_on: updated.purchased_on,
          },
        };
        if (status === "consumed") await recordConsumed(outcomeInput);
        else await recordDiscarded(outcomeInput);
      }
      return updated;
    },
    onSuccess: () => userId && invalidate(qc, userId),
  });
};
