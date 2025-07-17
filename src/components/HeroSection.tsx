
import { useState } from "react";
import { Button } from "@/components/ui/button";
import WaitingListModal from "@/components/WaitingListModal";
import { Star, ChefHat, Calendar, ShoppingCart } from "lucide-react";
import familyCookingHero from "@/assets/family-cooking-hero.jpg";

const HeroSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-white via-cream-50/20 to-cream-100/30 overflow-hidden">
      {/* Enhanced background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-cream-400/20 to-cream-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-gradient-to-br from-sage-300/15 to-sage-400/15 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-br from-cream-300/10 to-cream-400/10 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-12 gap-16 items-center min-h-screen py-20">
          {/* Left side - Content */}
          <div className="lg:col-span-5 space-y-12 animate-fade-in">
            {/* Logo/Brand with enhanced styling */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img 
                  src="/lovable-uploads/43e3a289-72ad-479c-bcac-b38053e385e7.png" 
                  alt="Tilda - Fuudit mascot" 
                  className="h-14 w-14 rounded-full shadow-lg"
                />
                <div className="absolute -inset-1 bg-gradient-to-br from-cream-300/30 to-sage-300/30 rounded-full blur-sm"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-nordic-800 tracking-tight">fuudit</h1>
                <p className="text-sage-600 font-medium">Your playful and smart kitchen assistant</p>
              </div>
            </div>

            {/* Main headline with improved typography */}
            <div className="space-y-6">
              <h2 className="text-5xl md:text-7xl font-bold text-nordic-800 leading-[0.9] tracking-tight">
                Recipes From Your{" "}
                <span className="text-sage-600 relative inline-block">
                  Kitchen
                  <svg className="absolute -bottom-3 left-0 w-full h-4" viewBox="0 0 200 12" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0,8 Q50,3 100,8 T200,8" stroke="currentColor" strokeWidth="3" fill="none" className="text-sage-300" />
                  </svg>
                </span>
              </h2>
              
              {/* Enhanced subtitle */}
              <p className="text-xl text-nordic-600 max-w-xl leading-relaxed font-medium">
                Turn your available ingredients into delicious meals with AI-powered recipe generation, meal planning, and smart grocery lists.
              </p>
            </div>

            {/* Enhanced feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3 p-4 bg-white/60 rounded-2xl shadow-sm border border-cream-200/50">
                <div className="p-2 bg-sage-100 rounded-lg">
                  <ChefHat className="h-5 w-5 text-sage-600" />
                </div>
                <span className="font-semibold text-nordic-700">AI Recipe Generator</span>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white/60 rounded-2xl shadow-sm border border-cream-200/50">
                <div className="p-2 bg-sage-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-sage-600" />
                </div>
                <span className="font-semibold text-nordic-700">Meal Planner</span>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white/60 rounded-2xl shadow-sm border border-cream-200/50">
                <div className="p-2 bg-sage-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-sage-600" />
                </div>
                <span className="font-semibold text-nordic-700">Smart Grocery Lists</span>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white/60 rounded-2xl shadow-sm border border-cream-200/50">
                <div className="p-2 bg-sage-100 rounded-lg">
                  <span className="text-lg">🥗</span>
                </div>
                <span className="font-semibold text-nordic-700">Leftover Remix</span>
              </div>
            </div>

            {/* Enhanced CTA section */}
            <div className="space-y-6">
              <Button 
                size="lg" 
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-cream-400 to-cream-500 hover:from-cream-500 hover:to-cream-600 text-white px-10 py-7 text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
              >
                🌱 Join Waiting List
              </Button>
              <p className="text-nordic-500 font-medium">Free to start • No credit card required</p>
              
              {/* Enhanced rating */}
              <div className="flex items-center space-x-3 pt-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-cream-400 text-cream-400" />
                  ))}
                </div>
                <span className="text-nordic-600 font-semibold">4.8 rating from early users</span>
              </div>
            </div>
          </div>

          {/* Right side - Enhanced image section */}
          <div className="lg:col-span-7 relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative lg:pl-12">
              <div className="relative">
                <img 
                  src={familyCookingHero}
                  alt="Happy family cooking together in kitchen"
                  className="w-full h-auto rounded-3xl shadow-2xl border border-white/20"
                />
                
                {/* Enhanced decorative elements */}
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-cream-300/30 to-cream-400/30 rounded-full blur-xl"></div>
                <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-gradient-to-br from-sage-300/20 to-sage-400/20 rounded-full blur-2xl"></div>
                
                {/* Additional accent elements */}
                <div className="absolute top-1/4 -left-4 w-16 h-16 bg-gradient-to-br from-cream-400/40 to-cream-500/40 rounded-full blur-lg"></div>
                <div className="absolute bottom-1/4 -right-4 w-20 h-20 bg-gradient-to-br from-sage-400/30 to-sage-500/30 rounded-full blur-lg"></div>
              </div>
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
