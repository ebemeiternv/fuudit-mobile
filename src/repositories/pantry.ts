import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { PantryItemStatus } from "@/lib/pantry";

export type PantryItem = Tables<"pantry_items">;
export type PantryItemInsert = TablesInsert<"pantry_items">;
export type PantryItemUpdate = TablesUpdate<"pantry_items">;

export const pantryRepository = {
  /** All active items for a user, ordered by nearest expiry (nulls last). */
  async listActive(userId: string): Promise<PantryItem[]> {
    const { data, error } = await supabase
      .from("pantry_items")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("expires_on", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async create(input: PantryItemInsert): Promise<PantryItem> {
    const { data, error } = await supabase
      .from("pantry_items")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  async update(id: string, patch: PantryItemUpdate): Promise<PantryItem> {
    const { data, error } = await supabase
      .from("pantry_items")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  async setStatus(id: string, status: PantryItemStatus): Promise<PantryItem> {
    return pantryRepository.update(id, { status });
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("pantry_items").delete().eq("id", id);
    if (error) throw error;
  },
};
