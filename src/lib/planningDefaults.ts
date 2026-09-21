// Phase 2 — planning defaults (profiles.planning_defaults, jsonb).
//
// These values are DEFAULTS for future planning sessions, never permanent
// constraints: a generated plan may override any of them for one session.
// Household size, dietary preferences and allergies deliberately stay in their
// own profile columns — they are not duplicated here.
//
// The parser is intentionally forgiving: null, missing keys, older versions and
// malformed values must never break the Profile screen. Anything unrecognised
// is preserved untouched when saving, so a newer client's keys survive a save
// from an older one.

export const PLANNING_DEFAULTS_VERSION = 1;

export type BudgetPeriod = "daily" | "weekly" | "monthly" | "custom";
export const BUDGET_PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: "daily", label: "Per day" },
  { value: "weekly", label: "Per week" },
  { value: "monthly", label: "Per month" },
  { value: "custom", label: "Custom" },
];

/** ISO-style codes only — never symbols or display strings. */
export const SUPPORTED_CURRENCIES = ["SEK", "EUR", "NOK", "DKK", "GBP", "USD"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: CurrencyCode = "SEK";

export type PlanMeal = "breakfast" | "lunch" | "dinner" | "snack";
export const PLAN_MEALS: { value: PlanMeal; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

export type NutritionStyle = "balanced" | "high_protein" | "family_friendly" | "low_carb" | "budget_basics";
export const NUTRITION_STYLES: { value: NutritionStyle; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "high_protein", label: "High protein" },
  { value: "family_friendly", label: "Family friendly" },
  { value: "low_carb", label: "Low carb" },
  { value: "budget_basics", label: "Budget basics" },
];

export type PlanningDefaults = {
  version: number;
  budget: {
    /** Null means "no default budget" — planning stays unbudgeted. */
    amount: number | null;
    currency: CurrencyCode;
    period: BudgetPeriod;
    /** Only meaningful when period === "custom". */
    customDays: number | null;
    /** Safety margin kept aside, 0–50 %. */
    bufferPercent: number;
  };
  meals: PlanMeal[];
  /** Usual upper bound on cooking time, in minutes. Null = no preference. */
  maxCookingMinutes: number | null;
  prioritizePantry: boolean;
  prioritizeExpiring: boolean;
  nutritionStyles: NutritionStyle[];
};

export const EMPTY_PLANNING_DEFAULTS: PlanningDefaults = {
  version: PLANNING_DEFAULTS_VERSION,
  budget: {
    amount: null,
    currency: DEFAULT_CURRENCY,
    period: "weekly",
    customDays: null,
    bufferPercent: 10,
  },
  meals: ["lunch", "dinner"],
  maxCookingMinutes: null,
  prioritizePantry: true,
  prioritizeExpiring: true,
  nutritionStyles: [],
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;

const pickList = <T extends string>(v: unknown, allowed: readonly T[]): T[] | null => {
  if (!Array.isArray(v)) return null;
  const out = v.filter((x): x is T => typeof x === "string" && (allowed as readonly string[]).includes(x));
  return out.length ? Array.from(new Set(out)) : [];
};

export const isCurrencyCode = (v: unknown): v is CurrencyCode =>
  typeof v === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(v);

/** Normalize anything (including null/garbage) into usable defaults. */
export const parsePlanningDefaults = (raw: unknown): PlanningDefaults => {
  if (!isRecord(raw)) return { ...EMPTY_PLANNING_DEFAULTS };
  const base = EMPTY_PLANNING_DEFAULTS;
  const rawBudget = isRecord(raw.budget) ? raw.budget : {};

  const amount = num(rawBudget.amount);
  const days = num(rawBudget.customDays);
  const buffer = num(rawBudget.bufferPercent);
  const cooking = num(raw.maxCookingMinutes);
  const meals = pickList(raw.meals, PLAN_MEALS.map((m) => m.value));
  const styles = pickList(raw.nutritionStyles, NUTRITION_STYLES.map((s) => s.value));

  const period = BUDGET_PERIODS.some((p) => p.value === rawBudget.period)
    ? (rawBudget.period as BudgetPeriod)
    : base.budget.period;

  return {
    version: num(raw.version) ?? PLANNING_DEFAULTS_VERSION,
    budget: {
      amount: amount != null && amount > 0 ? amount : null,
      currency: isCurrencyCode(rawBudget.currency) ? rawBudget.currency : base.budget.currency,
      period,
      customDays: days != null && days >= 1 ? Math.round(clamp(days, 1, 365)) : null,
      bufferPercent: buffer != null ? Math.round(clamp(buffer, 0, 50)) : base.budget.bufferPercent,
    },
    meals: meals ?? base.meals,
    maxCookingMinutes:
      cooking != null && cooking > 0 ? Math.round(clamp(cooking, 5, 600)) : null,
    prioritizePantry: bool(raw.prioritizePantry, base.prioritizePantry),
    prioritizeExpiring: bool(raw.prioritizeExpiring, base.prioritizeExpiring),
    nutritionStyles: styles ?? base.nutritionStyles,
  };
};

/**
 * Merge a validated patch back onto the stored object, preserving any keys we
 * don't know about (future versions, other clients) so saving one setting can
 * never erase them.
 */
export const mergePlanningDefaults = (
  raw: unknown,
  next: PlanningDefaults,
): Record<string, unknown> => {
  const prev = isRecord(raw) ? raw : {};
  const prevBudget = isRecord(prev.budget) ? prev.budget : {};
  return {
    ...prev,
    ...next,
    version: PLANNING_DEFAULTS_VERSION,
    budget: { ...prevBudget, ...next.budget },
  };
};

/** Currency a user should see by default: their saved choice, else app default. */
export const preferredCurrency = (raw: unknown): CurrencyCode =>
  parsePlanningDefaults(raw).budget.currency;
