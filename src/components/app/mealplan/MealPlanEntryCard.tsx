import { Link } from "react-router-dom";
import { Clock, Users, MoreHorizontal, Pencil, Trash2, ArrowRightLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import type { MealPlanEntryWithRecipe } from "@/repositories/mealPlan";

type Props = {
  entry: MealPlanEntryWithRecipe;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  deleting?: boolean;
};

const MealPlanEntryCard = ({ entry, onEdit, onMove, onDelete, deleting }: Props) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const recipe = entry.recipe;
  const title = recipe?.title ?? entry.custom_title ?? "Untitled meal";
  const image = recipe?.image ?? null;
  const ready = recipe?.ready_minutes ?? null;
  const target = recipe ? `/app/recipes/local/${recipe.id}` : null;

  const Inner = (
    <>
      <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(var(--app-primary-soft))] to-[hsl(var(--app-accent-sky-soft))] grid place-items-center shrink-0">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-2xl">🥗</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[hsl(var(--app-foreground))] line-clamp-2 leading-snug">
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[hsl(var(--app-muted))]">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {entry.servings}
          </span>
          {ready != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {ready} min
            </span>
          )}
          {!recipe && entry.custom_title && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--app-primary))]">
              Custom
            </span>
          )}
        </div>
        {entry.notes && (
          <p className="text-xs text-[hsl(var(--app-muted))] mt-1 line-clamp-1">{entry.notes}</p>
        )}
      </div>
    </>
  );

  return (
    <div className="app-card p-4 flex items-center gap-4">
      {target ? (
        <Link
          to={target}
          className="flex items-center gap-4 flex-1 min-w-0 no-tap-highlight active:opacity-90"
        >
          {Inner}
        </Link>
      ) : (
        <div className="flex items-center gap-4 flex-1 min-w-0">{Inner}</div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Entry actions"
            className="h-9 w-9 rounded-full grid place-items-center bg-[hsl(var(--app-subtle))] text-[hsl(var(--app-foreground))] active:scale-95 no-tap-highlight"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMove}>
            <ArrowRightLeft className="h-4 w-4 mr-2" /> Move
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="text-[hsl(var(--app-danger))] focus:text-[hsl(var(--app-danger))]"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this meal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove it from your plan. You can add it again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => {
                onDelete();
                setConfirmOpen(false);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MealPlanEntryCard;
