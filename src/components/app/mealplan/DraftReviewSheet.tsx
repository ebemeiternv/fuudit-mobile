import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, RefreshCw, Trash2, Leaf, Timer, Users, Wallet, ChefHat, Sprout } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAddToMealPlan } from "@/hooks/queries/useMealPlan";
import { usePantryItems } from "@/hooks/queries/usePantryItems";
import { shortWeekday } from "@/lib/dates";
import { evaluateDraft, mealReasons } from "@/lib/mealPlan/planCost";
import type { DraftMeal, DraftPlan, PlanSlot } from "@/lib/mealPlan/draft";

type Props = {
  open: boolean;
  draft: DraftPlan | null;
  onClose: () => void;
  /** Called with the updated draft after remove/regenerate. */
  onDraftChange: (draft: DraftPlan) => void;
  /** Regenerate a single slot; resolves to the replacement meal or null. */
  onRegenerateSlot: (slot: PlanSlot, excludeIds: number[]) => Promise<DraftMeal | null>;
  /** Ask Fuudit to write an original recipe for a slot the catalogue can't fill. */
  onInventSlot: (slot: PlanSlot) => Promise<DraftMeal | null>;
  /** Called after a successful accept with how many meals were saved. */
  onAccepted: (count: number) => void;
};

const SLOT_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const DraftReviewSheet = ({
  open,
  draft,
  onClose,
  onDraftChange,
  onRegenerateSlot,
  onInventSlot,
  onAccepted,
}: Props) => {
  const { user } = useAuth();
  const addToPlan = useAddToMealPlan(user?.id);
  const [accepting, setAccepting] = useState(false);
  const [busySlot, setBusySlot] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, DraftMeal[]>();
    for (const meal of draft?.meals ?? []) {
      const list = m.get(meal.date) ?? [];
      list.push(meal);
      m.set(meal.date, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.slotId.localeCompare(b.slotId));
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [draft]);

  const pantryCount = useMemo(
    () => new Set((draft?.meals ?? []).flatMap((m) => m.pantryUsed)).size,
    [draft],
  );
  const rescuedCount = useMemo(
    () => new Set((draft?.meals ?? []).flatMap((m) => m.expiringUsed)).size,
    [draft],
  );

  // Whole-plan cost evaluation. Recomputed on every draft change, so removing
  // or regenerating one meal always refreshes the entire summary.
  const { data: pantry = [] } = usePantryItems(user?.id);
  const budget = draft?.budget ?? null;
  const cost = useMemo(
    () =>
      draft && budget
        ? evaluateDraft(draft.meals, pantry, budget, budget.currency)
        : null,
    [draft, pantry, budget],
  );

  if (!draft) return null;

  const removeMeal = (slotId: string) => {
    const meal = draft.meals.find((m) => m.slotId === slotId);
    const slot = meal
      ? { slotId: meal.slotId, date: meal.date, mealType: meal.mealType, occupiedBy: null }
      : null;
    onDraftChange({
      ...draft,
      meals: draft.meals.filter((m) => m.slotId !== slotId),
      unresolved: slot ? [...draft.unresolved, slot] : draft.unresolved,
    });
  };

  const regenerate = async (slot: PlanSlot) => {
    if (busySlot) return;
    setBusySlot(slot.slotId);
    try {
      const excludeIds = draft.meals
        .map((m) => m.spoonId)
        .filter((id): id is number => id != null);
      const replacement = await onRegenerateSlot(slot, excludeIds);
      if (replacement) {
        onDraftChange({
          ...draft,
          meals: [...draft.meals.filter((m) => m.slotId !== slot.slotId), replacement],
          unresolved: draft.unresolved.filter((s) => s.slotId !== slot.slotId),
        });
      } else {
        toast({
          title: "Couldn't find an alternative",
          description: "Try removing the meal and planning it manually.",
          variant: "destructive",
        });
      }
    } finally {
      setBusySlot(null);
    }
  };

  const invent = async (slot: PlanSlot) => {
    if (busySlot) return;
    setBusySlot(slot.slotId);
    try {
      const written = await onInventSlot(slot);
      if (written) {
        onDraftChange({
          ...draft,
          meals: [...draft.meals.filter((m) => m.slotId !== slot.slotId), written],
          unresolved: draft.unresolved.filter((s) => s.slotId !== slot.slotId),
        });
      } else {
        toast({
          title: "Couldn't write a recipe",
          description: "Try again, or plan this meal manually.",
          variant: "destructive",
        });
      }
    } finally {
      setBusySlot(null);
    }
  };

  const accept = async () => {
    if (accepting || !draft.meals.length) return;
    setAccepting(true);
    let saved = 0;
    const failures: string[] = [];
    try {
      for (const meal of draft.meals) {
        try {
          // The existing save path: full recipe detail is fetched and cached
          // before the meal-plan entry is created — no incomplete records.
          await addToPlan.mutateAsync({
            payload:
              meal.kind === "ai" && meal.aiRecipe
                ? {
                    kind: "ai",
                    recipe: {
                      title: meal.aiRecipe.title,
                      servings: meal.aiRecipe.servings,
                      readyMinutes: meal.aiRecipe.readyMinutes,
                      summary: meal.aiRecipe.summary,
                      ingredients: meal.aiRecipe.ingredients,
                      steps: meal.aiRecipe.steps,
                    },
                  }
                : {
                    kind: "spoon",
                    spoonId: meal.spoonId!,
                    hint: { title: meal.title, image: meal.image },
                  },
            date: meal.date,
            mealType: meal.mealType,
            servings: meal.servings,
          });
          saved += 1;
        } catch (err) {
          console.error("Failed to save generated meal", meal.title, err);
          failures.push(meal.title);
        }
      }
      if (failures.length) {
        toast({
          title: `Saved ${saved} of ${draft.meals.length} meals`,
          description: `Couldn't save: ${failures.join(", ")}. Add them manually from the plan.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Plan saved", description: `${saved} meals added to your week.` });
      }
      if (saved > 0) onAccepted(saved);
      onClose();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !accepting && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Review your plan</SheetTitle>
          <SheetDescription>
            A draft — nothing is saved until you accept it.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-5">
          {!cost && (pantryCount > 0 || rescuedCount > 0) && (
            <div className="flex gap-2">
              {pantryCount > 0 && (
                <div className="flex-1 app-card-flat p-3 text-center">
                  <p className="text-lg font-bold text-[hsl(var(--app-foreground))]">{pantryCount}</p>
                  <p className="text-[11px] font-medium text-[hsl(var(--app-muted))]">
                    pantry ingredient{pantryCount === 1 ? "" : "s"} used
                  </p>
                </div>
              )}
              {rescuedCount > 0 && (
                <div className="flex-1 app-card-flat p-3 text-center">
                  <p className="text-lg font-bold text-[hsl(var(--app-foreground))]">{rescuedCount}</p>
                  <p className="text-[11px] font-medium text-[hsl(var(--app-muted))]">
                    expiring item{rescuedCount === 1 ? "" : "s"} rescued
                  </p>
                </div>
              )}
            </div>
          )}

          {cost && budget && (
            <div className="rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-subtle))] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[hsl(var(--app-primary))]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[hsl(var(--app-foreground))]">
                  Budget for these days
                </p>
              </div>

              <SummaryRow label="Budget" value={`${money(budget.amount)} ${budget.currency}`} />
              <SummaryRow
                label="Estimated shopping"
                value={
                  cost.status.kind === "incomplete"
                    ? `~${money(cost.sim.summary.estimatedPurchaseSpend)} ${budget.currency} + ${cost.status.unpricedCount} unpriced item${cost.status.unpricedCount === 1 ? "" : "s"}`
                    : `~${money(cost.sim.summary.estimatedPurchaseSpend)} ${budget.currency}`
                }
              />

              {cost.status.kind === "complete" ? (
                <SummaryRow
                  label={cost.status.withinBudget ? "Budget remaining" : "Over budget"}
                  value={`~${money(cost.status.withinBudget ? cost.status.remaining : cost.status.overBy)} ${budget.currency}`}
                  strong
                />
              ) : cost.status.kind === "incomplete" ? (
                <>
                  <SummaryRow label="Budget status" value="Incomplete estimate" strong />
                  {cost.status.exceedsOnKnownPrices ? (
                    <SummaryRow
                      label="Priced items alone"
                      value={`~${money(-cost.status.knownPriceHeadroom)} ${budget.currency} over`}
                    />
                  ) : (
                    <SummaryRow
                      label="Known-price headroom"
                      value={`~${money(cost.status.knownPriceHeadroom)} ${budget.currency}`}
                    />
                  )}
                </>
              ) : null}

              <SummaryRow
                label="Pantry ingredients used"
                value={String(cost.sim.summary.pantryIngredientsUsed)}
              />
              <SummaryRow
                label="Expiring ingredients rescued"
                value={String(cost.sim.summary.expiringIngredientsRescued)}
              />
              {cost.sim.summary.purchasedRemainingCount > 0 && (
                <SummaryRow
                  label="Purchased ingredients remaining"
                  value={`${cost.sim.summary.purchasedRemainingCount} · ~${money(cost.sim.summary.estimatedPurchasedRemainingValue)} ${budget.currency}`}
                />
              )}
              <SummaryRow label="Confidence" value={cost.confidenceLabel} />

              {cost.groceryDifferences.length > 0 && (
                <p className="text-[11px] text-[hsl(var(--app-muted))] leading-relaxed pt-1">
                  {cost.groceryDifferences.length} ingredient
                  {cost.groceryDifferences.length === 1 ? "" : "s"} may end up with a slightly
                  different amount on your shopping list.
                </p>
              )}

              <p className="text-[11px] text-[hsl(var(--app-muted))] leading-relaxed pt-1">
                Estimates only — not shop prices. Ingredients you already have are never
                counted as spending, and anything left over from a pack you buy is already
                included in the shopping estimate, not an extra cost.
                {cost.status.kind === "incomplete" &&
                  " Some ingredients have no price we can estimate, so this can't confirm the plan fits."}
                {draft.optimiseRounds
                  ? ` Adjusted ${draft.optimiseRounds} time${draft.optimiseRounds === 1 ? "" : "s"} to bring the cost down.`
                  : ""}
              </p>
            </div>
          )}


          {byDay.map(([date, meals]) => (
            <section key={date} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--app-primary))] px-1">
                {shortWeekday(new Date(date + "T00:00:00"))} {Number(date.slice(8, 10))}
              </p>
              {meals.map((meal) => (
                <div key={meal.slotId} className="app-card p-3.5 flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(var(--app-primary-soft))] to-[hsl(var(--app-accent-sky-soft))] grid place-items-center shrink-0">
                    {meal.image ? (
                      <img src={meal.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xl">🥗</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--app-muted))]">
                        {SLOT_LABEL[meal.mealType] ?? meal.mealType}
                      </p>
                      {meal.kind === "ai" && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))]">
                          <ChefHat className="h-2.5 w-2.5" aria-hidden="true" /> Written by Fuudit
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-[hsl(var(--app-foreground))] line-clamp-2 leading-snug">
                      {meal.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[hsl(var(--app-muted))]">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {meal.servings}
                      </span>
                      {meal.readyMinutes != null && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {meal.readyMinutes} min
                        </span>
                      )}
                      {!cost && meal.pantryUsed.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--app-primary))]">
                          <Leaf className="h-3 w-3" /> uses {meal.pantryUsed.length} you have
                        </span>
                      )}
                      {!cost && meal.expiringUsed.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--app-primary))]">
                          <Timer className="h-3 w-3" /> rescues {meal.expiringUsed.length}
                        </span>
                      )}
                    </div>
                    {cost && budget && (
                      <p className="mt-1 text-[11px] text-[hsl(var(--app-muted))] leading-relaxed">
                        {mealReasons(cost.sim, meal.slotId, budget.currency).join(" · ")}
                      </p>
                    )}
                    {meal.why && (
                      <p className="mt-1 text-[11px] italic text-[hsl(var(--app-foreground))] leading-relaxed">
                        {meal.why}
                      </p>
                    )}
                    {meal.twist && (
                      <p className="mt-1 inline-flex items-start gap-1 text-[11px] text-[hsl(var(--app-primary))] leading-relaxed">
                        <Sprout className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{meal.twist}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label={`Regenerate ${SLOT_LABEL[meal.mealType]}`}
                      disabled={busySlot !== null || accepting}
                      onClick={() =>
                        regenerate({
                          slotId: meal.slotId,
                          date: meal.date,
                          mealType: meal.mealType,
                          occupiedBy: null,
                        })
                      }
                      className="h-11 w-11 rounded-full bg-white border border-[hsl(var(--app-border))] grid place-items-center active:scale-95 transition-transform disabled:opacity-40 no-tap-highlight"
                    >
                      {busySlot === meal.slotId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${meal.title}`}
                      disabled={busySlot !== null || accepting}
                      onClick={() => removeMeal(meal.slotId)}
                      className="h-11 w-11 rounded-full bg-white border border-[hsl(var(--app-border))] grid place-items-center text-[hsl(var(--app-danger))] active:scale-95 transition-transform disabled:opacity-40 no-tap-highlight"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}

          {draft.unresolved.length > 0 && (
            <section className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--app-muted))] px-1">
                Needs your touch
              </p>
              {draft.unresolved.map((slot) => (
                <div
                  key={slot.slotId}
                  className="app-card-flat p-3.5 flex items-center gap-3 border border-dashed border-[hsl(var(--app-border))]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--app-foreground))]">
                      {SLOT_LABEL[slot.mealType]} · {shortWeekday(new Date(slot.date + "T00:00:00"))}{" "}
                      {Number(slot.date.slice(8, 10))}
                    </p>
                    <p className="text-xs text-[hsl(var(--app-muted))]">
                      No safe recipe found — retry, let Fuudit write one, or plan it manually.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Retry ${SLOT_LABEL[slot.mealType]}`}
                    disabled={busySlot !== null || accepting}
                    onClick={() => regenerate(slot)}
                    className="h-11 w-11 rounded-full bg-white border border-[hsl(var(--app-border))] grid place-items-center active:scale-95 transition-transform disabled:opacity-40 no-tap-highlight"
                  >
                    {busySlot === slot.slotId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Let Fuudit write a ${SLOT_LABEL[slot.mealType]} recipe`}
                    disabled={busySlot !== null || accepting}
                    onClick={() => invent(slot)}
                    className="h-11 w-11 rounded-full bg-[hsl(var(--app-primary))] text-white grid place-items-center active:scale-95 transition-transform disabled:opacity-40 no-tap-highlight"
                  >
                    <ChefHat className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>

        <SheetFooter className="safe-bottom flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 rounded-xl"
            onClick={onClose}
            disabled={accepting}
          >
            Discard
          </Button>
          <Button
            onClick={accept}
            disabled={accepting || !draft.meals.length}
            className="flex-1 h-12 rounded-xl font-semibold bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
          >
            {accepting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </span>
            ) : (
              `Accept plan (${draft.meals.length})`
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

const money = (n: number) => Math.round(n).toLocaleString();

const SummaryRow = ({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-xs text-[hsl(var(--app-muted))]">{label}</span>
    <span
      className={
        strong
          ? "text-sm font-bold text-[hsl(var(--app-foreground))]"
          : "text-sm font-medium text-[hsl(var(--app-foreground))]"
      }
    >
      {value}
    </span>
  </div>
);

export default DraftReviewSheet;
