import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SavedRecipe = Tables<"saved_recipes">;
export type Recipe = Tables<"recipes">;

export const savedRecipesRepository = {
  async list(userId: string): Promise<(SavedRecipe & { recipe: Recipe | null })[]> {
    const { data, error } = await supabase
      .from("saved_recipes")
      .select("*, recipe:recipes(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as (SavedRecipe & { recipe: Recipe | null })[];
  },
  async save(userId: string, recipeId: string): Promise<SavedRecipe> {
    const { data, error } = await supabase
      .from("saved_recipes")
      .insert({ user_id: userId, recipe_id: recipeId })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  async remove(userId: string, recipeId: string): Promise<void> {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", userId)
      .eq("recipe_id", recipeId);
    if (error) throw error;
  },
};
