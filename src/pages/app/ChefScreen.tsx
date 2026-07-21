import ScreenHeader from "@/components/app/ScreenHeader";
import { Sparkles, Clock, Flame, Utensils, Refrigerator, Recycle } from "lucide-react";

const prompts = [
  { title: "Cook with what I have", subtitle: "Uses 8 pantry items", Icon: Refrigerator, tint: "bg-[hsl(var(--app-accent-violet)/0.12)] text-[hsl(var(--app-accent-violet))]" },
  { title: "Remix last night's dinner", subtitle: "Leftover chicken & rice", Icon: Recycle, tint: "bg-[hsl(var(--app-accent-sky)/0.12)] text-[hsl(var(--app-accent-sky))]" },
  { title: "Quick 15-min dinner", subtitle: "Weeknight friendly", Icon: Clock, tint: "bg-[hsl(var(--app-accent-warm)/0.12)] text-[hsl(var(--app-accent-warm))]" },
  { title: "High-protein lunch", subtitle: "Aligned to your goals", Icon: Flame, tint: "bg-[hsl(var(--app-accent-berry)/0.12)] text-[hsl(var(--app-accent-berry))]" },
];

const suggestion = {
  title: "Spinach & feta pan pie",
  desc: "Uses spinach, yogurt & pantry basics before they expire.",
  time: 25,
  servings: 2,
};

const ChefScreen = () => (
  <div>
    <ScreenHeader
      eyebrow="AI Chef"
      title="Tilda"
      subtitle="Your smart kitchen companion"
      right={
        <div className="h-11 w-11 rounded-full bg-[hsl(var(--app-accent-violet-soft))] text-[hsl(var(--app-accent-violet))] grid place-items-center shadow-md">
          <Sparkles className="h-5 w-5" />
        </div>
      }
    />

    <div className="px-5 space-y-5">
      <div className="app-card p-5 bg-gradient-to-br from-[hsl(var(--app-accent-violet))] to-[hsl(268_60%_48%)] text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Recommended tonight</p>
        <h2 className="text-2xl font-bold mt-2 tracking-tight">{suggestion.title}</h2>
        <p className="text-white/90 text-sm mt-1">{suggestion.desc}</p>
        <div className="flex items-center gap-4 mt-4 text-sm text-white/90 font-medium">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {suggestion.time} min</span>
          <span className="inline-flex items-center gap-1.5"><Utensils className="h-4 w-4" /> {suggestion.servings} servings</span>
        </div>
        <button className="mt-5 w-full h-11 rounded-xl bg-white text-[hsl(var(--app-accent-violet))] font-semibold no-tap-highlight active:scale-[0.98] transition-transform">
          Show me the recipe
        </button>
      </div>

      <section>
        <h3 className="text-lg font-bold text-[hsl(var(--app-foreground))] mb-3 px-1">What would you like?</h3>
        <div className="grid grid-cols-2 gap-3">
          {prompts.map((p) => {
            const tokenMap: Record<string, string> = {
              violet: "app-accent-violet",
              sky: "app-accent-sky",
              warm: "app-accent-warm",
              berry: "app-accent-berry",
            };
            const token = tokenMap[p.tint];
            return (
              <button
                key={p.title}
                className="app-card p-4 text-left no-tap-highlight active:scale-[0.98] transition-transform"
              >
                <div className={`h-10 w-10 rounded-xl bg-[hsl(var(--${token})_/_0.12)] text-[hsl(var(--${token}))] grid place-items-center mb-3`}>
                  <p.Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-[hsl(var(--app-foreground))] text-sm leading-snug">{p.title}</p>
                <p className="text-xs text-[hsl(var(--app-muted))] mt-1">{p.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="app-card-flat p-4 flex items-center gap-3">
        <input
          placeholder="Ask Tilda anything..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[hsl(var(--app-muted))]"
        />
        <button className="h-9 w-9 rounded-xl bg-[hsl(var(--app-accent-violet))] text-white grid place-items-center">
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

export default ChefScreen;
