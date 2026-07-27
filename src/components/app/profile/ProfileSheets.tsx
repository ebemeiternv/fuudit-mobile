import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Loader2, ExternalLink, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/queries/useProfile";
import { BUILD_ID } from "@/pwa/buildId";
import { cn } from "@/lib/utils";

/** Options aligned with Spoonacular's `diet` and `intolerances` params. */
export const DIET_OPTIONS: { value: string; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescetarian", label: "Pescetarian" },
  { value: "gluten free", label: "Gluten-free" },
  { value: "ketogenic", label: "Ketogenic" },
  { value: "paleo", label: "Paleo" },
  { value: "low fodmap", label: "Low FODMAP" },
  { value: "whole30", label: "Whole30" },
];

export const ALLERGY_OPTIONS: { value: string; label: string }[] = [
  { value: "dairy", label: "Dairy" },
  { value: "egg", label: "Egg" },
  { value: "gluten", label: "Gluten" },
  { value: "grain", label: "Grain" },
  { value: "peanut", label: "Peanut" },
  { value: "tree nut", label: "Tree nut" },
  { value: "soy", label: "Soy" },
  { value: "wheat", label: "Wheat" },
  { value: "seafood", label: "Seafood" },
  { value: "shellfish", label: "Shellfish" },
  { value: "sesame", label: "Sesame" },
  { value: "sulfite", label: "Sulfite" },
];

type ChipProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const Chip = ({ active, onClick, children }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "min-h-[44px] px-4 rounded-full border text-sm font-medium transition-colors no-tap-highlight",
      active
        ? "bg-[hsl(var(--app-primary))] border-[hsl(var(--app-primary))] text-white"
        : "bg-[hsl(var(--app-subtle))] border-[hsl(var(--app-border))] text-[hsl(var(--app-foreground))]",
    )}
  >
    {children}
  </button>
);

type BaseProps = { open: boolean; onOpenChange: (open: boolean) => void };

// ------------------- Household -------------------

