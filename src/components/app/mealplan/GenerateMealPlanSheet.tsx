import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Minus, Plus, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/queries/useProfile";
import { usePantryItems } from "@/hooks/queries/usePantryItems";
import { parsePlanningDefaults } from "@/lib/planningDefaults";
import { shortWeekday, todayLocalIso } from "@/lib/dates";
import { buildSlots, type DraftPlan, type MealType, type PlanSlot } from "@/lib/mealPlan/draft";
import { fetchCandidates, generateMealPlan, GenerateError } from "@/lib/mealPlan/generate";
import type { MealPlanEntryWithRecipe } from "@/repositories/mealPlan";

const MEAL_SLOTS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

const COOKING_OPTIONS = [15, 30, 45, 60];

const NUTRITION_OPTIONS: { value: string; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "high_protein", label: "High protein" },
  { value: "family_friendly", label: "Family friendly" },
  { value: "low_carb", label: "Low carb" },
];

type ChipProps = { active: boolean; onClick: () => void; children: React.ReactNode };
const Chip = ({ active, onClick, children }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "min-h-[44px] px-4 rounded-full border text-sm font-medium transition-colors no-tap-highlight",
      active
        ? "bg-[hsl(var(--app-primary))] border-[hsl(var(--app-primary))] text-white"
        : "bg-[hsl(var(--app-subtle))] border-[hsl(var(--app-border))] text-[hsl(var(--app-foreground))]",
    )}
  >
    {children}
  </button>
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ISO dates of the week currently in view. */
  weekDays: string[];
  entries: MealPlanEntryWithRecipe[];
  onGenerated: (draft: DraftPlan) => void;
};

