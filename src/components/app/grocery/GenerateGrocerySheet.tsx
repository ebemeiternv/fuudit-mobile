import { useEffect, useMemo, useState } from "react";
import { Loader2, X, AlertTriangle, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import LoadingState from "@/components/app/states/LoadingState";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMealPlan } from "@/hooks/queries/useMealPlan";
import { usePantryItems } from "@/hooks/queries/usePantryItems";
import { useBulkAddGrocery } from "@/hooks/queries/useGroceryItems";
import {
  convertQuantity,
  formatQuantityUnit,
  inferCategory,
  ingredientsMatch,
  normalizeIngredientName,
  normalizeUnit,
  type UnitType,
} from "@/lib/grocery";
import { CATEGORIES, UNITS } from "@/lib/pantry";
import type { GroceryItem } from "@/repositories/grocery";
import type { NormalizedIngredient } from "@/lib/spoonacular";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFrom: string;
  defaultTo: string;
  existingPending: GroceryItem[];
};

type ReviewRow = {
  // Stable client id for list keys and edits.
  key: string;
  name: string;
  category: string | null;
  requiredQty: number | null;
  requiredUnit: UnitType | null;
  pantryQty: number | null;
  pantryUnit: UnitType | null;
  missingQty: number | null;
  missingUnit: UnitType | null;
  included: boolean;
  warning: string | null;
  sourceLabel: string;
  sourceRecipeId: string | null;
  sourceMealPlanId: string | null;
};

