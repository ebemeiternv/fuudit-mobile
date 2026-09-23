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
import { Input } from "@/components/ui/input";
import { ChevronDown, Loader2, Minus, Plus, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/queries/useProfile";
import { usePantryItems } from "@/hooks/queries/usePantryItems";
import {
  BUDGET_PERIODS,
  SUPPORTED_CURRENCIES,
  parsePlanningDefaults,
  type BudgetPeriod,
} from "@/lib/planningDefaults";
import { shortWeekday, todayLocalIso } from "@/lib/dates";
import { buildSlots, type DraftMeal, type DraftPlan, type MealType, type PlanSlot } from "@/lib/mealPlan/draft";
import { fetchCandidates, generateMealPlan, inventMeals, GenerateError } from "@/lib/mealPlan/generate";
import { derivePlanningBudget } from "@/lib/mealPlan/budget";
import { simulatePlan } from "@/lib/mealPlan/inventory";
import { createPlanResolver, draftToSimMeals, toSimPantry } from "@/lib/mealPlan/planCost";
import { optimizePlan } from "@/lib/mealPlan/optimize";
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
  /** Let Fuudit write original recipes for slots the catalogue can't fill. */
  const [allowInvented, setAllowInvented] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  // Optional budget — off by default. These are one-session overrides and never
  // change the saved profile defaults.
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetOn, setBudgetOn] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState<string>("SEK");
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>("weekly");
  const [bufferPercent, setBufferPercent] = useState(10);

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
    setAllowInvented(true);
    setBusy(false);
    setBusyLabel(null);
    setBudgetOn(false);
    setBudgetOpen(false);
    setBudgetAmount(defaults.budget.amount != null ? String(defaults.budget.amount) : "");
    setBudgetCurrency(defaults.budget.currency);
    setBudgetPeriod(defaults.budget.period);
    setBufferPercent(defaults.budget.bufferPercent);
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

  const parsedAmount = Number(budgetAmount.replace(",", "."));
  const planningBudget = useMemo(() => {
    if (!budgetOn || !(parsedAmount > 0) || !days.length) return null;
    return derivePlanningBudget(
      {
        amount: parsedAmount,
        currency: budgetCurrency,
        period: budgetPeriod,
        customDays: defaults.budget.customDays,
        bufferPercent,
      },
      { days },
    );
  }, [budgetOn, parsedAmount, budgetCurrency, budgetPeriod, bufferPercent, days, defaults]);

  const generate = async () => {
    if (!openSlots.length || busy) return;
    setBusy(true);
    setBusyLabel(null);
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

      let finalMeals = result.meals;
      let rounds = 0;

      // Budget-aware optimisation. Every number below comes from the
      // deterministic simulation — the planner is only asked for alternatives.
      if (planningBudget) {
        setBusyLabel("Checking the cost");
        const currency = planningBudget.currency;
        const simPantry = toSimPantry(pantry);
        const resolver = createPlanResolver(pantry, currency);
        const slotById = new Map(openSlots.map((s) => [s.slotId, s]));

        const optimised = await optimizePlan<DraftMeal>(result.meals, planningBudget, {
          simulate: (ms) =>
            simulatePlan(draftToSimMeals(ms), simPantry, { currency, resolver }),
          substitute: async (req) => {
            setBusyLabel("Looking for cheaper meals");
            const slots = req.slots
              .map((s) => slotById.get(s.slotId))
              .filter((s): s is PlanSlot => !!s);
            if (!slots.length) return [];
            const subConstraints = {
              ...constraints,
              excludeRecipeIds: req.excludeRecipeIds,
            };
            const pool = await fetchCandidates({
              mealTypes: [...new Set(slots.map((s) => s.mealType))],
              pantry,
              constraints: subConstraints,
            });
            if (!pool.length) return [];
            const sub = await generateMealPlan({
              slots,
              candidates: pool,
              constraints: subConstraints,
              guidance: {
                reason: "budget",
                estimatedSpend: req.spend,
                budget: req.budget,
                currency: req.currency,
                overBy: req.overBy,
                reusableIngredients: req.reusableIngredients,
                costliestMeals: req.slots,
              },
            });
            return sub.meals;
          },
        });
        finalMeals = optimised.meals;
        rounds = optimised.rounds;
      }

      // Slots the catalogue couldn't fill: let Fuudit write original recipes for
      // them when allowed. Clearly labelled, and a failure here never
      // invalidates the rest of the plan.
      let unresolved = result.unresolved;
      if (allowInvented && unresolved.length) {
        setBusyLabel("Writing recipes for the last slots");
        try {
          const written = await inventMeals({ slots: unresolved, pantry, constraints });
          if (written.length) {
            const filled = new Set(written.map((m) => m.slotId));
            finalMeals = [...finalMeals, ...written];
            unresolved = unresolved.filter((s) => !filled.has(s.slotId));
          }
        } catch {
          // keep the valid plan; the user can retry per slot in the review sheet
        }
      }

      onGenerated({
        meals: finalMeals,
        unresolved,
        kept: keptSlots,
        budget: planningBudget,
        optimiseRounds: rounds,
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
      setBusyLabel(null);
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
              <Chip active={allowInvented} onClick={() => setAllowInvented((v) => !v)}>
                Let Fuudit write recipes
              </Chip>
              {NUTRITION_OPTIONS.map((s) => (
                <Chip key={s.value} active={styles.includes(s.value)} onClick={() => toggleStyle(s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Optional budget — collapsed, and off unless switched on. */}
          <div className="rounded-2xl border border-[hsl(var(--app-border))] overflow-hidden">
            <button
              type="button"
              onClick={() => setBudgetOpen((v) => !v)}
              aria-expanded={budgetOpen}
              className="w-full min-h-[52px] px-4 flex items-center gap-2.5 text-left no-tap-highlight"
            >
              <Wallet className="h-4 w-4 text-[hsl(var(--app-primary))]" aria-hidden="true" />
              <span className="flex-1 text-sm font-semibold text-[hsl(var(--app-foreground))]">
                Plan within my budget
                <span className="ml-1.5 text-xs font-normal text-[hsl(var(--app-muted))]">
                  {budgetOn && parsedAmount > 0 ? `${parsedAmount} ${budgetCurrency}` : "optional"}
                </span>
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-[hsl(var(--app-muted))] transition-transform", budgetOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            {budgetOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Chip active={budgetOn} onClick={() => setBudgetOn((v) => !v)}>
                    {budgetOn ? "Budget on" : "Turn on"}
                  </Chip>
                </div>

                {budgetOn && (
                  <>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="mp-budget" className="text-xs">
                          Amount
                        </Label>
                        <Input
                          id="mp-budget"
                          inputMode="decimal"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value)}
                          placeholder="1200"
                          className="h-12 rounded-xl mt-1"
                        />
                      </div>
                      <div className="w-24">
                        <Label htmlFor="mp-currency" className="text-xs">
                          Currency
                        </Label>
                        <select
                          id="mp-currency"
                          value={budgetCurrency}
                          onChange={(e) => setBudgetCurrency(e.target.value)}
                          className="mt-1 h-12 w-full rounded-xl border border-[hsl(var(--app-border))] bg-white px-2 text-sm"
                        >
                          {SUPPORTED_CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {BUDGET_PERIODS.filter((p) => p.value !== "custom").map((p) => (
                        <Chip
                          key={p.value}
                          active={budgetPeriod === p.value}
                          onClick={() => setBudgetPeriod(p.value)}
                        >
                          {p.label}
                        </Chip>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[0, 5, 10, 20].map((b) => (
                        <Chip key={b} active={bufferPercent === b} onClick={() => setBufferPercent(b)}>
                          {b === 0 ? "No buffer" : `${b}% buffer`}
                        </Chip>
                      ))}
                    </div>

                    <p className="text-xs text-[hsl(var(--app-muted))] leading-relaxed">
                      {planningBudget
                        ? `About ${planningBudget.amount} ${planningBudget.currency} for these days — ${planningBudget.note}. All costs are estimates, not shop prices.`
                        : "Enter an amount to plan against. All costs are estimates, not shop prices."}
                    </p>
                  </>
                )}
              </div>
            )}
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
                <Loader2 className="h-4 w-4 animate-spin" />{" "}
                {busyLabel ??
                  `Planning ${openSlots.length} meal${openSlots.length === 1 ? "" : "s"}`}
                …
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
