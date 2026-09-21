// Phase 1 — price resolver.
//
// Asks each source in priority order and returns the first usable answer.
// Priority: personal > local_estimate > external_estimate > category_fallback.
// A source that cannot answer returns null and we fall through; when every
// source declines, the line is reported as unpriced rather than guessed.

import { PRICE_SOURCE_PRIORITY } from "./types";
import type {
  PriceEstimate,
  PriceQuery,
  PriceSourceProvider,
} from "./types";

export type PriceResolver = {
  resolve: (query: PriceQuery) => PriceEstimate | null;
  /** All candidates, highest priority first. Useful for debugging/UI detail. */
  candidates: (query: PriceQuery) => PriceEstimate[];
};

export const createPriceResolver = (
  providers: PriceSourceProvider[],
): PriceResolver => {
  const ordered = PRICE_SOURCE_PRIORITY.map((source) =>
    providers.filter((p) => p.source === source),
  ).flat();

  const candidates = (query: PriceQuery): PriceEstimate[] => {
    const out: PriceEstimate[] = [];
    for (const provider of ordered) {
      let candidate = null;
      try {
        candidate = provider.lookup(query);
      } catch {
        candidate = null; // a broken source must never break a plan
      }
      if (!candidate) continue;
      if (!(candidate.pricePerBasis > 0)) continue;
      if (candidate.currency !== query.currency) continue;
      out.push({
        ...candidate,
        identityKey: query.identityKey,
        name: candidate.name ?? query.name,
      });
    }
    return out;
  };

  return {
    candidates,
    resolve: (query) => candidates(query)[0] ?? null,
  };
};
