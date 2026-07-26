import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type ChefConversation = Tables<"chef_conversations">;
export type ChefMessage = Tables<"chef_messages">;
export type ChefMessageInsert = TablesInsert<"chef_messages">;

export const chefRepository = {
  async listConversations(userId: string): Promise<ChefConversation[]> {
    const { data, error } = await supabase
      .from("chef_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async createConversation(userId: string, title?: string): Promise<ChefConversation> {
    const { data, error } = await supabase
      .from("chef_conversations")
      .insert({ user_id: userId, title: title ?? null })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  async listMessages(conversationId: string): Promise<ChefMessage[]> {
    const { data, error } = await supabase
      .from("chef_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async addMessage(input: ChefMessageInsert): Promise<ChefMessage> {
    const { data, error } = await supabase
      .from("chef_messages")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    // Bump conversation's last_message_at
    await supabase
      .from("chef_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", input.conversation_id);
    return data;
  },
};
