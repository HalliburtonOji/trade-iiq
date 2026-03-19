import { Home, TrendingUp, ClipboardList, GraduationCap, PieChart, Search, Sparkles, Lightbulb, LogOut, Filter } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const navSections = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: Home, path: "/" },
      { label: "Analysis", icon: TrendingUp, path: "/analysis" },
      { label: "Screener", icon: Filter, path: "/screener" },
      { label: "Daily Picks", icon: Sparkles, path: "/daily-picks" },
    ],
  },
  {
    title: "Journal",
    items: [
      { label: "Trade Tracker", icon: ClipboardList, path: "/tracker" },
      { label: "Portfolio", icon: PieChart, path: "/portfolio" },
      { label: "Insights", icon: Lightbulb, path: "/insights" },
    ],
  },
  {
    title: "Grow",
    items: [
      { label: "Learn", icon: GraduationCap, path: "/learn" },
    ],
  },
];

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 z-50 border-r border-border/30 bg-background/95 backdrop-blur-xl flex flex-col">
      {/* Brand */}
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold tracking-tight">
          Trade<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">IQ</span>
        </h1>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Decision Intelligence</p>
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 mb-2">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidenav-indicator"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-accent opacity-90"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border/20">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

export default SideNav;
