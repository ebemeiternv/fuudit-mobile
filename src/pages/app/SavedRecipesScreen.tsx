import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Bookmark } from "lucide-react";
import ScreenHeader from "@/components/app/ScreenHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/app/states/LoadingState";
import EmptyState from "@/components/app/states/EmptyState";
import ErrorState from "@/components/app/states/ErrorState";
import RecipeCard from "@/components/app/recipes/RecipeCard";
import { useAuth } from "@/hooks/useAuth";
import { useSavedRecipes, useUnsaveRecipe } from "@/hooks/queries/useSavedRecipes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const SavedRecipesScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const { data: saved = [], isLoading, isError, refetch } = useSavedRecipes(userId);
  const unsaveMut = useUnsaveRecipe(userId);

  const [search, setSearch] = useState("");
  const [dietFilter, setDietFilter] = useState<string>("all");

  const availableDiets = useMemo(() => {
    const set = new Set<string>();
    for (const s of saved) {
      const diets = (s.recipe?.data as any)?.diets;
      if (Array.isArray(diets)) diets.forEach((d) => typeof d === "string" && set.add(d));
    }
    return Array.from(set).sort();
  }, [saved]);

  const filtered = useMemo(() => {
    let out = saved.filter((s) => !!s.recipe);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((s) => s.recipe!.title.toLowerCase().includes(q));
    }
    if (dietFilter !== "all") {
      out = out.filter((s) => {
        const diets = (s.recipe!.data as any)?.diets;
        return Array.isArray(diets) && diets.includes(dietFilter);
      });
    }
    return out;
  }, [saved, search, dietFilter]);

  const handleUnsave = async (recipeId: string) => {
    try {
      await unsaveMut.mutateAsync(recipeId);
      toast({ title: "Removed from saved" });
    } catch {
      toast({ title: "Couldn't unsave", variant: "destructive" });
    }
  };

  return (
    <div>
      <ScreenHeader
        title="Saved recipes"
        subtitle={
          saved.length
            ? `${saved.length} saved recipe${saved.length === 1 ? "" : "s"}`
            : "Save recipes to view them offline"
        }
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

      <div className="px-5 space-y-5">
        {saved.length > 0 && (
          <>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--app-muted))]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saved recipes"
                className="h-12 rounded-2xl pl-11 pr-4 bg-white border-[hsl(var(--app-border))]"
              />
            </div>
            {availableDiets.length > 0 && (
              <Select value={dietFilter} onValueChange={setDietFilter}>
                <SelectTrigger className="h-10 rounded-xl bg-white border-[hsl(var(--app-border))]">
                  <SelectValue placeholder="Filter by dietary tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dietary tags</SelectItem>
                  {availableDiets.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}

        {isLoading ? (
          <LoadingState label="Loading your saved recipes…" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load saved recipes"
            description="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : saved.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-5 w-5" />}
            title="No saved recipes yet"
            description="Save recipes from Discover to view them here, even offline."
            action={
              <Button asChild className="rounded-xl bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white">
                <Link to="/app/chef">Discover recipes</Link>
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matches"
            description="Try a different search or clear the filter."
            action={
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setSearch("");
                  setDietFilter("all");
                }}
              >
                Clear
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {filtered.map((s) => {
              const r = s.recipe!;
              return (
                <RecipeCard
                  key={s.id}
                  saved
                  saving={unsaveMut.isPending}
                  onToggleSave={() => handleUnsave(r.id)}
                  recipe={{
                    localId: r.id,
                    title: r.title,
                    image: r.image ?? null,
                    readyMinutes: r.ready_minutes ?? null,
                    servings: r.servings ?? null,
                    diets: (r.data as any)?.diets ?? [],
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedRecipesScreen;
