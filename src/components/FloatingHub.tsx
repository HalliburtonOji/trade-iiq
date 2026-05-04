import { useState } from "react";
import {
  Menu, X, Home, TrendingUp, BarChart3, Filter, Sparkles, ClipboardList,
  PieChart, Lightbulb, GraduationCap, Gamepad2, Users, User as UserIcon,
  LogOut, BookOpen, Image as ImageIcon, BarChart, Eye, Sun, Moon, Sunrise,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type Item = { label: string; icon: any; path: string };
type Section = { title: string; greek: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Acropolis", greek: "Ἀκρόπολις",
    items: [
      { label: "Dashboard", icon: Home, path: "/" },
      { label: "Analysis", icon: TrendingUp, path: "/analysis" },
      { label: "Charts", icon: BarChart3, path: "/charts" },
      { label: "Screener", icon: Filter, path: "/screener" },
      { label: "Daily Picks", icon: Sparkles, path: "/daily-picks" },
    ],
  },
  {
    title: "Training", greek: "Ἄθλησις",
    items: [
      { label: "Demo Trading", icon: Gamepad2, path: "/demo-trading" },
      { label: "Tracker", icon: ClipboardList, path: "/tracker" },
      { label: "Playbook", icon: BookOpen, path: "/playbook" },
      { label: "Screenshots", icon: ImageIcon, path: "/screenshots" },
      { label: "Portfolio", icon: PieChart, path: "/portfolio" },
    ],
  },
  {
    title: "Grow", greek: "Παιδεία",
    items: [
      { label: "Learn", icon: GraduationCap, path: "/learn" },
      { label: "Review", icon: BarChart, path: "/review" },
      { label: "Insights", icon: Lightbulb, path: "/insights" },
      { label: "Community", icon: Users, path: "/community" },
      { label: "Profile", icon: UserIcon, path: "/profile" },
    ],
  },
];

const RITUALS: Item[] = [
  { label: "Morning Brief", icon: Sunrise, path: "/morning" },
  { label: "Evening Reflection", icon: MoonIcon, path: "/evening" },
];

const FloatingHub = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const go = (path: string) => { setOpen(false); navigate(path); };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="fixed bottom-6 right-4 z-[60] h-14 w-14 rounded-full flex items-center justify-center md:right-6"
            style={{
              background: "var(--stoa-bg)",
              border: "1px solid var(--stoa-gold-rule)",
              color: "var(--stoa-accent)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.35), inset 0 0 0 1px var(--stoa-shine)",
            }}
          >
            <Menu className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[88vh] h-[88vh] flex flex-col p-0 border-0"
          style={{ background: "var(--stoa-bg)", borderTop: "1px solid var(--stoa-gold-rule)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pt-5 pb-4"
            style={{ borderBottom: "1px solid var(--stoa-rule)" }}
          >
            <div>
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>NAVIGATION</div>
              <div
                className="stoa-display"
                style={{ fontSize: 22, fontWeight: 600, color: "var(--stoa-ink)", lineHeight: 1.1, marginTop: 2 }}
              >
                Stoa <span className="stoa-greek" style={{ color: "var(--stoa-accent)", fontSize: 16 }}>· Στοά</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="h-9 w-9 rounded-full flex items-center justify-center"
                style={{
                  border: "1px solid var(--stoa-rule)",
                  background: "var(--stoa-shine)",
                  color: "var(--stoa-ink)",
                }}
              >
                {theme === "cream" ? <Moon size={15} /> : <Sun size={15} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="h-9 w-9 rounded-full flex items-center justify-center"
                style={{
                  border: "1px solid var(--stoa-rule)",
                  background: "var(--stoa-shine)",
                  color: "var(--stoa-ink)",
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {/* Oracle CTA — single unified coach */}
            <button
              onClick={() => go("/oracle")}
              className="group w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--stoa-accent) 14%, transparent), var(--stoa-shine))",
                border: "1px solid var(--stoa-gold-rule)",
              }}
            >
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "var(--stoa-bg)",
                  border: "1px solid var(--stoa-gold-rule)",
                  color: "var(--stoa-accent)",
                }}
              >
                <Eye className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>
                  ORACLE · Μαντεῖον
                </div>
                <div
                  className="stoa-display"
                  style={{ fontSize: 18, fontWeight: 600, color: "var(--stoa-ink)", marginTop: 2 }}
                >
                  Ask the Oracle
                </div>
                <div style={{ color: "var(--stoa-muted)", fontSize: 12, marginTop: 2 }}>
                  Your personal AI coach — grounded in your trades, rules &amp; reflections.
                </div>
              </div>
            </button>

            {/* Daily rituals */}
            <div>
              <div className="stoa-kicker mb-3" style={{ color: "var(--stoa-muted)" }}>
                DAILY · Ἕξις
              </div>
              <div className="grid grid-cols-2 gap-2">
                {RITUALS.map((r) => {
                  const active = location.pathname === r.path;
                  return (
                    <button
                      key={r.path}
                      onClick={() => go(r.path)}
                      className="flex items-center gap-2 rounded-xl px-3 py-3 text-left"
                      style={{
                        background: active ? "var(--stoa-shine)" : "transparent",
                        border: "1px solid var(--stoa-rule)",
                        color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                      }}
                    >
                      <r.icon className="h-4 w-4" style={{ color: "var(--stoa-accent)" }} />
                      <span className="stoa-kicker" style={{ color: active ? "var(--stoa-ink)" : "var(--stoa-muted)" }}>
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sections */}
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                    {section.title.toUpperCase()}
                  </span>
                  <span
                    className="stoa-greek"
                    style={{ color: "var(--stoa-accent)", opacity: 0.7, fontSize: 12 }}
                  >
                    · {section.greek}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => go(item.path)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
                        )}
                        style={{
                          background: isActive ? "var(--stoa-shine)" : "transparent",
                          border: isActive
                            ? "1px solid var(--stoa-gold-rule)"
                            : "1px solid var(--stoa-rule)",
                          color: isActive ? "var(--stoa-ink)" : "var(--stoa-muted)",
                        }}
                      >
                        <item.icon
                          className="h-4 w-4 shrink-0"
                          style={{ color: isActive ? "var(--stoa-accent)" : "var(--stoa-muted)" }}
                        />
                        <span
                          className="stoa-kicker truncate"
                          style={{ color: isActive ? "var(--stoa-ink)" : "var(--stoa-muted)" }}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Sign out */}
            <div style={{ borderTop: "1px solid var(--stoa-rule)" }} className="pt-4">
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="flex items-center gap-3 w-full rounded-xl px-3 py-3"
                style={{
                  border: "1px solid var(--stoa-rule)",
                  color: "var(--stoa-muted)",
                  background: "var(--stoa-shine)",
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="stoa-kicker">Sign Out</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FloatingHub;