const GenerateGrocerySheet = ({
  open,
  onOpenChange,
  defaultFrom,
  defaultTo,
  existingPending,
}: Props) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [step, setStep] = useState<"config" | "review">("config");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [selectedEntries, setSelectedEntries] = useState<Record<string, boolean>>({});
  const [includeOptional, setIncludeOptional] = useState(true);
  const [rows, setRows] = useState<ReviewRow[]>([]);

  const {
    data: entries = [],
    isLoading: entriesLoading,
    isError: entriesError,
  } = useMealPlan(userId, from, to);
  const { data: pantry = [] } = usePantryItems(userId);
  const bulk = useBulkAddGrocery(userId);

  // Reset to config when opening.
  useEffect(() => {
    if (!open) return;
    setStep("config");
    setFrom(defaultFrom);
    setTo(defaultTo);
    setIncludeOptional(true);
    setRows([]);
  }, [open, defaultFrom, defaultTo]);

  // Default: all recipe-linked entries selected once entries load.
  useEffect(() => {
    if (!open) return;
    const next: Record<string, boolean> = {};
    for (const e of entries) next[e.id] = !!e.recipe;
    setSelectedEntries(next);
  }, [open, entries]);

  const withRecipeEntries = useMemo(() => entries.filter((e) => e.recipe), [entries]);
  const customEntries = useMemo(() => entries.filter((e) => !e.recipe), [entries]);

  const activePantry = useMemo(
    () => pantry.filter((p) => p.status === "active"),
    [pantry],
  );

  const buildReview = () => {
    // 1. Gather ingredients from selected recipe-linked entries, scaled by
    //    servings / recipe.servings.
    type Agg = {
      key: string;
      name: string;
      totalByUnit: Map<UnitType | "__none", number>;
      unknownUnitLines: { qty: number | null; unit: string | null }[];
      sources: Set<string>;
      recipeIds: Set<string>;
      mealPlanIds: Set<string>;
    };
    const agg = new Map<string, Agg>();

    for (const entry of entries) {
      if (!selectedEntries[entry.id]) continue;
      if (!entry.recipe) continue;
      const recipe = entry.recipe;
      const recipeServings = recipe.servings ?? 0;
      const scale = recipeServings > 0 ? entry.servings / recipeServings : 1;
      const ings = (recipe.ingredients as unknown as NormalizedIngredient[] | null) ?? [];
      for (const ing of ings) {
        if (!includeOptional && (ing as { optional?: boolean }).optional) continue;
        const name = ing.name?.trim();
        if (!name) continue;
        const norm = normalizeIngredientName(name);
        if (!norm) continue;
        const unit = normalizeUnit(ing.unit);
        const qty = ing.amount != null ? ing.amount * scale : null;
        let a = agg.get(norm);
        if (!a) {
          a = {
            key: norm,
            name,
            totalByUnit: new Map(),
            unknownUnitLines: [],
            sources: new Set(),
            recipeIds: new Set(),
            mealPlanIds: new Set(),
          };
          agg.set(norm, a);
        }
        a.sources.add(recipe.title);
        a.recipeIds.add(recipe.id);
        a.mealPlanIds.add(entry.id);

        // Try to combine with an existing unit in the same family via safe
        // conversion. Otherwise keep the line separate.
        if (qty == null) {
          a.unknownUnitLines.push({ qty: null, unit: ing.unit ?? null });
          continue;
        }
        let combined = false;
        for (const [existingUnit] of a.totalByUnit) {
          if (existingUnit === "__none") continue;
          const converted = unit
            ? convertQuantity(qty, unit, existingUnit as UnitType)
            : null;
          if (converted != null) {
            a.totalByUnit.set(
              existingUnit,
              (a.totalByUnit.get(existingUnit) ?? 0) + converted,
            );
            combined = true;
            break;
          }
        }
        if (!combined) {
          if (unit) {
            a.totalByUnit.set(unit, (a.totalByUnit.get(unit) ?? 0) + qty);
          } else {
            // No unit at all — assume pieces if others exist in "piece", else __none.
            const key: UnitType | "__none" = "__none";
            a.totalByUnit.set(key, (a.totalByUnit.get(key) ?? 0) + qty);
          }
        }
      }
    }

    // 2. Emit review rows, subtracting pantry when safely comparable.
    const out: ReviewRow[] = [];
    for (const a of agg.values()) {
      const pantryMatch = activePantry.find((p) => ingredientsMatch(p.name, a.name));
      const sourceLabel = Array.from(a.sources).slice(0, 2).join(", ") +
        (a.sources.size > 2 ? "…" : "");
      const recipeIdArr = Array.from(a.recipeIds);
      const mealIdArr = Array.from(a.mealPlanIds);

      const pushRow = (
        qty: number | null,
        unit: UnitType | null,
        warning: string | null,
        included: boolean,
      ) => {
        out.push({
          key: `${a.key}::${unit ?? "none"}::${out.length}`,
          name: a.name,
          category: inferCategory(a.name),
          requiredQty: qty,
          requiredUnit: unit,
          pantryQty: pantryMatch?.quantity ?? null,
          pantryUnit: (pantryMatch?.unit as UnitType | null) ?? null,
          missingQty: qty,
          missingUnit: unit,
          included,
          warning,
          sourceLabel,
          sourceRecipeId: recipeIdArr[0] ?? null,
          sourceMealPlanId: mealIdArr[0] ?? null,
        });
      };

      const totalEntries = Array.from(a.totalByUnit.entries());
      const hasAnyQty = totalEntries.length > 0 || a.unknownUnitLines.length > 0;

      if (!hasAnyQty) {
        pushRow(null, null, null, true);
      } else {
        // Emit one row per unit bucket. Try pantry subtraction per bucket.
        for (const [uKey, total] of totalEntries) {
          const unit: UnitType | null = uKey === "__none" ? null : (uKey as UnitType);
          let missing: number | null = total;
          let warning: string | null = null;

          if (pantryMatch) {
            if (pantryMatch.quantity == null) {
              warning = "Check pantry quantity";
            } else {
              const converted = convertQuantity(
                pantryMatch.quantity,
                pantryMatch.unit as UnitType | null,
                unit,
              );
              if (converted == null) {
                warning = "Pantry uses a different unit — please check";
              } else {
                missing = Math.max(0, total - converted);
              }
            }
          }

          if (missing != null && missing <= 0 && !warning) {
            // Pantry covers requirement — still list for transparency but excluded.
            out.push({
              key: `${a.key}::${unit ?? "none"}::covered::${out.length}`,
              name: a.name,
              category: inferCategory(a.name),
              requiredQty: total,
              requiredUnit: unit,
              pantryQty: pantryMatch?.quantity ?? null,
              pantryUnit: (pantryMatch?.unit as UnitType | null) ?? null,
              missingQty: 0,
              missingUnit: unit,
              included: false,
              warning: "Pantry covers this — excluded",
              sourceLabel,
              sourceRecipeId: recipeIdArr[0] ?? null,
              sourceMealPlanId: mealIdArr[0] ?? null,
            });
          } else {
            pushRow(
              missing != null && missing > 0 ? Math.round(missing * 100) / 100 : total,
              unit,
              warning,
              true,
            );
          }
        }
        // Unknown-unit lines preserved as extra rows.
        for (const line of a.unknownUnitLines) {
          pushRow(
            line.qty,
            null,
            `Unrecognised unit "${line.unit ?? ""}" — please review`,
            true,
          );
        }
      }
    }

    setRows(out);
    setStep("review");
  };

  const updateRow = (key: string, patch: Partial<ReviewRow>) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const removeRow = (key: string) => setRows((r) => r.filter((row) => row.key !== key));

  const included = rows.filter((r) => r.included);

  const confirm = async () => {
    if (included.length === 0) {
      toast({ title: "Nothing to add", description: "Include at least one item." });
      return;
    }
    // Merge with existing pending items when identity + unit are compatible.
    const rowsToInsert: Parameters<typeof bulk.mutateAsync>[0] = [];
    const rowsToUpdate: { id: string; qty: number }[] = [];

    for (const row of included) {
      const existing = existingPending.find(
        (p) =>
          ingredientsMatch(p.name, row.name) &&
          normalizeUnit(p.unit) === row.missingUnit,
      );
      if (existing && row.missingQty != null && existing.quantity != null) {
        rowsToUpdate.push({ id: existing.id, qty: existing.quantity + row.missingQty });
      } else if (existing && row.missingQty == null && existing.quantity == null) {
        // Same identity + unit with no quantities — nothing to merge, skip duplicate.
        continue;
      } else {
        rowsToInsert.push({
          name: row.name,
          quantity: row.missingQty,
          unit: row.missingUnit,
          category: row.category,
          checked: false,
          source: "meal_plan",
          recipe_id: row.sourceRecipeId,
          meal_plan_entry_id: row.sourceMealPlanId,
        });
      }
    }

    try {
      // Insert new rows in one batched call.
      if (rowsToInsert.length > 0) await bulk.mutateAsync(rowsToInsert);
      // Update merged rows individually — small N is fine.
      const { groceryRepository } = await import("@/repositories/grocery");
      for (const upd of rowsToUpdate) {
        await groceryRepository.update(upd.id, { quantity: upd.qty });
      }
      toast({
        title: "Grocery list updated",
        description: `${rowsToInsert.length} new · ${rowsToUpdate.length} merged`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Couldn't create list",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[92dvh] overflow-y-auto p-0 border-t border-[hsl(var(--app-border))]"
      >
        <SheetHeader className="px-5 pt-5 pb-2 text-left">
          <SheetTitle className="text-xl font-bold text-[hsl(var(--app-foreground))]">
            {step === "config" ? "Generate grocery list" : "Review before adding"}
          </SheetTitle>
          <SheetDescription className="text-[hsl(var(--app-muted))]">
            {step === "config"
              ? "Choose a date range and the meals to include."
              : "Edit quantities, remove items, or include extras before we add them."}
          </SheetDescription>
        </SheetHeader>

        {step === "config" ? (
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-from">From</Label>
                <Input
                  id="g-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-to">To</Label>
                <Input
                  id="g-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-[hsl(var(--app-foreground))]">
              <Checkbox
                checked={includeOptional}
                onCheckedChange={(v) => setIncludeOptional(!!v)}
              />
              Include optional recipe ingredients
            </label>

            {entriesLoading ? (
              <LoadingState label="Loading planned meals…" />
            ) : entriesError ? (
              <p className="text-sm text-[hsl(var(--app-danger))]">
                Couldn't load planned meals.
              </p>
            ) : entries.length === 0 ? (
              <div className="rounded-2xl bg-[hsl(var(--app-subtle))] p-4 text-sm text-[hsl(var(--app-muted))]">
                No planned meals in this range.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--app-muted))]">
                  Planned meals ({withRecipeEntries.length})
                </p>
                <div className="space-y-1.5">
                  {withRecipeEntries.map((e) => (
                    <label
                      key={e.id}
                      className="flex items-center gap-3 rounded-xl border border-[hsl(var(--app-border))] px-3 py-2"
                    >
                      <Checkbox
                        checked={!!selectedEntries[e.id]}
                        onCheckedChange={(v) =>
                          setSelectedEntries((s) => ({ ...s, [e.id]: !!v }))
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[hsl(var(--app-foreground))] truncate">
                          {e.recipe?.title}
                        </p>
                        <p className="text-xs text-[hsl(var(--app-muted))]">
                          {e.date} · {e.meal_type} · {e.servings} serving
                          {e.servings === 1 ? "" : "s"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                {customEntries.length > 0 && (
                  <p className="text-xs text-[hsl(var(--app-muted))] pt-1">
                    {customEntries.length} custom meal
                    {customEntries.length === 1 ? "" : "s"} skipped (no linked recipe).
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {rows.length === 0 ? (
              <div className="rounded-2xl bg-[hsl(var(--app-subtle))] p-4 text-sm text-[hsl(var(--app-muted))]">
                Nothing to add — your pantry already covers everything.
              </div>
            ) : (
              rows.map((row) => (
                <div
                  key={row.key}
                  className={cn(
                    "rounded-2xl border p-3 space-y-2",
                    row.included
                      ? "bg-white border-[hsl(var(--app-border))]"
                      : "bg-[hsl(var(--app-subtle))] border-[hsl(var(--app-border))] opacity-70",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={row.included}
                      onCheckedChange={(v) => updateRow(row.key, { included: !!v })}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(row.key, { name: e.target.value })}
                        className="h-9 rounded-lg font-semibold"
                      />
                      <p className="text-[11px] text-[hsl(var(--app-muted))]">
                        From: {row.sourceLabel || "recipe"}
                        {row.requiredQty != null && (
                          <> · Required {formatQuantityUnit(row.requiredQty, row.requiredUnit)}</>
                        )}
                        {row.pantryQty != null && (
                          <> · Pantry {formatQuantityUnit(row.pantryQty, row.pantryUnit)}</>
                        )}
                      </p>
                      {row.warning && (
                        <p className="text-[11px] text-[hsl(var(--app-warning))] flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {row.warning}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeRow(row.key)}
                      aria-label="Remove item"
                      className="text-[hsl(var(--app-muted))] p-1 no-tap-highlight"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      inputMode="decimal"
                      placeholder="Qty"
                      value={row.missingQty != null ? String(row.missingQty) : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateRow(row.key, {
                          missingQty: v === "" ? null : Number(v),
                        });
                      }}
                      className="h-10 rounded-lg"
                    />
                    <Select
                      value={row.missingUnit ?? "__none"}
                      onValueChange={(v) =>
                        updateRow(row.key, {
                          missingUnit: v === "__none" ? null : (v as UnitType),
                        })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">—</SelectItem>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={row.category ?? "Other"}
                      onValueChange={(v) => updateRow(row.key, { category: v })}
                    >
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <SheetFooter className="px-5 pb-6 pt-2 flex-row gap-3">
          {step === "config" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={buildReview}
                disabled={entriesLoading || withRecipeEntries.length === 0}
                className="flex-1 h-12 rounded-xl bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
              >
                Review list
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => setStep("config")}
                disabled={bulk.isPending}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={confirm}
                disabled={bulk.isPending || included.length === 0}
                className="flex-1 h-12 rounded-xl bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
              >
                {bulk.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Add {included.length} item{included.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default GenerateGrocerySheet;
