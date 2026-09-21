// Phase 3 — deterministic candidate signals for AI meal-plan generation.
//
// Pantry prioritisation is measurable, never prompt-only: each recipe
// candidate gets concrete signals computed here, and those signals are what
// the ranker and the AI see. Nothing is claimed "rescued" by name alone — a
// match must come from the same conservative normalisation the grocery layer
// uses, and quantity compatibility uses safe unit conversion only.

import {
  convertQuantity,
  ingredientsMatch,
  normalizeIngredientName,
  normalizeUnit,
  type UnitType,
} from "@/lib/grocery";
import { parseLocalIsoDate, todayLocalIso } from "@/lib/dates";

export type PantrySignalItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  /** ISO date (yyyy-mm-dd) or null. */
  expiresOn: string | null;
};

export type CandidateIngredientSignal = {
  name: string;
  amount: number | null;
  unit: string | null;
};

export type CandidateSignals = {
  /** Pantry items this recipe uses (pantry names). */
  pantryOverlap: string[];
  /** Overlap where the pantry quantity safely covers the needed amount. */
  quantityCompatible: string[];
  /** Overlap with pantry items expiring within the horizon. */
  expiringOverlap: string[];
  /** Ingredients not in the pantry, when the source reported it. */
  missedCount: number | null;
  /** Null when cooking time is unknown. */
  fitsCookingTime: boolean | null;
  /** Null when the source carried no diet information. */
  dietCompatible: boolean | null;
  /** Allergy terms detected in ingredient names. Non-empty ⇒ ineligible. */
  allergyViolations: string[];
};

export type RankedCandidate = {
  /** Recipe id from the existing catalogue flow (Spoonacular). */
  id: number;
  title: string;
  image: string | null;
  readyMinutes: number | null;
  servings: number | null;
  diets: string[];
  ingredients: CandidateIngredientSignal[];
  /** Missing-ingredient count when the source reported it (byIngredients). */
  missedIngredientCount?: number | null;
  signals: CandidateSignals;
};

/* ------------------------------------------------------------- allergies */

/**
 * Common expansions so a profile allergy still matches its usual recipe
 * spellings. Matching stays word-based on normalised ingredient names.
 */
const ALLERGY_TERMS: Record<string, string[]> = {
  dairy: ["milk", "cream", "cheese", "butter", "yogurt", "yoghurt", "kefir", "whey"],
  egg: ["egg", "eggs", "mayonnaise"],
  gluten: ["flour", "wheat", "barley", "rye", "bread", "pasta", "noodle", "noodles", "couscous", "soy sauce"],
  grain: ["flour", "wheat", "barley", "rye", "oat", "oats", "rice", "corn", "quinoa"],
  peanut: ["peanut", "peanuts"],
  "tree nut": ["almond", "almonds", "walnut", "walnuts", "cashew", "cashews", "pecan", "pistachio", "hazelnut", "hazelnuts"],
  soy: ["soy", "soya", "tofu", "edamame", "miso", "tempeh"],
  wheat: ["wheat", "flour"],
  seafood: ["fish", "salmon", "tuna", "cod", "shrimp", "prawn", "prawns", "anchovy"],
  shellfish: ["shrimp", "prawn", "prawns", "crab", "lobster", "mussel", "mussels", "clam", "scallop", "oyster"],
  sesame: ["sesame", "tahini"],
  sulfite: ["wine", "vinegar"],
};

/** Allergy terms found in an ingredient list. Word-based, conservative. */
export const detectAllergyViolations = (
  ingredients: CandidateIngredientSignal[],
  allergies: string[],
): string[] => {
  const hits = new Set<string>();
  const normalized = ingredients.map((i) => normalizeIngredientName(i.name));
  for (const allergy of allergies) {
    const key = allergy.trim().toLowerCase();
    if (!key) continue;
    const terms = ALLERGY_TERMS[key] ?? [key];
    for (const term of terms) {
      const needle = normalizeIngredientName(term);
      if (!needle) continue;
      const found = normalized.some((ing) =>
        ing.split(" ").some((word) => word === needle) ||
        (needle.includes(" ") && ing.includes(needle)),
      );
      if (found) {
        hits.add(key);
        break;
      }
    }
  }
  return Array.from(hits);
};

/* -------------------------------------------------------------- diet */

/** Spoonacular uses slightly different spellings for a few diets. */
const DIET_SYNONYMS: Record<string, string[]> = {
  "gluten free": ["gluten free", "gluten-free"],
  pescetarian: ["pescatarian", "pescetarian"],
};

