import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";

type StoaShellProps = {
  children: React.ReactNode;
  palette?: "delphi" | "pompeii";
  crumb?: React.ReactNode;
  rightBar?: React.ReactNode;
};

type NavItem = { kicker: string; greek: string; to: string };
type NavSection = { title: string; greek: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: "ACROPOLIS",
    greek: "Ἀκρόπολις",
    items: [
      { kicker: "DASHBOARD",   greek: "Ναός",    to: "/" },
      { kicker: "ANALYSIS",    greek: "Σκέψις",  to: "/analysis" },
      { kicker: "CHARTS",      greek: "Γραμμαί", to: "/charts" },
      { kicker: "SCREENER",    greek: "Ἀγορά",   to: "/screener" },
      { kicker: "DAILY PICKS", greek: "Οἰωνοί",  to: "/daily-picks" },
    ],
  },
  {
    title: "TRAINING",
    greek: "Ἄθλησις",
    items: [
      { kicker: "DEMO TRADING",  greek: "Γυμνάσιον", to: "/demo-trading" },
      { kicker: "TRADE TRACKER", greek: "Βίβλος",    to: "/tracker" },
      { kicker: "PLAYBOOK",      greek: "Τακτικά",   to: "/playbook" },
      { kicker: "SCREENSHOTS",   greek: "Εἰκόνες",   to: "/screenshots" },
      { kicker: "PORTFOLIO",     greek: "Θησαυρός",  to: "/portfolio" },
    ],
  },
  {
    title: "GROW",
    greek: "Παιδεία",
    items: [
      { kicker: "LEARN",     greek: "Κῶδιξ",   to: "/learn" },
      { kicker: "REVIEW",    greek: "Θέατρον", to: "/review" },
      { kicker: "INSIGHTS",  greek: "Γνῶσις",  to: "/insights" },
      { kicker: "COMMUNITY", greek: "Στοά",    to: "/community" },
      { kicker: "PROFILE",   greek: "Ἔργον",   to: "/profile" },
    ],
  },
];

const SIDEBAR_WIDTH = 248;
const TOPBAR_HEIGHT = 56;
const DRAWER_WIDTH = Math.min(SIDEBAR_WIDTH + 20, 280);

const StoaShell = React.forwardRef<HTMLDivElement, StoaShellProps>(function StoaShell(
  { children, palette = "delphi", crumb, rightBar },
  ref,
) {
  const loc = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const paletteClass = palette === "pompeii" ? "stoa-pompeii" : "";

  // Auto-close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [loc.pathname]);

  // Close drawer if viewport widens to desktop
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const sidebarInner = (
    <>
      <div style={{ marginBottom: 22 }}>
        <div
          className="stoa-display"
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "var(--stoa-ink)",
          }}
        >
          ΣTOA
        </div>
        <div
          style={{
            height: 1,
            background: "var(--stoa-gold-rule)",
            margin: "10px 0 8px",
          }}
        />
        <div className="stoa-kicker">Decision Intelligence</div>
      </div>

      {NAV.map((section) => (
        <div key={section.title} style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 8 }}>
            <span className="stoa-kicker">{section.title}</span>
            <span
              className="stoa-greek"
              style={{
                color: "var(--stoa-accent)",
                opacity: 0.55,
                marginLeft: 6,
                fontSize: 11,
                whiteSpace: "nowrap",
              }}
            >
              · {section.greek}
            </span>
          </div>

          {section.items.map((item) => {
            const active =
              loc.pathname === item.to ||
              (item.to !== "/" && loc.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderLeft: active
                    ? "2px solid var(--stoa-accent)"
                    : "2px solid transparent",
                  background: active ? "var(--stoa-shine)" : "transparent",
                  color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                  textDecoration: "none",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                <span
                  className="stoa-kicker"
                  style={{ color: active ? "var(--stoa-ink)" : "var(--stoa-muted)" }}
                >
                  {item.kicker}
                </span>
                <span
                  className="stoa-greek"
                  style={{
                    fontSize: 11,
                    color: "var(--stoa-accent)",
                    opacity: active ? 0.75 : 0.5,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.greek}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <div
      className={`stoa-root ${paletteClass}`}
      style={{ minHeight: "100vh", display: "flex" }}
    >
      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <aside
          style={{
            width: SIDEBAR_WIDTH,
            minHeight: "100vh",
            borderRight: "1px solid var(--stoa-rule)",
            padding: "20px 18px",
            background: "var(--stoa-bg)",
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            maxHeight: "100vh",
            overflowY: "auto",
          }}
        >
          {sidebarInner}
        </aside>
      )}

      {/* MOBILE DRAWER BACKDROP */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            zIndex: 40,
            transition: "opacity 0.18s ease",
          }}
        />
      )}

      {/* MOBILE DRAWER */}
      {isMobile && (
        <aside
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            background: "var(--stoa-bg)",
            borderRight: "1px solid var(--stoa-rule)",
            padding: "16px 16px 24px",
            overflowY: "auto",
            transform: drawerOpen ? "translateX(0)" : "translateX(-110%)",
            transition: "transform 0.22s ease",
            zIndex: 50,
            boxShadow: drawerOpen ? "0 12px 40px rgba(0,0,0,0.18)" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid var(--stoa-rule)",
                background: "var(--stoa-shine)",
                color: "var(--stoa-ink)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>
          </div>
          {sidebarInner}
        </aside>
      )}

      {/* MAIN */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* TOP BAR */}
        <header
          style={{
            height: TOPBAR_HEIGHT,
            borderBottom: "1px solid var(--stoa-rule)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "0 14px" : "0 24px",
            background: "var(--stoa-bg)",
            position: "sticky",
            top: 0,
            zIndex: 10,
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              flex: 1,
            }}
          >
            {isMobile && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid var(--stoa-rule)",
                  background: "var(--stoa-shine)",
                  color: "var(--stoa-ink)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Menu size={15} />
              </button>
            )}
            <div
              className="stoa-greek"
              style={{
                color: "var(--stoa-muted)",
                fontSize: 14,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {crumb || "Stoa"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "cream" ? "Switch to dark theme" : "Switch to cream theme"}
              title={theme === "cream" ? "Switch to dark theme" : "Switch to cream theme"}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid var(--stoa-rule)",
                background: "var(--stoa-shine)",
                color: "var(--stoa-ink)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
            >
              {theme === "cream" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            {rightBar}
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ padding: isMobile ? "18px 14px" : "28px 32px", flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </main>
    </div>
  );
});

export default StoaShell;
