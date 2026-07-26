import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/queries/useProfile";
import BottomNav from "./BottomNav";
import LoadingState from "./states/LoadingState";

const AppLayout = () => {
  const { session, user, loading } = useAuth();
  const location = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  if (loading || (session && profileLoading)) {
    return (
      <div className="app-shell grid place-items-center">
        <LoadingState />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const onOnboarding = location.pathname.startsWith("/app/onboarding");
  if (profile && !profile.onboarding_complete && !onOnboarding) {
    return <Navigate to="/app/onboarding" replace />;
  }
  if (profile?.onboarding_complete && onOnboarding) {
    return <Navigate to="/app/home" replace />;
  }

  const showNav = !onOnboarding;

  return (
    <div className="app-shell">
      <main className="pb-24 min-h-dvh animate-fade-in" key={location.pathname}>
        <Outlet />
      </main>
      {showNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
