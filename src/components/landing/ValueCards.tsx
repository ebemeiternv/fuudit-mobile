import { Refrigerator, ChefHat, Sprout } from "lucide-react";

const values = [
  {
    icon: Refrigerator,
    title: "Know what you have",
    body: "Keep food organised and see what should be used first.",
  },
  {
    icon: ChefHat,
    title: "Cook with what's already there",
    body: "Get recipe ideas based on your pantry, preferences and available time.",
  },
  {
    icon: Sprout,
    title: "Waste less, with less effort",
    body: "Plan meals and shopping while Fuudit learns the defaults that suit you.",
  },
];

const ValueCards = () => (
  <section aria-label="Why Fuudit" className="bg-white py-16 md:py-20">
    <div className="container mx-auto px-6">
      <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
        {values.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="rounded-3xl border border-sage-100 bg-white p-8 text-center transition-shadow duration-300 hover:shadow-lg hover:shadow-sage-100/60"
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-700 mb-5">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-nordic-800 mb-2">
              {title}
            </h3>
            <p className="text-nordic-600 text-sm leading-relaxed">{body}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default ValueCards;
