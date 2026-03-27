import { Home, TrendingUp, ClipboardList, GraduationCap, PieChart, Sparkles, Lightbulb, LogOut, Filter, BarChart3, ChevronsLeft, ChevronsRight, Gamepad2, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navSections = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: Home, path: "/" },
      { label: "Analysis", icon: TrendingUp, path: "/analysis" },
      { label: "Charts", icon: BarChart3, path: "/charts" },
      { label: "Screener", icon: Filter, path: "/screener" },
      { label: "Daily Picks", icon: Sparkles, path: "/daily-picks" },
    ],
  },
  {
    title: "Trading",
    items: [
      { label: "Demo Trading", icon: Gamepad2, path: "/demo-trading" },
      { label: "Trade Tracker", icon: ClipboardList, path: "/tracker" },
      { label: "Portfolio", icon: PieChart, path: "/portfolio" },
      { label: "Insights", icon: Lightbulb, path: "/insights" },
    ],
  },
  {
    title: "Grow",
    items: [
      { label: "Learn", icon: GraduationCap, path: "/learn" },
      { label: "Community", icon: Users, path: "/community" },
    ],
  },
];

interface SideNavProps {
  collapsed: boolean;
  onToggle: () => void;
}

const SideNav = ({ collapsed, onToggle }: SideNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <nav className={cn(
      "fixed left-0 top-0 bottom-0 z-50 border-r border-border/30 bg-background/95 backdrop-blur-xl flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Brand */}
      <div className={cn("py-6 flex items-center", collapsed ? "px-3 justify-center" : "px-6")}>
        {collapsed ? (
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">T</span>
        ) : (
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Trade<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">IQ</span>
            </h1>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Decision Intelligence</p>
          </div>
        )}
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 mb-2">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const button = (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "relative w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all",
                      collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
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
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.path} delayDuration={0}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }
                return button;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="px-2 py-4 border-t border-border/20 space-y-1">
        {collapsed ? (
          <>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button onClick={signOut} className="w-full flex items-center justify-center py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Sign Out</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button onClick={onToggle} className="w-full flex items-center justify-center py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Expand</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
            <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
              <ChevronsLeft className="h-4 w-4" />
              <span>Collapse</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default SideNav;
