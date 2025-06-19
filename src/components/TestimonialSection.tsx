
import { Star } from "lucide-react";

const TestimonialSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-cream-500 fill-current" />
            ))}
          </div>
          
          <blockquote className="text-2xl md:text-3xl font-medium text-nordic-800 mb-8 text-balance leading-relaxed">
            "Fuudit has completely changed how I approach cooking. I used to throw away so much food, but now every ingredient has a purpose. The AI suggestions are surprisingly creative and always delicious!"
          </blockquote>
          
          <div className="flex items-center justify-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-sage-400 to-sage-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">AS</span>
            </div>
            <div className="text-left">
              <div className="font-semibold text-nordic-800">Anna Svensson</div>
              <div className="text-nordic-600">Working parent, Stockholm</div>
            </div>
          </div>

          {/* Additional social proof */}
          <div className="mt-16 pt-8 border-t border-sage-200/50">
            <p className="text-nordic-600 font-medium">
              Loved by families across Scandinavia and beyond
            </p>
            <div className="flex justify-center items-center space-x-8 mt-4 opacity-60">
              <span className="text-sm text-nordic-500">🇸🇪 Sweden</span>
              <span className="text-sm text-nordic-500">🇳🇴 Norway</span>
              <span className="text-sm text-nordic-500">🇩🇰 Denmark</span>
              <span className="text-sm text-nordic-500">🇫🇮 Finland</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
