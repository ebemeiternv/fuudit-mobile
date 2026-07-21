import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Loader2 } from "lucide-react";

const Auth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) navigate("/app/home", { replace: true });
  }, [session, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app/home`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast({ title: "Welcome to Fuudit", description: "Check your inbox to confirm your email." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/app/home", { replace: true });
      }
    } catch (err) {
      toast({ title: "Something went wrong", description: err instanceof Error ? err.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/app/home`,
    });
    if (result.error) {
      toast({ title: "Sign in failed", description: result.error.message, variant: "destructive" });
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate("/app/home", { replace: true });
  };

  return (
    <div className="app-shell flex flex-col safe-top safe-bottom px-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-[hsl(var(--app-muted))] py-4 no-tap-highlight">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[hsl(var(--app-primary))] text-white grid place-items-center text-2xl font-bold shadow-lg">
            F
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--app-foreground))]">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-[hsl(var(--app-muted))] mt-2">
            {mode === "signup" ? "Start reducing food waste today" : "Sign in to continue cooking smarter"}
          </p>
        </div>

        <div className="app-card p-5 space-y-3">
          <Button
            onClick={() => handleOAuth("google")}
            disabled={busy}
            variant="outline"
            className="w-full h-12 rounded-xl font-medium bg-white hover:bg-[hsl(var(--app-subtle))]"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
          <Button
            onClick={() => handleOAuth("apple")}
            disabled={busy}
            variant="outline"
            className="w-full h-12 rounded-xl font-medium bg-black text-white hover:bg-black/90 hover:text-white border-black"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            Continue with Apple
          </Button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-[hsl(var(--app-border))]" />
            <span className="text-xs uppercase tracking-wider text-[hsl(var(--app-muted))]">or</span>
            <div className="h-px flex-1 bg-[hsl(var(--app-border))]" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name" className="text-sm">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-12 rounded-xl mt-1" />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 rounded-xl mt-1" />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="h-12 rounded-xl mt-1" />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl font-semibold bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-6 text-sm text-[hsl(var(--app-muted))] text-center no-tap-highlight"
        >
          {mode === "signup" ? "Already have an account? " : "New to Fuudit? "}
          <span className="text-[hsl(var(--app-primary))] font-semibold">
            {mode === "signup" ? "Sign in" : "Create an account"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Auth;
