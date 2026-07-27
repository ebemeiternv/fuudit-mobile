import PublicNav from "@/components/landing/PublicNav";
import Hero from "@/components/landing/Hero";
import ValueCards from "@/components/landing/ValueCards";
import HowItWorks from "@/components/landing/HowItWorks";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import AdaptiveLearning from "@/components/landing/AdaptiveLearning";
import MobileAvailability from "@/components/landing/MobileAvailability";
import TestimonialSection from "@/components/TestimonialSection";
import ArticlesPreviewSection from "@/components/ArticlesPreviewSection";
import TrustSection from "@/components/landing/TrustSection";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import CookieConsent from "@/components/CookieConsent";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <main>
        <Hero />
        <ValueCards />
        <HowItWorks />
        <FeatureShowcase />
        <AdaptiveLearning />
        <MobileAvailability />
        <TestimonialSection />
        <ArticlesPreviewSection />
        <TrustSection />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
};

export default Index;
