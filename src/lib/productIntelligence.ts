// Product Intelligence service — the single learning layer for Fuudit.
//
// Screens never contain learning logic. They call into this module to:
//   - suggestDefaults()    — build a smart-defaults bundle for a new item
//   - recordAdded()        — after a successful pantry insert
//   - recordUpdated()      — after a successful pantry update
//   - recordConsumed()     — after a confirmed "consumed" transition
//   - recordDiscarded()    — after a confirmed "discarded" transition
//
// All learning is per-user and gated by RLS. Nothing here should ever run
// on a cancelled form, a validation failure, or a failed mutation.

import type { PantryItem } from "@/repositories/pantry";
import {
  productIntelligenceRepository,
  type ProductIntelligence,
} from "@/repositories/productIntelligence";
import {
  buildIdentityKey,
  confidenceTier,
  type ConfidenceTier,
} from "@/lib/productIdentity";
import type { PantryLocation, UnitType } from "@/lib/pantry";

// ---------- Category-level generic fallbacks ----------

const CATEGORY_EXPIRY_DAYS: Record<string, number> = {
  Produce: 5,
  Dairy: 7,
  "Meat & Fish": 3,
  Bakery: 4,
  "Grains & Pasta": 180,
  "Pantry Staples": 365,
  Beverages: 30,
  Frozen: 90,
  Snacks: 60,
  Other: 14,
};

const CATEGORY_LOCATION: Record<string, PantryLocation> = {
  Produce: "fridge",
  Dairy: "fridge",
  "Meat & Fish": "fridge",
  Bakery: "pantry",
  "Grains & Pasta": "pantry",
  "Pantry Staples": "pantry",
  Beverages: "pantry",
  Frozen: "freezer",
  Snacks: "pantry",
  Other: "pantry",
};

export const categoryExpiryOffset = (category: string | null | undefined) =>
  category ? CATEGORY_EXPIRY_DAYS[category] ?? null : null;

export const categoryLocationDefault = (
  category: string | null | undefined,
): PantryLocation | null =>
  category ? CATEGORY_LOCATION[category] ?? null : null;

// ---------- Suggestion bundle ----------

export type SmartDefaults = {
  category: string | null;
  location: PantryLocation | null;
  quantity: number | null;
  unit: UnitType | null;
  package_quantity: number | null;
  package_unit: UnitType | null;
  expiry_offset_days: number | null;
  /** ISO YYYY-MM-DD, computed from today + expiry_offset_days. */
  suggested_expires_on: string | null;
  /** Confidence for the primary preference set. */
  confidence: ConfidenceTier;
  /** Source of the expiry suggestion — used for messaging in the sheet. */
  expiry_source: "learned" | "product" | "category" | "generic";
};

type SuggestionInputs = {
  intelligence: ProductIntelligence | null;
  productHints?: {
    category?: string | null;
    package_quantity?: number | null;
    package_unit?: UnitType | null;
  };
};

const GENERIC_EXPIRY_DAYS = 7;

const addDaysIso = (days: number): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/**
 * Build the smart-default bundle. Priority per product spec:
 *   Category  → user pref > product hint > (none)
 *   Location  → user pref > category default
 *   Quantity  → user pref > product package
 *   Expiry    → user pref (learned offset) > category default > generic 7d
 */
export const buildDefaults = ({
  intelligence,
  productHints,
}: SuggestionInputs): SmartDefaults => {
  const learned = intelligence;
  const category =
    learned?.preferred_category ?? productHints?.category ?? null;
  const location =
    (learned?.preferred_location as PantryLocation | null) ??
    categoryLocationDefault(category);
  const quantity =
    learned?.preferred_quantity != null
      ? Number(learned.preferred_quantity)
      : productHints?.package_quantity ?? null;
  const unit =
    (learned?.preferred_unit as UnitType | null) ??
    (productHints?.package_unit as UnitType | null) ??
    null;
  const package_quantity =
    learned?.preferred_package_quantity != null
      ? Number(learned.preferred_package_quantity)
      : productHints?.package_quantity ?? null;
  const package_unit =
    (learned?.preferred_package_unit as UnitType | null) ??
    (productHints?.package_unit as UnitType | null) ??
    null;

  let expiry_offset_days: number | null = null;
  let expiry_source: SmartDefaults["expiry_source"] = "generic";

  if (learned?.preferred_expiry_offset_days != null) {
    expiry_offset_days = learned.preferred_expiry_offset_days;
    expiry_source = "learned";
  } else if (learned?.avg_consumption_days != null) {
    expiry_offset_days = Math.max(1, Math.round(Number(learned.avg_consumption_days)));
    expiry_source = "product";
  } else if (category) {
    const catDays = categoryExpiryOffset(category);
    if (catDays != null) {
      expiry_offset_days = catDays;
      expiry_source = "category";
    }
  }
  if (expiry_offset_days == null) {
    expiry_offset_days = GENERIC_EXPIRY_DAYS;
    expiry_source = "generic";
  }

  const suggested_expires_on = addDaysIso(expiry_offset_days);
  const confidence = confidenceTier(learned?.observations ?? 0);

  return {
    category,
    location,
    quantity,
    unit,
    package_quantity,
    package_unit,
    expiry_offset_days,
    suggested_expires_on,
    confidence,
    expiry_source,
  };
};

