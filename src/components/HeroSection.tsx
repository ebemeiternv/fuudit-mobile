
import { Button } from "@/components/ui/button";
import { Utensils } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-sage-50 to-nordic-50 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-sage-200/30 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-32 right-16 w-24 h-24 bg-cream-200/40 rounded-full blur-lg animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-sage-300/20 rounded-full blur-md animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto animate-fade-in">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-sage-500 p-3 rounded-2xl mr-3">
              <Utensils className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-sage-800">Fuudit</h1>
          </div>

          {/* Main headline */}
          <h2 className="text-5xl md:text-7xl font-bold text-nordic-800 mb-6 text-balance">
            AI magic for your{" "}
            <span className="text-sage-600 relative">
              kitchen
              <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 10" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,7 Q50,2 100,7 T200,7" stroke="currentColor" strokeWidth="2" fill="none" className="text-sage-300" />
              </svg>
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-nordic-600 mb-8 max-w-2xl mx-auto text-balance font-light">
            Turn ingredients into inspiration. Reduce waste, eat better, and discover meals you'll love.
          </p>

          {/* CTA Button */}
          <div className="space-y-4">
            <Button 
              size="lg" 
              className="bg-sage-500 hover:bg-sage-600 text-white px-8 py-6 text-lg font-medium rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Try Fuudit – AI magic for your kitchen
            </Button>
            <p className="text-sm text-nordic-500 font-medium">Free to start • No credit card required</p>
          </div>

          {/* Social proof hint */}
          <div className="mt-16 pt-8 border-t border-sage-200/50">
            <p className="text-sm text-nordic-500 font-medium">
              Join thousands reducing food waste and eating smarter
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
