import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type ChefConversation = Tables<"chef_conversations">;
export type ChefMessage = Tables<"chef_messages">;
export type ChefMessageInsert = TablesInsert<"chef_messages">;

export type ChefRecipeCard = {
  source: "spoonacular";
  sourceId: string;
  title: string;
  image: string | null;
  readyMinutes: number | null;
  servings: number | null;
  diets: string[];
  pantryUsed: string[];
  missing: string[];
  expiringUsed: string[];
  reason: string;
};

export type ChefMessageData = {
  recipes?: ChefRecipeCard[];
  tips?: string[];
  clarifyingQuestion?: string | null;
};

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
  async renameConversation(conversationId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from("chef_conversations")
      .update({ title })
      .eq("id", conversationId);
    if (error) throw error;
  },
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from("chef_conversations")
      .delete()
      .eq("id", conversationId);
    if (error) throw error;
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
  async sendMessage(
    conversationId: string,
    message: string,
  ): Promise<{
    conversationId: string;
    assistant: {
      content: string;
      clarifyingQuestion?: string;
      recipes: ChefRecipeCard[];
      tips: string[];
    };
  }> {
    const { data, error } = await supabase.functions.invoke("chef", {
      body: { conversationId, message },
    });
    if (error) throw error;
    return data;
  },
};
