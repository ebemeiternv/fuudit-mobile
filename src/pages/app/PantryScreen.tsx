import ScreenHeader from "@/components/app/ScreenHeader";
import { Plus, Search, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";

const categories = [
  { name: "Fresh", count: 12, color: "app-primary" },
  { name: "Fridge", count: 8, color: "app-accent-sky" },
  { name: "Freezer", count: 5, color: "app-accent-violet" },
  { name: "Dry goods", count: 21, color: "app-accent-warm" },
];

const items = [
  { name: "Spinach", qty: "200 g", expires: "Tomorrow", urgent: true },
  { name: "Greek yogurt", qty: "500 g", expires: "In 2 days", urgent: true },
  { name: "Chicken breast", qty: "400 g", expires: "In 3 days", urgent: false },
  { name: "Cherry tomatoes", qty: "1 pack", expires: "In 5 days", urgent: false },
  { name: "Sourdough bread", qty: "½ loaf", expires: "In 4 days", urgent: false },
];

const PantryScreen = () => (
  <div>
    <ScreenHeader
      title="Pantry"
      subtitle="46 items · 3 need attention"
      right={
        <button className="h-11 w-11 rounded-full bg-[hsl(var(--app-primary))] text-white grid place-items-center shadow-md no-tap-highlight active:scale-95 transition-transform">
          <Plus className="h-5 w-5" />
        </button>
      }
    />

    <div className="px-5 space-y-5">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--app-muted))]" />
        <Input placeholder="Search your pantry" className="h-12 rounded-2xl pl-11 pr-12 bg-white border-[hsl(var(--app-border))]" />
        <button className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center">
          <Camera className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {categories.map((c) => (
          <div key={c.name} className={`app-card-flat p-3 text-center bg-[hsl(var(--${c.color})_/_0.06)]`}>
            <p className="text-xl font-bold text-[hsl(var(--app-foreground))]">{c.count}</p>
            <p className="text-[11px] font-medium text-[hsl(var(--app-muted))]">{c.name}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))] mb-3 px-1">Expiring soon</h2>
        <div className="app-card divide-y divide-[hsl(var(--app-border))]">
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-3 p-4">
              <div className={`h-11 w-11 rounded-xl grid place-items-center text-lg font-bold ${
                item.urgent
                  ? "bg-[hsl(var(--app-accent-warm-soft))] text-[hsl(var(--app-accent-warm))]"
                  : "bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))]"
              }`}>
                {item.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[hsl(var(--app-foreground))]">{item.name}</p>
                <p className="text-xs text-[hsl(var(--app-muted))]">{item.qty}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                item.urgent
                  ? "bg-[hsl(var(--app-accent-berry-soft))] text-[hsl(var(--app-danger))]"
                  : "bg-[hsl(var(--app-subtle))] text-[hsl(var(--app-muted))]"
              }`}>
                {item.expires}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

export default PantryScreen;
