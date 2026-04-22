import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface StoaLayoutProps {
  children: ReactNode;
  /** When true, this page uses the Pompeii (light parchment) palette. */
  pompeii?: boolean;
}

const NAV_ACROPOLIS = [
  { english: "Temple", greek: "Ναός", path: "/dashboard" },
  { english: "Scroll", greek: "Βίβλος", path: "/journal" },
  { english: "Codex", greek: "Κῶδιξ", path: "/learn" },
  { english: "Agora", greek: "Ἀγορά", path: "/markets" },
  { english: "Amphitheater", greek: "Θέατρον", path: "/review" },
  { english: "Sanctuary", greek: "Πυθία", path: "/coach" },
];

const NAV_UTILITY = [
  { english: "Ergon", greek: "Ἔργον", path: "/settings" },
  { english: "Kanon", greek: "Κανών", path: "/style", devOnly: true },
];

const POMPEII_PATHS = new Set(["/journal", "/learn"]);

const isNyseOpen = (now: Date) => {
  // Convert to ET. America/New_York handles DST automatically.
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay(); // 0 Sun .. 6 Sat
  if (day === 0 || day === 6) return false;
  const minutes = et.getHours() * 60 + et.getMinutes();
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
};

const formatEt = (now: Date) =>
  now.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const useViewportWidth = () => {
  const [w, setW] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
};

