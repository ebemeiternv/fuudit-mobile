import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  MoreVertical,
  Check,
  Trash2,
  X,
  Pencil,
  SlidersHorizontal,
  History as HistoryIcon,
  ScanLine,
} from "lucide-react";
import ScreenHeader from "@/components/app/ScreenHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  usePantryItems,
  useCreatePantryItem,
  useUpdatePantryItem,
  useDeletePantryItem,
  useSetPantryItemStatus,
} from "@/hooks/queries/usePantryItems";
import LoadingState from "@/components/app/states/LoadingState";
import EmptyState from "@/components/app/states/EmptyState";
import ErrorState from "@/components/app/states/ErrorState";
import PantryItemSheet from "@/components/app/pantry/PantryItemSheet";
import BarcodeScanSheet, {
  type ScannedInitialValues,
} from "@/components/app/pantry/BarcodeScanSheet";
import {
  CATEGORIES,
  LOCATIONS,
  expiryBucket,
  expiryLabel,
  expiryTone,
  daysUntilExpiry,
} from "@/lib/pantry";
import type { PantryItem } from "@/repositories/pantry";
import { toast } from "@/hooks/use-toast";

type SortKey = "expiry" | "recent";
type LocationFilter = "all" | PantryItem["location"];
type CategoryFilter = "all" | string;

const formatQty = (item: PantryItem) => {
  if (item.quantity == null) return item.unit ?? "";
  const q = Number(item.quantity);
  const qStr = Number.isInteger(q) ? String(q) : q.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return item.unit ? `${qStr} ${item.unit}` : qStr;
};

const PantryScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: items = [], isLoading, isError, refetch } = usePantryItems(userId);
  const createMut = useCreatePantryItem(userId);
  const updateMut = useUpdatePantryItem(userId);
  const deleteMut = useDeletePantryItem(userId);
  const statusMut = useSetPantryItemStatus(userId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanInitial, setScanInitial] = useState<ScannedInitialValues | undefined>(undefined);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PantryItem | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [location, setLocation] = useState<LocationFilter>("all");
  const [sort, setSort] = useState<SortKey>("expiry");

  const filtersActive = category !== "all" || location !== "all";

  const filtered = useMemo(() => {
    let out = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (category !== "all") out = out.filter((i) => i.category === category);
    if (location !== "all") out = out.filter((i) => i.location === location);

    if (sort === "expiry") {
      out = [...out].sort((a, b) => {
        const ad = daysUntilExpiry(a.expires_on);
        const bd = daysUntilExpiry(b.expires_on);
        if (ad === null && bd === null) return 0;
        if (ad === null) return 1;
        if (bd === null) return -1;
        return ad - bd;
      });
    } else {
      out = [...out].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return out;
  }, [items, search, category, location, sort]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) {
      const key = it.category ?? "Other";
      m[key] = (m[key] ?? 0) + 1;
    }
    return m;
  }, [items]);

  const expiringCount = useMemo(
    () =>
      items.filter((i) => {
        const b = expiryBucket(i.expires_on);
        return b === "expired" || b === "today" || b === "tomorrow" || b === "soon";
      }).length,
    [items]
  );

  const openAdd = () => {
    setEditing(null);
    setScanInitial(undefined);
    setSheetOpen(true);
  };
  const openEdit = (item: PantryItem) => {
    setEditing(item);
    setScanInitial(undefined);
    setSheetOpen(true);
  };
  const openScan = () => setScanOpen(true);
  const handleScanPrefill = (values: ScannedInitialValues) => {
    setEditing(null);
    setScanInitial(values);
    setSheetOpen(true);
  };
  const handleScanDuplicate = (existing: PantryItem) => {
    toast({
      title: "Already in your pantry",
      description: `${existing.name} — update the existing item instead.`,
    });
    setScanInitial(undefined);
    setEditing(existing);
    setSheetOpen(true);
  };

  const handleSubmit = async (payload: Parameters<typeof createMut.mutateAsync>[0]) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, patch: payload });
      toast({ title: "Item updated" });
    } else {
      await createMut.mutateAsync(payload);
      toast({ title: "Added to pantry" });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMut.mutateAsync(pendingDelete);
      toast({ title: "Item deleted" });
    } catch (e) {
      toast({
        title: "Couldn't delete",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingDelete(null);
    }
  };

  const handleStatus = async (item: PantryItem, status: "consumed" | "discarded") => {
    try {
      await statusMut.mutateAsync({ item, status });
      toast({
        title: status === "consumed" ? "Marked as consumed" : "Marked as discarded",
      });
    } catch (e) {
      toast({
        title: "Couldn't update status",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const subtitle = items.length
    ? `${items.length} item${items.length === 1 ? "" : "s"}${
        expiringCount ? ` · ${expiringCount} need attention` : ""
      }`
    : "Start tracking what's in your kitchen";

  return (
    <div>
      <ScreenHeader
        title="Pantry"
        subtitle={subtitle}
        right={
          <div className="flex items-center gap-2">
            <Link
              to="/app/pantry/history"
              aria-label="Pantry history"
              className="h-11 w-11 rounded-full bg-white border border-[hsl(var(--app-border))] grid place-items-center no-tap-highlight active:scale-95 transition-transform"
            >
              <HistoryIcon className="h-5 w-5 text-[hsl(var(--app-foreground))]" />
            </Link>
            <button
              onClick={openAdd}
              aria-label="Add pantry item"
              className="h-11 w-11 rounded-full bg-[hsl(var(--app-primary))] text-white grid place-items-center shadow-md no-tap-highlight active:scale-95 transition-transform"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="px-5 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--app-muted))]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your pantry"
            className="h-12 rounded-2xl pl-11 pr-4 bg-white border-[hsl(var(--app-border))]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v)}>
            <SelectTrigger className="h-10 rounded-xl flex-1 bg-white border-[hsl(var(--app-border))]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={location} onValueChange={(v) => setLocation(v as LocationFilter)}>
            <SelectTrigger className="h-10 rounded-xl flex-1 bg-white border-[hsl(var(--app-border))]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {LOCATIONS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white border-[hsl(var(--app-border))]"
                aria-label="Sort"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSort("expiry")}>
                {sort === "expiry" && <Check className="h-4 w-4 mr-2" />}
                <span className={sort === "expiry" ? "" : "ml-6"}>Nearest expiry</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("recent")}>
                {sort === "recent" && <Check className="h-4 w-4 mr-2" />}
                <span className={sort === "recent" ? "" : "ml-6"}>Recently added</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Category tiles */}
        {items.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.slice(0, 4).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? "all" : c)}
                className={`app-card-flat p-3 text-center transition-colors ${
                  category === c
                    ? "bg-[hsl(var(--app-primary-soft))] border-[hsl(var(--app-primary))]"
                    : ""
                }`}
              >
                <p className="text-xl font-bold text-[hsl(var(--app-foreground))]">
                  {categoryCounts[c] ?? 0}
                </p>
                <p className="text-[11px] font-medium text-[hsl(var(--app-muted))] truncate">
                  {c}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <LoadingState label="Loading your pantry…" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load pantry"
            description="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Plus className="h-5 w-5" />}
            title="Your pantry is empty"
            description="Add your first item to start tracking freshness and reduce waste."
            action={
              <Button
                onClick={openAdd}
                className="rounded-xl bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add item
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No matches" : "No items match your filters"}
            description={
              search
                ? `Nothing found for "${search}".`
                : "Try changing category or location filters."
            }
            action={
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setLocation("all");
                }}
              >
                Clear {search ? "search" : "filters"}
              </Button>
            }
          />
        ) : (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))]">
                {sort === "expiry" ? "By expiry" : "Recently added"}
              </h2>
              <span className="text-xs text-[hsl(var(--app-muted))]">
                {filtered.length} shown
              </span>
            </div>
            <div className="app-card divide-y divide-[hsl(var(--app-border))]">
              {filtered.map((item) => {
                const bucket = expiryBucket(item.expires_on);
                const tone = expiryTone(bucket);
                const qty = formatQty(item);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => openEdit(item)}
                      className={`h-11 w-11 rounded-xl grid place-items-center text-lg font-bold no-tap-highlight ${tone.icon}`}
                    >
                      {item.name[0]?.toUpperCase()}
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-semibold text-[hsl(var(--app-foreground))] truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-[hsl(var(--app-muted))] truncate">
                        {[qty, item.category, LOCATIONS.find((l) => l.value === item.location)?.label]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </button>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${tone.badge}`}
                    >
                      {expiryLabel(item.expires_on)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="Item actions"
                          className="h-8 w-8 rounded-lg grid place-items-center text-[hsl(var(--app-muted))] hover:bg-[hsl(var(--app-subtle))] no-tap-highlight"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatus(item, "consumed")}>
                          <Check className="h-4 w-4 mr-2" /> Mark as consumed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatus(item, "discarded")}>
                          <X className="h-4 w-4 mr-2" /> Mark as discarded
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setPendingDelete(item)}
                          className="text-[hsl(var(--app-danger))] focus:text-[hsl(var(--app-danger))]"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <PantryItemSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={editing}
        onSubmit={handleSubmit}
        saving={createMut.isPending || updateMut.isPending}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} will be removed from your pantry. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[hsl(var(--app-danger))] hover:bg-[hsl(var(--app-danger))]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PantryScreen;
