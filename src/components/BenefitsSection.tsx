
import { Clock, Leaf, Utensils } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Save Time",
    description: "No more endless recipe hunting. Get instant meal ideas based on what you already have."
  },
  {
    icon: Utensils,
    title: "Eat Smarter",
    description: "Discover nutritious, delicious meals tailored to your dietary preferences and goals."
  },
  {
    icon: Leaf,
    title: "Waste Less",
    description: "Turn every ingredient into opportunity. Reduce food waste and save money effortlessly."
  }
];

const BenefitsSection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-sage-50 to-cream-50">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-nordic-800 mb-6">
            Save time. Eat smarter. Waste less.
          </h2>
          <p className="text-xl text-nordic-600 mb-16 text-balance">
            Fuudit doesn't just give you recipes – it transforms your entire relationship with food
          </p>

          <div className="grid md:grid-cols-3 gap-12">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex flex-col items-center text-center group">
                <div className="bg-white p-6 rounded-full shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="h-10 w-10 text-sage-600" />
                </div>
                
                <h3 className="text-2xl font-semibold text-nordic-800 mb-4">
                  {benefit.title}
                </h3>
                
                <p className="text-nordic-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-sage-200/50">
            <div className="text-center">
              <div className="text-3xl font-bold text-sage-600 mb-2">30%</div>
              <div className="text-sm text-nordic-600">Less food waste</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sage-600 mb-2">15min</div>
              <div className="text-sm text-nordic-600">Average meal planning</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sage-600 mb-2">200+</div>
              <div className="text-sm text-nordic-600">Recipe combinations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sage-600 mb-2">4.8★</div>
              <div className="text-sm text-nordic-600">User satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
