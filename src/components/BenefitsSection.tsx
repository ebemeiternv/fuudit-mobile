
import { Clock, Leaf, Utensils, TrendingDown } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Save Time",
    description: "No more endless recipe hunting. Get instant meal ideas based on what you already have at home."
  },
  {
    icon: Utensils,
    title: "Cook Smarter",
    description: "Discover personalized recipes that match your dietary preferences, available ingredients, and cravings."
  },
  {
    icon: Leaf,
    title: "Reduce Waste",
    description: "Use up ingredients before they expire with smart alerts and creative leftover transformation ideas."
  },
  {
    icon: TrendingDown,
    title: "Lower Grocery Bills",
    description: "Smart shopping lists and meal planning help you buy only what you need and use what you have."
  }
];

const BenefitsSection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-sage-50 to-cream-50">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-nordic-800 mb-6">
            Save time. Cook smarter. Waste less.
          </h2>
          <p className="text-xl text-nordic-600 mb-16 text-balance">
            Fuudit transforms your relationship with food through smart technology and sustainable practices
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex flex-col items-center text-center group">
                <div className="bg-white p-6 rounded-full shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="h-10 w-10 text-sage-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-nordic-800 mb-4">
                  {benefit.title}
                </h3>
                
                <p className="text-nordic-600 leading-relaxed text-sm">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-sage-200/50">
            <div className="text-center">
              <div className="text-3xl font-bold text-sage-600 mb-2">30%</div>
              <div className="text-sm text-nordic-600">Less food waste</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sage-600 mb-2">15min</div>
              <div className="text-sm text-nordic-600">Average meal planning</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sage-600 mb-2">1000+</div>
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
