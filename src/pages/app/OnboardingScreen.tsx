import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/queries/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

const OnboardingScreen = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [householdSize, setHouseholdSize] = useState<number>(profile?.household_size ?? 1);

  const busy = updateProfile.isPending;

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim() || user?.email?.split("@")[0] || "You",
        household_size: householdSize,
        onboarding_complete: true,
      });
      navigate("/app/home", { replace: true });
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="app-shell px-6 py-10 flex flex-col safe-top safe-bottom">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[hsl(var(--app-primary))] text-white grid place-items-center shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--app-foreground))]">
            Welcome to Fuudit
          </h1>
          <p className="text-[hsl(var(--app-muted))] mt-2">
            A couple of quick details so we can personalise things.
          </p>
        </div>

        <form onSubmit={handleContinue} className="app-card p-5 space-y-4">
          <div>
            <Label htmlFor="displayName" className="text-sm">Your name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              className="h-12 rounded-xl mt-1"
            />
          </div>
          <div>
            <Label htmlFor="household" className="text-sm">People in your household</Label>
            <Input
              id="household"
              type="number"
              min={1}
              max={20}
              value={householdSize}
              onChange={(e) => setHouseholdSize(Math.max(1, Number(e.target.value) || 1))}
              className="h-12 rounded-xl mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl font-semibold bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingScreen;
