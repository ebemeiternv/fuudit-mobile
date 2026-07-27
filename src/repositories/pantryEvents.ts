import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type PantryEvent = Tables<"pantry_events">;
export type PantryEventInsert = TablesInsert<"pantry_events">;
export type PantryEventType = PantryEvent["event_type"];

export const pantryEventsRepository = {
  async list(userId: string): Promise<PantryEvent[]> {
    const { data, error } = await supabase
      .from("pantry_events")
      .select("*")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async log(input: PantryEventInsert): Promise<PantryEvent> {
    const { data, error } = await supabase
      .from("pantry_events")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
