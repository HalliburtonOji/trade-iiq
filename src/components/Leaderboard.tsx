import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Flame } from "lucide-react";

type Window = "7d" | "30d" | "alltime";

interface Row {
  user_id: string;
  display_name: string;
  xp_window: number;
  xp_total: number;
  streak_count: number;
  level: string;
  active_days: number;
}

const WINDOWS: { id: Window; kicker: string; greek: string; view: string }[] = [
  { id: "7d", kicker: "7 DAYS", greek: "Ἑβδομάς", view: "leaderboard_7d" },
  { id: "30d", kicker: "30 DAYS", greek: "Μήν", view: "leaderboard_30d" },
  { id: "alltime", kicker: "ALL TIME", greek: "Αἰών", view: "leaderboard_alltime" },
];

const Leaderboard = () => {
  const { user } = useAuth();
  const [windowId, setWindowId] = useState<Window>("30d");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const activeView = useMemo(
    () => WINDOWS.find((w) => w.id === windowId)?.view ?? "leaderboard_30d",
    [windowId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from(activeView)
        .select("user_id, display_name, xp_window, xp_total, streak_count, level, active_days")
        .order("xp_window", { ascending: false })
        .limit(50);
      if (!cancelled) {
        setRows((data as Row[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeView]);

  // If current user is outside top 50, fetch their rank separately.
  const [selfRow, setSelfRow] = useState<{ row: Row; rank: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSelfRow(null);
      return;
    }
    if (rows.some((r) => r.user_id === user.id)) {
      setSelfRow(null);
      return;
    }
    (async () => {
      const { data: me } = await (supabase as any)
        .from(activeView)
        .select("user_id, display_name, xp_window, xp_total, streak_count, level, active_days")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !me) return;
      // Rank = 1 + count of rows with strictly greater xp_window
      const { count } = await (supabase as any)
        .from(activeView)
        .select("user_id", { count: "exact", head: true })
        .gt("xp_window", me.xp_window);
      if (!cancelled) {
        setSelfRow({ row: me as Row, rank: (count ?? 0) + 1 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, rows, activeView]);

  const medals = ["🥇", "🥈", "🥉"];

  const renderRow = (e: Row, rank: number, isYou: boolean) => (
    <div
      key={`${e.user_id}-${rank}`}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto auto auto",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        background: isYou ? "var(--stoa-shine)" : "transparent",
        borderLeft: isYou ? "2px solid var(--stoa-accent)" : "2px solid transparent",
        borderBottom: "1px solid var(--stoa-rule)",
      }}
    >
      <span
        className="stoa-kicker"
        style={{ color: "var(--stoa-muted)", textAlign: "center" }}
      >
        {rank <= 3 ? medals[rank - 1] : rank}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 14,
            color: "var(--stoa-ink)",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            borderBottom: isYou ? "1px solid var(--stoa-accent)" : "none",
            display: "inline",
          }}
        >
          {e.display_name}
          {isYou ? " (You)" : ""}
        </div>
        <div
          className="stoa-kicker"
          style={{ color: "var(--stoa-muted)", fontSize: 10, marginTop: 2 }}
        >
          {e.level} · {e.active_days}d active
        </div>
      </div>
      <span
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 12,
          color: "var(--stoa-muted)",
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Flame size={12} style={{ color: "var(--stoa-accent)" }} />
        {e.streak_count}
      </span>
      <span
        style={{
          fontFamily: "Georgia, serif",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          fontSize: 14,
          color: "var(--stoa-accent)",
          minWidth: 60,
          textAlign: "right",
        }}
      >
        {e.xp_window.toLocaleString()}
      </span>
      <span
        className="stoa-kicker"
        style={{ color: "var(--stoa-muted)", fontSize: 9 }}
      >
        XP
      </span>
    </div>
  );

  return (
    <div
      style={{
        background: "var(--stoa-bg)",
        border: "1px solid var(--stoa-rule)",
        borderRadius: 2,
      }}
    >
      <div
        style={{
          padding: "14px 14px 8px",
          borderBottom: "1px solid var(--stoa-rule)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <span className="stoa-kicker" style={{ color: "var(--stoa-ink)" }}>
            LEADERBOARD
          </span>
          <span
            className="stoa-greek"
            style={{
              color: "var(--stoa-accent)",
              opacity: 0.65,
              marginLeft: 8,
              fontSize: 12,
            }}
          >
            · Ἀριστεία
          </span>
        </div>
        <div
          style={{
            display: "inline-flex",
            border: "1px solid var(--stoa-rule)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {WINDOWS.map((w) => {
            const active = w.id === windowId;
            return (
              <button
                key={w.id}
                onClick={() => setWindowId(w.id)}
                className="stoa-kicker"
                style={{
                  padding: "5px 10px",
                  background: active ? "var(--stoa-accent)" : "transparent",
                  color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 10,
                }}
              >
                {w.kicker}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div
          className="stoa-kicker"
          style={{ color: "var(--stoa-muted)", textAlign: "center", padding: 24 }}
        >
          LOADING · ΧΡΟΝΟΣ…
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "var(--stoa-muted)",
            textAlign: "center",
            padding: 24,
            margin: 0,
          }}
        >
          No XP yet in this window.
        </p>
      )}

      {!loading &&
        rows.map((e, i) => renderRow(e, i + 1, !!user && e.user_id === user.id))}

      {!loading && selfRow && (
        <>
          <div
            className="stoa-kicker"
            style={{
              color: "var(--stoa-muted)",
              textAlign: "center",
              padding: "10px 0 4px",
              letterSpacing: "0.18em",
            }}
          >
            …
          </div>
          {renderRow(selfRow.row, selfRow.rank, true)}
        </>
      )}
    </div>
  );
};

export default Leaderboard;
