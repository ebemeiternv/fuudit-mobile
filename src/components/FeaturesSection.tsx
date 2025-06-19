
import { Search, ChefHat, Recycle, Calendar, ShoppingCart, Clock } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Smart Ingredient Search",
    description: "Enter ingredients you have at home and get real-time recipe suggestions from our extensive database.",
    color: "sage"
  },
  {
    icon: ChefHat,
    title: "AI Chef Assistant",
    description: "Get personalized recipes based on your ingredients, dietary goals, and cooking style preferences.",
    color: "cream"
  },
  {
    icon: Recycle,
    title: "Leftover Remix",
    description: "Transform yesterday's meals into today's inspiration with creative leftover recipe suggestions.",
    color: "nordic"
  },
  {
    icon: Calendar,
    title: "Meal Planning",
    description: "Plan your week with our smart calendar integration and never run out of meal ideas again.",
    color: "sage"
  },
  {
    icon: ShoppingCart,
    title: "Smart Shopping Lists",
    description: "Auto-generated shopping lists based on your meal plans and pantry inventory.",
    color: "cream"
  },
  {
    icon: Clock,
    title: "Pantry Tracking",
    description: "Track expiration dates and get alerts to use ingredients before they go bad.",
    color: "nordic"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-nordic-800 mb-6">
            Everything you need for smarter cooking
          </h2>
          <p className="text-xl text-nordic-600 max-w-2xl mx-auto text-balance">
            From ingredient search to meal planning, Fuudit helps you cook smarter and waste less
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group text-center p-8 rounded-3xl border border-sage-100 hover:border-sage-200 transition-all duration-300 hover:shadow-lg hover:shadow-sage-100/50 hover:-translate-y-1"
            >
              <div className={`inline-flex p-4 rounded-2xl mb-6 ${
                feature.color === 'sage' ? 'bg-sage-100 text-sage-600' :
                feature.color === 'cream' ? 'bg-cream-100 text-cream-700' :
                'bg-nordic-100 text-nordic-600'
              } group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="h-8 w-8" />
              </div>
              
              <h3 className="text-xl font-semibold text-nordic-800 mb-4">
                {feature.title}
              </h3>
              
              <p className="text-nordic-600 leading-relaxed text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
