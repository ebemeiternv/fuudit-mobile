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