export const isDietCompatible = (
  requiredDiets: string[],
  candidateDiets: string[] | null,
): boolean | null => {
  if (!requiredDiets.length) return true;
  if (candidateDiets == null) return null; // source said nothing
  const have = new Set(candidateDiets.map((d) => d.toLowerCase()));
  return requiredDiets.every((d) => {
    const key = d.toLowerCase();
    const options = DIET_SYNONYMS[key] ?? [key];
    return options.some((o) => have.has(o));
  });
};

/* ------------------------------------------------------------ signals */

const daysUntil = (iso: string, todayIso: string): number => {
  const ms = parseLocalIsoDate(iso).getTime() - parseLocalIsoDate(todayIso).getTime();
  return Math.round(ms / 86400000);
};

export type SignalOptions = {
  todayIso?: string;
  /** Items expiring within this many days count as "expiring soon". */
  expiringWithinDays?: number;
  maxCookingMinutes: number | null;
  /** Profile diets (Spoonacular spelling). */
  diets: string[];
  /** Profile allergies / intolerances — strict exclusions. */
  allergies: string[];
};

export const computeSignals = (
  candidate: Omit<RankedCandidate, "signals"> & { missedIngredientCount?: number | null },
  pantry: PantrySignalItem[],
  opts: SignalOptions,
): CandidateSignals => {
  const today = opts.todayIso ?? todayLocalIso();
  const horizon = opts.expiringWithinDays ?? 4;

  const pantryOverlap: string[] = [];
  const quantityCompatible: string[] = [];
  const expiringOverlap: string[] = [];

  for (const ing of candidate.ingredients) {
    const match = pantry.find((p) => ingredientsMatch(p.name, ing.name));
    if (!match) continue;
    pantryOverlap.push(match.name);

    const pUnit = normalizeUnit(match.unit);
    const iUnit = normalizeUnit(ing.unit);
    if (
      match.quantity != null &&
      ing.amount != null &&
      pUnit != null &&
      iUnit != null
    ) {
      const neededInPantryUnit = convertQuantity(ing.amount, iUnit, pUnit);
      if (neededInPantryUnit != null && match.quantity >= neededInPantryUnit) {
        quantityCompatible.push(match.name);
      }
    }

    if (
      match.expiresOn &&
      daysUntil(match.expiresOn, today) <= horizon &&
      daysUntil(match.expiresOn, today) >= -1
    ) {
      expiringOverlap.push(match.name);
    }
  }

  return {
    pantryOverlap: Array.from(new Set(pantryOverlap)),
    quantityCompatible: Array.from(new Set(quantityCompatible)),
    expiringOverlap: Array.from(new Set(expiringOverlap)),
    missedCount:
      typeof candidate.missedIngredientCount === "number"
        ? candidate.missedIngredientCount
        : null,
    fitsCookingTime:
      opts.maxCookingMinutes == null || candidate.readyMinutes == null
        ? opts.maxCookingMinutes == null
          ? true
          : null
        : candidate.readyMinutes <= opts.maxCookingMinutes,
    dietCompatible: isDietCompatible(opts.diets, candidate.diets),
    allergyViolations: detectAllergyViolations(candidate.ingredients, opts.allergies),
  };
};

/** A candidate is eligible only with zero allergy hits and no known diet conflict. */
export const isEligible = (c: RankedCandidate): boolean =>
  c.signals.allergyViolations.length === 0 && c.signals.dietCompatible !== false;

/**
 * Rank eligible-first, then by measurable signals: expiring overlap, quantity
 * compatibility, pantry overlap, cooking time, fewest missing ingredients.
 */
export const rankCandidates = (
  candidates: RankedCandidate[],
  opts: { prioritizePantry: boolean; prioritizeExpiring: boolean },
): RankedCandidate[] => {
  const score = (c: RankedCandidate): number => {
    const s = c.signals;
    let v = 0;
    if (opts.prioritizeExpiring) v += s.expiringOverlap.length * 30;
    if (opts.prioritizePantry) {
      v += s.quantityCompatible.length * 10;
      v += s.pantryOverlap.length * 4;
    }
    if (s.fitsCookingTime === true) v += 5;
    if (s.fitsCookingTime === false) v -= 20;
    if (s.missedCount != null) v -= s.missedCount;
    return v;
  };
  return [...candidates].sort((a, b) => {
    const ea = isEligible(a) ? 1 : 0;
    const eb = isEligible(b) ? 1 : 0;
    if (ea !== eb) return eb - ea;
    return score(b) - score(a);
  });
};
