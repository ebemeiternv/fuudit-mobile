import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type GroceryItem = Tables<"grocery_items">;
export type GroceryItemInsert = TablesInsert<"grocery_items">;
export type GroceryItemUpdate = TablesUpdate<"grocery_items">;

export const groceryRepository = {
  async list(userId: string): Promise<GroceryItem[]> {
    const { data, error } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("user_id", userId)
      .order("checked", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async create(input: GroceryItemInsert): Promise<GroceryItem> {
    const { data, error } = await supabase
      .from("grocery_items")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  async update(id: string, patch: GroceryItemUpdate): Promise<GroceryItem> {
    const { data, error } = await supabase
      .from("grocery_items")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("grocery_items").delete().eq("id", id);
    if (error) throw error;
  },
  async clearPurchased(userId: string): Promise<void> {
    const { error } = await supabase
      .from("grocery_items")
      .delete()
      .eq("user_id", userId)
      .eq("checked", true);
    if (error) throw error;
  },
  async bulkInsert(
    userId: string,
    rows: Omit<GroceryItemInsert, "user_id">[],
  ): Promise<GroceryItem[]> {
    if (rows.length === 0) return [];
    const payload = rows.map((r) => ({ ...r, user_id: userId }));
    const { data, error } = await supabase
      .from("grocery_items")
      .insert(payload)
      .select("*");
    if (error) throw error;
    return data ?? [];
  },
};
