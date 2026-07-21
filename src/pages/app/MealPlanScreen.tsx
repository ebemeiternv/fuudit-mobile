import ScreenHeader from "@/components/app/ScreenHeader";
import { Plus } from "lucide-react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const today = new Date().getDay(); // 0=Sun
const todayIndex = today === 0 ? 6 : today - 1;

const meals = [
  { slot: "Breakfast", title: "Overnight oats", note: "with berries & almonds", kcal: 380 },
  { slot: "Lunch", title: "Greek salad bowl", note: "feta, cucumber, olives", kcal: 520 },
  { slot: "Dinner", title: "Spinach & feta pan pie", note: "using pantry items", kcal: 640 },
  { slot: "Snack", title: "Yogurt & honey", note: "quick refuel", kcal: 220 },
];

const MealPlanScreen = () => (
  <div>
    <ScreenHeader
      title="Meal plan"
      subtitle="This week · 4 meals planned"
      right={
        <button className="h-11 w-11 rounded-full bg-[hsl(var(--app-primary))] text-white grid place-items-center shadow-md no-tap-highlight active:scale-95 transition-transform">
          <Plus className="h-5 w-5" />
        </button>
      }
    />

    <div className="px-5 space-y-5">
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar">
        {days.map((d, i) => {
          const isToday = i === todayIndex;
          return (
            <button
              key={d}
              className={`shrink-0 flex flex-col items-center justify-center h-16 w-14 rounded-2xl transition-all no-tap-highlight ${
                isToday
                  ? "bg-[hsl(var(--app-primary))] text-white shadow-md"
                  : "bg-white border border-[hsl(var(--app-border))] text-[hsl(var(--app-foreground))]"
              }`}
            >
              <span className={`text-[11px] font-medium ${isToday ? "text-white/80" : "text-[hsl(var(--app-muted))]"}`}>{d}</span>
              <span className="text-lg font-bold mt-0.5">{i + 1}</span>
            </button>
          );
        })}
      </div>

      <section className="space-y-3">
        {meals.map((m) => (
          <div key={m.slot} className="app-card p-4 flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--app-primary-soft))] to-[hsl(var(--app-accent-sky-soft))] grid place-items-center">
              <span className="text-2xl">🥗</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--app-primary))]">{m.slot}</p>
              <p className="font-semibold text-[hsl(var(--app-foreground))] mt-0.5">{m.title}</p>
              <p className="text-xs text-[hsl(var(--app-muted))]">{m.note} · {m.kcal} kcal</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  </div>
);

export default MealPlanScreen;
