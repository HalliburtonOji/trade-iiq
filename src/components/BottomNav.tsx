import { Home, TrendingUp, GraduationCap, Gamepad2, MoreHorizontal, BarChart3, Filter, Sparkles, ClipboardList, PieChart, Lightbulb, Users, User, LogOut, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const primaryTabs = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Analysis", icon: TrendingUp, path: "/analysis" },
  { label: "Demo", icon: Gamepad2, path: "/demo-trading" },
  { label: "Learn", icon: GraduationCap, path: "/learn" },
];

const moreItems = [
  { label: "Charts", icon: BarChart3, path: "/charts" },
  { label: "Screener", icon: Filter, path: "/screener" },
  { label: "Daily Picks", icon: Sparkles, path: "/daily-picks" },
  { label: "Tracker", icon: ClipboardList, path: "/tracker" },
  { label: "Portfolio", icon: PieChart, path: "/portfolio" },
  { label: "Insights", icon: Lightbulb, path: "/insights" },
  { label: "Community", icon: Users, path: "/community" },
  { label: "Profile", icon: User, path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreItems.some(i => location.pathname === i.path);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[480px] items-center justify-around py-2 px-2">
          {primaryTabs.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/60 hover:text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-gradient-to-r from-primary to-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    isActive && "drop-shadow-[0_0_8px_hsl(239_84%_67%/0.5)]"
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-all",
              isMoreActive
                ? "text-primary"
                : "text-muted-foreground/60 hover:text-muted-foreground"
            )}
          >
            {isMoreActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-2 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-gradient-to-r from-primary to-accent"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm font-semibold">More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-3 pt-2">
            {moreItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(item.path);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 text-[11px] font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border/30">
            <button
              onClick={() => {
                setMoreOpen(false);
                signOut();
              }}
              className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
