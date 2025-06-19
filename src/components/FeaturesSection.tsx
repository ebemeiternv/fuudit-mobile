
import { Search, Utensils, Heart } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Smart Ingredient Search",
    description: "Tell us what's in your fridge, and we'll find perfect recipes that use exactly what you have.",
    color: "sage"
  },
  {
    icon: Utensils,
    title: "AI Chef Assistant",
    description: "Craving something specific? Our AI suggests creative meals based on your preferences and dietary needs.",
    color: "cream"
  },
  {
    icon: Heart,
    title: "Leftover Magic",
    description: "Transform yesterday's dinner into today's delight. Never waste food again with clever remix ideas.",
    color: "nordic"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-nordic-800 mb-6">
            Your kitchen, simplified
          </h2>
          <p className="text-xl text-nordic-600 max-w-2xl mx-auto text-balance">
            Three powerful features that transform how you cook, plan, and enjoy meals
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
              
              <h3 className="text-2xl font-semibold text-nordic-800 mb-4">
                {feature.title}
              </h3>
              
              <p className="text-nordic-600 leading-relaxed">
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
