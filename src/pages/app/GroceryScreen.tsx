import ScreenHeader from "@/components/app/ScreenHeader";
import { Sparkles, Plus } from "lucide-react";
import { useState } from "react";

type Item = { id: string; name: string; qty: string; section: string; done: boolean };

const initial: Item[] = [
  { id: "1", name: "Baby spinach", qty: "200 g", section: "Produce", done: false },
  { id: "2", name: "Cherry tomatoes", qty: "1 pack", section: "Produce", done: false },
  { id: "3", name: "Feta cheese", qty: "200 g", section: "Dairy", done: false },
  { id: "4", name: "Greek yogurt", qty: "500 g", section: "Dairy", done: true },
  { id: "5", name: "Whole-grain pasta", qty: "1 pack", section: "Pantry", done: false },
  { id: "6", name: "Olive oil", qty: "1 bottle", section: "Pantry", done: true },
];

const GroceryScreen = () => {
  const [items, setItems] = useState(initial);
  const grouped = items.reduce<Record<string, Item[]>>((acc, i) => {
    (acc[i.section] ||= []).push(i);
    return acc;
  }, {});
  const remaining = items.filter((i) => !i.done).length;

  return (
    <div>
      <ScreenHeader
        title="Grocery"
        subtitle={`${remaining} items to buy`}
        right={
          <button className="h-11 w-11 rounded-full bg-[hsl(var(--app-accent-berry))] text-white grid place-items-center shadow-md no-tap-highlight active:scale-95 transition-transform">
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-5 space-y-5">
        <button className="w-full app-card p-4 flex items-center gap-3 no-tap-highlight active:scale-[0.99] transition-transform text-left">
          <div className="h-10 w-10 rounded-xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[hsl(var(--app-foreground))] text-sm">Auto-generate from meal plan</p>
            <p className="text-xs text-[hsl(var(--app-muted))]">Skips what you already have</p>
          </div>
        </button>

        {Object.entries(grouped).map(([section, list]) => (
          <section key={section}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--app-muted))] mb-2 px-1">{section}</h3>
            <div className="app-card divide-y divide-[hsl(var(--app-border))]">
              {list.map((it) => (
                <label key={it.id} className="flex items-center gap-3 p-4 no-tap-highlight cursor-pointer">
                  <button
                    onClick={() => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, done: !p.done } : p)))}
                    className={`h-6 w-6 rounded-full border-2 grid place-items-center transition-all ${
                      it.done
                        ? "bg-[hsl(var(--app-primary))] border-[hsl(var(--app-primary))]"
                        : "border-[hsl(var(--app-border))]"
                    }`}
                    aria-label={it.done ? "Uncheck" : "Check"}
                  >
                    {it.done && (
                      <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${it.done ? "line-through text-[hsl(var(--app-muted))]" : "text-[hsl(var(--app-foreground))]"}`}>{it.name}</p>
                    <p className="text-xs text-[hsl(var(--app-muted))]">{it.qty}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default GroceryScreen;
