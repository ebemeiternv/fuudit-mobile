
import { Search, ChefHat, Recycle, Calendar, ShoppingCart, Clock, Dna, HeartPulse, Lightbulb } from "lucide-react";

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
    title: "Smart Grocery Companion",
    description: "Let Fuudit be your personal grocery guide. It not only auto-generates shopping lists based on your pantry and meal plan — but also recommends what to buy next based on your health goals, habits, and upcoming needs. Smart, time-saving, and waste-reducing.",
    color: "cream"
  },
  {
    icon: Clock,
    title: "Pantry Tracking",
    description: "Track expiration dates and get alerts to use ingredients before they go bad.",
    color: "nordic"
  }
];

const comingSoonFeatures = [
  {
    icon: Dna,
    title: "Personalized Nutrition Engine",
    description: "Integrate your genetic test or nutrition profile to personalize what Fuudit suggests — from ingredient choices to meal types. Let your body decide what's best for you.",
    color: "sage"
  },
  {
    icon: HeartPulse,
    title: "Bio-Aware Food Suggestions",
    description: "Fuudit adapts to your sleep, cycle, stress, and movement data (from wearables like RingConn, Oura, or Apple Watch) to suggest meals that support your body in real time.",
    color: "cream"
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

        {/* Coming Soon Section */}
        <div className="mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-nordic-800 mb-6">
              Coming Soon
            </h2>
            <p className="text-lg text-nordic-600 max-w-2xl mx-auto text-balance">
              The future of personalized cooking and wellness is on the horizon
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {comingSoonFeatures.map((feature, index) => (
              <div 
                key={index}
                className="group relative text-center p-8 rounded-3xl border border-sage-100 hover:border-sage-200 transition-all duration-300 hover:shadow-lg hover:shadow-sage-100/50 hover:-translate-y-1 opacity-80"
              >
                {/* Coming Soon Badge */}
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-sage-500 to-cream-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                  Coming Soon
                </div>

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

          {/* Centered Evolution Text Block */}
          <div className="mt-16 text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-sage-300 to-transparent"></div>
              <span className="mx-4 text-2xl">✨</span>
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-sage-300 to-transparent"></div>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold text-nordic-800 mb-6">
              Fuudit Is Evolving
            </h3>
            
            <p className="text-lg text-nordic-600 leading-relaxed mb-6">
              We're cooking up something groundbreaking. Soon, Fuudit will become the world's most personalized food and wellbeing assistant — blending AI, biometrics, and your pantry into daily health magic.
            </p>
            
            <p className="text-lg text-nordic-600 leading-relaxed">
              Join the waiting list to be among the first to experience it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
