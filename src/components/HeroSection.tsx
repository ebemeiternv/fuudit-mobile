
import { useState } from "react";
import { Button } from "@/components/ui/button";
import WaitingListModal from "@/components/WaitingListModal";
import { Star, ChefHat, Calendar, ShoppingCart } from "lucide-react";
import familyCookingHero from "@/assets/family-cooking-hero.jpg";

const HeroSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-white via-cream-50/30 to-cream-100/50 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-40 h-40 bg-gradient-to-br from-cream-400/30 to-cream-500/30 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-32 left-16 w-32 h-32 bg-gradient-to-br from-sage-300/20 to-sage-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-gradient-to-br from-cream-300/25 to-cream-400/25 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left side - Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/43e3a289-72ad-479c-bcac-b38053e385e7.png" 
                alt="Tilda - Fuudit mascot" 
                className="h-12 w-12"
              />
              <div>
                <h1 className="text-2xl font-bold text-nordic-800">fuudit</h1>
                <p className="text-sm text-sage-600">Your playful and smart kitchen assistant</p>
              </div>
            </div>

            {/* Main headline */}
            <h2 className="text-4xl md:text-6xl font-bold text-nordic-800 leading-tight">
              Recipes From Your{" "}
              <span className="text-sage-600 relative">
                Kitchen
                <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 10" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0,7 Q50,2 100,7 T200,7" stroke="currentColor" strokeWidth="2" fill="none" className="text-sage-300" />
                </svg>
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-xl text-nordic-600 max-w-lg leading-relaxed">
              Turn your available ingredients into delicious meals with AI-powered recipe generation, meal planning, and smart grocery lists.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <ChefHat className="h-5 w-5 text-sage-500" />
                <span className="text-sm font-medium text-nordic-700">AI Recipe Generator</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-sage-500" />
                <span className="text-sm font-medium text-nordic-700">Meal Planner</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-sage-500" />
                <span className="text-sm font-medium text-nordic-700">Smart Grocery Lists</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-nordic-700">🥗 Leftover Remix</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-4">
              <Button 
                size="lg" 
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-cream-400 to-cream-500 hover:from-cream-500 hover:to-cream-600 text-white px-8 py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                🌱 Join Waiting List
              </Button>
              <p className="text-sm text-nordic-500 font-medium">Free to start • No credit card required</p>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-cream-400 text-cream-400" />
                ))}
              </div>
              <span className="text-sm text-nordic-600 font-medium">4.8 rating from early users</span>
            </div>
          </div>

          {/* Right side - Image */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative">
              <img 
                src={familyCookingHero}
                alt="Happy family cooking together in kitchen"
                className="w-full h-auto max-w-lg mx-auto rounded-3xl shadow-2xl"
              />
              
              {/* Decorative elements around image */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-cream-300/40 to-cream-400/40 rounded-full blur-lg"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-sage-300/30 to-sage-400/30 rounded-full blur-xl"></div>
            </div>
          </div>
        </div>
      </div>

      <WaitingListModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </section>
  );
};

export default HeroSection;
