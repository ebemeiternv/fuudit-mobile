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

interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WaitingListModal = ({ isOpen, onClose }: WaitingListModalProps) => {
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
      await emailjs.send(
        'service_073243j',
        'template_6kfvi1y',
        {
          name: formData.name || 'Anonymous',
          email: formData.email,
          message: formData.message || 'Looking forward to trying Fuudit!',
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
            Join the Waiting List
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-lg font-medium text-sage-600">
              You're in! We'll be in touch soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-nordic-700 font-medium">
                Name (optional)
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Your name"
                className="border-sage-200 focus:border-sage-400 focus:ring-sage-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-nordic-700 font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your.email@example.com"
                className="border-sage-200 focus:border-sage-400 focus:ring-sage-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-nordic-700 font-medium">
                Why are you excited to try Fuudit? (optional)
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                placeholder="Tell us what excites you about smart cooking..."
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
                {isSubmitting ? "Joining..." : "Join Waiting List"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WaitingListModal;