export const HouseholdSheet = ({ open, onOpenChange }: BaseProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile(user?.id);
  const [displayName, setDisplayName] = useState("");
  const [size, setSize] = useState(1);

  useEffect(() => {
    if (open) {
      setDisplayName(profile?.display_name ?? "");
      setSize(profile?.household_size ?? 1);
    }
  }, [open, profile]);

  const save = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim() || null,
        household_size: size,
      });
      toast({ title: "Saved", description: "Household details updated." });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const busy = updateProfile.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Household</SheetTitle>
          <SheetDescription>
            Used to scale recipe servings and portion estimates.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          <div>
            <Label htmlFor="displayName" className="text-sm">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              className="h-12 rounded-xl mt-1"
              maxLength={60}
            />
          </div>

          <div>
            <Label className="text-sm">Household size</Label>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease household size"
                onClick={() => setSize((s) => Math.max(1, s - 1))}
                className="h-11 w-11 rounded-xl bg-[hsl(var(--app-subtle))] grid place-items-center active:scale-95 transition-transform"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--app-foreground))]">{size}</p>
                <p className="text-xs text-[hsl(var(--app-muted))]">
                  {size === 1 ? "person" : "people"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Increase household size"
                onClick={() => setSize((s) => Math.min(20, s + 1))}
                className="h-11 w-11 rounded-xl bg-[hsl(var(--app-subtle))] grid place-items-center active:scale-95 transition-transform"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <SheetFooter className="pb-safe">
          <Button
            onClick={save}
            disabled={busy}
            className="w-full h-12 rounded-xl font-semibold bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// ------------------- Dietary preferences -------------------

export const DietarySheet = ({ open, onOpenChange }: BaseProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile(user?.id);
  const [diet, setDiet] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setDiet(profile?.dietary_preferences ?? []);
      setAllergies(profile?.allergies ?? []);
    }
  }, [open, profile]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const save = async () => {
    try {
      await updateProfile.mutateAsync({
        dietary_preferences: diet,
        allergies,
      });
      toast({
        title: "Saved",
        description: "Discover and AI Chef will use these on your next request.",
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const busy = updateProfile.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Dietary preferences</SheetTitle>
          <SheetDescription>
            These filter recipes in Discover and guide AI Chef.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--app-foreground))] mb-2">
              Diet
            </p>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  active={diet.includes(o.value)}
                  onClick={() => toggle(diet, setDiet, o.value)}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[hsl(var(--app-foreground))] mb-2">
              Allergies & intolerances
            </p>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  active={allergies.includes(o.value)}
                  onClick={() => toggle(allergies, setAllergies, o.value)}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-[hsl(var(--app-muted))] mt-3 leading-relaxed">
              Allergies are user-provided constraints used to filter recipe search.
              Always verify ingredient and product labels yourself — Fuudit can't
              guarantee third-party recipe or packaging accuracy.
            </p>
          </div>
        </div>

        <SheetFooter className="pb-safe">
          <Button
            onClick={save}
            disabled={busy}
            className="w-full h-12 rounded-xl font-semibold bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// ------------------- Notifications (info) -------------------

export const NotificationsSheet = ({ open, onOpenChange }: BaseProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="rounded-t-3xl">
      <SheetHeader className="text-left">
        <SheetTitle>Notifications</SheetTitle>
        <SheetDescription>Coming later</SheetDescription>
      </SheetHeader>
      <div className="py-4 space-y-3 text-sm text-[hsl(var(--app-foreground))] leading-relaxed">
        <p>
          Expiry reminders and meal-plan nudges are planned for the native app.
          Web push isn't available on iPhone home-screen apps today, so we've
          held off until it feels reliable.
        </p>
        <p className="text-[hsl(var(--app-muted))]">
          You'll be able to enable expiry, meal-plan and grocery reminders once
          this ships.
        </p>
      </div>
      <SheetFooter className="pb-safe">
        <Button
          onClick={() => onOpenChange(false)}
          className="w-full h-12 rounded-xl font-semibold bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
        >
          Got it
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);

// ------------------- Privacy -------------------

export const PrivacySheet = ({ open, onOpenChange }: BaseProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
      <SheetHeader className="text-left">
        <SheetTitle>Privacy</SheetTitle>
        <SheetDescription>How Fuudit handles your data.</SheetDescription>
      </SheetHeader>

      <div className="py-4 space-y-5 text-sm leading-relaxed text-[hsl(var(--app-foreground))]">
        <section>
          <h3 className="font-semibold mb-1">What we store</h3>
          <p className="text-[hsl(var(--app-muted))]">
            Your account, pantry items, meal plan, grocery list, saved recipes,
            and AI Chef conversations. Row-level security ensures only you can
            read your data.
          </p>
        </section>
        <section>
          <h3 className="font-semibold mb-1">Adaptive learning</h3>
          <p className="text-[hsl(var(--app-muted))]">
            Fuudit records anonymous per-item stats (category, typical shelf
            life, purchase cadence) to speed up pantry entry. This never leaves
            your account and is not shared with other users.
          </p>
        </section>
        <section>
          <h3 className="font-semibold mb-1">AI processing</h3>
          <p className="text-[hsl(var(--app-muted))]">
            AI Chef sends your prompt, a rolling conversation summary, and — on
            request — your pantry contents to a model provider. Requests are
            proxied through Fuudit and are not used to train third-party
            models. Recipe search uses Spoonacular.
          </p>
        </section>
        <section>
          <h3 className="font-semibold mb-1">Full policy</h3>
          <a
            href="/#faq"
            className="inline-flex items-center gap-1 text-[hsl(var(--app-primary))] font-medium"
          >
            Read the Fuudit privacy policy <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
        <p className="text-xs text-[hsl(var(--app-muted))]">
          Need your account or data removed? Email{" "}
          <a href="mailto:hello@fuudit.com" className="underline">
            hello@fuudit.com
          </a>{" "}
          and we'll handle it manually during beta.
        </p>
      </div>

      <SheetFooter className="pb-safe">
        <Button
          onClick={() => onOpenChange(false)}
          className="w-full h-12 rounded-xl font-semibold bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
        >
          Close
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);

// ------------------- Help & Support -------------------

export const HelpSheet = ({ open, onOpenChange }: BaseProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
      <SheetHeader className="text-left">
        <SheetTitle>Help & support</SheetTitle>
        <SheetDescription>We read every message.</SheetDescription>
      </SheetHeader>

      <div className="py-4 space-y-5 text-sm leading-relaxed text-[hsl(var(--app-foreground))]">
        <a
          href="mailto:hello@fuudit.com?subject=Fuudit%20feedback"
          className="app-card-flat p-4 flex items-center gap-3 no-tap-highlight active:bg-[hsl(var(--app-subtle))]"
        >
          <div className="h-9 w-9 rounded-xl bg-[hsl(var(--app-subtle))] grid place-items-center">
            <Mail className="h-[18px] w-[18px]" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Send feedback</p>
            <p className="text-xs text-[hsl(var(--app-muted))]">hello@fuudit.com</p>
          </div>
        </a>

        <section>
          <h3 className="font-semibold mb-1">FAQ</h3>
          <a
            href="/#faq"
            className="inline-flex items-center gap-1 text-[hsl(var(--app-primary))] font-medium"
          >
            Read the FAQ <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        <section>
          <h3 className="font-semibold mb-1">Install Fuudit as an app</h3>
          <ul className="list-disc pl-5 space-y-1 text-[hsl(var(--app-muted))]">
            <li>iPhone Safari: tap Share → Add to Home Screen.</li>
            <li>Android Chrome: menu → Install app.</li>
            <li>Desktop Chrome: address bar install icon.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold mb-1">Stuck on an old version?</h3>
          <ul className="list-disc pl-5 space-y-1 text-[hsl(var(--app-muted))]">
            <li>Pull down to refresh; new versions show an "Update available" banner.</li>
            <li>On iPhone, fully close the app and reopen it.</li>
            <li>
              As a last resort, visit{" "}
              <code className="text-[12px]">/?sw=off</code> once to unregister
              the service worker.
            </li>
          </ul>
        </section>

        <p className="text-xs text-[hsl(var(--app-muted))]">
          Fuudit · Beta · Build {BUILD_ID}
        </p>
      </div>

      <SheetFooter className="pb-safe">
        <Button
          onClick={() => onOpenChange(false)}
          className="w-full h-12 rounded-xl font-semibold bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
        >
          Close
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
