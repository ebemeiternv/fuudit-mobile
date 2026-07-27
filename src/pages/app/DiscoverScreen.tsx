import { useMemo, useState } from "react";
import { Search, Sparkles, Refrigerator, X, RefreshCw } from "lucide-react";
import ScreenHeader from "@/components/app/ScreenHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/app/states/LoadingState";
import EmptyState from "@/components/app/states/EmptyState";
import ErrorState from "@/components/app/states/ErrorState";
import RecipeCard from "@/components/app/recipes/RecipeCard";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/queries/useProfile";
import { usePantryItems } from "@/hooks/queries/usePantryItems";
import {
  useRecipeSearch,
  useRecipesByIngredients,
  useSaveSpoonacularRecipe,
} from "@/hooks/queries/useRecipes";
import { useSavedRecipes, useUnsaveRecipe } from "@/hooks/queries/useSavedRecipes";
import {
  pantryNamesToIngredients,
  pickSpoonDiet,
  pickSpoonIntolerances,
} from "@/lib/spoonacular";
import { spoonErrorMessage } from "@/lib/spoonErrors";
import { daysUntilExpiry } from "@/lib/pantry";
import { toast } from "@/hooks/use-toast";

type Mode = "search" | "pantry";

const ChefScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: profile } = useProfile(userId);
  const { data: pantry = [] } = usePantryItems(userId);
  const { data: saved = [] } = useSavedRecipes(userId);

  const savedBySource = useMemo(() => {
    const m = new Map<string, string>(); // spoonacular source_id -> local recipe id
    for (const s of saved) {
      if (s.recipe?.source === "spoonacular" && s.recipe.source_id) {
        m.set(s.recipe.source_id, s.recipe.id);
      }
    }
    return m;
  }, [saved]);

  const diet = pickSpoonDiet(profile?.dietary_preferences ?? []);
  const intolerances = pickSpoonIntolerances(profile?.allergies ?? []);

  const [mode, setMode] = useState<Mode>("search");
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  // Pantry-mode chip management. Seeded from real pantry items, expiring first.
  const pantryChips = useMemo(() => {
    const withDays = pantry.map((p) => ({
      name: p.name,
      d: daysUntilExpiry(p.expires_on) ?? 999,
    }));
    withDays.sort((a, b) => a.d - b.d);
    return pantryNamesToIngredients(withDays.map((p) => p.name));
  }, [pantry]);
  const expiringNames = useMemo(() => {
    return new Set(
      pantry
        .filter((p) => {
          const d = daysUntilExpiry(p.expires_on);
          return d !== null && d <= 7;
        })
        .map((p) => p.name.toLowerCase()),
    );
  }, [pantry]);
  const [removedChips, setRemovedChips] = useState<Set<string>>(new Set());
  const activeChips = useMemo(
    () => pantryChips.filter((c) => !removedChips.has(c)),
    [pantryChips, removedChips],
  );

  const searchQuery = useRecipeSearch({
    query: submittedQuery,
    diet,
    intolerances,
    enabled: mode === "search" && submittedQuery.length > 0,
  });

  const pantryQuery = useRecipesByIngredients({
    ingredients: activeChips,
    diet,
    intolerances,
    enabled: mode === "pantry" && activeChips.length > 0,
  });

  const saveMut = useSaveSpoonacularRecipe(userId);
  const unsaveMut = useUnsaveRecipe(userId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchInput.trim());
  };

  const toggleSave = async (
    spoonId: number,
    hit: Parameters<typeof saveMut.mutateAsync>[0],
  ) => {
    const savedLocalId = savedBySource.get(String(spoonId));
    try {
      if (savedLocalId) {
        await unsaveMut.mutateAsync(savedLocalId);
        toast({ title: "Removed from saved" });
      } else {
        await saveMut.mutateAsync(hit);
        toast({ title: "Saved" });
      }
    } catch (e) {
      const { title, description } = spoonErrorMessage(e);
      toast({ title, description, variant: "destructive" });
    }
  };

  const activeQuery = mode === "search" ? searchQuery : pantryQuery;
  const results = activeQuery.data ?? [];

  return (
    <div>
      <ScreenHeader
        eyebrow="Recipes"
        title="Discover"
        subtitle="Find something to cook — from a keyword or your pantry"
        right={
          <div className="h-11 w-11 rounded-full bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
        }
      />

      <div className="px-5 space-y-5">
        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[hsl(var(--app-subtle))]">
          {(
            [
              { key: "search", label: "Search", Icon: Search },
              { key: "pantry", label: "From pantry", Icon: Refrigerator },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`h-10 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 no-tap-highlight transition-colors ${
                mode === key
                  ? "bg-white text-[hsl(var(--app-foreground))] shadow-sm"
                  : "text-[hsl(var(--app-muted))]"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {mode === "search" ? (
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--app-muted))]" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. pasta, curry, salad"
              className="h-12 rounded-2xl pl-11 pr-4 bg-white border-[hsl(var(--app-border))]"
            />
          </form>
        ) : (
          <div className="space-y-3">
            <div className="app-card-flat p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--app-muted))]">
                Cook with my pantry
              </p>
              <p className="text-sm text-[hsl(var(--app-foreground))] mt-1">
                Tap to remove items you don't want to use. Expiring soon are prioritised.
              </p>
              {pantryChips.length === 0 ? (
                <p className="text-sm text-[hsl(var(--app-muted))] mt-3">
                  Add items to your pantry to use this mode.
                </p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pantryChips.map((c) => {
                      const removed = removedChips.has(c);
                      const expiring = expiringNames.has(c.toLowerCase());
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            setRemovedChips((prev) => {
                              const next = new Set(prev);
                              if (next.has(c)) next.delete(c);
                              else next.add(c);
                              return next;
                            })
                          }
                          className={`text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors ${
                            removed
                              ? "bg-[hsl(var(--app-subtle))] text-[hsl(var(--app-muted))] line-through"
                              : expiring
                              ? "bg-[hsl(var(--app-warning-soft,var(--app-primary-soft)))] text-[hsl(var(--app-foreground))] border border-[hsl(var(--app-border))]"
                              : "bg-white text-[hsl(var(--app-foreground))] border border-[hsl(var(--app-border))]"
                          }`}
                        >
                          {c}
                          {expiring && !removed && <span aria-hidden>·⏱</span>}
                          {!removed && <X className="h-3 w-3 opacity-60" />}
                        </button>
                      );
                    })}
                  </div>
                  {removedChips.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setRemovedChips(new Set())}
                      className="mt-3 text-xs font-semibold text-[hsl(var(--app-primary))] no-tap-highlight"
                    >
                      Restore all
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {activeQuery.isFetching ? (
          <LoadingState label="Finding recipes…" />
        ) : activeQuery.isError ? (
          (() => {
            const { title, description } = spoonErrorMessage(activeQuery.error);
            return (
              <ErrorState
                title={title}
                description={description}
                onRetry={() => activeQuery.refetch()}
              />
            );
          })()
        ) : mode === "search" && !submittedQuery ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="Search for a recipe"
            description="Try 'pasta', 'chicken curry', or 'oats'."
          />
        ) : mode === "pantry" && activeChips.length === 0 ? (
          <EmptyState
            icon={<Refrigerator className="h-5 w-5" />}
            title={pantryChips.length === 0 ? "Your pantry is empty" : "No ingredients selected"}
            description={
              pantryChips.length === 0
                ? "Add items to your pantry to cook with what you have."
                : "Restore at least one ingredient to search."
            }
          />
        ) : results.length === 0 ? (
          <EmptyState
            title="No recipes found"
            description={
              mode === "search"
                ? `Nothing matched "${submittedQuery}". Try a different keyword.`
                : "No recipes matched your pantry. Try removing an ingredient."
            }
            action={
              <Button
                variant="outline"
                onClick={() => activeQuery.refetch()}
                className="rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {results.map((hit: any) => {
              const spoonId = hit.id as number;
              const isSaved = savedBySource.has(String(spoonId));
              return (
                <RecipeCard
                  key={spoonId}
                  saved={isSaved}
                  saving={saveMut.isPending || unsaveMut.isPending}
                  onToggleSave={() => toggleSave(spoonId, hit)}
                  recipe={{
                    spoonId,
                    title: hit.title,
                    image: hit.image ?? null,
                    readyMinutes: hit.readyInMinutes ?? null,
                    servings: hit.servings ?? null,
                    used: hit.usedIngredientCount,
                    missed: hit.missedIngredientCount,
                    diets: hit.diets,
                  }}
                />
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-[hsl(var(--app-muted))] text-center pt-2 pb-1">
          Recipe data powered by Spoonacular.
        </p>
      </div>
    </div>
  );
};

export default ChefScreen;
