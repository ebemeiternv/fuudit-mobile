// Phase 1 — the concrete price sources behind the resolver.
//
// Each source is a pure function over data handed in by the caller. Nothing
// here reads the database: Phase 2+ will fetch observations and pass them in,
// which keeps this layer testable and reusable from an edge function.

import { buildIdentityKey } from "@/lib/productIdentity";
import { inferCategory } from "@/lib/grocery";
import { basisForUnit, toBasisQuantity } from "./units";
import { personalConfidence, SOURCE_BASE_CONFIDENCE } from "./confidence";
import { REFERENCE_CURRENCY, referenceFor } from "./referencePrices";
import type {
  PriceCandidate,
  PriceQuery,
  PriceSourceProvider,
  UnitBasis,
} from "./types";
import type { UnitType } from "@/lib/grocery";

/* ------------------------------------------------------------------ personal */

/**
 * One recorded purchase by the user. Phase 1 defines the shape; the data will
 * come from pantry purchase prices once that field exists (Phase 2 proposal).
 */
export type PersonalPriceObservation = {
  identityKey: string;
  name: string;
  /** What was paid in total for the pack. */
  paidAmount: number;
  currency: string;
  /** Size of the pack that was paid for. */
  packQuantity: number;
  packUnit: UnitType | null;
  observedAt?: string | null;
};

export const createPersonalPriceSource = (
  observations: PersonalPriceObservation[],
  now: Date = new Date(),
): PriceSourceProvider => {
  const byKey = new Map<string, PersonalPriceObservation[]>();
  for (const o of observations) {
    if (!o.identityKey || !(o.paidAmount > 0) || !(o.packQuantity > 0)) continue;
    const list = byKey.get(o.identityKey) ?? [];
    list.push(o);
    byKey.set(o.identityKey, list);
  }

  return {
    source: "personal",
    lookup: (q: PriceQuery): PriceCandidate | null => {
      const list = byKey.get(q.identityKey)?.filter((o) => o.currency === q.currency);
      if (!list?.length) return null;

      // Prefer a basis that matches what the plan needs; fall back to any.
      const wanted = basisForUnit(q.unit);
      const priced = list
        .map((o) => {
          const basis = basisForUnit(o.packUnit);
          if (!basis) return null;
          const packInBasis = toBasisQuantity(o.packQuantity, o.packUnit, basis);
          if (packInBasis == null || packInBasis <= 0) return null;
          return {
            basis,
            pricePerBasis: o.paidAmount / packInBasis,
            observedAt: o.observedAt ?? null,
            packSize:
              o.packUnit != null
                ? { quantity: o.packQuantity, unit: o.packUnit }
                : null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);
      if (!priced.length) return null;

      const pool = wanted
        ? priced.filter((p) => p.basis === wanted).length
          ? priced.filter((p) => p.basis === wanted)
          : priced
        : priced;

      // Median price on the chosen basis — resistant to one odd receipt.
      const basis: UnitBasis = pool[0].basis;
      const sameBasis = pool.filter((p) => p.basis === basis);
      const values = sameBasis.map((p) => p.pricePerBasis).sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      const pricePerBasis =
        values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

      const newest = sameBasis
        .map((p) => p.observedAt)
        .filter((d): d is string => !!d)
        .sort()
        .pop() ?? null;
      const ageDays = newest
        ? Math.max(0, Math.round((now.getTime() - new Date(newest).getTime()) / 86400000))
        : null;

      // Most recent known pack size wins — real, never invented.
      const packSize =
        sameBasis
          .slice()
          .sort((a, b) => String(a.observedAt ?? "").localeCompare(String(b.observedAt ?? "")))
          .map((p) => p.packSize)
          .filter(Boolean)
          .pop() ?? null;

      return {
        pricePerBasis,
        currency: q.currency,
        basis,
        source: "personal",
        confidence: personalConfidence({ observations: sameBasis.length, ageDays }),
        observedAt: newest,
        packSize,
      };
    },
  };
};

/* ------------------------------------------------ local estimate (future slot) */

/**
 * Regional / retailer pricing. Intentionally EMPTY in the MVP — the slot keeps
 * the resolution order stable so real local data (or later supermarket and
 * receipt sources) can be added without changing any caller. We never ship
 * invented local prices.
 */
export const createLocalEstimateSource = (): PriceSourceProvider => ({
  source: "local_estimate",
  lookup: () => null,
});

/* -------------------------------------------------------- external estimate */

/**
 * Spoonacular-derived estimate. Treated strictly as an external ranking /
 * magnitude signal, NOT as accurate local grocery pricing: it stays flagged
 * as `external_estimate` with low confidence, and is only used in the
 * requested currency when the caller supplies an explicit rate.
 */
export type ExternalPriceObservation = {
  identityKey: string;
  name: string;
  /** Price per basis unit in the external source's own currency. */
  pricePerBasis: number;
  currency: string;
  basis: UnitBasis;
  observedAt?: string | null;
};

export const createExternalEstimateSource = (
  observations: ExternalPriceObservation[],
  opts: {
    /** Explicit, caller-owned conversion, e.g. { from: "USD", to: "SEK", rate: 10.5 }. */
    conversion?: { from: string; to: string; rate: number } | null;
  } = {},
): PriceSourceProvider => {
  const byKey = new Map<string, ExternalPriceObservation>();
  for (const o of observations) {
    if (!o.identityKey || !(o.pricePerBasis > 0)) continue;
    byKey.set(o.identityKey, o);
  }
  const conv = opts.conversion ?? null;

  return {
    source: "external_estimate",
    lookup: (q: PriceQuery): PriceCandidate | null => {
      const o = byKey.get(q.identityKey);
      if (!o) return null;
      let price = o.pricePerBasis;
      if (o.currency !== q.currency) {
        if (!conv || conv.from !== o.currency || conv.to !== q.currency || !(conv.rate > 0)) {
          // Refuse to guess an exchange rate.
          return null;
        }
        price = price * conv.rate;
      }
      return {
        pricePerBasis: price,
        currency: q.currency,
        basis: o.basis,
        source: "external_estimate",
        confidence: SOURCE_BASE_CONFIDENCE.external_estimate,
        observedAt: o.observedAt ?? null,
        packSize: null,
      };
    },
  };
};

/* --------------------------------------------------------- category fallback */

export const createCategoryFallbackSource = (
  opts: { currency?: string; conversionFromReference?: number | null } = {},
): PriceSourceProvider => {
  const currency = opts.currency ?? REFERENCE_CURRENCY;
  const rate = opts.conversionFromReference ?? null;
  return {
    source: "category_fallback",
    lookup: (q: PriceQuery): PriceCandidate | null => {
      const category = q.category ?? inferCategory(q.name);
      const wantPiece = basisForUnit(q.unit) === "piece" || q.unit == null;
      const ref = referenceFor(category, wantPiece);
      if (!ref) return null;

      let price = ref.pricePerBasis;
      if (q.currency !== currency) {
        if (!(rate && rate > 0)) return null;
        price = price * rate;
      }
      return {
        pricePerBasis: price,
        currency: q.currency,
        basis: ref.basis,
        source: "category_fallback",
        confidence: SOURCE_BASE_CONFIDENCE.category_fallback,
        observedAt: null,
        packSize: null,
      };
    },
  };
};

/** Convenience: derive an identity key the same way the pantry layer does. */
export const ingredientIdentityKey = (name: string): string =>
  buildIdentityKey({ name }) ?? `name:${name.trim().toLowerCase()}`;
