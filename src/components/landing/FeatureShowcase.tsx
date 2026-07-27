// Feature showcase — outcome-led copy paired with lightweight, honest
// device-frame previews. Previews are built with the app's real design
// tokens (sage/nordic/cream) so they read as authentic Fuudit screens
// without ever claiming a feature that doesn't ship.
import {
  Package,
  ChefHat,
  Search,
  CalendarDays,
  ShoppingBag,
  ScanLine,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";

// ---------- Reusable mini-phone frame ----------

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto w-full max-w-[280px]">
    <div className="rounded-[2.5rem] border border-nordic-200/70 bg-nordic-900/95 p-2 shadow-2xl shadow-sage-900/10">
      <div className="rounded-[2rem] bg-white overflow-hidden aspect-[9/17]">
        <div className="h-8 bg-white flex items-center justify-center">
          <div className="h-1.5 w-16 rounded-full bg-nordic-200" aria-hidden="true" />
        </div>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  </div>
);

// ---------- Real-feature previews ----------

const PantryPreview = () => (
  <PhoneFrame>
    <p className="text-[10px] font-semibold uppercase tracking-widest text-sage-700 mb-1">
      Pantry
    </p>
    <h4 className="text-sm font-bold text-nordic-800 mb-3">12 items · 3 need attention</h4>
    <div className="space-y-2">
      {[
        { name: "Spinach", tone: "bg-red-100 text-red-700", meta: "Today" },
        { name: "Greek yogurt", tone: "bg-amber-100 text-amber-700", meta: "2 days" },
        { name: "Oat milk", tone: "bg-sage-100 text-sage-700", meta: "5 days" },
        { name: "Sourdough", tone: "bg-sage-100 text-sage-700", meta: "6 days" },
      ].map((r) => (
        <div key={r.name} className="flex items-center gap-2 rounded-xl border border-sage-100 p-2">
          <div className="h-7 w-7 rounded-lg bg-sage-100 text-sage-700 grid place-items-center text-xs font-bold">
            {r.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-nordic-800 truncate">{r.name}</p>
          </div>
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${r.tone}`}>
            {r.meta}
          </span>
        </div>
      ))}
    </div>
    <div className="mt-3 rounded-xl bg-sage-50 border border-sage-100 p-2 flex items-center gap-2">
      <Sparkles className="h-3 w-3 text-sage-700" aria-hidden="true" />
      <p className="text-[10px] text-nordic-700">Smart expiry · +3 · +7 days</p>
    </div>
  </PhoneFrame>
);

const ChefPreview = () => (
  <PhoneFrame>
    <p className="text-[10px] font-semibold uppercase tracking-widest text-sage-700 mb-1">
      AI Chef
    </p>
    <h4 className="text-sm font-bold text-nordic-800 mb-3">Cook with what I have</h4>
    <div className="space-y-2">
      <div className="rounded-2xl rounded-tl-sm bg-sage-100 p-2.5 text-xs text-nordic-800 max-w-[85%]">
        I have spinach and yogurt about to expire. 20 minutes.
      </div>
      <div className="rounded-2xl rounded-tr-sm bg-white border border-sage-100 p-2.5 text-xs text-nordic-800 max-w-[90%] ml-auto">
        Try a warm spinach yogurt bowl. Uses both, ready in 18 min.
      </div>
      <div className="rounded-xl border border-sage-100 p-2 bg-white">
        <p className="text-[10px] font-semibold text-sage-700 uppercase tracking-widest">Recipe</p>
        <p className="text-xs font-bold text-nordic-800 mt-0.5">Spinach yogurt bowl</p>
        <p className="text-[10px] text-nordic-600 mt-0.5">18 min · uses 2 pantry items</p>
      </div>
    </div>
  </PhoneFrame>
);

const DiscoverPreview = () => (
  <PhoneFrame>
    <div className="flex items-center gap-2 rounded-xl border border-sage-200 bg-white px-3 py-2 mb-3">
      <Search className="h-3 w-3 text-nordic-500" aria-hidden="true" />
      <span className="text-[11px] text-nordic-500">spinach, yogurt…</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {["Greens bowl", "Yogurt flatbread", "Lentil soup", "Herby pasta"].map((t) => (
        <div key={t} className="rounded-xl border border-sage-100 overflow-hidden">
          <div className="aspect-[4/3] bg-gradient-to-br from-sage-200 to-cream-200" />
          <p className="p-2 text-[10px] font-semibold text-nordic-800 truncate">{t}</p>
        </div>
      ))}
    </div>
  </PhoneFrame>
);

const MealPlanPreview = () => (
  <PhoneFrame>
    <p className="text-[10px] font-semibold uppercase tracking-widest text-sage-700 mb-1">
      Meal Plan
    </p>
    <h4 className="text-sm font-bold text-nordic-800 mb-3">This week</h4>
    <div className="space-y-2">
      {[
        { d: "Mon", m: "Warm grain bowl" },
        { d: "Tue", m: "Lentil soup" },
        { d: "Wed", m: "Sourdough toast" },
        { d: "Thu", m: "Salmon + greens" },
      ].map((r) => (
        <div key={r.d} className="flex items-center gap-2 rounded-xl bg-sage-50 p-2">
          <div className="h-8 w-8 rounded-lg bg-white grid place-items-center">
            <span className="text-[10px] font-bold text-sage-700">{r.d}</span>
          </div>
          <p className="text-xs font-semibold text-nordic-800 flex-1 min-w-0 truncate">
            {r.m}
          </p>
          <CalendarDays className="h-3 w-3 text-nordic-400" aria-hidden="true" />
        </div>
      ))}
    </div>
  </PhoneFrame>
);

const GroceryPreview = () => (
  <PhoneFrame>
    <p className="text-[10px] font-semibold uppercase tracking-widest text-sage-700 mb-1">
      Grocery
    </p>
    <h4 className="text-sm font-bold text-nordic-800 mb-3">Only what's missing</h4>
    <div className="space-y-1.5">
      {[
        { n: "Chickpeas", c: false },
        { n: "Lemon", c: false },
        { n: "Feta", c: true },
        { n: "Olive oil", c: false },
      ].map((r) => (
        <div
          key={r.n}
          className="flex items-center gap-2 rounded-xl border border-sage-100 p-2"
        >
          <div
            className={`h-5 w-5 rounded-md grid place-items-center border ${
              r.c
                ? "bg-sage-600 border-sage-600 text-white"
                : "bg-white border-sage-300"
            }`}
          >
            {r.c && <Check className="h-3 w-3" aria-hidden="true" />}
          </div>
          <p
            className={`text-xs font-semibold flex-1 min-w-0 truncate ${
              r.c ? "text-nordic-400 line-through" : "text-nordic-800"
            }`}
          >
            {r.n}
          </p>
        </div>
      ))}
    </div>
  </PhoneFrame>
);

const ScanPreview = () => (
  <PhoneFrame>
    <p className="text-[10px] font-semibold uppercase tracking-widest text-sage-700 mb-1">
      Barcode scan
    </p>
    <div className="aspect-[4/3] rounded-xl bg-nordic-900 relative overflow-hidden mb-3">
      <div className="absolute inset-4 rounded-lg border-2 border-white/80" />
      <div className="absolute inset-x-6 top-1/2 h-0.5 bg-sage-400/80" />
    </div>
    <div className="rounded-xl border border-sage-100 bg-white p-2 flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-cream-100 grid place-items-center">
        <ScanLine className="h-4 w-4 text-cream-700" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-sage-700 uppercase tracking-widest">
          Confirm before adding
        </p>
        <p className="text-xs font-bold text-nordic-800 truncate">Oat milk 1L</p>
      </div>
    </div>
  </PhoneFrame>
);

const AdaptivePreview = () => (
  <PhoneFrame>
    <div className="rounded-2xl bg-sage-50 border border-sage-200 p-3 mb-3 flex items-start gap-2">
      <Sparkles className="h-4 w-4 text-sage-700 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sage-700">
          Smart insight
        </p>
        <p className="text-xs text-nordic-800 mt-0.5">
          You usually finish oat milk within 4 days.
        </p>
      </div>
    </div>
    <p className="text-[10px] font-semibold uppercase tracking-widest text-nordic-500 mb-2">
      Frequently added
    </p>
    <div className="flex flex-wrap gap-1.5">
      {["Oat milk", "Bananas", "Greek yogurt", "Sourdough", "Spinach"].map((c) => (
        <span
          key={c}
          className="rounded-full bg-white border border-sage-200 px-2.5 py-1 text-[10px] font-medium text-nordic-800"
        >
          {c} +
        </span>
      ))}
    </div>
  </PhoneFrame>
);

// ---------- Section rows ----------

type Feature = {
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ElementType;
  Preview: React.ComponentType;
  reverse?: boolean;
};

const features: Feature[] = [
  {
    eyebrow: "Smart Pantry",
    title: "Your food, organised without the fuss",
    body: "See what you have, what needs using first, and where it's stored — with quick expiry shortcuts that get you back to cooking.",
    icon: Package,
    Preview: PantryPreview,
  },
  {
    eyebrow: "AI Chef",
    title: "Cook with what's already there",
    body: "Have a short conversation with Fuudit about what you feel like eating. It answers with recipes that use the ingredients you already own.",
    icon: ChefHat,
    Preview: ChefPreview,
    reverse: true,
  },
  {
    eyebrow: "Recipe Discovery",
    title: "Find recipes that fit tonight",
    body: "Browse a curated recipe library, filter by ingredients or diet, and save the ones you love for later.",
    icon: Search,
    Preview: DiscoverPreview,
  },
  {
    eyebrow: "Meal Planning",
    title: "A week of meals, without the guesswork",
    body: "Drag recipes into your week — breakfast, lunch, dinner or a snack — and see everything you'll need at a glance.",
    icon: CalendarDays,
    Preview: MealPlanPreview,
    reverse: true,
  },
  {
    eyebrow: "Grocery List",
    title: "Shop only for what's actually missing",
    body: "Generate a grocery list from your meal plan. Fuudit compares it with your pantry so you don't rebuy what you already have.",
    icon: ShoppingBag,
    Preview: GroceryPreview,
  },
  {
    eyebrow: "Barcode Scanning",
    title: "Scan packaged food in seconds",
    body: "Point your camera at a barcode and review the details before adding it to your pantry — you stay in control of every entry.",
    icon: ScanLine,
    Preview: ScanPreview,
    reverse: true,
  },
];

const FeatureShowcase = () => (
  <section
    id="features"
    aria-labelledby="features-heading"
    className="bg-white py-20 md:py-24"
  >
    <div className="container mx-auto px-6">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-sage-700 mb-3">
          Features
        </p>
        <h2
          id="features-heading"
          className="text-3xl md:text-4xl font-bold text-nordic-800 text-balance"
        >
          Everything you need to eat well and waste less
        </h2>
      </div>

      <div className="space-y-20 md:space-y-28 max-w-6xl mx-auto">
        {features.map((f) => {
          const Icon = f.icon;
          const Preview = f.Preview;
          return (
            <article
              key={f.title}
              className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${
                f.reverse ? "md:[&>div:first-child]:order-2" : ""
              }`}
            >
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-sage-100 text-sage-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest mb-4">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {f.eyebrow}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-nordic-800 mb-4 text-balance">
                  {f.title}
                </h3>
                <p className="text-base md:text-lg text-nordic-600 leading-relaxed max-w-md">
                  {f.body}
                </p>
              </div>
              <div>
                <Preview />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);

export default FeatureShowcase;
export { AdaptivePreview };
