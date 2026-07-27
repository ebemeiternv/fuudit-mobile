import { useMemo } from "react";
import { usePantryEvents } from "@/hooks/queries/usePantryItems";
import { usePantryItems } from "@/hooks/queries/usePantryItems";

/**
 * Real, transparent MVP metrics computed from pantry_events.
 *
 * - consumed: items marked consumed
 * - discarded: items marked discarded
 * - active: current active pantry items
 * - consumedPct: share of consumed vs (consumed + discarded), only when there's enough data
 * - consumedThisMonth / discardedThisMonth: same but scoped to the current calendar month
 */
export const usePantryImpact = (userId: string | undefined) => {
  const { data: events = [], isLoading: eventsLoading } = usePantryEvents(userId);
  const { data: active = [], isLoading: pantryLoading } = usePantryItems(userId);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let consumed = 0;
    let discarded = 0;
    let consumedThisMonth = 0;
    let discardedThisMonth = 0;

    for (const e of events) {
      if (e.event_type !== "consumed" && e.event_type !== "discarded") continue;
      const t = new Date(e.occurred_at).getTime();
      const inMonth = t >= monthStart;
      if (e.event_type === "consumed") {
        consumed++;
        if (inMonth) consumedThisMonth++;
      } else {
        discarded++;
        if (inMonth) discardedThisMonth++;
      }
    }

    const decided = consumed + decidedZeroGuard(discarded);
    const enoughData = consumed + discarded >= 3;
    const consumedPct = enoughData ? Math.round((consumed / (consumed + discarded)) * 100) : null;

    const decidedThisMonth = consumedThisMonth + discardedThisMonth;
    const enoughThisMonth = decidedThisMonth >= 3;
    const consumedPctThisMonth = enoughThisMonth
      ? Math.round((consumedThisMonth / decidedThisMonth) * 100)
      : null;

    return {
      consumed,
      discarded,
      active: active.length,
      consumedPct,
      consumedThisMonth,
      discardedThisMonth,
      consumedPctThisMonth,
      enoughData,
      _decided: decided, // keeps ts happy for the guard fn
    };
  }, [events, active]);

  return {
    ...stats,
    isLoading: eventsLoading || pantryLoading,
  };
};

// Tiny helper to keep the discard count referenced even when zero, without changing math.
function decidedZeroGuard(n: number) {
  return n;
}