// ---------- Fetch/lookup helpers ----------

export const resolveIdentityKey = (opts: {
  barcode?: string | null;
  name?: string | null;
}) => buildIdentityKey(opts);

export const fetchIntelligence = async (
  userId: string,
  opts: { barcode?: string | null; name?: string | null },
): Promise<ProductIntelligence | null> => {
  const key = resolveIdentityKey(opts);
  if (!key) return null;
  return productIntelligenceRepository.findByKey(userId, key);
};

// ---------- Confirmation recording ----------

/** Weighted running average kept in numeric fields. */
const nextAvg = (
  prevAvg: number | null | undefined,
  prevCount: number,
  sample: number,
): number => {
  const p = prevAvg == null ? 0 : Number(prevAvg);
  if (prevCount <= 0) return sample;
  return (p * prevCount + sample) / (prevCount + 1);
};

const diffDays = (fromIso: string | null, to: Date): number | null => {
  if (!fromIso) return null;
  const [y, m, d] = fromIso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const from = new Date(y, m - 1, d).getTime();
  const target = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((target - from) / 86400000);
};

const dateDiffDays = (from: Date, to: Date): number =>
  Math.round(
    (new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime() -
      new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) /
      86400000,
  );

type AddedInput = {
  userId: string;
  name: string;
  barcode: string | null;
  category: string | null;
  location: PantryLocation | null;
  quantity: number | null;
  unit: UnitType | null;
  package_quantity: number | null;
  package_unit: UnitType | null;
  expires_on: string | null;
  purchased_on: string | null;
  created_at: string;
};

/**
 * Record a successful add. Updates preferences (recency-biased simple
 * overwrite is sufficient at low N; running values become stable once the
 * user has a repeated pattern) and behavioural aggregates.
 */
export const recordAdded = async (input: AddedInput): Promise<void> => {
  const key = buildIdentityKey({ barcode: input.barcode, name: input.name });
  if (!key) return;
  try {
    const prev = await productIntelligenceRepository.findByKey(
      input.userId,
      key,
    );

    const purchaseDate = input.purchased_on
      ? new Date(input.purchased_on)
      : new Date(input.created_at);

    const interval =
      prev?.last_purchased_at
        ? Math.max(
            0,
            dateDiffDays(new Date(prev.last_purchased_at), purchaseDate),
          )
        : null;

    const expiryOffset =
      input.expires_on && input.purchased_on
        ? diffDays(input.purchased_on, new Date(input.expires_on))
        : input.expires_on
          ? diffDays(input.expires_on, new Date()) === null
            ? null
            : Math.max(1, -1 * (diffDays(input.expires_on, new Date()) ?? 0) * -1)
          : null;

    const purchaseCount = (prev?.purchase_count ?? 0) + 1;

    await productIntelligenceRepository.upsert({
      id: prev?.id,
      user_id: input.userId,
      identity_key: key,
      barcode: input.barcode ?? prev?.barcode ?? null,
      display_name: input.name,
      preferred_category: input.category ?? prev?.preferred_category ?? null,
      preferred_location: input.location ?? prev?.preferred_location ?? null,
      preferred_quantity: input.quantity ?? prev?.preferred_quantity ?? null,
      preferred_unit: input.unit ?? prev?.preferred_unit ?? null,
      preferred_package_quantity:
        input.package_quantity ?? prev?.preferred_package_quantity ?? null,
      preferred_package_unit:
        input.package_unit ?? prev?.preferred_package_unit ?? null,
      preferred_expiry_offset_days:
        expiryOffset != null && expiryOffset > 0
          ? Math.round(
              nextAvg(
                prev?.preferred_expiry_offset_days,
                prev?.purchase_count ?? 0,
                expiryOffset,
              ),
            )
          : prev?.preferred_expiry_offset_days ?? null,
      purchase_count: purchaseCount,
      consumption_count: prev?.consumption_count ?? 0,
      discard_count: prev?.discard_count ?? 0,
      avg_purchase_interval_days:
        interval != null && interval > 0
          ? nextAvg(
              prev?.avg_purchase_interval_days,
              Math.max(0, (prev?.purchase_count ?? 1) - 1),
              interval,
            )
          : prev?.avg_purchase_interval_days ?? null,
      avg_consumption_days: prev?.avg_consumption_days ?? null,
      avg_discard_days: prev?.avg_discard_days ?? null,
      last_purchased_at: purchaseDate.toISOString(),
      last_consumed_at: prev?.last_consumed_at ?? null,
      last_discarded_at: prev?.last_discarded_at ?? null,
      observations: (prev?.observations ?? 0) + 1,
    });
  } catch (e) {
    // Learning must never block the user's action.
    console.error("productIntelligence.recordAdded failed", e);
  }
};

