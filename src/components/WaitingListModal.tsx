import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    interests: [] as string[],
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
          message: formData.interests.length > 0 
            ? `I'm interested in: ${formData.interests.join(', ')}` 
            : 'Looking forward to trying Fuudit!',
        },
        'UdQc0_sEnTxrudWHD'
      );

      setShowSuccess(true);
      setFormData({ name: "", email: "", interests: [] });
      
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

  const handleInterestChange = (interest: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      interests: checked 
        ? [...prev.interests, interest]
        : prev.interests.filter(item => item !== interest)
    }));
  };

  const interestOptions = [
    "I want to reduce household food waste",
    "I need cooking inspiration",
    "I want to make grocery shopping more efficient",
    "I want to better track what items I have at home",
    "I want to better track shelf-life of the items I have"
  ];

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
              />
            </div>

            <div className="space-y-3">
              <Label className="text-nordic-700 font-medium">
                Why are you excited to try Fuudit? (optional)
              </Label>
              <div className="space-y-3">
                {interestOptions.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`interest-${index}`}
                      checked={formData.interests.includes(option)}
                      onCheckedChange={(checked) => 
                        handleInterestChange(option, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`interest-${index}`} 
                      className="text-sm text-nordic-600 cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
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