import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import emailjs from '@emailjs/browser';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DemoRequestModal = ({ isOpen, onClose }: DemoRequestModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      return;
    }

    setIsSubmitting(true);

    try {
      const messageWithType = `Form type: Demo Request\n\n${formData.message || 'Interested in scheduling a demo for Fuudit.'}`;
      
      await emailjs.send(
        'service_073243j',
        'template_6kfvi1j',
        {
          name: formData.name || 'Anonymous',
          email: formData.email,
          message: messageWithType,
        },
        'UdQc0_sEnTxrudWHD'
      );

      setShowSuccess(true);
      setFormData({ name: "", email: "", message: "" });
      
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-sage-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-nordic-800 text-center">
            Request a Demo
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-lg font-medium text-sage-600">
              Thanks! We'll get back to you soon to schedule your demo.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="demo-name" className="text-nordic-700 font-medium">
                Name (optional)
              </Label>
              <Input
                id="demo-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Your name"
                className="border-sage-200 focus:border-sage-400 focus:ring-sage-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-email" className="text-nordic-700 font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="demo-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your.email@company.com"
                className="border-sage-200 focus:border-sage-400 focus:ring-sage-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-message" className="text-nordic-700 font-medium">
                Tell us briefly about your company or what you're looking for (optional)
              </Label>
              <Textarea
                id="demo-message"
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                placeholder="Company size, industry, specific needs..."
                rows={4}
                className="border-sage-200 focus:border-sage-400 focus:ring-sage-400 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-sage-300 text-nordic-600 hover:bg-sage-50"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.email || isSubmitting}
                className="flex-1 bg-sage-500 hover:bg-sage-600 text-white font-medium"
              >
                {isSubmitting ? "Sending..." : "Request Demo"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DemoRequestModal;