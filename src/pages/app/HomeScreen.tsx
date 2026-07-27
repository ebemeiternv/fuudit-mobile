import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/queries/useProfile";
import { usePantryItems } from "@/hooks/queries/usePantryItems";
import ScreenHeader from "@/components/app/ScreenHeader";
import {
  ArrowRight,
  Leaf,
  AlertCircle,
  ChefHat,
  ShoppingBag,
  TrendingDown,
  Plus,
} from "lucide-react";
import {
  daysUntilExpiry,
  expiryBucket,
  expiryLabel,
  expiryTone,
} from "@/lib/pantry";

const HomeScreen = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: pantry = [], isLoading: pantryLoading } = usePantryItems(user?.id);

  const name = profile?.display_name || user?.email?.split("@")[0] || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const expiring = pantry
    .filter((i) => {
      const d = daysUntilExpiry(i.expires_on);
      return d !== null && d <= 7;
    })
    .sort((a, b) => (daysUntilExpiry(a.expires_on) ?? 999) - (daysUntilExpiry(b.expires_on) ?? 999))
    .slice(0, 5);

  return (
    <div>
      <ScreenHeader
        eyebrow={greeting}
        title={name ? `Hi, ${name}` : "Welcome"}
        subtitle="Let's make the most of what's in your kitchen."
        right={
          <div className="h-11 w-11 rounded-full bg-[hsl(var(--app-primary))] text-white grid place-items-center font-semibold shadow-md">
            {(name || "F")[0]?.toUpperCase()}
          </div>
        }
      />

      <div className="px-5 space-y-5">
        {/* Impact card */}
        <div className="app-card p-5 bg-gradient-to-br from-[hsl(var(--app-primary))] to-[hsl(150_50%_28%)] text-white relative overflow-hidden">
          <Leaf className="absolute -right-3 -bottom-3 h-32 w-32 text-white/10" />
          <p className="text-xs uppercase tracking-widest text-white/80 font-semibold">Your impact</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight">2.4</span>
            <span className="text-white/80 font-medium">kg saved</span>
          </div>
          <p className="text-white/80 text-sm mt-1">this month · ~€18 & 6kg CO₂</p>
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-white/95">
            <TrendingDown className="h-4 w-4" /> 32% less waste vs last month
          </div>
        </div>

        {/* Expiring soon */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))]">Use these soon</h2>
            <Link
              to="/app/pantry"
              className="text-sm font-semibold text-[hsl(var(--app-primary))] flex items-center gap-1 no-tap-highlight"
            >
              Pantry <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {pantryLoading ? (
            <div className="app-card p-6 text-center text-sm text-[hsl(var(--app-muted))]">
              Loading…
            </div>
          ) : expiring.length === 0 ? (
            <Link
              to="/app/pantry"
              className="app-card p-5 flex items-center gap-3 no-tap-highlight active:scale-[0.99] transition-transform"
            >
              <div className="h-11 w-11 rounded-xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center">
                <Plus className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[hsl(var(--app-foreground))]">
                  {pantry.length === 0 ? "Add your first pantry item" : "Nothing expiring soon"}
                </p>
                <p className="text-xs text-[hsl(var(--app-muted))]">
                  {pantry.length === 0
                    ? "Track what's in your kitchen to reduce waste."
                    : "Great — your fridge is in good shape."}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[hsl(var(--app-muted))]" />
            </Link>
          ) : (
            <div className="app-card divide-y divide-[hsl(var(--app-border))]">
              {expiring.map((item) => {
                const tone = expiryTone(expiryBucket(item.expires_on));
                return (
                  <Link
                    key={item.id}
                    to="/app/pantry"
                    className="flex items-center gap-3 p-4 no-tap-highlight active:bg-[hsl(var(--app-subtle))]"
                  >
                    <div className={`h-10 w-10 rounded-xl grid place-items-center ${tone.icon}`}>
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[hsl(var(--app-foreground))] truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-[hsl(var(--app-muted))]">
                        {expiryLabel(item.expires_on)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[hsl(var(--app-muted))]" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="text-lg font-bold text-[hsl(var(--app-foreground))] mb-3 px-1">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/app/chef" className="app-card p-4 no-tap-highlight active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-[hsl(var(--app-accent-violet-soft))] text-[hsl(var(--app-accent-violet))] grid place-items-center mb-3">
                <ChefHat className="h-5 w-5" />
              </div>
              <p className="font-semibold text-[hsl(var(--app-foreground))]">Cook with what I have</p>
              <p className="text-xs text-[hsl(var(--app-muted))] mt-1">AI-picked recipes</p>
            </Link>
            <Link to="/app/grocery" className="app-card p-4 no-tap-highlight active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-[hsl(var(--app-accent-berry-soft))] text-[hsl(var(--app-accent-berry))] grid place-items-center mb-3">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <p className="font-semibold text-[hsl(var(--app-foreground))]">Build shopping list</p>
              <p className="text-xs text-[hsl(var(--app-muted))] mt-1">From your meal plan</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomeScreen;
