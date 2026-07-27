import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ProductIntelligence = Tables<"product_intelligence">;
export type ProductIntelligenceInsert = TablesInsert<"product_intelligence">;
export type ProductIntelligenceUpdate = TablesUpdate<"product_intelligence">;

export const productIntelligenceRepository = {
  async listForUser(userId: string): Promise<ProductIntelligence[]> {
    const { data, error } = await supabase
      .from("product_intelligence")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  },
  async findByKey(
    userId: string,
    identityKey: string,
  ): Promise<ProductIntelligence | null> {
    const { data, error } = await supabase
      .from("product_intelligence")
      .select("*")
      .eq("user_id", userId)
      .eq("identity_key", identityKey)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },
  async upsert(
    input: ProductIntelligenceInsert,
  ): Promise<ProductIntelligence> {
    const { data, error } = await supabase
      .from("product_intelligence")
      .upsert(input, { onConflict: "user_id,identity_key" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
  async update(
    id: string,
    patch: ProductIntelligenceUpdate,
  ): Promise<ProductIntelligence> {
    const { data, error } = await supabase
      .from("product_intelligence")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
