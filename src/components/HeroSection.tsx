
import { useState } from "react";
import { Button } from "@/components/ui/button";
import WaitingListModal from "@/components/WaitingListModal";

const HeroSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/30 to-secondary/50 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-32 right-16 w-24 h-24 bg-primary/15 rounded-full blur-lg animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-primary/8 rounded-full blur-md animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-5xl mx-auto animate-fade-in">
          {/* Logo/Brand */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-1">fuudit</h1>
            <p className="text-sm text-muted-foreground font-medium mb-6">Your playful and smart kitchen assistant</p>
            
            {/* Tilda below the text, centrally aligned */}
            <div className="flex justify-center">
              <img 
                src="/lovable-uploads/43e3a289-72ad-479c-bcac-b38053e385e7.png" 
                alt="Tilda - Fuudit mascot" 
                className="h-16 w-16"
              />
            </div>
          </div>

          {/* Main headline */}
          <h2 className="text-5xl md:text-7xl font-bold text-foreground mb-6 text-balance">
            Recipes From Your{" "}
            <span className="text-primary relative">
              Kitchen
              <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 10" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,7 Q50,2 100,7 T200,7" stroke="currentColor" strokeWidth="2" fill="none" className="text-primary/50" />
              </svg>
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance">
            From pantry to plate — no waste, just taste.
          </p>

          {/* CTA Button */}
          <div className="space-y-4">
            <Button 
              size="lg" 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 text-lg font-medium rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              🌱 Join waiting list
            </Button>
            <p className="text-sm text-muted-foreground font-medium">Free to start • No credit card required</p>
          </div>

          {/* Social proof hint */}
          <div className="mt-16 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground font-medium">
              Join thousands reducing food waste and planning smarter meals
            </p>
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
