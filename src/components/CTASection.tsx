
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import DemoRequestModal from "@/components/DemoRequestModal";

const CTASection = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <section className="py-24 bg-gradient-to-br from-sage-500 via-sage-600 to-sage-700 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/lovable-uploads/43e3a289-72ad-479c-bcac-b38053e385e7.png" 
              alt="Tilda mascot" 
              className="h-16 w-16 mr-4 brightness-0 invert"
            />
            <ChefHat className="h-12 w-12 text-white" />
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
            Ready to cook smarter?
          </h2>

          <p className="text-xl md:text-2xl mb-10 text-sage-100 max-w-2xl mx-auto text-balance font-light">
            Join thousands who've discovered the joy of stress-free meal planning with Fuudit and Tilda
          </p>

          <div className="space-y-4">
            <Button 
              size="lg"
              onClick={() => setIsDemoModalOpen(true)}
              className="bg-white text-sage-700 hover:bg-sage-50 px-10 py-6 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              🏢 For Businesses - Request a Demo
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
                <div className="text-sm text-sage-200">Active users</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">100k+</div>
                <div className="text-sm text-sage-200">Recipes generated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">30%</div>
                <div className="text-sm text-sage-200">Less food waste</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">4.8★</div>
                <div className="text-sm text-sage-200">User rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DemoRequestModal 
        isOpen={isDemoModalOpen} 
        onClose={() => setIsDemoModalOpen(false)} 
      />
    </section>
  );
};

export default CTASection;
