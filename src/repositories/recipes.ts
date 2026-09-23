import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { NormalizedRecipe } from "@/lib/spoonacular";

export type Recipe = Tables<"recipes">;

export const recipesRepository = {
  /** Upsert a normalized Spoonacular recipe into the local cache. Idempotent on (source, source_id). */
  async upsertFromSpoonacular(n: NormalizedRecipe): Promise<Recipe> {
    const row: TablesInsert<"recipes"> = {
      source: n.source,
      source_id: n.source_id,
      title: n.title,
      image: n.image,
      servings: n.servings ?? null,
      ready_minutes: n.ready_minutes ?? null,
      ingredients: n.ingredients as unknown as TablesInsert<"recipes">["ingredients"],
      instructions: n.instructions,
      data: n.data as unknown as TablesInsert<"recipes">["data"],
    };
    const { data, error } = await supabase
      .from("recipes")
      .upsert(row, { onConflict: "source,source_id" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  /**
   * Store a recipe Fuudit wrote itself. Uses its own `fuudit_ai` source so it
   * can never collide with or overwrite a cached catalogue recipe.
   */
  async insertAiRecipe(r: {
    title: string;
    servings: number | null;
    readyMinutes: number | null;
    summary: string | null;
    ingredients: { name: string; amount: number | null; unit: string | null }[];
    steps: string[];
  }): Promise<Recipe> {
    const row: TablesInsert<"recipes"> = {
      source: "fuudit_ai",
      source_id: crypto.randomUUID(),
      title: r.title,
      image: null,
      servings: r.servings,
      ready_minutes: r.readyMinutes,
      ingredients: r.ingredients.map((i) => ({
        name: i.name,
        amount: i.amount,
        unit: i.unit,
        original: [i.amount ?? "", i.unit ?? "", i.name].filter(Boolean).join(" ").trim(),
      })) as unknown as TablesInsert<"recipes">["ingredients"],
      instructions: r.steps.join("\n"),
      data: {
        steps: r.steps.map((step, idx) => ({ number: idx + 1, step })),
        diets: [],
        dishTypes: [],
        dietaryFlags: {},
        nutrition: [],
        summary: r.summary,
        sourceUrl: null,
        sourceName: "Fuudit",
        creditsText: "Recipe written by Fuudit",
        license: null,
        aiGenerated: true,
      } as unknown as TablesInsert<"recipes">["data"],
    };
    const { data, error } = await supabase.from("recipes").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },
  async getById(id: string): Promise<Recipe | null> {
    const { data, error } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async findBySourceId(sourceId: string): Promise<Recipe | null> {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("source", "spoonacular")
      .eq("source_id", sourceId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};
