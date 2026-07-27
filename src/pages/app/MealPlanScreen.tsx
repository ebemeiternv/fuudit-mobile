import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, CalendarCheck, ShoppingBag } from "lucide-react";
import GenerateGrocerySheet from "@/components/app/grocery/GenerateGrocerySheet";
import { useGroceryItems } from "@/hooks/queries/useGroceryItems";
import ScreenHeader from "@/components/app/ScreenHeader";
import LoadingState from "@/components/app/states/LoadingState";
import ErrorState from "@/components/app/states/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import {
  useMealPlan,
  useDeleteMealPlanEntry,
} from "@/hooks/queries/useMealPlan";
import AddToMealPlanSheet from "@/components/app/mealplan/AddToMealPlanSheet";
import MealPlanEntryCard from "@/components/app/mealplan/MealPlanEntryCard";
import {
  addDays,
  humanDate,
  isSameLocalDate,
  parseLocalIsoDate,
  shortWeekday,
  startOfWeekMonday,
  toLocalIsoDate,
} from "@/lib/dates";
import type { Database } from "@/integrations/supabase/types";
import type { MealPlanEntryWithRecipe } from "@/repositories/mealPlan";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type MealType = Database["public"]["Enums"]["meal_type"];

const SLOTS: { value: MealType; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🥣" },
  { value: "lunch", label: "Lunch", emoji: "🥗" },
  { value: "dinner", label: "Dinner", emoji: "🍲" },
  { value: "snack", label: "Snack", emoji: "🍎" },
];

type SheetState =
  | { mode: "closed" }
  | { mode: "add"; date: string; mealType: MealType }
  | { mode: "edit"; entry: MealPlanEntryWithRecipe };

const MealPlanScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [selected, setSelected] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [generateOpen, setGenerateOpen] = useState(false);
  const { data: groceryItems = [] } = useGroceryItems(userId);

  const weekStart = useMemo(() => startOfWeekMonday(selected), [selected]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const fromIso = toLocalIsoDate(weekStart);
  const toIso = toLocalIsoDate(addDays(weekStart, 6));

  const { data: entries = [], isLoading, isError, refetch } = useMealPlan(userId, fromIso, toIso);
  const deleteMut = useDeleteMealPlanEntry(userId);

  const selectedIso = toLocalIsoDate(selected);
  const entriesForDay = useMemo(
    () => entries.filter((e) => e.date === selectedIso),
    [entries, selectedIso],
  );

  const entriesBySlot = useMemo(() => {
    const m: Record<MealType, MealPlanEntryWithRecipe[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const e of entriesForDay) m[e.meal_type].push(e);
    return m;
  }, [entriesForDay]);

  const weekCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.date, (m.get(e.date) ?? 0) + 1);
    return m;
  }, [entries]);

  const isToday = isSameLocalDate(selected, new Date());
  const totalWeek = entries.length;

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: "Meal removed" });
    } catch {
      toast({ title: "Couldn't remove meal", variant: "destructive" });
    }
  };

  return (
    <div>
      <ScreenHeader
        title="Meal plan"
        subtitle={
          totalWeek > 0
            ? `This week · ${totalWeek} meal${totalWeek === 1 ? "" : "s"} planned`
            : "Plan your week, meal by meal"
        }
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGenerateOpen(true)}
              aria-label="Generate grocery list from meal plan"
              className="h-11 px-3 rounded-full bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform no-tap-highlight"
            >
              <ShoppingBag className="h-4 w-4" /> List
            </button>
            <button
              onClick={() =>
                setSheet({
                  mode: "add",
                  date: selectedIso,
                  mealType: contextualSlot(),
                })
              }
              aria-label="Add meal"
              className="h-11 w-11 rounded-full bg-[hsl(var(--app-primary))] text-white grid place-items-center shadow-md no-tap-highlight active:scale-95 transition-transform"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="px-5 space-y-5">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <button
            aria-label="Previous week"
            onClick={() => setSelected((d) => addDays(d, -7))}
            className="h-9 w-9 rounded-full bg-white border border-[hsl(var(--app-border))] grid place-items-center active:scale-95 transition-transform no-tap-highlight"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-[hsl(var(--app-foreground))]">
              {humanDate(selected)}
            </p>
            {!isToday && (
              <button
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setSelected(d);
                }}
                className="text-xs text-[hsl(var(--app-primary))] font-semibold mt-0.5"
              >
                Jump to today
              </button>
            )}
          </div>
          <button
            aria-label="Next week"
            onClick={() => setSelected((d) => addDays(d, 7))}
            className="h-9 w-9 rounded-full bg-white border border-[hsl(var(--app-border))] grid place-items-center active:scale-95 transition-transform no-tap-highlight"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Weekly day selector */}
        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar">
          {weekDays.map((d) => {
            const iso = toLocalIsoDate(d);
            const isSelected = iso === selectedIso;
            const today = isSameLocalDate(d, new Date());
            const count = weekCounts.get(iso) ?? 0;
            return (
              <button
                key={iso}
                onClick={() => setSelected(d)}
                className={cn(
                  "shrink-0 flex flex-col items-center justify-center h-16 w-14 rounded-2xl transition-all no-tap-highlight border relative",
                  isSelected
                    ? "bg-[hsl(var(--app-primary))] text-white border-transparent shadow-md"
                    : "bg-white border-[hsl(var(--app-border))] text-[hsl(var(--app-foreground))]",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isSelected ? "text-white/80" : "text-[hsl(var(--app-muted))]",
                  )}
                >
                  {shortWeekday(d)}
                </span>
                <span className="text-lg font-bold mt-0.5">{d.getDate()}</span>
                {today && !isSelected && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[hsl(var(--app-primary))]" />
                )}
                {count > 0 && (
                  <span
                    className={cn(
                      "absolute bottom-1 h-1 w-4 rounded-full",
                      isSelected ? "bg-white/70" : "bg-[hsl(var(--app-primary))]/50",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <LoadingState label="Loading your plan…" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load your meal plan"
            description="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : (
          <section className="space-y-4">
            {SLOTS.map((slot) => {
              const items = entriesBySlot[slot.value];
              return (
                <div key={slot.value} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--app-primary))]">
                      {slot.emoji} {slot.label}
                    </p>
                    <button
                      onClick={() =>
                        setSheet({ mode: "add", date: selectedIso, mealType: slot.value })
                      }
                      className="text-xs font-semibold text-[hsl(var(--app-primary))] flex items-center gap-1 no-tap-highlight active:opacity-70"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <button
                      onClick={() =>
                        setSheet({ mode: "add", date: selectedIso, mealType: slot.value })
                      }
                      className="app-card-flat w-full p-4 flex items-center gap-3 text-left border border-dashed border-[hsl(var(--app-border))] hover:border-[hsl(var(--app-primary))]/40 active:scale-[0.99] transition-transform no-tap-highlight"
                    >
                      <div className="h-10 w-10 rounded-xl bg-[hsl(var(--app-subtle))] grid place-items-center text-[hsl(var(--app-muted))]">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-[hsl(var(--app-muted))]">
                        Plan a {slot.label.toLowerCase()}
                      </span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {items.map((entry) => (
                        <MealPlanEntryCard
                          key={entry.id}
                          entry={entry}
                          onEdit={() => setSheet({ mode: "edit", entry })}
                          onMove={() => setSheet({ mode: "edit", entry })}
                          onDelete={() => handleDelete(entry.id)}
                          deleting={deleteMut.isPending}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {entriesForDay.length === 0 && (
              <div className="app-card-flat p-6 text-center flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <p className="font-semibold text-[hsl(var(--app-foreground))] text-sm">
                  Nothing planned yet
                </p>
                <p className="text-xs text-[hsl(var(--app-muted))] max-w-xs">
                  Add a saved recipe, a Discover result, or a custom meal to any slot above.
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      <AddToMealPlanSheet
        open={sheet.mode !== "closed"}
        onOpenChange={(o) => !o && setSheet({ mode: "closed" })}
        payload={
          sheet.mode === "add"
            ? { kind: "custom", customTitle: "" }
            : sheet.mode === "edit"
              ? sheet.entry.recipe
                ? { kind: "recipe", recipeId: sheet.entry.recipe.id }
                : { kind: "custom", customTitle: sheet.entry.custom_title ?? "" }
              : null
        }
        title={sheet.mode === "edit" ? sheet.entry.recipe?.title ?? undefined : undefined}
        defaultDate={sheet.mode === "add" ? sheet.date : undefined}
        defaultMealType={sheet.mode === "add" ? sheet.mealType : undefined}
        editEntryId={sheet.mode === "edit" ? sheet.entry.id : undefined}
        editInitial={
          sheet.mode === "edit"
            ? {
                date: sheet.entry.date,
                mealType: sheet.entry.meal_type,
                servings: sheet.entry.servings,
                notes: sheet.entry.notes,
                customTitle: sheet.entry.custom_title,
              }
            : undefined
        }
      />

      <GenerateGrocerySheet
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        defaultFrom={fromIso}
        defaultTo={toIso}
        existingPending={groceryItems.filter((i) => !i.checked)}
      />
    </div>
  );
};

const contextualSlot = (): MealType => {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
};

export default MealPlanScreen;