type UpdatedInput = Omit<AddedInput, "created_at"> & { itemCreatedAt: string };

/**
 * Record a successful edit — refresh preferences from the (edited) values
 * without incrementing the purchase counter.
 */
export const recordUpdated = async (input: UpdatedInput): Promise<void> => {
  const key = buildIdentityKey({ barcode: input.barcode, name: input.name });
  if (!key) return;
  try {
    const prev = await productIntelligenceRepository.findByKey(
      input.userId,
      key,
    );
    if (!prev) {
      // First observation for this identity — treat as an add so we don't
      // lose the signal.
      await recordAdded({ ...input, created_at: input.itemCreatedAt });
      return;
    }
    await productIntelligenceRepository.update(prev.id, {
      display_name: input.name,
      preferred_category: input.category ?? prev.preferred_category,
      preferred_location: input.location ?? prev.preferred_location,
      preferred_quantity: input.quantity ?? prev.preferred_quantity,
      preferred_unit: input.unit ?? prev.preferred_unit,
      preferred_package_quantity:
        input.package_quantity ?? prev.preferred_package_quantity,
      preferred_package_unit:
        input.package_unit ?? prev.preferred_package_unit,
      barcode: input.barcode ?? prev.barcode,
      observations: prev.observations + 1,
    });
  } catch (e) {
    console.error("productIntelligence.recordUpdated failed", e);
  }
};

type OutcomeInput = {
  userId: string;
  item: Pick<
    PantryItem,
    "name" | "barcode" | "created_at" | "purchased_on"
  >;
  at?: Date;
};

const recordOutcome = async (
  input: OutcomeInput,
  kind: "consumed" | "discarded",
) => {
  const key = buildIdentityKey({
    barcode: input.item.barcode,
    name: input.item.name,
  });
  if (!key) return;
  const eventDate = input.at ?? new Date();
  const anchor = new Date(input.item.purchased_on ?? input.item.created_at);
  const days = Math.max(0, dateDiffDays(anchor, eventDate));
  try {
    const prev = await productIntelligenceRepository.findByKey(
      input.userId,
      key,
    );
    if (!prev) {
      // No prior row — create a minimal one so the outcome isn't lost.
      await productIntelligenceRepository.upsert({
        user_id: input.userId,
        identity_key: key,
        display_name: input.item.name,
        barcode: input.item.barcode ?? null,
        purchase_count: 0,
        consumption_count: kind === "consumed" ? 1 : 0,
        discard_count: kind === "discarded" ? 1 : 0,
        avg_consumption_days: kind === "consumed" ? days : null,
        avg_discard_days: kind === "discarded" ? days : null,
        last_consumed_at:
          kind === "consumed" ? eventDate.toISOString() : null,
        last_discarded_at:
          kind === "discarded" ? eventDate.toISOString() : null,
        observations: 1,
      });
      return;
    }
    await productIntelligenceRepository.update(prev.id, {
      consumption_count:
        prev.consumption_count + (kind === "consumed" ? 1 : 0),
      discard_count: prev.discard_count + (kind === "discarded" ? 1 : 0),
      avg_consumption_days:
        kind === "consumed"
          ? nextAvg(prev.avg_consumption_days, prev.consumption_count, days)
          : prev.avg_consumption_days,
      avg_discard_days:
        kind === "discarded"
          ? nextAvg(prev.avg_discard_days, prev.discard_count, days)
          : prev.avg_discard_days,
      last_consumed_at:
        kind === "consumed" ? eventDate.toISOString() : prev.last_consumed_at,
      last_discarded_at:
        kind === "discarded"
          ? eventDate.toISOString()
          : prev.last_discarded_at,
      observations: prev.observations + 1,
    });
  } catch (e) {
    console.error(`productIntelligence.record${kind} failed`, e);
  }
};

