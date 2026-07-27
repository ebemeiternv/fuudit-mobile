import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/queries/useProfile";
import { usePantryImpact } from "@/hooks/queries/usePantryImpact";
import { useSavedRecipes } from "@/hooks/queries/useSavedRecipes";
import ScreenHeader from "@/components/app/ScreenHeader";
import { useToast } from "@/hooks/use-toast";
import InstallRow from "@/pwa/InstallRow";
import { BUILD_ID } from "@/pwa/buildId";
import { Bell, Bookmark, Leaf, HelpCircle, Shield, LogOut, ChevronRight, Users } from "lucide-react";
import {
  HouseholdSheet,
  DietarySheet,
  NotificationsSheet,
  PrivacySheet,
  HelpSheet,
} from "@/components/app/profile/ProfileSheets";

type SheetKey = "household" | "dietary" | "notifications" | "privacy" | "help" | null;

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const impact = usePantryImpact(user?.id);
  const { data: saved = [] } = useSavedRecipes(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "See you soon!" });
    navigate("/", { replace: true });
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "You";
  const householdSize = profile?.household_size ?? 1;
  const dietCount =
    (profile?.dietary_preferences?.length ?? 0) + (profile?.allergies?.length ?? 0);
  const dietary = dietCount ? `${dietCount} selected` : "Not set";

  const rows: {
    Icon: typeof Users;
    label: string;
    value: string;
    onClick: () => void;
    hint?: string;
  }[] = [
    {
      Icon: Bookmark,
      label: "Saved recipes",
      value: `${saved.length}`,
      onClick: () => navigate("/app/saved"),
    },
    {
      Icon: Users,
      label: "Household",
      value: `${householdSize} ${householdSize === 1 ? "person" : "people"}`,
      onClick: () => setOpenSheet("household"),
    },
    {
      Icon: Leaf,
      label: "Dietary preferences",
      value: dietary,
      onClick: () => setOpenSheet("dietary"),
    },
    {
      Icon: Bell,
      label: "Notifications",
      value: "Coming later",
      onClick: () => setOpenSheet("notifications"),
    },
    {
      Icon: Shield,
      label: "Privacy",
      value: "",
      onClick: () => setOpenSheet("privacy"),
    },
    {
      Icon: HelpCircle,
      label: "Help & support",
      value: "",
      onClick: () => setOpenSheet("help"),
    },
  ];

  return (
    <div>
      <ScreenHeader title="Profile" />

      <div className="px-5 space-y-5">
        <div className="app-card p-5 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[hsl(var(--app-primary))] to-[hsl(150_50%_28%)] text-white grid place-items-center text-2xl font-bold shadow-md">
            {displayName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-[hsl(var(--app-foreground))] truncate">{displayName}</p>
            <p className="text-sm text-[hsl(var(--app-muted))] truncate">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Consumed", value: String(impact.consumed) },
            { label: "Discarded", value: String(impact.discarded) },
            {
              label: "Used %",
              value: impact.consumedPct !== null ? `${impact.consumedPct}%` : "—",
            },
          ].map((s) => (
            <div key={s.label} className="app-card-flat p-4 text-center">
              <p className="text-xl font-bold text-[hsl(var(--app-foreground))]">{s.value}</p>
              <p className="text-[11px] font-medium text-[hsl(var(--app-muted))] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="app-card divide-y divide-[hsl(var(--app-border))]">
          <InstallRow />

          {rows.map(({ Icon, label, value, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex items-center gap-3 p-4 w-full text-left no-tap-highlight active:bg-[hsl(var(--app-subtle))] transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-[hsl(var(--app-subtle))] text-[hsl(var(--app-foreground))] grid place-items-center">
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <span className="flex-1 font-medium text-[hsl(var(--app-foreground))]">{label}</span>
              {value && <span className="text-sm text-[hsl(var(--app-muted))]">{value}</span>}
              <ChevronRight className="h-4 w-4 text-[hsl(var(--app-muted))]" />
            </button>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          className="w-full app-card p-4 flex items-center justify-center gap-2 text-[hsl(var(--app-danger))] font-semibold no-tap-highlight active:scale-[0.99] transition-transform"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        <p className="text-center text-xs text-[hsl(var(--app-muted))] pb-4">
          Fuudit · Beta · Build {BUILD_ID}
        </p>
      </div>
    </div>
  );
};

export default ProfileScreen;
