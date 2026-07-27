import { Sparkles, Check } from "lucide-react";
import { AdaptivePreview } from "./FeatureShowcase";

const learns = [
  "Your preferred storage location",
  "Usual quantity and unit",
  "Common expiry choices",
  "Frequently and recently added products",
  "How long products typically last before you use them",
];

const AdaptiveLearning = () => (
  <section
    aria-labelledby="adaptive-heading"
    className="bg-gradient-to-br from-sage-50 via-white to-cream-50 py-20 md:py-24"
  >
    <div className="container mx-auto px-6">
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-6xl mx-auto">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-sage-200 text-sage-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest mb-4">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Adaptive learning
          </div>
          <h2
            id="adaptive-heading"
            className="text-3xl md:text-4xl font-bold text-nordic-800 text-balance mb-4"
          >
            The more you use Fuudit, the less you have to enter.
          </h2>
          <p className="text-nordic-600 text-lg leading-relaxed mb-6 max-w-md">
            Fuudit quietly picks up on how you actually shop, store and cook —
            so the next time you add the same product, most of the form is
            already filled in the way you'd fill it yourself.
          </p>
          <ul className="space-y-2.5">
            {learns.map((l) => (
              <li key={l} className="flex items-start gap-3 text-nordic-700">
                <Check
                  className="h-5 w-5 text-sage-600 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm md:text-base">{l}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-nordic-500 max-w-md">
            Suggestions are always editable. You stay in control of what goes
            into your kitchen.
          </p>
        </div>
        <div>
          <AdaptivePreview />
        </div>
      </div>
    </div>
  </section>
);

export default AdaptiveLearning;
