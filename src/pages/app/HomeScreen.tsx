import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/queries/useProfile";
import { usePantryItems } from "@/hooks/queries/usePantryItems";
import { useMealPlan } from "@/hooks/queries/useMealPlan";
import { useGroceryItems } from "@/hooks/queries/useGroceryItems";
import { useProductIntelligence } from "@/hooks/queries/useProductIntelligence";
import { useRecipesByIngredients } from "@/hooks/queries/useRecipes";
import { pickAmbientHint } from "@/lib/productIntelligence";
import { todayLocalIso } from "@/lib/dates";
import {
  pantryNamesToIngredients,
  pickSpoonDiet,
  pickSpoonIntolerances,
} from "@/lib/spoonacular";
import { spoonErrorMessage } from "@/lib/spoonErrors";
import ScreenHeader from "@/components/app/ScreenHeader";
import RecipeCard from "@/components/app/recipes/RecipeCard";
import ErrorState from "@/components/app/states/ErrorState";
import LoadingState from "@/components/app/states/LoadingState";
import {
  ArrowRight,
  AlertCircle,
  ChefHat,
  ShoppingBag,
  Plus,
  Sparkles,
  CalendarDays,
  Search,
} from "lucide-react";
import {
  daysUntilExpiry,
  expiryBucket,
  expiryLabel,
  expiryTone,
} from "@/lib/pantry";

