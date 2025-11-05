import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import BenefitsSection from "@/components/BenefitsSection";
import TestimonialSection from "@/components/TestimonialSection";
import ArticlesPreviewSection from "@/components/ArticlesPreviewSection";
import CTASection from "@/components/CTASection";
import CookieConsent from "@/components/CookieConsent";

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <TestimonialSection />
      <ArticlesPreviewSection />
      <CTASection />
      <CookieConsent />
    </div>
  );
};

export default Index;
