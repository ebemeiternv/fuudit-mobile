
import { Star } from "lucide-react";

const TestimonialSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-sage-500 fill-current" />
            ))}
          </div>
          
          <blockquote className="text-2xl md:text-3xl font-medium text-nordic-800 mb-8 text-balance leading-relaxed">
            "Fuudit has completely transformed my kitchen routine. I used to waste so much food, but now I actually look forward to using up leftovers. The AI suggestions are surprisingly creative and the meal planning saves me hours every week!"
          </blockquote>
          
          <div className="flex items-center justify-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-sage-400 to-sage-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">MH</span>
            </div>
            <div className="text-left">
              <div className="font-semibold text-nordic-800">Maria Hansen</div>
              <div className="text-nordic-600">Busy parent, Copenhagen</div>
            </div>
          </div>

          {/* Additional social proof */}
          <div className="mt-16 pt-8 border-t border-sage-200/50">
            <p className="text-nordic-600 font-medium mb-4">
              Loved by families across Scandinavia and beyond
            </p>
            <div className="flex justify-center items-center space-x-6 opacity-60">
              <span className="text-sm text-nordic-500">🇸🇪 Sweden</span>
              <span className="text-sm text-nordic-500">🇳🇴 Norway</span>
              <span className="text-sm text-nordic-500">🇩🇰 Denmark</span>
              <span className="text-sm text-nordic-500">🇫🇮 Finland</span>
              <span className="text-sm text-nordic-500">🇪🇪 Estonia</span>
            </div>
            
            {/* Tilda mascot */}
            <div className="flex justify-center mt-6">
              <img 
                src="/lovable-uploads/43e3a289-72ad-479c-bcac-b38053e385e7.png" 
                alt="Tilda mascot" 
                className="h-12 w-12 opacity-40"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
