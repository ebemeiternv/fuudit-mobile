// Phase 2 — feeds the user's own recorded purchases into the Phase 1 resolver.
//
// Source data is the pantry row itself: price_paid + price_currency (Phase 2)
// combined with the pack fields that already existed (package_quantity /
// package_unit) and purchased_on. Nothing is duplicated and nothing is invented:
// if a price exists but the pack size or unit is insufficient to derive a
// normalized unit price, the row is simply skipped as a price observation — the
// stored data stays intact for later use.

import { buildIdentityKey } from "@/lib/productIdentity";
import { normalizeUnit, type UnitType } from "@/lib/grocery";
import { basisForUnit } from "./units";
import type { PersonalPriceObservation } from "./sources";

/** The subset of a pantry row this mapping needs. */
export type PantryPriceRow = {
  name: string;
  barcode?: string | null;
  price_paid?: number | null;
  price_currency?: string | null;
  package_quantity?: number | null;
  package_unit?: string | null;
  quantity?: number | null;
  unit?: string | null;
  purchased_on?: string | null;
  created_at?: string | null;
};

const isIsoCurrency = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Z]{3}$/.test(v);

/**
 * Convert pantry rows into personal price observations.
 * A row qualifies only when all of these hold:
 *   - price_paid is a positive, finite number
 *   - price_currency is an ISO-style 3-letter code
 *   - a pack size is known (package_quantity/unit preferred, else quantity/unit)
 *   - the pack unit maps onto a price basis (kg / l / piece)
 */
export const pantryRowsToPersonalObservations = (
  rows: PantryPriceRow[],
): PersonalPriceObservation[] => {
  const out: PersonalPriceObservation[] = [];
  for (const row of rows) {
    const paid = typeof row.price_paid === "number" ? row.price_paid : null;
    if (paid == null || !Number.isFinite(paid) || paid <= 0) continue;
    if (!isIsoCurrency(row.price_currency)) continue;

    // Prefer the real pack the price was paid for; fall back to the stocked
    // quantity, which for a freshly added item is normally the same pack.
    const packQuantity =
      typeof row.package_quantity === "number" && row.package_quantity > 0
        ? row.package_quantity
        : typeof row.quantity === "number" && row.quantity > 0
          ? row.quantity
          : null;
    const packUnit: UnitType | null =
      normalizeUnit(row.package_unit ?? null) ?? normalizeUnit(row.unit ?? null);
    if (packQuantity == null) continue;
    // No safe basis (e.g. cups) → no derived unit price. Data is kept in the DB.
    if (!basisForUnit(packUnit)) continue;

    const identityKey = buildIdentityKey({ barcode: row.barcode ?? null, name: row.name });
    if (!identityKey) continue;

    out.push({
      identityKey,
      name: row.name,
      paidAmount: paid,
      currency: row.price_currency,
      packQuantity,
      packUnit,
      observedAt: row.purchased_on ?? row.created_at ?? null,
    });
  }
  return out;
};