export const recordConsumed = (input: OutcomeInput) =>
  recordOutcome(input, "consumed");
export const recordDiscarded = (input: OutcomeInput) =>
  recordOutcome(input, "discarded");

// ---------- Home-surface hints ----------

export type AmbientHint = {
  intelligenceId: string;
  message: string;
  identityKey: string;
  displayName: string;
};

/**
 * Pick at most one high-confidence hint to surface on Home. We only show
 * hints backed by real repeated behaviour and never expose raw counts.
 */
export const pickAmbientHint = (
  rows: ProductIntelligence[],
): AmbientHint | null => {
  const candidates = rows
    .filter((r) => r.observations >= 5)
    .map((r) => {
      // Prefer whichever behavioural signal is strongest.
      if (r.consumption_count >= 3 && r.avg_consumption_days != null) {
        const d = Math.max(1, Math.round(Number(r.avg_consumption_days)));
        return {
          score: r.consumption_count + r.observations / 10,
          hint: `You usually finish ${r.display_name.toLowerCase()} within ${d} day${d === 1 ? "" : "s"}.`,
          row: r,
        };
      }
      if (r.purchase_count >= 3 && r.avg_purchase_interval_days != null) {
        const d = Math.max(1, Math.round(Number(r.avg_purchase_interval_days)));
        return {
          score: r.purchase_count + r.observations / 10,
          hint: `You often buy ${r.display_name.toLowerCase()} every ${d} day${d === 1 ? "" : "s"}.`,
          row: r,
        };
      }
      return null;
    })
    .filter((v): v is { score: number; hint: string; row: ProductIntelligence } => !!v)
    .sort((a, b) => b.score - a.score);

  const top = candidates[0];
  if (!top) return null;
  return {
    intelligenceId: top.row.id,
    message: top.hint,
    identityKey: top.row.identity_key,
    displayName: top.row.display_name,
  };
};

// ---------- Recently / Frequently added ----------

export type RecentEntry = {
  id: string;
  identityKey: string;
  displayName: string;
  category: string | null;
  lastPurchasedAt: string | null;
  purchaseCount: number;
};

export const recentlyAdded = (
  rows: ProductIntelligence[],
  limit = 6,
): RecentEntry[] =>
  rows
    .filter((r) => r.last_purchased_at)
    .sort(
      (a, b) =>
        new Date(b.last_purchased_at!).getTime() -
        new Date(a.last_purchased_at!).getTime(),
    )
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      identityKey: r.identity_key,
      displayName: r.display_name,
      category: r.preferred_category,
      lastPurchasedAt: r.last_purchased_at,
      purchaseCount: r.purchase_count,
    }));

/**
 * Frequency ranked by purchase_count with a mild recency decay so
 * long-abandoned staples don't dominate.
 */
export const frequentlyAdded = (
  rows: ProductIntelligence[],
  limit = 6,
): RecentEntry[] => {
  const now = Date.now();
  return rows
    .filter((r) => r.purchase_count >= 2)
    .map((r) => {
      const ageDays = r.last_purchased_at
        ? Math.max(1, (now - new Date(r.last_purchased_at).getTime()) / 86400000)
        : 90;
      const decay = 1 / (1 + ageDays / 30); // half-life ~30 days
      return { row: r, score: r.purchase_count * decay };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row: r }) => ({
      id: r.id,
      identityKey: r.identity_key,
      displayName: r.display_name,
      category: r.preferred_category,
      lastPurchasedAt: r.last_purchased_at,
      purchaseCount: r.purchase_count,
    }));
};
