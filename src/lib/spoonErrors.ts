import type { SpoonError } from "@/repositories/spoonacular";

export const spoonErrorMessage = (e: unknown): { title: string; description: string } => {
  const err = e as Partial<SpoonError> | undefined;
  switch (err?.code) {
    case "missing_api_key":
      return {
        title: "Recipe service unavailable",
        description: "The recipe provider isn't configured yet. Please try again later.",
      };
    case "rate_limited":
      return {
        title: "Daily recipe limit reached",
        description: "We've hit today's recipe quota. Try again tomorrow, or open a saved recipe.",
      };
    case "not_found":
      return { title: "Recipe not found", description: "This recipe is no longer available." };
    case "unauthorized":
      return {
        title: "Recipe service unavailable",
        description: "The recipe provider rejected the request. Please try again later.",
      };
    case "network":
      return { title: "You're offline", description: "Check your connection and try again." };
    default:
      return {
        title: "Something went wrong",
        description: "We couldn't reach the recipe provider. Please try again.",
      };
  }
};
