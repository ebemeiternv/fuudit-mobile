import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  productIntelligenceRepository,
  type ProductIntelligence,
} from "@/repositories/productIntelligence";
import {
  fetchIntelligence,
  buildDefaults,
  type SmartDefaults,
} from "@/lib/productIntelligence";
import { buildIdentityKey } from "@/lib/productIdentity";
import type { UnitType } from "@/lib/pantry";

const key = (userId: string) => ["productIntelligence", userId] as const;

export const useProductIntelligence = (userId: string | undefined) =>
  useQuery({
    queryKey: userId ? key(userId) : ["productIntelligence", "anon"],
    queryFn: () => productIntelligenceRepository.listForUser(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });

export const invalidateProductIntelligence = (
  qc: ReturnType<typeof useQueryClient>,
  userId: string,
) => qc.invalidateQueries({ queryKey: key(userId) });

/**
 * Compute smart defaults for a single lookup. Falls back to category/
 * generic defaults when nothing has been learned yet.
 */
export const useSmartDefaults = (
  userId: string | undefined,
  lookup: {
    barcode?: string | null;
    name?: string | null;
    productHints?: {
      category?: string | null;
      package_quantity?: number | null;
      package_unit?: UnitType | null;
    };
  },
  enabled = true,
) => {
  const identityKey = buildIdentityKey({
    barcode: lookup.barcode ?? null,
    name: lookup.name ?? null,
  });
  return useQuery({
    queryKey: [
      "productIntelligence",
      "defaults",
      userId ?? "anon",
      identityKey ?? "none",
      lookup.productHints ?? null,
    ],
    queryFn: async (): Promise<SmartDefaults> => {
      let intelligence: ProductIntelligence | null = null;
      if (userId && identityKey) {
        intelligence = await fetchIntelligence(userId, {
          barcode: lookup.barcode ?? null,
          name: lookup.name ?? null,
        });
      }
      return buildDefaults({
        intelligence,
        productHints: lookup.productHints,
      });
    },
    enabled: !!userId && enabled,
    staleTime: 30_000,
  });
};
