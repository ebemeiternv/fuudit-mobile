import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Users, TrendingUp, Shield, Zap, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BusinessModal = ({ isOpen, onClose }: BusinessModalProps) => {
  const { toast } = useToast();
  const businessCategories = [
    {
      title: "Fuudit for Restaurants & Catering",
      subtitle: "Cut food waste and boost margins with AI-powered menu & stock optimization",
      features: [
        "Real-time AI-powered inventory & waste tracking",
        "Menu optimization based on available stock (reduce costs, increase sustainability)",
        "Dynamic pricing suggestions (use soon-to-expire stock in daily specials)",
        "Staff-facing AI assistant for recipe/portion adjustments"
      ],
      icon: <Building2 className="h-6 w-6 text-sage-600" />
    },
    {
      title: "Fuudit for Grocery Retail",
      subtitle: "Engage customers with smart expiry alerts, recipe tie-ins, and sustainable stock flow",
      features: [
        "Smart stock rotation & expiry alerts (reduce in-store food waste)",
        "AI-driven shopper engagement → recipe suggestions linked to items in their cart",
        "Digital 'Use Me First' labels and consumer notifications for near-expiry items",
        "Circular economy options (divert surplus stock into meal boxes or charity channels)"
      ],
      icon: <Users className="h-6 w-6 text-sage-600" />
    },
    {
      title: "Fuudit for Corporate Wellbeing",
      subtitle: "Bring smarter, healthier, waste-free food to your workplace",
      features: [
        "Pantry/kitchen integration in workplace cafeterias",
        "Personalized meal suggestions for employees (aligned with nutrition & wellbeing)",
        "AI-driven menu planning to balance budget, taste, and health",
        "Sustainability reporting: carbon & food waste reduction metrics"
      ],
      icon: <TrendingUp className="h-6 w-6 text-sage-600" />
    },
    {
      title: "Fuudit for Smart Appliances & Tech Partners",
      subtitle: "Turn every kitchen device into a food-waste-fighting assistant",
      features: [
        "IoT fridge/freezer integration (scan contents → recipe suggestions)",
        "Partnerships with smart kitchen devices (Ovens, Thermomix, Instant Pot)",
        "API integrations with Apple Health, Oura, RingConn, Samsung Health → link wellness + food planning",
        "Retail tie-ins: scan receipt → Fuudit updates pantry automatically"
      ],
      icon: <Zap className="h-6 w-6 text-sage-600" />
    },
    {
      title: "Fuudit for Hospitality & Multi-Location Chains",
      subtitle: "Optimize food operations across all outlets with centralized AI-driven insights",
      features: [
        "Unified inventory dashboards across all locations",
        "Predictive ordering to reduce overstocking",
        "Insights on usage patterns, costs, and waste reduction ROI",
        "Centralized menu management and cost optimization"
      ],
      icon: <BarChart3 className="h-6 w-6 text-sage-600" />
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-white border-sage-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-nordic-800 text-center mb-4">
            Fuudit for Businesses
          </DialogTitle>
          <p className="text-lg text-nordic-600 text-center max-w-2xl mx-auto">
            Transform your commercial kitchen operations with AI-powered inventory management and waste reduction solutions.
          </p>
        </DialogHeader>

        <div className="space-y-8 mt-6">
          {/* Business Categories */}
          <div className="space-y-8">
            {businessCategories.map((category, index) => (
              <div key={index} className="p-6 rounded-lg border border-sage-200 bg-sage-50/30">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-nordic-800 mb-2">{category.title}</h3>
                    <p className="text-sm text-sage-600 font-medium mb-4">{category.subtitle}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3 ml-14">
                  {category.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-sage-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-nordic-600">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-r from-sage-500 to-sage-600 rounded-2xl p-8 text-white">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">40%</div>
                <div className="text-sage-100">Average food waste reduction</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">$50k+</div>
                <div className="text-sage-100">Annual savings per location</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">99.9%</div>
                <div className="text-sage-100">Platform uptime guarantee</div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-sage-50/50 rounded-xl p-8 text-center">
            <h3 className="text-3xl font-bold text-nordic-800 mb-4">
              ✨ Ready to cook smarter?
            </h3>
            <p className="text-lg text-nordic-600 mb-8 max-w-3xl mx-auto">
              Join thousands who've discovered the joy of stress-free meal planning with Fuudit and Tilda - Plan meals, track your pantry, and let AI help you cut food waste while saving time and money.
            </p>
            
            <div className="space-y-4">
              <Button 
                onClick={() => {
                  toast({
                    title: "Welcome to Fuudit!",
                    description: "Starting your free journey to smarter cooking and less food waste.",
                  });
                  onClose();
                }}
                className="bg-sage-500 hover:bg-sage-600 text-white px-8 py-3 text-lg"
              >
                🍲 Get Started Free
              </Button>
              
              <p className="text-sm text-nordic-500">
                👉 Running a restaurant or food business?{" "}
                <Button
                  variant="link"
                  onClick={() => {
                    // Keep modal open to show business content
                  }}
                  className="text-sage-600 hover:text-sage-700 p-0 h-auto font-medium underline"
                >
                  Explore Fuudit for Businesses →
                </Button>
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="text-center pt-4 border-t border-sage-200">
            <p className="text-nordic-600 mb-2">
              Questions? Contact our enterprise team
            </p>
            <p className="text-sage-600 font-medium">
              📧 hello@fuudit.com
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessModal;