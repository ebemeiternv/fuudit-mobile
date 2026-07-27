import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";

const FinalCTA = () => (
  <section
    aria-labelledby="final-cta-heading"
    className="py-24 bg-gradient-to-br from-sage-500 via-sage-600 to-sage-700 relative overflow-hidden"
  >
    <div className="container mx-auto px-6 relative z-10">
      <div className="max-w-3xl mx-auto text-center text-white">
        <div className="flex items-center justify-center mb-6 gap-3">
          <img
            src="/lovable-uploads/43e3a289-72ad-479c-bcac-b38053e385e7.png"
            alt=""
            className="h-14 w-14 brightness-0 invert"
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
          />
          <ChefHat className="h-10 w-10 text-white" aria-hidden="true" />
        </div>

        <h2
          id="final-cta-heading"
          className="text-3xl md:text-5xl font-bold mb-4 text-balance"
        >
          Start cooking smarter today
        </h2>
        <p className="text-lg md:text-xl mb-8 text-sage-100 max-w-2xl mx-auto text-balance">
          Create your free account and add your first pantry item in under a
          minute. Fuudit will take it from there.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-white text-sage-700 hover:bg-sage-50 px-10 py-6 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <Link to="/auth?mode=signup">Get Started Free</Link>
          </Button>
          <p className="text-sm text-sage-100">
            Already have an account?{" "}
            <Link
              to="/auth?mode=signin"
              className="underline underline-offset-2 hover:text-white font-semibold"
            >
              Sign in
            </Link>
          </p>
          <p className="text-xs text-sage-200 font-medium">
            Free during beta · No credit card required
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default FinalCTA;