const HomeScreen = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: pantry = [], isLoading: pantryLoading } = usePantryItems(user?.id);
  const todayIso = todayLocalIso();
  const { data: todaysMeals = [] } = useMealPlan(user?.id, todayIso, todayIso);
  const { data: groceryItems = [] } = useGroceryItems(user?.id);
  const { data: intelligence = [] } = useProductIntelligence(user?.id);
  const ambientHint = pickAmbientHint(intelligence);
  const pendingGrocery = groceryItems.filter((i) => !i.checked).length;

  const name = profile?.display_name || user?.email?.split("@")[0] || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Featured recipe uses the same query as Discover → shared TanStack cache.
  const diet = pickSpoonDiet(profile?.dietary_preferences ?? []);
  const intolerances = pickSpoonIntolerances(profile?.allergies ?? []);
  const featuredIngredients = useMemo(() => {
    const withDays = pantry.map((p) => ({
      name: p.name,
      d: daysUntilExpiry(p.expires_on) ?? 999,
    }));
    withDays.sort((a, b) => a.d - b.d);
    return pantryNamesToIngredients(withDays.map((p) => p.name));
  }, [pantry]);
  const featuredQuery = useRecipesByIngredients({
    ingredients: featuredIngredients,
    diet,
    intolerances,
    enabled: featuredIngredients.length > 0,
  });
  const featured = featuredQuery.data?.[0];

  const expiring = pantry
    .filter((i) => {
      const d = daysUntilExpiry(i.expires_on);
      return d !== null && d <= 7;
    })
    .sort((a, b) => (daysUntilExpiry(a.expires_on) ?? 999) - (daysUntilExpiry(b.expires_on) ?? 999))
    .slice(0, 5);

  return (
    <div>
      <ScreenHeader
        eyebrow={greeting}
        title={name ? `Hi, ${name}` : "Welcome"}
        subtitle="Let's make the most of what's in your kitchen."
        right={
          <div className="h-11 w-11 rounded-full bg-[hsl(var(--app-primary))] text-white grid place-items-center font-semibold shadow-md">
            {(name || "F")[0]?.toUpperCase()}
          </div>
        }
      />

      <div className="px-5 space-y-5">
        {/* Featured Recipe Discovery — replaces the old impact hero */}
        <section aria-labelledby="home-featured-heading">
          <div className="flex items-end justify-between mb-3 px-1">
            <div>
              <h2
                id="home-featured-heading"
                className="text-lg font-bold text-[hsl(var(--app-foreground))]"
              >
                Recommended for you
              </h2>
              <p className="text-xs text-[hsl(var(--app-muted))] mt-0.5">
                Recipes based on what's currently in your pantry.
              </p>
            </div>
          </div>

          {featuredIngredients.length === 0 ? (
            <div className="app-card p-6 text-center flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[hsl(var(--app-foreground))]">
                  Your next favourite recipe starts here
                </p>
                <p className="text-sm text-[hsl(var(--app-muted))] mt-1">
                  Add a few pantry items and Fuudit will recommend recipes you can cook.
                </p>
              </div>
              <Link
                to="/app/pantry"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[hsl(var(--app-primary))] rounded-full px-4 py-2 no-tap-highlight active:scale-95 transition-transform"
              >
                Add pantry items <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : featuredQuery.isLoading ? (
            <LoadingState label="Finding a recipe for you…" />
          ) : featuredQuery.isError ? (
            (() => {
              const { title, description } = spoonErrorMessage(featuredQuery.error);
              return (
                <ErrorState
                  title={title}
                  description={description}
                  onRetry={() => featuredQuery.refetch()}
                />
              );
            })()
          ) : !featured ? (
            <div className="app-card p-5 text-center">
              <p className="font-semibold text-[hsl(var(--app-foreground))]">
                No matches just yet
              </p>
              <p className="text-sm text-[hsl(var(--app-muted))] mt-1">
                Try adding a few more pantry items — or browse the full recipe library.
              </p>
              <Link
                to="/app/discover"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--app-primary))] no-tap-highlight"
              >
                Browse all recipes <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <RecipeCard
              recipe={{
                spoonId: featured.id,
                title: featured.title,
                image: featured.image ?? null,
                readyMinutes: (featured as any).readyInMinutes ?? null,
                servings: (featured as any).servings ?? null,
                used: (featured as any).usedIngredientCount,
                missed: (featured as any).missedIngredientCount,
              }}
            />
          )}

          <div className="mt-3 text-right px-1">
            <Link
              to="/app/discover"
              aria-label="Browse all recipes"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--app-primary))] no-tap-highlight"
            >
              Browse all recipes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>


        {ambientHint && (
          <Link
            to="/app/pantry"
            className="app-card p-4 flex items-start gap-3 no-tap-highlight active:scale-[0.99] transition-transform border border-[hsl(var(--app-primary))]/20 bg-[hsl(var(--app-primary-soft))]/60"
          >
            <div className="h-9 w-9 rounded-xl bg-white text-[hsl(var(--app-primary))] grid place-items-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--app-primary))]">
                Smart insight
              </p>
              <p className="text-sm text-[hsl(var(--app-foreground))] mt-0.5">
                {ambientHint.message}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-[hsl(var(--app-muted))] mt-1" />
          </Link>
        )}

        {/* Today's meals */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))]">Today's meals</h2>
            <Link
              to="/app/meal-plan"
              className="text-sm font-semibold text-[hsl(var(--app-primary))] flex items-center gap-1 no-tap-highlight"
            >
              Meal plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {todaysMeals.length === 0 ? (
            <Link
              to="/app/meal-plan"
              className="app-card p-5 flex items-center gap-3 no-tap-highlight active:scale-[0.99] transition-transform"
            >
              <div className="h-11 w-11 rounded-xl bg-[hsl(var(--app-accent-sky-soft))] text-[hsl(var(--app-primary))] grid place-items-center">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[hsl(var(--app-foreground))]">
                  Plan today's meals
                </p>
                <p className="text-xs text-[hsl(var(--app-muted))]">
                  Line up breakfast, lunch, dinner or a snack.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[hsl(var(--app-muted))]" />
            </Link>
          ) : (
            <div className="app-card divide-y divide-[hsl(var(--app-border))]">
              {todaysMeals.map((entry) => {
                const title = entry.recipe?.title ?? entry.custom_title ?? "Untitled";
                const to = entry.recipe
                  ? `/app/recipes/local/${entry.recipe.id}`
                  : "/app/meal-plan";
                return (
                  <Link
                    key={entry.id}
                    to={to}
                    className="flex items-center gap-3 p-4 no-tap-highlight active:bg-[hsl(var(--app-subtle))]"
                  >
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-[hsl(var(--app-primary-soft))] grid place-items-center text-[hsl(var(--app-primary))]">
                      {entry.recipe?.image ? (
                        <img
                          src={entry.recipe.image}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <CalendarDays className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--app-primary))]">
                        {entry.meal_type}
                      </p>
                      <p className="font-semibold text-[hsl(var(--app-foreground))] truncate">
                        {title}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[hsl(var(--app-muted))]" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>


        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))]">Use these soon</h2>
            <Link
              to="/app/pantry"
              className="text-sm font-semibold text-[hsl(var(--app-primary))] flex items-center gap-1 no-tap-highlight"
            >
              Pantry <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {pantryLoading ? (
            <div className="app-card p-6 text-center text-sm text-[hsl(var(--app-muted))]">
              Loading…
            </div>
          ) : expiring.length === 0 ? (
            <Link
              to="/app/pantry"
              className="app-card p-5 flex items-center gap-3 no-tap-highlight active:scale-[0.99] transition-transform"
            >
              <div className="h-11 w-11 rounded-xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center">
                <Plus className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[hsl(var(--app-foreground))]">
                  {pantry.length === 0 ? "Add your first pantry item" : "Nothing expiring soon"}
                </p>
                <p className="text-xs text-[hsl(var(--app-muted))]">
                  {pantry.length === 0
                    ? "Track what's in your kitchen to reduce waste."
                    : "Great — your fridge is in good shape."}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[hsl(var(--app-muted))]" />
            </Link>
          ) : (
            <div className="app-card divide-y divide-[hsl(var(--app-border))]">
              {expiring.map((item) => {
                const tone = expiryTone(expiryBucket(item.expires_on));
                return (
                  <Link
                    key={item.id}
                    to="/app/pantry"
                    className="flex items-center gap-3 p-4 no-tap-highlight active:bg-[hsl(var(--app-subtle))]"
                  >
                    <div className={`h-10 w-10 rounded-xl grid place-items-center ${tone.icon}`}>
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[hsl(var(--app-foreground))] truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-[hsl(var(--app-muted))]">
                        {expiryLabel(item.expires_on)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[hsl(var(--app-muted))]" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))] mb-3 px-1">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/app/chef" className="app-card p-4 no-tap-highlight active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-[hsl(var(--app-accent-violet-soft))] text-[hsl(var(--app-accent-violet))] grid place-items-center mb-3">
                <ChefHat className="h-5 w-5" />
              </div>
              <p className="font-semibold text-[hsl(var(--app-foreground))]">Cook with what I have</p>
              <p className="text-xs text-[hsl(var(--app-muted))] mt-1">AI-picked recipes</p>
            </Link>
            <Link to="/app/discover" className="app-card p-4 no-tap-highlight active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center mb-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="font-semibold text-[hsl(var(--app-foreground))]">Discover recipes</p>
              <p className="text-xs text-[hsl(var(--app-muted))] mt-1">Search or cook from pantry</p>
            </Link>
            <Link to="/app/grocery" className="app-card p-4 no-tap-highlight active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-[hsl(var(--app-accent-berry-soft))] text-[hsl(var(--app-accent-berry))] grid place-items-center mb-3">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <p className="font-semibold text-[hsl(var(--app-foreground))]">
                {pendingGrocery > 0 ? `Grocery · ${pendingGrocery}` : "Build shopping list"}
              </p>
              <p className="text-xs text-[hsl(var(--app-muted))] mt-1">
                {pendingGrocery > 0
                  ? `${pendingGrocery} item${pendingGrocery === 1 ? "" : "s"} to pick up`
                  : "From your meal plan"}
              </p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomeScreen;
