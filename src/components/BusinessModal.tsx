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

interface BusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BusinessModal = ({ isOpen, onClose }: BusinessModalProps) => {
  const businessFeatures = [
    {
      icon: <Building2 className="h-6 w-6 text-sage-600" />,
      title: "Enterprise Integration",
      description: "Seamlessly integrate with existing procurement and inventory systems"
    },
    {
      icon: <Users className="h-6 w-6 text-sage-600" />,
      title: "Multi-Location Management",
      description: "Manage inventory and meal planning across multiple restaurant locations"
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-sage-600" />,
      title: "Cost Optimization",
      description: "Reduce food waste by up to 40% with AI-powered inventory tracking"
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-sage-600" />,
      title: "Analytics Dashboard",
      description: "Real-time insights on food usage, waste patterns, and cost savings"
    },
    {
      icon: <Shield className="h-6 w-6 text-sage-600" />,
      title: "Enterprise Security",
      description: "SOC 2 compliant with advanced data protection and privacy controls"
    },
    {
      icon: <Zap className="h-6 w-6 text-sage-600" />,
      title: "Custom API Access",
      description: "Build custom integrations with our comprehensive API suite"
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
          {/* Key Benefits */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businessFeatures.map((feature, index) => (
              <div key={index} className="p-6 rounded-lg border border-sage-200 bg-sage-50/30 hover:bg-sage-50/50 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-nordic-800 mb-2">{feature.title}</h3>
                    <p className="text-sm text-nordic-600">{feature.description}</p>
                  </div>
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
                  <Label htmlFor="phone" className="text-nordic-700 font-medium">Phone Number</Label>
                  <Input id="phone" placeholder="+1 (555) 123-4567" className="mt-1" />
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
                onClick={onClose}
                className="border-sage-300 text-nordic-600 hover:bg-sage-50"
              >
                Close
              </Button>
              <Button className="bg-sage-500 hover:bg-sage-600 text-white px-8">
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
              📧 business@fuudit.com • 📞 +1 (555) FUUDIT-BIZ
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessModal;