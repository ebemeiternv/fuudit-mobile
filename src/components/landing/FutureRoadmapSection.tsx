import { Dna, Activity, Scan } from "lucide-react";

const roadmap = [
  {
    icon: Dna,
    title: "Personalised nutrition",
    body: "Future meal guidance shaped around your goals, preferences and lifestyle. Fuudit will never provide diagnosis, treatment or medical nutrition therapy.",
  },
  {
    icon: Activity,
    title: "Health and wearable insights",
    body: "Optional future integrations that could help Fuudit make recommendations relevant to your activity and routines.",
  },
  {
    icon: Scan,
    title: "Camera-powered food entry",
    body: "Future photo recognition to help identify food and make Pantry entry even faster. Expiry-date scanning could be part of the same experience.",
  },
];

const FutureRoadmapSection = () => (
  <section
    id="roadmap"
    aria-labelledby="roadmap-heading"
    className="bg-cream-50/60 py-20 md:py-24"
  >
    <div className="container mx-auto px-6">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-sage-700 mb-3">
          Future roadmap
        </p>
        <h2
          id="roadmap-heading"
          className="text-3xl md:text-4xl font-bold text-nordic-800 text-balance"
        >
          Fuudit is just getting started
        </h2>
        <p className="mt-4 text-nordic-600 leading-relaxed">
          We’re building more ways to make food management, meal planning and everyday nutrition feel effortless.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {roadmap.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-3xl border-2 border-dashed border-sage-200 bg-white p-6"
            >
              <div className="inline-flex items-center rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold text-cream-800 mb-4">
                On our roadmap
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sage-100 text-sage-700 mb-4">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-nordic-800 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-nordic-600 leading-relaxed">
                {item.body}
              </p>
            </article>
          );
        })}
      </div>

      <p className="text-center text-xs text-nordic-500 mt-10 max-w-2xl mx-auto">
        These capabilities are planned but not yet available. We’ll share more when they’re ready.
      </p>
    </div>
  </section>
);

export default FutureRoadmapSection;
