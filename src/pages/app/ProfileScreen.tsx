import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ScreenHeader from "@/components/app/ScreenHeader";
import { useToast } from "@/hooks/use-toast";
import { Bell, Leaf, Settings, HelpCircle, Shield, LogOut, ChevronRight, Users } from "lucide-react";

const rows = [
  { Icon: Users, label: "Household", value: "1 person" },
  { Icon: Leaf, label: "Dietary preferences", value: "Not set" },
  { Icon: Bell, label: "Notifications", value: "On" },
  { Icon: Shield, label: "Privacy", value: "" },
  { Icon: Settings, label: "Preferences", value: "" },
  { Icon: HelpCircle, label: "Help & support", value: "" },
];

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.display_name || "");
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "See you soon!" });
    navigate("/", { replace: true });
  };

  const displayName = name || user?.email?.split("@")[0] || "You";

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
            { label: "Saved", value: "2.4 kg" },
            { label: "Recipes", value: "18" },
            { label: "Streak", value: "6 d" },
          ].map((s) => (
            <div key={s.label} className="app-card-flat p-4 text-center">
              <p className="text-xl font-bold text-[hsl(var(--app-foreground))]">{s.value}</p>
              <p className="text-[11px] font-medium text-[hsl(var(--app-muted))] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="app-card divide-y divide-[hsl(var(--app-border))]">
          {rows.map(({ Icon, label, value }) => (
            <button key={label} className="flex items-center gap-3 p-4 w-full text-left no-tap-highlight active:bg-[hsl(var(--app-subtle))] transition-colors">
              <div className="h-9 w-9 rounded-xl bg-[hsl(var(--app-subtle))] text-[hsl(var(--app-foreground))] grid place-items-center">
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
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

        <p className="text-center text-xs text-[hsl(var(--app-muted))] pb-4">Fuudit · v0.2</p>
      </div>
    </div>
  );
};

export default ProfileScreen;
