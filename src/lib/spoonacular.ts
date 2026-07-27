// Shared Spoonacular payload types and normalizers used by client-side code.
// Spoonacular's schema is loose — always tolerate missing fields.

export type SpoonIngredient = {
  id?: number;
  name?: string;
  original?: string;
  amount?: number;
  unit?: string;
};

export type SpoonSearchHit = {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  diets?: string[];
  dishTypes?: string[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  summary?: string;
};

export type SpoonByIngredientsHit = {
  id: number;
  title: string;
  image?: string;
  usedIngredientCount?: number;
  missedIngredientCount?: number;
  usedIngredients?: SpoonIngredient[];
  missedIngredients?: SpoonIngredient[];
};

export type SpoonRecipeDetail = SpoonSearchHit & {
  extendedIngredients?: (SpoonIngredient & {
    measures?: { metric?: { amount?: number; unitShort?: string } };
  })[];
  analyzedInstructions?: { steps?: { number?: number; step?: string }[] }[];
  instructions?: string;
  nutrition?: {
    nutrients?: { name: string; amount: number; unit: string }[];
  };
  creditsText?: string;
  sourceName?: string;
  license?: string;
};

export type NormalizedIngredient = {
  name: string;
  amount: number | null;
  unit: string | null;
  original: string;
};

export type NormalizedRecipe = {
  source: "spoonacular";
  source_id: string;
  title: string;
  image: string | null;
  servings: number | null;
  ready_minutes: number | null;
  ingredients: NormalizedIngredient[];
  instructions: string | null; // may include HTML
  data: {
    steps: { number: number; step: string }[];
    diets: string[];
    dishTypes: string[];
    dietaryFlags: {
      vegetarian?: boolean;
      vegan?: boolean;
      glutenFree?: boolean;
      dairyFree?: boolean;
    };
    nutrition: { name: string; amount: number; unit: string }[];
    summary: string | null;
    sourceUrl: string | null;
    sourceName: string | null;
    creditsText: string | null;
    license: string | null;
  };
};

const toStr = (v: unknown) => (typeof v === "string" ? v : "");
const toNum = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
};

export function normalizeIngredient(i: SpoonIngredient): NormalizedIngredient {
  const metric = (i as any).measures?.metric;
  const amount = toNum(metric?.amount) ?? toNum(i.amount);
  const unit = toStr(metric?.unitShort) || toStr(i.unit) || null;
  return {
    name: toStr(i.name) || toStr(i.original) || "Ingredient",
    amount,
    unit: unit || null,
    original: toStr(i.original) || toStr(i.name) || "",
  };
}

export function normalizeSpoonRecipe(r: SpoonRecipeDetail): NormalizedRecipe {
  const steps: { number: number; step: string }[] = [];
  const analyzed = r.analyzedInstructions ?? [];
  for (const group of analyzed) {
    for (const s of group.steps ?? []) {
      if (s.step) steps.push({ number: s.number ?? steps.length + 1, step: s.step });
    }
  }

  const ingredients = (r.extendedIngredients ?? []).map(normalizeIngredient);

  return {
    source: "spoonacular",
    source_id: String(r.id),
    title: toStr(r.title) || "Untitled recipe",
    image: toStr(r.image) || null,
    servings: toNum(r.servings),
    ready_minutes: toNum(r.readyInMinutes),
    ingredients,
    instructions: r.instructions ?? null,
    data: {
      steps,
      diets: Array.isArray(r.diets) ? r.diets.filter((d) => typeof d === "string") : [],
      dishTypes: Array.isArray(r.dishTypes) ? r.dishTypes.filter((d) => typeof d === "string") : [],
      dietaryFlags: {
        vegetarian: r.vegetarian,
        vegan: r.vegan,
        glutenFree: r.glutenFree,
        dairyFree: r.dairyFree,
      },
      nutrition: (r.nutrition?.nutrients ?? [])
        .filter((n) => n && typeof n.name === "string")
        .map((n) => ({ name: n.name, amount: toNum(n.amount) ?? 0, unit: toStr(n.unit) })),
      summary: r.summary ?? null,
      sourceUrl: r.sourceUrl ?? null,
      sourceName: r.sourceName ?? null,
      creditsText: r.creditsText ?? null,
      license: r.license ?? null,
    },
  };
}

/** Filter pantry item names into ingredient tokens suitable for Spoonacular. */
export function pantryNamesToIngredients(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const n = String(raw ?? "").trim().toLowerCase();
    if (!n) continue;
    // Take just the head noun (e.g. "organic red onion" -> keep whole; Spoonacular tolerates this)
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= 20) break;
  }
  return out;
}

/** Map profile dietary_preferences → Spoonacular's `diet` param (single value). */
export function pickSpoonDiet(prefs: string[] | null | undefined): string | undefined {
  if (!prefs?.length) return undefined;
  const lower = prefs.map((p) => p.toLowerCase());
  const supported = [
    "gluten free",
    "ketogenic",
    "vegetarian",
    "lacto vegetarian",
    "ovo vegetarian",
    "vegan",
    "pescetarian",
    "paleo",
    "primal",
    "low fodmap",
    "whole30",
  ];
  for (const s of supported) {
    if (lower.includes(s)) return s;
  }
  return undefined;
}

/** Map profile allergies to Spoonacular's comma-joined `intolerances`. */
export function pickSpoonIntolerances(allergies: string[] | null | undefined): string | undefined {
  if (!allergies?.length) return undefined;
  const known = new Set([
    "dairy",
    "egg",
    "gluten",
    "grain",
    "peanut",
    "seafood",
    "sesame",
    "shellfish",
    "soy",
    "sulfite",
    "tree nut",
    "wheat",
  ]);
  const picked = allergies
    .map((a) => a.toLowerCase().trim())
    .filter((a) => known.has(a));
  return picked.length ? picked.join(",") : undefined;
}
