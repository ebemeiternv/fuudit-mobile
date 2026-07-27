import { Lock, User, Settings2, Leaf } from "lucide-react";

const pillars = [
  {
    icon: Lock,
    title: "Private by design",
    body: "Your pantry and learning data belong to your account and aren't shared with other users.",
  },
  {
    icon: User,
    title: "Your data, your account",
    body: "Everything Fuudit learns is scoped to you — including preferences, history and suggestions.",
  },
  {
    icon: Settings2,
    title: "You stay in control",
    body: "Suggestions are always editable. Nothing gets added to your pantry or list without your confirmation.",
  },
  {
    icon: Leaf,
    title: "Built to reduce waste",
    body: "Every design decision is aimed at helping households throw away less food, one meal at a time.",
  },
];

const TrustSection = () => (
  <section
    aria-labelledby="trust-heading"
    className="bg-gradient-to-b from-white to-sage-50/40 py-20 md:py-24"
  >
    <div className="container mx-auto px-6">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-sage-700 mb-3">
          Trust &amp; privacy
        </p>
        <h2
          id="trust-heading"
          className="text-3xl md:text-4xl font-bold text-nordic-800 text-balance"
        >
          A calm, private space for your kitchen
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="rounded-3xl border border-sage-100 bg-white p-6"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sage-100 text-sage-700 mb-4">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-nordic-800 mb-2">
                {p.title}
              </h3>
              <p className="text-sm text-nordic-600 leading-relaxed">
                {p.body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default TrustSection;
