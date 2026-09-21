// Phase 1 — normalization of quantities onto a price basis.
//
// Reuses the existing unit engine in lib/grocery.ts (normalizeUnit,
// convertQuantity, unitFamily) rather than re-implementing conversions.

import { convertQuantity, unitFamily, type UnitType } from "@/lib/grocery";
import type { UnitBasis } from "./types";

/** The price basis a given unit belongs to, when resolvable. */
export const basisForUnit = (unit: UnitType | null): UnitBasis | null => {
  if (!unit) return null;
  switch (unitFamily(unit)) {
    case "mass":
      return "kg";
    case "volume":
      return "l";
    case "piece":
      return "piece";
    default:
      // tbsp / tsp / cup have no density-free conversion to mass or volume.
      return null;
  }
};

/**
 * Express `quantity unit` in the given price basis. Returns null when the
 * conversion would require an assumption we refuse to make (e.g. cups → kg).
 */
export const toBasisQuantity = (
  quantity: number,
  unit: UnitType | null,
  basis: UnitBasis,
): number | null => {
  if (!Number.isFinite(quantity)) return null;
  if (unit == null) {
    // No unit at all: treat as countable only for the piece basis.
    return basis === "piece" ? quantity : null;
  }
  const target: UnitType = basis === "kg" ? "kg" : basis === "l" ? "l" : "piece";
  if (unit === target) return quantity;
  return convertQuantity(quantity, unit, target);
};

/** Inverse: how much of `unit` equals one basis unit. Null when unsafe. */
export const fromBasisQuantity = (
  basisQuantity: number,
  basis: UnitBasis,
  unit: UnitType | null,
): number | null => {
  const from: UnitType = basis === "kg" ? "kg" : basis === "l" ? "l" : "piece";
  if (unit == null) return basis === "piece" ? basisQuantity : null;
  return convertQuantity(basisQuantity, from, unit);
};

/** Add b into a when safely convertible; null means "cannot combine". */
export const addQuantities = (
  a: { quantity: number; unit: UnitType | null },
  b: { quantity: number; unit: UnitType | null },
): { quantity: number; unit: UnitType | null } | null => {
  const converted = convertQuantity(b.quantity, b.unit, a.unit);
  if (converted == null) return null;
  return { quantity: a.quantity + converted, unit: a.unit };
};
