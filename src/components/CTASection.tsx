
import { Button } from "@/components/ui/button";
import { Utensils } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-sage-500 via-sage-600 to-sage-700 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-12 left-12 w-32 h-32 border border-white rounded-full"></div>
        <div className="absolute bottom-16 right-16 w-24 h-24 border border-white rounded-full"></div>
        <div className="absolute top-1/2 right-1/4 w-16 h-16 border border-white rounded-full"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-white/20 p-4 rounded-2xl">
              <Utensils className="h-12 w-12 text-white" />
            </div>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
            Ready to transform your kitchen?
          </h2>

          <p className="text-xl md:text-2xl mb-10 text-sage-100 max-w-2xl mx-auto text-balance font-light">
            Join thousands who've already discovered the joy of smart cooking with Fuudit
          </p>

          <div className="space-y-4">
            <Button 
              size="lg" 
              className="bg-white text-sage-700 hover:bg-sage-50 px-10 py-6 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              Start Planning Smarter Meals
            </Button>
            <p className="text-sm text-sage-200 font-medium">
              Free forever • Premium features available • Cancel anytime
            </p>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-sage-400/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-white mb-1">10k+</div>
                <div className="text-sm text-sage-200">Happy users</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">50k+</div>
                <div className="text-sm text-sage-200">Meals planned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">30%</div>
                <div className="text-sm text-sage-200">Waste reduced</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">4.8★</div>
                <div className="text-sm text-sage-200">User rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