const StoaLayout = ({ children, pompeii }: StoaLayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const width = useViewportWidth();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [searchExpanded, setSearchExpanded] = useState(false);

  // ⌘K focuses the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.getElementById("stoa-command") as HTMLInputElement | null;
        if (el) el.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isPompeii = pompeii ?? POMPEII_PATHS.has(location.pathname);
  const sidebarMode: "full" | "rail" | "mini" =
    width < 720 ? "mini" : width < 1100 ? "rail" : "full";
  const sidebarWidth = sidebarMode === "full" ? 220 : sidebarMode === "rail" ? 80 : 56;

  const fullName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const displayName = fullName ?? "Halliburton";
  const initials = useMemo(() => {
    const src = (fullName ?? "Halliburton Oracle").trim();
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] ?? "H") + (parts[1]?.[0] ?? "O")).toUpperCase();
  }, [fullName]);

  const isDev = import.meta.env.DEV;
  const utilityItems = NAV_UTILITY.filter((i) => !i.devOnly || isDev);

  const open = isNyseOpen(now);
  const clock = formatEt(now);

  const currentNav = [...NAV_ACROPOLIS, ...NAV_UTILITY].find((i) => i.path === location.pathname);

  return (
    <div
      className={isPompeii ? "p-pompeii" : ""}
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
        display: "grid",
        gridTemplateColumns: `${sidebarWidth}px 1fr`,
        fontFamily: "'IBM Plex Serif', Georgia, serif",
        fontSize: 15,
        lineHeight: 1.55,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {/* ===== SIDEBAR ===== */}
      <aside
        style={{
          borderRight: "1px solid var(--rule)",
          height: "100vh",
          position: "sticky",
          top: 0,
          background:
            "linear-gradient(90deg, transparent 18%, rgba(242,234,215,0.02) 19%, rgba(242,234,215,0.02) 19.5%, transparent 20%, transparent 78%, rgba(242,234,215,0.02) 78.5%, rgba(242,234,215,0.02) 79%, transparent 80%), var(--bg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Wordmark */}
        <div style={{ padding: sidebarMode === "full" ? "22px 18px 14px" : "22px 0 14px", textAlign: sidebarMode === "full" ? "left" : "center" }}>
          <Link
            to="/dashboard"
            className="display"
            style={{
              fontSize: sidebarMode === "full" ? 28 : 22,
              letterSpacing: "0.15em",
              color: "var(--ink)",
              textDecoration: "none",
            }}
          >
            {sidebarMode === "full" ? "ΣTOA" : "Σ"}
          </Link>
          {sidebarMode === "full" && (
            <div style={{ height: 1, width: 40, background: "var(--accent)", opacity: 0.7, marginTop: 8 }} />
          )}
        </div>

        {/* Sections */}
        <nav style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}>
          <SidebarSection
            title="ACROPOLIS"
            items={NAV_ACROPOLIS}
            mode={sidebarMode}
            currentPath={location.pathname}
          />
          <SidebarSection
            title="UTILITY"
            items={utilityItems}
            mode={sidebarMode}
            currentPath={location.pathname}
          />
        </nav>

        {/* Footer / avatar */}
        <div
          style={{
            borderTop: "1px solid var(--rule)",
            padding: sidebarMode === "full" ? "14px 18px" : "14px 0",
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: sidebarMode === "full" ? "flex-start" : "center",
          }}
        >
          <div
            aria-hidden
            className="display"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid var(--gold-rule)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "var(--ink)",
              flexShrink: 0,
            }}
            title={displayName}
          >
            {initials}
          </div>
          {sidebarMode === "full" && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {displayName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                Connected
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main style={{ minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "0 24px",
            borderBottom: "1px solid var(--rule)",
            background: "var(--bg)",
          }}
        >
          {/* Breadcrumbs */}
          <div style={{ flex: "0 0 auto", color: "var(--muted)", fontSize: 13, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {sidebarMode === "mini" ? (
              <span>{currentNav?.english ?? "Stoa"}</span>
            ) : (
              <>
                <span>Stoa</span>
                <span style={{ margin: "0 8px" }}>·</span>
                <span className="greek">{currentNav?.greek ?? "—"}</span>
                <span style={{ margin: "0 8px" }}>·</span>
                <span style={{ color: "var(--ink)" }}>{currentNav?.english ?? "—"}</span>
              </>
            )}
          </div>

          {/* Command palette */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            {sidebarMode === "mini" && !searchExpanded ? (
              <button
                aria-label="Open search"
                onClick={() => setSearchExpanded(true)}
                style={{
                  width: 36,
                  height: 36,
                  border: "1px solid var(--rule)",
                  background: "transparent",
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                <Search size={16} />
              </button>
            ) : (
              <input
                id="stoa-command"
                placeholder="Ask the oracle or find anything…  ⌘K"
                onBlur={() => sidebarMode === "mini" && setSearchExpanded(false)}
                style={{
                  width: sidebarMode === "mini" ? "100%" : Math.min(420, width - 360),
                  maxWidth: 420,
                  height: 36,
                  background: "transparent",
                  border: "1px solid var(--rule)",
                  borderRadius: 2,
                  padding: "0 12px",
                  color: "var(--ink)",
                  fontFamily: "'IBM Plex Serif', Georgia, serif",
                  fontSize: 13,
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold-rule)")}
              />
            )}
          </div>

          {/* Right cluster */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "0 0 auto" }}>
            {/* Live clock */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--ink)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: open ? "var(--secondary)" : "var(--muted)",
                  boxShadow: open ? "0 0 6px var(--secondary)" : "none",
                }}
              />
              <span className="mono">{clock} ET</span>
              {sidebarMode !== "mini" && (
                <span style={{ color: "var(--muted)", letterSpacing: "0.08em", fontSize: 11 }}>
                  {open ? "NYSE OPEN" : "NYSE CLOSED"}
                </span>
              )}
            </div>

            {/* Alerts chip */}
            <button
              aria-label="Alerts"
              onClick={() => navigate("/review")}
              style={{
                position: "relative",
                width: 36,
                height: 36,
                border: "1px solid var(--rule)",
                background: "transparent",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 2,
                cursor: "pointer",
              }}
            >
              <Bell size={16} />
            </button>
          </div>
        </header>

        <div>{children}</div>
      </main>
    </div>
  );
};

interface SidebarSectionProps {
  title: string;
  items: { english: string; greek: string; path: string }[];
  mode: "full" | "rail" | "mini";
  currentPath: string;
}

const SidebarSection = ({ title, items, mode, currentPath }: SidebarSectionProps) => (
  <div style={{ padding: "12px 0" }}>
    {mode === "full" && (
      <div className="kicker" style={{ padding: "8px 18px" }}>
        {title}
      </div>
    )}
    {mode !== "full" && (
      <div style={{ height: 1, background: "var(--rule)", margin: "6px 12px" }} />
    )}
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((item) => {
        const active = currentPath === item.path;
        return (
          <li key={item.path}>
            <Link
              to={item.path}
              title={mode === "full" ? undefined : `${item.english} · ${item.greek}`}
              style={{
                display: "flex",
                alignItems: mode === "full" ? "flex-start" : "center",
                justifyContent: mode === "full" ? "flex-start" : "center",
                flexDirection: "column",
                padding: mode === "full" ? "12px 18px 12px 18px" : "14px 0",
                borderLeft: mode === "full" && active ? "2px solid var(--accent)" : "2px solid transparent",
                background: active ? "rgba(212,169,74,0.04)" : "transparent",
                textDecoration: "none",
                color: "var(--ink)",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(212,169,74,0.04)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {mode === "full" ? (
                <>
                  <span className="kicker" style={{ fontSize: 11 }}>{item.english}</span>
                  <span className="greek" style={{ fontSize: 14 }}>{item.greek}</span>
                </>
              ) : (
                <span
                  className="display"
                  style={{
                    fontSize: 18,
                    fontStyle: "italic",
                    color: active ? "var(--accent)" : "var(--ink)",
                  }}
                >
                  {item.greek.charAt(0)}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  </div>
);

export default StoaLayout;
