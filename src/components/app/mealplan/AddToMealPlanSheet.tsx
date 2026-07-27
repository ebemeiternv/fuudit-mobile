import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Minus, Plus, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/queries/useProfile";
import {
  useAddToMealPlan,
  useUpdateMealPlanEntry,
  type AddToMealPlanPayload,
} from "@/hooks/queries/useMealPlan";
import { toast } from "@/hooks/use-toast";
import {
  addDays,
  shortHumanDate,
  shortWeekday,
  todayLocalIso,
  toLocalIsoDate,
} from "@/lib/dates";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type MealType = Database["public"]["Enums"]["meal_type"];

const SLOTS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

const contextualSlot = (): MealType => {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
};

export type AddToMealPlanSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is being added — recipe (local), spoonacular id, or a blank custom slot. */
  payload: AddToMealPlanPayload | null;
  /** Optional preview text — e.g. recipe title — shown in the header. */
  title?: string;
  /** Default date (YYYY-MM-DD, local). Falls back to today. */
  defaultDate?: string;
  /** Default meal slot. Falls back to a time-of-day guess. */
  defaultMealType?: MealType;
  /** Optional edit mode — patches an existing entry instead of creating. */
  editEntryId?: string;
  /** When editing, provide the existing values so the sheet is pre-filled. */
  editInitial?: {
    date: string;
    mealType: MealType;
    servings: number;
    notes?: string | null;
    customTitle?: string | null;
  };
  onSuccess?: () => void;
};

