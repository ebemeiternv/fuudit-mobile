import { Smartphone } from "lucide-react";

const MobileAvailability = () => (
  <section
    aria-labelledby="mobile-heading"
    className="bg-white py-16 md:py-20"
  >
    <div className="container mx-auto px-6">
      <div className="max-w-3xl mx-auto rounded-3xl border border-sage-100 bg-gradient-to-br from-sage-50/70 to-white p-8 md:p-10 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-700 mb-4">
          <Smartphone className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2
          id="mobile-heading"
          className="text-2xl md:text-3xl font-bold text-nordic-800 mb-3 text-balance"
        >
          Use Fuudit on your phone today
        </h2>
        <p className="text-nordic-600 max-w-xl mx-auto text-balance">
          Fuudit works on mobile web right now — open it in your browser and
          you're set. Installable iPhone and Android experiences are coming
          soon.
        </p>
      </div>
    </div>
  </section>
);

export default MobileAvailability;
