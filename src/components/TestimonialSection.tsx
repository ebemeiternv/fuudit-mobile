
import { Star } from "lucide-react";

const TestimonialSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="grid md:grid-cols-2 gap-12 mb-8">
            {/* First testimonial */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-sage-500 fill-current" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl font-medium text-nordic-800 mb-6 text-balance leading-relaxed">
                "Fuudit has completely transformed my kitchen routine. I used to waste so much food, but now I actually look forward to using up leftovers. The AI suggestions are surprisingly creative!"
              </blockquote>
              
              <div className="flex items-center justify-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-sage-400 to-sage-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">AV</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-nordic-800">Andres V.</div>
                  <div className="text-nordic-600">Busy parent, Stockholm</div>
                </div>
              </div>
            </div>

            {/* Second testimonial */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-sage-500 fill-current" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl font-medium text-nordic-800 mb-6 text-balance leading-relaxed">
                "The meal planning feature saves me hours every week! I love how Fuudit suggests recipes based on what I already have at home. No more last-minute grocery runs."
              </blockquote>
              
              <div className="flex items-center justify-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cream-400 to-cream-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">M</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-nordic-800">Madli</div>
                  <div className="text-nordic-600">Food enthusiast, Estonia</div>
                </div>
              </div>
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
