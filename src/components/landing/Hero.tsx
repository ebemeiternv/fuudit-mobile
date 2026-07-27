import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-sage-50/40 to-sage-100/60">
      {/* Ambient shapes — respect reduced motion */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
        aria-hidden="true"
      >
        <div className="absolute top-16 left-8 h-32 w-32 rounded-full bg-sage-200/25 blur-2xl animate-float" />
        <div
          className="absolute bottom-24 right-10 h-24 w-24 rounded-full bg-sage-300/25 blur-xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container mx-auto px-6 py-20 md:py-28 lg:py-32 relative">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <img
              src="/lovable-uploads/43e3a289-72ad-479c-bcac-b38053e385e7.png"
              alt="Tilda, the Fuudit kitchen assistant"
              className="h-16 w-16"
              width={64}
              height={64}
              loading="eager"
              decoding="async"
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-nordic-800 leading-tight text-balance">
            A kitchen companion{" "}
            <span className="text-sage-600 relative inline-block">
              that remembers
              <svg
                className="absolute -bottom-1 left-0 w-full h-3"
                viewBox="0 0 200 10"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M0,7 Q50,2 100,7 T200,7"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-sage-300"
                />
              </svg>
            </span>
            .
          </h1>

          <p className="mt-6 text-lg md:text-xl text-nordic-600 max-w-2xl mx-auto text-balance">
            Fuudit keeps track of what's in your kitchen, learns your habits,
            and helps you decide what to cook — so less food goes to waste.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-sage-600 hover:bg-sage-700 text-white px-10 py-6 text-lg font-medium rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link to="/auth?mode=signup">Get Started Free</Link>
            </Button>
            <p className="text-sm text-nordic-600">
              Already have an account?{" "}
              <Link
                to="/auth?mode=signin"
                className="font-semibold text-sage-700 hover:text-sage-800 underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
            <p className="text-xs text-nordic-500 font-medium">
              Free during beta · No credit card required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