const AddToMealPlanSheet = ({
  open,
  onOpenChange,
  payload,
  title,
  defaultDate,
  defaultMealType,
  editEntryId,
  editInitial,
  onSuccess,
}: AddToMealPlanSheetProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const householdServings = Math.max(1, profile?.household_size ?? 1);

  const addMut = useAddToMealPlan(user?.id);
  const updateMut = useUpdateMealPlanEntry(user?.id);

  const [date, setDate] = useState<string>(defaultDate ?? todayLocalIso());
  const [mealType, setMealType] = useState<MealType>(
    defaultMealType ?? contextualSlot(),
  );
  const [servings, setServings] = useState<number>(householdServings);
  const [notes, setNotes] = useState<string>("");
  const [customTitle, setCustomTitle] = useState<string>("");

  // Reset form when the sheet opens with a new payload/edit target.
  useEffect(() => {
    if (!open) return;
    if (editEntryId && editInitial) {
      setDate(editInitial.date);
      setMealType(editInitial.mealType);
      setServings(editInitial.servings || householdServings);
      setNotes(editInitial.notes ?? "");
      setCustomTitle(editInitial.customTitle ?? "");
    } else {
      setDate(defaultDate ?? todayLocalIso());
      setMealType(defaultMealType ?? contextualSlot());
      setServings(householdServings);
      setNotes("");
      setCustomTitle("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editEntryId]);

  const isCustom = payload?.kind === "custom" || (!!editEntryId && !title && !!editInitial?.customTitle);

  const dateChoices = useMemo(() => {
    const anchor = new Date();
    anchor.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => addDays(anchor, i));
  }, []);

  const busy = addMut.isPending || updateMut.isPending;

  const canSubmit = (() => {
    if (busy) return false;
    if (!user) return false;
    if (isCustom && !customTitle.trim()) return false;
    if (!editEntryId && !payload) return false;
    return true;
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      if (editEntryId) {
        await updateMut.mutateAsync({
          id: editEntryId,
          patch: {
            date,
            meal_type: mealType,
            servings,
            notes: notes.trim() ? notes.trim() : null,
            ...(isCustom ? { custom_title: customTitle.trim() } : {}),
          },
        });
        toast({ title: "Meal updated" });
      } else {
        const effective: AddToMealPlanPayload = isCustom
          ? { kind: "custom", customTitle: customTitle.trim() }
          : payload!;
        await addMut.mutateAsync({
          payload: effective,
          date,
          mealType,
          servings,
          notes: notes.trim() || null,
        });
        toast({
          title: "Added to meal plan",
          description: `${SLOTS.find((s) => s.value === mealType)?.label} · ${shortHumanDate(
            new Date(date + "T00:00:00"),
          )}`,
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast({
        title: editEntryId ? "Couldn't update meal" : "Couldn't add to meal plan",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[hsl(var(--app-border))] bg-white p-0 max-h-[92dvh] overflow-y-auto"
      >
        <SheetHeader className="px-5 pt-5 pb-2 text-left">
          <SheetTitle className="text-xl font-bold text-[hsl(var(--app-foreground))]">
            {editEntryId ? "Edit meal" : "Add to meal plan"}
          </SheetTitle>
          {(title || isCustom) && !editEntryId && (
            <SheetDescription className="text-sm text-[hsl(var(--app-muted))] line-clamp-2">
              {isCustom ? "Add a meal without a recipe" : title}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          {isCustom && (
            <div className="space-y-2">
              <Label htmlFor="meal-title" className="text-sm font-semibold">
                Meal name
              </Label>
              <Input
                id="meal-title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Leftover pasta"
                className="h-12 rounded-2xl border-[hsl(var(--app-border))]"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> Date
            </Label>
            <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar">
              {dateChoices.map((d) => {
                const iso = toLocalIsoDate(d);
                const selected = iso === date;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setDate(iso)}
                    className={cn(
                      "shrink-0 flex flex-col items-center justify-center h-16 w-14 rounded-2xl transition-all no-tap-highlight border",
                      selected
                        ? "bg-[hsl(var(--app-primary))] text-white border-transparent shadow-md"
                        : "bg-white border-[hsl(var(--app-border))] text-[hsl(var(--app-foreground))]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        selected ? "text-white/80" : "text-[hsl(var(--app-muted))]",
                      )}
                    >
                      {shortWeekday(d)}
                    </span>
                    <span className="text-base font-bold mt-0.5">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Meal</Label>
            <div className="grid grid-cols-4 gap-2">
              {SLOTS.map((s) => {
                const selected = s.value === mealType;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setMealType(s.value)}
                    className={cn(
                      "h-11 rounded-2xl text-sm font-semibold border transition-all no-tap-highlight",
                      selected
                        ? "bg-[hsl(var(--app-primary))] text-white border-transparent shadow-md"
                        : "bg-white border-[hsl(var(--app-border))] text-[hsl(var(--app-foreground))]",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Servings</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                className="h-11 w-11 rounded-2xl border border-[hsl(var(--app-border))] grid place-items-center active:scale-95 transition-transform"
                aria-label="Decrease servings"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 h-11 rounded-2xl bg-[hsl(var(--app-subtle))] grid place-items-center font-semibold text-[hsl(var(--app-foreground))]">
                {servings} {servings === 1 ? "serving" : "servings"}
              </div>
              <button
                type="button"
                onClick={() => setServings((s) => Math.min(20, s + 1))}
                className="h-11 w-11 rounded-2xl border border-[hsl(var(--app-border))] grid place-items-center active:scale-95 transition-transform"
                aria-label="Increase servings"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {profile?.household_size ? (
              <p className="text-xs text-[hsl(var(--app-muted))]">
                Default {profile.household_size} from your household size.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="meal-notes" className="text-sm font-semibold">
              Notes <span className="text-[hsl(var(--app-muted))] font-normal">(optional)</span>
            </Label>
            <Textarea
              id="meal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember?"
              rows={2}
              className="rounded-2xl border-[hsl(var(--app-border))] resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[hsl(var(--app-border))] px-5 py-4 safe-bottom">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-2xl bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white font-semibold"
          >
            {busy ? "Saving…" : editEntryId ? "Save changes" : "Add to meal plan"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddToMealPlanSheet;
