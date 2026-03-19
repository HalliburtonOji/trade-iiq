import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Analysis from "./pages/Analysis";
import Tracker from "./pages/Tracker";
import Learn from "./pages/Learn";
import Portfolio from "./pages/Portfolio";
import Screener from "./pages/Screener";
import DailyPicks from "./pages/DailyPicks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/daily-picks" element={<DailyPicks />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
