import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/app/AppLayout";
import HomeScreen from "./pages/app/HomeScreen";
import PantryScreen from "./pages/app/PantryScreen";
import ChefScreen from "./pages/app/ChefScreen";
import MealPlanScreen from "./pages/app/MealPlanScreen";
import GroceryScreen from "./pages/app/GroceryScreen";
import ProfileScreen from "./pages/app/ProfileScreen";
import OnboardingScreen from "./pages/app/OnboardingScreen";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Marketing / public */}
            <Route path="/" element={<Index />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />

            {/* Auth */}
            <Route path="/auth" element={<Auth />} />

            {/* Authenticated app */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="/app/home" replace />} />
              <Route path="onboarding" element={<OnboardingScreen />} />
              <Route path="home" element={<HomeScreen />} />
              <Route path="pantry" element={<PantryScreen />} />
              <Route path="chef" element={<ChefScreen />} />
              <Route path="meal-plan" element={<MealPlanScreen />} />
              <Route path="grocery" element={<GroceryScreen />} />
              <Route path="profile" element={<ProfileScreen />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
