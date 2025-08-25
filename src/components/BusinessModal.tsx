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

          {/* Contact Form */}
          <div className="bg-sage-50/50 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-nordic-800 mb-6 text-center">
              Ready to Transform Your Kitchen Operations?
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company" className="text-nordic-700 font-medium">Company Name</Label>
                  <Input id="company" placeholder="Your Company" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="contact-email" className="text-nordic-700 font-medium">Business Email</Label>
                  <Input id="contact-email" type="email" placeholder="business@company.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="locations" className="text-nordic-700 font-medium">Number of Locations</Label>
                  <Input id="locations" placeholder="e.g., 5 restaurants" className="mt-1" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contact-name" className="text-nordic-700 font-medium">Your Name</Label>
                  <Input id="contact-name" placeholder="Full Name" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="timeline" className="text-nordic-700 font-medium">Implementation Timeline</Label>
                  <Input id="timeline" placeholder="e.g., Q2 2024" className="mt-1" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Thank you!",
                    description: "Feel free to reach out anytime for questions about Fuudit for Business.",
                  });
                  onClose();
                }}
                className="border-sage-300 text-nordic-600 hover:bg-sage-50"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Demo Requested!",
                    description: "Our enterprise team will contact you within 24 hours to schedule your personalized demo.",
                  });
                  onClose();
                }}
                className="bg-sage-500 hover:bg-sage-600 text-white px-8"
              >
                Schedule Demo
              </Button>
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