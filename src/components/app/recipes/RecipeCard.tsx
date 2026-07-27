import { Link } from "react-router-dom";
import { Clock, Users, Bookmark, BookmarkCheck } from "lucide-react";

export type RecipeCardData = {
  spoonId?: number;
  localId?: string;
  title: string;
  image: string | null;
  readyMinutes: number | null;
  servings: number | null;
  used?: number;
  missed?: number;
  diets?: string[];
};

type Props = {
  recipe: RecipeCardData;
  saved?: boolean;
  saving?: boolean;
  onToggleSave?: () => void;
};

const RecipeCard = ({ recipe, saved, saving, onToggleSave }: Props) => {
  const target = recipe.localId
    ? `/app/recipes/local/${recipe.localId}`
    : `/app/recipes/spoon/${recipe.spoonId}`;

  return (
    <div className="app-card overflow-hidden">
      <Link to={target} className="block no-tap-highlight active:opacity-95">
        <div className="relative aspect-[16/10] bg-[hsl(var(--app-subtle))]">
          {recipe.image ? (
            <img
              src={recipe.image}
              alt={recipe.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-[hsl(var(--app-muted))] text-xs">
              No image
            </div>
          )}
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!saving) onToggleSave();
              }}
              aria-label={saved ? "Unsave recipe" : "Save recipe"}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/95 backdrop-blur grid place-items-center shadow-md active:scale-95 transition-transform no-tap-highlight disabled:opacity-60"
              disabled={saving}
            >
              {saved ? (
                <BookmarkCheck className="h-4 w-4 text-[hsl(var(--app-primary))]" />
              ) : (
                <Bookmark className="h-4 w-4 text-[hsl(var(--app-foreground))]" />
              )}
            </button>
          )}
        </div>
        <div className="p-4">
          <p className="font-semibold text-[hsl(var(--app-foreground))] line-clamp-2 leading-snug">
            {recipe.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--app-muted))]">
            {recipe.readyMinutes != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {recipe.readyMinutes} min
              </span>
            )}
            {recipe.servings != null && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {recipe.servings}
              </span>
            )}
            {recipe.used != null && recipe.missed != null && (
              <span className="inline-flex items-center gap-1">
                <span className="text-[hsl(var(--app-primary))] font-semibold">
                  {recipe.used}
                </span>{" "}
                used ·{" "}
                <span className="font-semibold">{recipe.missed}</span> missing
              </span>
            )}
          </div>
          {recipe.diets && recipe.diets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recipe.diets.slice(0, 3).map((d) => (
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
      </Link>
    </div>
  );
};

export default RecipeCard;
