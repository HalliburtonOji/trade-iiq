import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

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

export default function StoaShell({
  children,
  palette = "delphi",
  crumb,
  rightBar,
}: StoaShellProps) {
  const loc = useLocation();
  const { theme, toggleTheme } = useTheme();
  const paletteClass = palette === "pompeii" ? "stoa-pompeii" : "";

  return (
    <div
      className={`stoa-root ${paletteClass}`}
      style={{ minHeight: "100vh", display: "flex" }}
    >
      {/* SIDEBAR */}
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
                style={{ color: "var(--stoa-muted)", marginLeft: 6, fontSize: 12 }}
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
                    style={{ fontSize: 12, color: "var(--stoa-muted)" }}
                  >
                    {item.greek}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

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
            padding: "0 24px",
            background: "var(--stoa-bg)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div className="stoa-greek" style={{ color: "var(--stoa-muted)", fontSize: 14 }}>
            {crumb || "Stoa"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
        <div style={{ padding: "28px 32px", flex: 1 }}>{children}</div>
      </main>
    </div>
  );
}
