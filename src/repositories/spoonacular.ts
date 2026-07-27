import { supabase } from "@/integrations/supabase/client";
import type {
  SpoonSearchHit,
  SpoonByIngredientsHit,
  SpoonRecipeDetail,
} from "@/lib/spoonacular";

export type SpoonError = {
  code: "missing_api_key" | "rate_limited" | "unauthorized" | "not_found" | "upstream_error" | "network";
  message: string;
  status: number;
};

const invoke = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("spoonacular", { body: payload });
  if (error) {
    // The functions client only surfaces a generic error; extract from `context` if possible.
    const status = (error as any).context?.status ?? 0;
    let bodyCode: string | undefined;
    try {
      const raw = await (error as any).context?.response?.text?.();
      if (raw) bodyCode = JSON.parse(raw)?.code ?? JSON.parse(raw)?.error;
    } catch {
      /* ignore */
    }
    const code: SpoonError["code"] =
      status === 503 || bodyCode === "missing_api_key"
        ? "missing_api_key"
        : status === 429
        ? "rate_limited"
        : status === 404
        ? "not_found"
        : status === 401 || status === 403
        ? "unauthorized"
        : status === 0
        ? "network"
        : "upstream_error";
    const err: SpoonError = { code, message: error.message, status };
    throw err;
  }
  if (data && (data as any).error) {
    const code = (data as any).code ?? (data as any).error;
    const err: SpoonError = {
      code:
        code === "missing_api_key"
          ? "missing_api_key"
          : code === "rate_limited"
          ? "rate_limited"
          : code === "not_found"
          ? "not_found"
          : "upstream_error",
      message: String((data as any).error),
      status: 0,
    };
    throw err;
  }
  return data as T;
};

export const spoonacularRepository = {
  search: (args: {
    query?: string;
    number?: number;
    diet?: string;
    intolerances?: string;
    cuisine?: string;
  }) => invoke<{ results: SpoonSearchHit[] }>({ action: "search", ...args }),

  byIngredients: (args: { ingredients: string[]; number?: number; ranking?: 1 | 2 }) =>
    invoke<{ results: SpoonByIngredientsHit[] }>({ action: "byIngredients", ...args }),

  detail: (id: number | string) =>
    invoke<{ recipe: SpoonRecipeDetail }>({ action: "detail", id }),
};
