// Phase 1 — how much we trust a price estimate.
//
// Confidence is a 0–1 number used for two things only: choosing between
// candidates from the same source tier, and telling the user how rough the
// total is. It is never presented as a percentage of accuracy.

import type { PriceSource } from "./types";

/** Base trust per source. Personal data beats any external estimate. */
export const SOURCE_BASE_CONFIDENCE: Record<PriceSource, number> = {
  personal: 0.85,
  local_estimate: 0.7,
  external_estimate: 0.4,
  category_fallback: 0.25,
};

/** Personal prices gain trust with repeated observations and lose it with age. */
export const personalConfidence = (opts: {
  observations: number;
  ageDays: number | null;
}): number => {
  const base = SOURCE_BASE_CONFIDENCE.personal;
  const obs = Math.max(0, opts.observations);
  // 1 observation → 0.6 of base, 5+ → full base.
  const obsFactor = obs <= 0 ? 0 : Math.min(1, 0.6 + (obs - 1) * 0.1);
  // Prices older than a year decay toward half trust.
  const age = opts.ageDays ?? 0;
  const ageFactor = age <= 30 ? 1 : Math.max(0.5, 1 - (age - 30) / 730);
  return round2(base * obsFactor * ageFactor);
};

/** Penalties applied by the engine when an estimate required a compromise. */
export const CONFIDENCE_PENALTY = {
  /** No known pack size — purchase cost is a proportional estimate. */
  proportionalPack: 0.8,
  /** Quantity or unit could not be normalized onto the price basis. */
  unitMismatch: 0.5,
  /** Recipe gave no amount for the ingredient. */
  missingAmount: 0.4,
} as const;

export const applyPenalty = (confidence: number, factor: number): number =>
  round2(Math.max(0, Math.min(1, confidence * factor)));

/** Cost-weighted mean, so a big uncertain line matters more than a small one. */
export const weightedConfidence = (
  entries: { confidence: number; weight: number }[],
): number => {
  const usable = entries.filter((e) => e.weight > 0);
  if (!usable.length) {
    if (!entries.length) return 0;
    const mean = entries.reduce((s, e) => s + e.confidence, 0) / entries.length;
    return round2(mean);
  }
  const totalWeight = usable.reduce((s, e) => s + e.weight, 0);
  const sum = usable.reduce((s, e) => s + e.confidence * e.weight, 0);
  return round2(sum / totalWeight);
};

/** Coarse label for the UI. Mirrors the pantry intelligence tiers. */
export type ConfidenceLabel = "unknown" | "rough" | "fair" | "good";

export const confidenceLabel = (confidence: number): ConfidenceLabel => {
  if (confidence <= 0) return "unknown";
  if (confidence < 0.35) return "rough";
  if (confidence < 0.65) return "fair";
  return "good";
};

const round2 = (n: number) => Math.round(n * 100) / 100;
