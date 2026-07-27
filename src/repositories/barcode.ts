// Barcode lookup + pantry duplicate check. Screens must never call the edge
// function or Supabase directly; they go through this repository so that
// error normalization stays in one place.
import { supabase } from "@/integrations/supabase/client";
import type { NormalizedProduct } from "@/lib/openFoodFacts";
import type { PantryItem } from "@/repositories/pantry";
import { normalizeIngredientName } from "@/lib/grocery";

export type BarcodeLookupResult =
  | { status: "found"; product: NormalizedProduct }
  | { status: "not_found"; barcode: string }
  | { status: "error"; code: "invalid_barcode" | "rate_limited" | "timeout" | "network" | "unknown"; message: string };

export const barcodeRepository = {
  async lookup(barcode: string): Promise<BarcodeLookupResult> {
    try {
      const { data, error } = await supabase.functions.invoke("barcode-lookup", {
        body: { barcode },
      });
      if (error) {
        // functions.invoke returns non-2xx as error with `context.response`.
        const status = (error as { context?: { response?: Response } }).context?.response?.status;
        if (status === 400) return { status: "error", code: "invalid_barcode", message: "That barcode doesn't look right." };
        if (status === 429) return { status: "error", code: "rate_limited", message: "Too many lookups — please try again in a moment." };
        if (status === 504) return { status: "error", code: "timeout", message: "Lookup timed out. Check your connection." };
        return { status: "error", code: "network", message: "Couldn't reach the product database." };
      }
      if (data?.found && data.product) {
        return { status: "found", product: data.product as NormalizedProduct };
      }
      return { status: "not_found", barcode };
    } catch {
      return { status: "error", code: "unknown", message: "Product lookup failed." };
    }
  },

  /**
   * Returns an active pantry item that likely represents the same product as
   * the incoming scan. Barcode match wins; otherwise falls back to normalized
   * name equality. Intentionally conservative — see slice spec.
   */
  async findLikelyDuplicate(
    userId: string,
    barcode: string | null,
    name: string | null,
  ): Promise<PantryItem | null> {
    if (barcode) {
      const { data } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .eq("barcode", barcode)
        .limit(1)
        .maybeSingle();
      if (data) return data as PantryItem;
    }
    if (name) {
      const normalized = normalizeIngredientName(name);
      if (!normalized) return null;
      const { data } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .ilike("name", name)
        .limit(5);
      const match = (data ?? []).find(
        (it) => normalizeIngredientName(it.name) === normalized,
      );
      return (match as PantryItem) ?? null;
    }
    return null;
  },
};
