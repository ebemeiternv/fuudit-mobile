import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type MealPlanEntry = Tables<"meal_plan_entries">;
export type MealPlanEntryInsert = TablesInsert<"meal_plan_entries">;
export type MealPlanEntryUpdate = TablesUpdate<"meal_plan_entries">;
export type Recipe = Tables<"recipes">;

export type MealPlanEntryWithRecipe = MealPlanEntry & { recipe: Recipe | null };

export const mealPlanRepository = {
  async listRange(userId: string, from: string, to: string): Promise<MealPlanEntryWithRecipe[]> {
    const { data, error } = await supabase
      .from("meal_plan_entries")
      .select("*, recipe:recipes(*)")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as MealPlanEntryWithRecipe[];
  },
  async create(input: MealPlanEntryInsert): Promise<MealPlanEntry> {
    const { data, error } = await supabase
      .from("meal_plan_entries")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  async update(id: string, patch: MealPlanEntryUpdate): Promise<MealPlanEntry> {
    const { data, error } = await supabase
      .from("meal_plan_entries")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("meal_plan_entries").delete().eq("id", id);
    if (error) throw error;
  },
};
