import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, X, Trash2, History as HistoryIcon } from "lucide-react";
import ScreenHeader from "@/components/app/ScreenHeader";
import LoadingState from "@/components/app/states/LoadingState";
import EmptyState from "@/components/app/states/EmptyState";
import ErrorState from "@/components/app/states/ErrorState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { usePantryEvents } from "@/hooks/queries/usePantryItems";
import type { PantryEventType } from "@/repositories/pantryEvents";

type Filter = "all" | "consumed" | "discarded" | "deleted";

const TYPE_META: Record<
  PantryEventType,
  { label: string; icon: typeof Check; tone: string }
> = {
  added: { label: "Added", icon: Check, tone: "bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))]" },
  consumed: { label: "Consumed", icon: Check, tone: "bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))]" },
  discarded: { label: "Discarded", icon: X, tone: "bg-amber-100 text-amber-700" },
  deleted: { label: "Deleted", icon: Trash2, tone: "bg-[hsl(var(--app-subtle))] text-[hsl(var(--app-muted))]" },
};

const formatQty = (quantity: number | null, unit: string | null) => {
  if (quantity == null) return unit ?? "";
  const q = Number(quantity);
  const qStr = Number.isInteger(q) ? String(q) : q.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return unit ? `${qStr} ${unit}` : qStr;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

const PantryHistoryScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: events = [], isLoading, isError, refetch } = usePantryEvents(userId);
  const [filter, setFilter] = useState<Filter>("all");

  // History = actions on items (exclude "added").
  const visible = useMemo(() => {
    const base = events.filter((e) => e.event_type !== "added");
    if (filter === "all") return base;
    return base.filter((e) => e.event_type === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    const groups: { key: string; items: typeof visible }[] = [];
    for (const e of visible) {
      const k = dayKey(e.occurred_at);
      const last = groups[groups.length - 1];
      if (last && last.key === k) last.items.push(e);
      else groups.push({ key: k, items: [e] });
    }
    return groups;
  }, [visible]);

  return (
    <div>
      <ScreenHeader
        title="Pantry history"
        subtitle="Every item you've used, tossed or removed."
        right={
          <Link
            to="/app/pantry"
            aria-label="Back to pantry"
            className="h-11 w-11 rounded-full bg-white border border-[hsl(var(--app-border))] grid place-items-center no-tap-highlight active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5 text-[hsl(var(--app-foreground))]" />
          </Link>
        }
      />

      <div className="px-5 space-y-5">
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="h-10 rounded-xl bg-white border-[hsl(var(--app-border))]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="consumed">Consumed</SelectItem>
            <SelectItem value="discarded">Discarded</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>

        {isLoading ? (
          <LoadingState label="Loading history…" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load history"
            description="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon className="h-5 w-5" />}
            title={filter === "all" ? "No history yet" : "No matching actions"}
            description={
              filter === "all"
                ? "Once you mark items consumed, discarded or deleted, they'll show up here."
                : "Try a different filter."
            }
          />
        ) : (
          <div className="space-y-5">
            {grouped.map((g) => (
              <section key={g.key}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--app-muted))] mb-2 px-1">
                  {g.key}
                </h2>
                <div className="app-card divide-y divide-[hsl(var(--app-border))]">
                  {g.items.map((e) => {
                    const meta = TYPE_META[e.event_type];
                    const Icon = meta.icon;
                    const qty = formatQty(e.quantity, e.unit);
                    return (
                      <div key={e.id} className="flex items-center gap-3 p-4">
                        <div className={`h-10 w-10 rounded-xl grid place-items-center ${meta.tone}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[hsl(var(--app-foreground))] truncate">
                            {e.item_name}
                          </p>
                          <p className="text-xs text-[hsl(var(--app-muted))] truncate">
                            {[meta.label, qty, e.category].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <span className="text-[11px] text-[hsl(var(--app-muted))] whitespace-nowrap">
                          {formatDate(e.occurred_at).split(" · ")[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PantryHistoryScreen;
