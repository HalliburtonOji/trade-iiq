import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FloatingHub from "@/components/FloatingHub";
import Index from "./pages/Index";
import Analysis from "./pages/Analysis";
import Charts from "./pages/Charts";
import Tracker from "./pages/Tracker";
import Learn from "./pages/Learn";
import LearnModule from "./pages/LearnModule";
import LearnDrill from "./pages/LearnDrill";
import LearnScenario from "./pages/LearnScenario";
import Portfolio from "./pages/Portfolio";
import Screener from "./pages/Screener";
import DailyPicks from "./pages/DailyPicks";
import Insights from "./pages/Insights";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import DemoTrading from "./pages/DemoTrading";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import Playbook from "./pages/Playbook";
import ScreenshotVault from "./pages/ScreenshotVault";
import ReviewWorkspace from "./pages/ReviewWorkspace";
import Council from "./pages/Council";
import Initiation from "./pages/Initiation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/landing" replace />;
  return <>{children}</>;
};

const PublicOnly = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/**
 * On first login (profiles.onboarded_at is null), bounce to /initiation.
 * Wraps only the root route so deep links still work.
 */
const InitiationGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<"checking" | "needs" | "ok">("checking");

  useEffect(() => {
    if (!user) { setState("ok"); return; }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      setState(data?.onboarded_at ? "ok" : "needs");
    })();
    return () => { active = false; };
  }, [user]);

  if (state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (state === "needs") return <Navigate to="/initiation" replace />;
  return <>{children}</>;
};

const AppContent = () => {
  const { user } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/landing" element={<PublicOnly><Landing /></PublicOnly>} />
        <Route path="/auth" element={<PublicOnly><Auth /></PublicOnly>} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/analysis" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
        <Route path="/charts" element={<ProtectedRoute><Charts /></ProtectedRoute>} />
        <Route path="/tracker" element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
        <Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
        <Route path="/learn/:slug" element={<ProtectedRoute><LearnModule /></ProtectedRoute>} />
        <Route path="/learn/:slug/drill" element={<ProtectedRoute><LearnDrill /></ProtectedRoute>} />
        <Route path="/learn/:slug/scenario" element={<ProtectedRoute><LearnScenario /></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
        <Route path="/screener" element={<ProtectedRoute><Screener /></ProtectedRoute>} />
        <Route path="/daily-picks" element={<ProtectedRoute><DailyPicks /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
        <Route path="/demo-trading" element={<ProtectedRoute><DemoTrading /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/playbook" element={<ProtectedRoute><Playbook /></ProtectedRoute>} />
        <Route path="/screenshots" element={<ProtectedRoute><ScreenshotVault /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute><ReviewWorkspace /></ProtectedRoute>} />
        <Route path="/council" element={<ProtectedRoute><Council /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && <FloatingHub />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
