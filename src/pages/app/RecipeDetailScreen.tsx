import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Users,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
} from "lucide-react";
import ScreenHeader from "@/components/app/ScreenHeader";
import LoadingState from "@/components/app/states/LoadingState";
import ErrorState from "@/components/app/states/ErrorState";
import {
  useRecipeDetail,
  useSaveSpoonacularRecipe,
} from "@/hooks/queries/useRecipes";
import { useSavedRecipes, useUnsaveRecipe } from "@/hooks/queries/useSavedRecipes";
import { useAuth } from "@/hooks/useAuth";
import { spoonErrorMessage } from "@/lib/spoonErrors";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { toast } from "@/hooks/use-toast";
import type { NormalizedIngredient } from "@/lib/spoonacular";

type Step = { number: number; step: string };

const KEY_NUTRIENTS = ["Calories", "Protein", "Carbohydrates", "Fat", "Fiber", "Sugar"];

const RecipeDetailScreen = () => {
  const { source, id } = useParams<{ source: "local" | "spoon"; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const { data: saved = [] } = useSavedRecipes(userId);

  const input = useMemo(() => {
    if (!source || !id) return null;
    return source === "local"
      ? ({ kind: "local", localId: id } as const)
      : ({ kind: "spoon", spoonId: id } as const);
  }, [source, id]);

  const { data: recipe, isLoading, isError, error, refetch } = useRecipeDetail(input);
  const saveMut = useSaveSpoonacularRecipe(userId);
  const unsaveMut = useUnsaveRecipe(userId);

  const savedRow = useMemo(
    () => saved.find((s) => s.recipe?.id === recipe?.id) ?? null,
    [saved, recipe?.id],
  );
  const isSaved = !!savedRow;

  const handleToggleSave = async () => {
    if (!recipe) return;
    try {
      if (isSaved) {
        await unsaveMut.mutateAsync(recipe.id);
        toast({ title: "Removed from saved" });
      } else if (recipe.source === "spoonacular" && recipe.source_id) {
        await saveMut.mutateAsync({ id: parseInt(recipe.source_id, 10), title: recipe.title });
        toast({ title: "Saved" });
      }
    } catch (e) {
      const { title, description } = spoonErrorMessage(e);
      toast({ title, description, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div>
        <ScreenHeader
          title="Recipe"
          left={
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="h-10 w-10 rounded-full grid place-items-center bg-white border border-[hsl(var(--app-border))]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
        />
        <LoadingState label="Loading recipe…" />
      </div>
    );
  }

  if (isError || !recipe) {
    const { title, description } = spoonErrorMessage(error);
    return (
      <div>
        <ScreenHeader
          title="Recipe"
          left={
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="h-10 w-10 rounded-full grid place-items-center bg-white border border-[hsl(var(--app-border))]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
        />
        <div className="px-5">
          <ErrorState title={title} description={description} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  const data = (recipe.data ?? {}) as any;
  const ingredients: NormalizedIngredient[] = Array.isArray(recipe.ingredients)
    ? (recipe.ingredients as unknown as NormalizedIngredient[])
    : [];
  const steps: Step[] = Array.isArray(data.steps) ? data.steps : [];
  const diets: string[] = Array.isArray(data.diets) ? data.diets : [];
  const nutrition: { name: string; amount: number; unit: string }[] = Array.isArray(
    data.nutrition,
  )
    ? data.nutrition
    : [];
  const keyNutrition = nutrition.filter((n) => KEY_NUTRIENTS.includes(n.name));
  const sourceUrl: string | null = data.sourceUrl ?? null;
  const sourceName: string | null = data.sourceName ?? null;
  const creditsText: string | null = data.creditsText ?? null;
  const summaryHtml = sanitizeHtml(data.summary);
  const instructionsHtml = steps.length === 0 ? sanitizeHtml(recipe.instructions) : "";

  return (
    <div className="pb-8">
      <div className="relative">
        <div className="aspect-[16/10] bg-[hsl(var(--app-subtle))]">
          {recipe.image ? (
            <img
              src={recipe.image}
              alt={recipe.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-[hsl(var(--app-muted))] text-sm">
              No image available
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="absolute top-4 left-4 h-10 w-10 rounded-full bg-white/95 backdrop-blur grid place-items-center shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={handleToggleSave}
          disabled={saveMut.isPending || unsaveMut.isPending}
          aria-label={isSaved ? "Unsave recipe" : "Save recipe"}
          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/95 backdrop-blur grid place-items-center shadow-md disabled:opacity-60"
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4 text-[hsl(var(--app-primary))]" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="px-5 pt-5 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--app-foreground))]">
            {recipe.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[hsl(var(--app-muted))]">
            {recipe.ready_minutes != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {recipe.ready_minutes} min
              </span>
            )}
            {recipe.servings != null && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {recipe.servings} servings
              </span>
            )}
          </div>
          {diets.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {diets.map((d) => (
                <span
                  key={d}
                  className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))]"
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {summaryHtml && (
          <section>
            <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))] mb-2">About</h2>
            <div
              className="text-sm text-[hsl(var(--app-muted))] leading-relaxed [&_a]:text-[hsl(var(--app-primary))] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: summaryHtml }}
            />
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))] mb-3">
            Ingredients ({ingredients.length})
          </h2>
          {ingredients.length === 0 ? (
            <p className="text-sm text-[hsl(var(--app-muted))]">
              No ingredient list available.
            </p>
          ) : (
            <div className="app-card divide-y divide-[hsl(var(--app-border))]">
              {ingredients.map((i, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="text-[hsl(var(--app-foreground))]">{i.name}</span>
                  <span className="text-[hsl(var(--app-muted))]">
                    {formatQuantity(i.amount, i.unit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))] mb-3">Instructions</h2>
          {steps.length > 0 ? (
            <ol className="space-y-3">
              {steps.map((s) => (
                <li key={s.number} className="app-card p-4 flex gap-3">
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center text-xs font-bold">
                    {s.number}
                  </div>
                  <p className="text-sm text-[hsl(var(--app-foreground))] leading-relaxed">
                    {s.step}
                  </p>
                </li>
              ))}
            </ol>
          ) : instructionsHtml ? (
            <div
              className="app-card p-4 text-sm text-[hsl(var(--app-foreground))] leading-relaxed [&_a]:text-[hsl(var(--app-primary))] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: instructionsHtml }}
            />
          ) : (
            <p className="text-sm text-[hsl(var(--app-muted))]">
              No instructions available. Open the source below for the full recipe.
            </p>
          )}
        </section>

        {keyNutrition.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))] mb-3">
              Nutrition (per serving)
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {keyNutrition.map((n) => (
                <div key={n.name} className="app-card-flat p-3 text-center">
                  <p className="text-base font-bold text-[hsl(var(--app-foreground))]">
                    {Math.round(n.amount)}
                    <span className="text-xs font-medium text-[hsl(var(--app-muted))] ml-0.5">
                      {n.unit}
                    </span>
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--app-muted))] mt-0.5">
                    {n.name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="app-card p-4 flex items-center justify-between no-tap-highlight active:scale-[0.99] transition-transform"
          >
            <span className="text-sm font-semibold text-[hsl(var(--app-foreground))]">
              View original recipe{sourceName ? ` on ${sourceName}` : ""}
            </span>
            <ExternalLink className="h-4 w-4 text-[hsl(var(--app-muted))]" />
          </a>
        )}

        <p className="text-[11px] text-[hsl(var(--app-muted))] text-center pt-2">
          {creditsText ?? sourceName ?? "Recipe data via Spoonacular."}{" "}
          {data.license ? `· ${data.license}` : ""}
        </p>
      </div>
    </div>
  );
};

const formatQuantity = (amount: number | null, unit: string | null): string => {
  if (amount == null) return unit ?? "";
  const rounded = Math.round(amount * 100) / 100;
  const asStr = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return unit ? `${asStr} ${unit}` : asStr;
};

export default RecipeDetailScreen;
