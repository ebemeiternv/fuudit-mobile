import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Check,
  Trash2,
  ShoppingBag,
  Sparkles,
  X,
  Package,
  MoreVertical,
} from "lucide-react";
import ScreenHeader from "@/components/app/ScreenHeader";
import LoadingState from "@/components/app/states/LoadingState";
import ErrorState from "@/components/app/states/ErrorState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import {
  useGroceryItems,
  useCreateGroceryItem,
  useUpdateGroceryItem,
  useDeleteGroceryItem,
  useToggleGroceryPurchased,
  useClearPurchasedGrocery,
} from "@/hooks/queries/useGroceryItems";
import { useMealPlan } from "@/hooks/queries/useMealPlan";
import GroceryItemSheet from "@/components/app/grocery/GroceryItemSheet";
import GenerateGrocerySheet from "@/components/app/grocery/GenerateGrocerySheet";
import AddToPantrySheet from "@/components/app/grocery/AddToPantrySheet";
import { toast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/pantry";
import { formatQuantityUnit } from "@/lib/grocery";
import { addDays, startOfWeekMonday, toLocalIsoDate } from "@/lib/dates";
import type { GroceryItem } from "@/repositories/grocery";
import { cn } from "@/lib/utils";

const GroceryScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: items = [], isLoading, isError, refetch } = useGroceryItems(userId);
  const createMut = useCreateGroceryItem(userId);
  const updateMut = useUpdateGroceryItem(userId);
  const deleteMut = useDeleteGroceryItem(userId);
  const toggleMut = useToggleGroceryPurchased(userId);
  const clearMut = useClearPurchasedGrocery(userId);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("__all");
  const [sheet, setSheet] = useState<
    { mode: "closed" } | { mode: "add" } | { mode: "edit"; item: GroceryItem }
  >({ mode: "closed" });
  const [generateOpen, setGenerateOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [addToPantryItem, setAddToPantryItem] = useState<GroceryItem | null>(null);

  const weekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const defaultFrom = toLocalIsoDate(weekStart);
  const defaultTo = toLocalIsoDate(addDays(weekStart, 6));
  // Warm the cache for the default range so Generate feels instant.
  useMealPlan(userId, defaultFrom, defaultTo);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const cat = (i as { category?: string | null }).category ?? "Other";
      if (category !== "__all" && cat !== category) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, category]);

  const pending = filtered.filter((i) => !i.checked);
  const purchased = filtered.filter((i) => i.checked);
  const pendingCountAll = items.filter((i) => !i.checked).length;
  const purchasedCountAll = items.filter((i) => i.checked).length;

  const handleToggle = (item: GroceryItem) =>
    toggleMut.mutate({ id: item.id, checked: !item.checked });

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: "Item removed" });
    } catch {
      toast({ title: "Couldn't remove item", variant: "destructive" });
    }
  };

  const handleClearPurchased = async () => {
    try {
      await clearMut.mutateAsync();
      toast({ title: "Purchased items cleared" });
      setConfirmClear(false);
    } catch {
      toast({ title: "Couldn't clear items", variant: "destructive" });
    }
  };

  return (
    <div>
      <ScreenHeader
        title="Grocery"
        subtitle={
          pendingCountAll > 0
            ? `${pendingCountAll} item${pendingCountAll === 1 ? "" : "s"} to pick up`
            : "Ready to shop"
        }
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGenerateOpen(true)}
              aria-label="Generate grocery list from meal plan"
              className="h-11 px-3 rounded-full bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform no-tap-highlight"
            >
              <Sparkles className="h-4 w-4" /> Generate
            </button>
            <button
              onClick={() => setSheet({ mode: "add" })}
              aria-label="Add grocery item"
              className="h-11 w-11 rounded-full bg-[hsl(var(--app-primary))] text-white grid place-items-center shadow-md no-tap-highlight active:scale-95 transition-transform"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="px-5 space-y-4">
        {/* Search + filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--app-muted))]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              className="h-11 pl-9 rounded-xl"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[hsl(var(--app-muted))] no-tap-highlight"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingState label="Loading your list…" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load your grocery list"
            description="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : items.length === 0 ? (
          <div className="app-card p-6 text-center flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="font-semibold text-[hsl(var(--app-foreground))]">
              Your list is empty
            </p>
            <p className="text-xs text-[hsl(var(--app-muted))] max-w-xs">
              Add items manually, or generate a list from this week's meal plan.
            </p>
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() => setSheet({ mode: "add" })}
                variant="outline"
                className="h-10 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add item
              </Button>
              <Button
                onClick={() => setGenerateOpen(true)}
                className="h-10 rounded-xl bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
              >
                <Sparkles className="h-4 w-4 mr-1.5" /> From meal plan
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Pending */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--app-primary))]">
                  To pick up · {pending.length}
                </p>
              </div>
              {pending.length === 0 ? (
                <div className="app-card p-4 text-center text-xs text-[hsl(var(--app-muted))]">
                  {pendingCountAll === 0
                    ? "Nothing pending — nice work."
                    : "No items match your filters."}
                </div>
              ) : (
                <ul className="app-card divide-y divide-[hsl(var(--app-border))]">
                  {pending.map((item) => (
                    <GroceryRow
                      key={item.id}
                      item={item}
                      onToggle={() => handleToggle(item)}
                      onEdit={() => setSheet({ mode: "edit", item })}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* Purchased */}
            {purchasedCountAll > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--app-muted))]">
                    Purchased · {purchased.length}
                  </p>
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="text-xs font-semibold text-[hsl(var(--app-danger))] no-tap-highlight active:opacity-70"
                  >
                    Clear
                  </button>
                </div>
                {purchased.length === 0 ? (
                  <div className="app-card p-4 text-center text-xs text-[hsl(var(--app-muted))]">
                    No purchased items match your filters.
                  </div>
                ) : (
                  <ul className="app-card divide-y divide-[hsl(var(--app-border))]">
                    {purchased.map((item) => (
                      <GroceryRow
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggle(item)}
                        onEdit={() => setSheet({ mode: "edit", item })}
                        onDelete={() => handleDelete(item.id)}
                        onAddToPantry={() => setAddToPantryItem(item)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <GroceryItemSheet
        open={sheet.mode !== "closed"}
        onOpenChange={(o) => !o && setSheet({ mode: "closed" })}
        item={sheet.mode === "edit" ? sheet.item : null}
        saving={createMut.isPending || updateMut.isPending}
        onSubmit={async (payload) => {
          if (sheet.mode === "edit") {
            await updateMut.mutateAsync({ id: sheet.item.id, patch: payload });
            toast({ title: "Item updated" });
          } else {
            await createMut.mutateAsync({
              ...payload,
              checked: false,
              source: "manual",
            });
            toast({ title: "Added to list" });
          }
        }}
      />

      <GenerateGrocerySheet
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        defaultFrom={defaultFrom}
        defaultTo={defaultTo}
        existingPending={items.filter((i) => !i.checked)}
      />

      <AddToPantrySheet
        open={!!addToPantryItem}
        onOpenChange={(o) => !o && setAddToPantryItem(null)}
        userId={userId}
        item={addToPantryItem}
        onAdded={() => setAddToPantryItem(null)}
      />

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear purchased items?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {purchasedCountAll} purchased item
              {purchasedCountAll === 1 ? "" : "s"} from your list. Items are not added
              to your pantry automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearPurchased}
              disabled={clearMut.isPending}
              className="bg-[hsl(var(--app-danger))] hover:bg-[hsl(var(--app-danger))]/90"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

type RowProps = {
  item: GroceryItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddToPantry?: () => void;
};

const GroceryRow = ({ item, onToggle, onEdit, onDelete, onAddToPantry }: RowProps) => {
  const cat = (item as { category?: string | null }).category ?? "Other";
  const notes = (item as { notes?: string | null }).notes ?? null;
  return (
    <li className="flex items-center gap-3 p-3">
      <button
        onClick={onToggle}
        aria-label={item.checked ? "Mark pending" : "Mark purchased"}
        className={cn(
          "h-8 w-8 rounded-full grid place-items-center shrink-0 border transition-colors no-tap-highlight active:scale-95",
          item.checked
            ? "bg-[hsl(var(--app-primary))] border-transparent text-white"
            : "bg-white border-[hsl(var(--app-border))] text-transparent",
        )}
      >
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onEdit} className="flex-1 min-w-0 text-left no-tap-highlight">
        <p
          className={cn(
            "font-semibold text-sm truncate",
            item.checked
              ? "line-through text-[hsl(var(--app-muted))]"
              : "text-[hsl(var(--app-foreground))]",
          )}
        >
          {item.name}
        </p>
        <p className="text-[11px] text-[hsl(var(--app-muted))] truncate">
          {[formatQuantityUnit(item.quantity, item.unit), cat, notes]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Item options"
            className="h-8 w-8 rounded-full grid place-items-center text-[hsl(var(--app-muted))] no-tap-highlight active:bg-[hsl(var(--app-subtle))]"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onAddToPantry && (
            <DropdownMenuItem onClick={onAddToPantry}>
              <Package className="h-4 w-4 mr-2" /> Add to pantry
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-[hsl(var(--app-danger))]">
            <Trash2 className="h-4 w-4 mr-2" /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
};

export default GroceryScreen;
