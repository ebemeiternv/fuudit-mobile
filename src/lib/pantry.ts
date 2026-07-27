import type { Database } from "@/integrations/supabase/types";

export type UnitType = Database["public"]["Enums"]["unit_type"];
export type PantryLocation = Database["public"]["Enums"]["pantry_location"];
export type PantryItemStatus = Database["public"]["Enums"]["pantry_item_status"];

export const UNITS: UnitType[] = ["piece", "g", "kg", "ml", "l", "tbsp", "tsp", "cup"];

export const LOCATIONS: { value: PantryLocation; label: string }[] = [
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "pantry", label: "Pantry" },
  { value: "other", label: "Other" },
];

export const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat & Fish",
  "Bakery",
  "Grains & Pasta",
  "Pantry Staples",
  "Beverages",
  "Frozen",
  "Snacks",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Days from today (local) until an ISO date string (YYYY-MM-DD). Null if no date. */
export const daysUntilExpiry = (expiresOn: string | null | undefined): number | null => {
  if (!expiresOn) return null;
  const [y, m, d] = expiresOn.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
};

export type ExpiryBucket =
  | "expired"
  | "today"
  | "tomorrow"
  | "soon"
  | "week"
  | "later"
  | "none";

export const expiryBucket = (expiresOn: string | null | undefined): ExpiryBucket => {
  const d = daysUntilExpiry(expiresOn);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d <= 3) return "soon";
  if (d <= 7) return "week";
  return "later";
};

export const expiryLabel = (expiresOn: string | null | undefined): string => {
  const d = daysUntilExpiry(expiresOn);
  if (d === null) return "No expiry";
  if (d < 0) return d === -1 ? "Expired yesterday" : `Expired ${-d} days ago`;
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  if (d <= 7) return `In ${d} days`;
  return `In ${d} days`;
};

/** Returns tailwind-safe token names for badge styling. */
export const expiryTone = (
  bucket: ExpiryBucket
): { badge: string; icon: string } => {
  switch (bucket) {
    case "expired":
    case "today":
    case "tomorrow":
      return {
        badge:
          "bg-[hsl(var(--app-accent-berry-soft))] text-[hsl(var(--app-danger))]",
        icon:
          "bg-[hsl(var(--app-accent-berry-soft))] text-[hsl(var(--app-danger))]",
      };
    case "soon":
      return {
        badge:
          "bg-[hsl(var(--app-accent-warm-soft))] text-[hsl(var(--app-accent-warm))]",
        icon:
          "bg-[hsl(var(--app-accent-warm-soft))] text-[hsl(var(--app-accent-warm))]",
      };
    case "week":
      return {
        badge:
          "bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))]",
        icon:
          "bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))]",
      };
    default:
      return {
        badge: "bg-[hsl(var(--app-subtle))] text-[hsl(var(--app-muted))]",
        icon: "bg-[hsl(var(--app-subtle))] text-[hsl(var(--app-muted))]",
      };
  }
};

/** Local YYYY-MM-DD (no UTC shift) from a Date. */
export const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Parse YYYY-MM-DD as local date (no UTC shift). */
export const parseLocalDate = (s: string | null | undefined): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};
