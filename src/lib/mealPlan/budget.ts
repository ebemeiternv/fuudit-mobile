// Phase 4 — budget envelope + honest budget status.
//
// Two rules drive everything here:
//   * the deterministic simulation owns the numbers, never the AI
//   * an unpriced ingredient is never treated as zero, so a plan with unpriced
//     items can only ever be an INCOMPLETE estimate — never proof of a fit

import { parseLocalIsoDate, todayLocalIso } from "@/lib/dates";
import type { BudgetPeriod } from "@/lib/planningDefaults";
import type { SimulationResult } from "./inventory";

export type BudgetSetting = {
  amount: number;
  currency: string;
  period: BudgetPeriod;
  /** Only meaningful for the custom period. */
  customDays: number | null;
  bufferPercent: number;
};

export type PlanningBudget = {
  /** Spendable amount for the generated date range, after the buffer. */
  amount: number;
  currency: string;
  /** Days the plan actually covers. */
  planDays: number;
  /** Days the underlying budget period still has left. */
  periodDaysRemaining: number;
  bufferPercent: number;
  period: BudgetPeriod;
  /** Short plain-language explanation of how the amount was derived. */
  note: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const dayDiff = (fromIso: string, toIso: string): number =>
  Math.round(
    (parseLocalIsoDate(toIso).getTime() - parseLocalIsoDate(fromIso).getTime()) / 86400000,
  );

const endOfMonthIso = (iso: string): string => {
  const d = parseLocalIsoDate(iso);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const m = String(last.getMonth() + 1).padStart(2, "0");
  return `${last.getFullYear()}-${m}-${String(last.getDate()).padStart(2, "0")}`;
};

/**
 * Turn a stored budget default (per day / week / month / custom) into the
 * amount available for exactly the dates being planned.
 *
 * A monthly budget is a real envelope: it is scaled by the days that genuinely
 * remain in the month, not by a flat four weeks.
 */
export const derivePlanningBudget = (
  setting: BudgetSetting,
  range: { days: string[]; todayIso?: string },
): PlanningBudget | null => {
  const days = [...range.days].sort();
  if (!days.length || !(setting.amount > 0)) return null;
  const today = range.todayIso ?? todayLocalIso();
  const planDays = days.length;
  const start = days[0] < today ? today : days[0];
  const buffer = Math.min(50, Math.max(0, setting.bufferPercent)) / 100;

  let periodDays: number;
  let note: string;
  switch (setting.period) {
    case "daily":
      periodDays = 1;
      note = `${planDays} day${planDays === 1 ? "" : "s"} of your daily budget`;
      break;
    case "monthly": {
      periodDays = Math.max(1, dayDiff(start, endOfMonthIso(start)) + 1);
      note = `share of this month's budget for ${planDays} of ${periodDays} days left`;
      break;
    }
    case "custom":
      periodDays = Math.max(1, setting.customDays ?? planDays);
      note = `${planDays} of ${periodDays} days in your budget period`;
      break;
    case "weekly":
    default:
      periodDays = 7;
      note = `${planDays} of 7 days of your weekly budget`;
      break;
  }

  const share = Math.min(1, planDays / periodDays);
  const amount = round2(setting.amount * share * (1 - buffer));
  if (!(amount > 0)) return null;

  return {
    amount,
    currency: setting.currency,
    planDays,
    periodDaysRemaining: periodDays,
    bufferPercent: setting.bufferPercent,
    period: setting.period,
    note: buffer > 0 ? `${note}, minus a ${setting.bufferPercent}% buffer` : note,
  };
};

/* ---------------------------------------------------------- budget status */

export type BudgetStatus =
  | { kind: "no_budget" }
  | {
      /** Every required purchase has a usable estimate — a real comparison. */
      kind: "complete";
      budget: number;
      currency: string;
      spend: number;
      remaining: number;
      withinBudget: boolean;
      overBy: number;
      confidence: number;
    }
  | {
      /** Some purchases are unpriced — a planning signal, never a guarantee. */
      kind: "incomplete";
      budget: number;
      currency: string;
      spend: number;
      /** Headroom against the priced part only. */
      knownPriceHeadroom: number;
      unpricedCount: number;
      /** True only when the priced part alone already exceeds the budget. */
      exceedsOnKnownPrices: boolean;
      confidence: number;
    };

export const evaluateBudget = (
  sim: SimulationResult,
  budget: PlanningBudget | null,
): BudgetStatus => {
  if (!budget) return { kind: "no_budget" };
  const spend = sim.summary.estimatedPurchaseSpend;
  const unpricedCount = sim.summary.unpricedItemCount;
  const confidence = sim.summary.confidence;

  if (unpricedCount > 0) {
    return {
      kind: "incomplete",
      budget: budget.amount,
      currency: budget.currency,
      spend,
      knownPriceHeadroom: round2(budget.amount - spend),
      unpricedCount,
      exceedsOnKnownPrices: spend > budget.amount,
      confidence,
    };
  }
  const remaining = round2(budget.amount - spend);
  return {
    kind: "complete",
    budget: budget.amount,
    currency: budget.currency,
    spend,
    remaining,
    withinBudget: remaining >= 0,
    overBy: remaining < 0 ? round2(-remaining) : 0,
    confidence,
  };
};

/** True when optimisation should keep trying to bring spend down. */
export const needsCheaperPlan = (status: BudgetStatus): boolean =>
  (status.kind === "complete" && !status.withinBudget) ||
  (status.kind === "incomplete" && status.exceedsOnKnownPrices);