const GenerateMealPlanSheet = ({ open, onOpenChange, weekDays, entries, onGenerated }: Props) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: pantry = [] } = usePantryItems(user?.id);

  const defaults = useMemo(
    () =>
      parsePlanningDefaults(
        (profile as { planning_defaults?: unknown } | null | undefined)?.planning_defaults,
      ),
    [profile],
  );

  const todayIso = todayLocalIso();
  const plannableDays = useMemo(
    () => weekDays.filter((d) => d >= todayIso),
    [weekDays, todayIso],
  );

  const [days, setDays] = useState<string[]>([]);
  const [meals, setMeals] = useState<MealType[]>([]);
  const [servings, setServings] = useState(1);
  const [maxCooking, setMaxCooking] = useState<number | null>(null);
  const [prioritizePantry, setPrioritizePantry] = useState(true);
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(true);
  const [styles, setStyles] = useState<string[]>([]);
  const [occupiedMode, setOccupiedMode] = useState<"keep" | "replace">("keep");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDays(plannableDays);
    setMeals((defaults.meals as MealType[]).length ? (defaults.meals as MealType[]) : ["lunch", "dinner"]);
    setServings(profile?.household_size ?? 1);
    setMaxCooking(defaults.maxCookingMinutes);
    setPrioritizePantry(defaults.prioritizePantry);
    setPrioritizeExpiring(defaults.prioritizeExpiring);
    setStyles(defaults.nutritionStyles);
    setOccupiedMode("keep");
    setBusy(false);
  }, [open, plannableDays, defaults, profile]);

  const allSlots = useMemo(
    () => buildSlots(days, meals, entries),
    [days, meals, entries],
  );
  const occupiedCount = allSlots.filter((s) => s.occupiedBy).length;
  const openSlots: PlanSlot[] =
    occupiedMode === "replace" ? allSlots : allSlots.filter((s) => !s.occupiedBy);
  const keptSlots = occupiedMode === "replace" ? [] : allSlots.filter((s) => s.occupiedBy);

  const diets = profile?.dietary_preferences ?? [];
  const allergies = profile?.allergies ?? [];

  const toggleDay = (d: string) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  const toggleMeal = (m: MealType) =>
    setMeals((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  const toggleStyle = (s: string) =>
    setStyles((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const generate = async () => {
    if (!openSlots.length || busy) return;
    setBusy(true);
    try {
      const constraints = {
        servings,
        diets,
        allergies,
        maxCookingMinutes: maxCooking,
        prioritizePantry,
        prioritizeExpiring,
        nutritionStyles: styles,
      };
      const candidates = await fetchCandidates({
        mealTypes: [...new Set(openSlots.map((s) => s.mealType))],
        pantry,
        constraints,
      });
      const result = await generateMealPlan({ slots: openSlots, candidates, constraints });
      if (!result.meals.length) {
        toast({
          title: "No plan this time",
          description:
            "I couldn't find safe recipes for those slots. Try different days or meals — or plan them manually.",
        });
        return;
      }
      onGenerated({
        meals: result.meals,
        unresolved: result.unresolved,
        kept: keptSlots,
      });
      onOpenChange(false);
    } catch (err) {
      const code = err instanceof GenerateError ? err.code : "unknown_error";
      toast({
        title: code === "no_candidates" ? "No recipes found" : "Couldn't generate a plan",
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90dvh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Generate with Fuudit</SheetTitle>
          <SheetDescription>
            A draft plan built around your kitchen — nothing is saved until you accept it.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--app-foreground))] mb-2">Days</p>
            <div className="flex flex-wrap gap-2">
              {plannableDays.map((iso) => (
                <Chip key={iso} active={days.includes(iso)} onClick={() => toggleDay(iso)}>
                  {shortWeekday(new Date(iso + "T00:00:00"))} {Number(iso.slice(8, 10))}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[hsl(var(--app-foreground))] mb-2">Meals</p>
            <div className="flex flex-wrap gap-2">
              {MEAL_SLOTS.map((m) => (
                <Chip key={m.value} active={meals.includes(m.value)} onClick={() => toggleMeal(m.value)}>
                  {m.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm">Servings per meal</Label>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                aria-label="Fewer servings"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                className="h-11 w-11 rounded-xl bg-[hsl(var(--app-subtle))] grid place-items-center active:scale-95 transition-transform"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--app-foreground))]">{servings}</p>
                <p className="text-xs text-[hsl(var(--app-muted))]">per meal</p>
              </div>
              <button
                type="button"
                aria-label="More servings"
                onClick={() => setServings((s) => Math.min(12, s + 1))}
                className="h-11 w-11 rounded-xl bg-[hsl(var(--app-subtle))] grid place-items-center active:scale-95 transition-transform"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[hsl(var(--app-foreground))] mb-2">
              Cooking time
            </p>
            <div className="flex flex-wrap gap-2">
              {COOKING_OPTIONS.map((n) => (
                <Chip
                  key={n}
                  active={maxCooking === n}
                  onClick={() => setMaxCooking((cur) => (cur === n ? null : n))}
                >
                  Up to {n} min
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[hsl(var(--app-foreground))] mb-2">
              Priorities
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip active={prioritizePantry} onClick={() => setPrioritizePantry((v) => !v)}>
                Use what I have
              </Chip>
              <Chip active={prioritizeExpiring} onClick={() => setPrioritizeExpiring((v) => !v)}>
                Rescue expiring food
              </Chip>
              {NUTRITION_OPTIONS.map((s) => (
                <Chip key={s.value} active={styles.includes(s.value)} onClick={() => toggleStyle(s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          {occupiedCount > 0 && (
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--app-foreground))] mb-2">
                Already-planned meals ({occupiedCount})
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip active={occupiedMode === "keep"} onClick={() => setOccupiedMode("keep")}>
                  Keep them
                </Chip>
                <Chip active={occupiedMode === "replace"} onClick={() => setOccupiedMode("replace")}>
                  Replace them
                </Chip>
              </div>
            </div>
          )}

          {(diets.length > 0 || allergies.length > 0) && (
            <div className="rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-subtle))] p-3 flex gap-2.5">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--app-primary))]" />
              <p className="text-xs text-[hsl(var(--app-muted))] leading-relaxed">
                Always applied from your profile and never relaxed:
                {allergies.length > 0 && <> allergies — {allergies.join(", ")}.</>}
                {diets.length > 0 && <> diet — {diets.join(", ")}.</>}
              </p>
            </div>
          )}
        </div>

        <SheetFooter className="safe-bottom">
          <Button
            onClick={generate}
            disabled={busy || !openSlots.length || !days.length || !meals.length}
            className="w-full h-12 rounded-xl font-semibold bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Planning {openSlots.length} meal
                {openSlots.length === 1 ? "" : "s"}…
              </span>
            ) : (
              "Generate plan"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default GenerateMealPlanSheet;
