import { Plus, Brain, Utensils, ShoppingBag } from "lucide-react";

const steps = [
  {
    icon: Plus,
    title: "Add food quickly",
    body: "Manual entry, barcode scanning and smart defaults.",
  },
  {
    icon: Brain,
    title: "Fuudit remembers",
    body: "It learns storage, quantities, expiry choices and real usage patterns.",
  },
  {
    icon: Utensils,
    title: "Decide what to cook",
    body: "Use AI Chef, recipe discovery and the Meal Plan.",
  },
  {
    icon: ShoppingBag,
    title: "Shop only for what's missing",
    body: "Generate the Grocery list by comparing planned recipes with the Pantry.",
  },
];

const HowItWorks = () => (
  <section
    id="how-it-works"
    aria-labelledby="how-heading"
    className="bg-gradient-to-b from-sage-50/60 to-white py-20 md:py-24"
  >
    <div className="container mx-auto px-6">
      <div className="max-w-2xl mx-auto text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-sage-700 mb-3">
          How it works
        </p>
        <h2
          id="how-heading"
          className="text-3xl md:text-4xl font-bold text-nordic-800 text-balance"
        >
          From pantry to plate, in four calm steps
        </h2>
      </div>

      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="relative rounded-3xl border border-sage-100 bg-white p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-sage-700 text-sm font-bold"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <Icon
                  className="h-5 w-5 text-sage-600"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-base font-semibold text-nordic-800 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-nordic-600 leading-relaxed">
                {step.body}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
