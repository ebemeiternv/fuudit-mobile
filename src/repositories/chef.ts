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

export type ChefErrorCode =
  | "unauthenticated"
  | "invalid_request"
  | "conversation_not_found"
  | "message_persistence_failed"
  | "model_unavailable"
  | "gateway_unauthorized"
  | "gateway_rate_limited"
  | "gateway_credits_exhausted"
  | "gateway_timeout"
  | "gateway_upstream"
  | "invalid_model_response"
  | "unknown_error";

export class ChefError extends Error {
  code: ChefErrorCode;
  requestId?: string;
  constructor(code: ChefErrorCode, message: string, requestId?: string) {
    super(message);
    this.code = code;
    this.requestId = requestId;
  }
}

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
    opts?: { retry?: boolean },
  ): Promise<{
    conversationId: string;
    requestId: string;
    assistant: {
      content: string;
      clarifyingQuestion?: string;
      recipes: ChefRecipeCard[];
      tips: string[];
    };
  }> {
    const { data, error } = await supabase.functions.invoke("chef", {
      body: { conversationId, message, retry: opts?.retry === true },
    });

    // Edge Function returns a structured error body on non-2xx statuses.
    // supabase-js surfaces those as `error` with a `context.response`.
    if (error) {
      // Try to parse the structured error body if present.
      let code: ChefErrorCode = "unknown_error";
      let requestId: string | undefined;
      let userMsg = "Something went wrong. Please try again.";
      try {
        const ctx = (error as unknown as { context?: { response?: Response } }).context;
        if (ctx?.response) {
          const body = await ctx.response.clone().json();
          if (body?.error) code = body.error as ChefErrorCode;
          if (typeof body?.requestId === "string") requestId = body.requestId;
          if (typeof body?.message === "string" && body.message) userMsg = body.message;
        }
      } catch {
        // fall through with defaults
      }
      throw new ChefError(code, userMsg, requestId);
    }

    if (!data || typeof data !== "object") {
      throw new ChefError("invalid_model_response", "Unexpected empty response.");
    }
    // A 200 response may still carry a soft error body (shouldn't with current server, but be safe).
    if ((data as { error?: string }).error) {
      const d = data as { error: ChefErrorCode; message?: string; requestId?: string };
      throw new ChefError(d.error, d.message ?? "Something went wrong.", d.requestId);
    }
    return data as {
      conversationId: string;
      requestId: string;
      assistant: {
        content: string;
        clarifyingQuestion?: string;
        recipes: ChefRecipeCard[];
        tips: string[];
      };
    };
  },
};
