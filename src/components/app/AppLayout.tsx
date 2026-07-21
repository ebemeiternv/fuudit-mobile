import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "./BottomNav";
import { Loader2 } from "lucide-react";

const AppLayout = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-shell grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--app-primary))]" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return (
    <div className="app-shell">
      <main className="pb-24 min-h-dvh animate-fade-in" key={location.pathname}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
