import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import FloatingHub from "@/components/FloatingHub";
import Index from "./pages/Index";
import Analysis from "./pages/Analysis";
import Charts from "./pages/Charts";
import Tracker from "./pages/Tracker";
import Learn from "./pages/Learn";
import Portfolio from "./pages/Portfolio";
import Screener from "./pages/Screener";
import DailyPicks from "./pages/DailyPicks";
import Insights from "./pages/Insights";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import DemoTrading from "./pages/DemoTrading";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
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
        <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
        <Route path="/screener" element={<ProtectedRoute><Screener /></ProtectedRoute>} />
        <Route path="/daily-picks" element={<ProtectedRoute><DailyPicks /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
        <Route path="/demo-trading" element={<ProtectedRoute><DemoTrading /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
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
