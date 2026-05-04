import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, X } from "lucide-react";

type MissedTrade = {
  id: string;
  symbol: string;
  direction: string;
  pnl: number | null;
  pnl_percent: number | null;
  closed_at: string | null;
  opened_at: string;
  thesis: string | null;
};

type Props = {
  mentorSlug?: string;
  onReflect: (trade: MissedTrade) => void;
};

/**
 * Surfaces winning Sophos trades the user did NOT copy or mirror —
 * gives them a "Why didn't you take this?" prompt + dismiss option.
 *
 * "Missed" = closed mentor_trade with positive PnL where there is
 * no mentor_copies row from this user pointing at it.
 */
const MentorMissedWinners = ({ mentorSlug = "sophos", onReflect }: Props) => {
  const { user } = useAuth();
  const [missed, setMissed] = useState<MissedTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const sinceIso = new Date(Date.now() - 14 * 86400_000).toISOString();

      // Recent winning closed mentor trades
      const { data: wins } = await supabase
        .from("mentor_trades")
        .select("id, symbol, direction, pnl, pnl_percent, closed_at, opened_at, thesis")
        .eq("mentor_slug", mentorSlug)
        .eq("status", "closed")
        .gt("pnl", 0)
        .gte("closed_at", sinceIso)
        .order("closed_at", { ascending: false })
        .limit(10);
      const winList = (wins || []) as MissedTrade[];
      if (winList.length === 0) { setMissed([]); setLoading(false); return; }

      // Trades the user already copied
      const { data: copies } = await supabase
        .from("mentor_copies")
        .select("source_id")
        .eq("user_id", user.id).eq("source_kind", "trade")
        .in("source_id", winList.map((t) => t.id));
      const copiedIds = new Set((copies || []).map((c) => c.source_id));

      // Reflections (already prompted) — exclude dismissed AND already-reflected
      const { data: refls } = await supabase
        .from("mentor_missed_reflections")
        .select("trade_id, reflected_at, dismissed_at")
        .eq("user_id", user.id)
        .in("trade_id", winList.map((t) => t.id));
      const handled = new Set(
        (refls || [])
          .filter((r) => r.reflected_at || r.dismissed_at)
          .map((r) => r.trade_id),
      );

      setMissed(winList.filter((t) => !copiedIds.has(t.id) && !handled.has(t.id)));
      setLoading(false);
    })();
  }, [user, mentorSlug]);

  const dismiss = async (t: MissedTrade) => {
    if (!user) return;
    await supabase.from("mentor_missed_reflections").upsert({
      user_id: user.id,
      trade_id: t.id,
      symbol: t.symbol,
      mentor_slug: mentorSlug,
      pnl_at_reflection: t.pnl,
      dismissed_at: new Date().toISOString(),
    }, { onConflict: "user_id,trade_id" });
    setMissed((prev) => prev.filter((x) => x.id !== t.id));
  };

  if (loading || !user || missed.length === 0) return null;

  const totalMissedPnl = missed.reduce((s, t) => s + Number(t.pnl || 0), 0);

  return (
    <div className="rounded-2xl p-4 mb-6" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-accent)" }}>
      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
        <div>
          <div className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>SOPHOS WON · YOU DIDN'T</div>
          <div className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-accent)", opacity: 0.75, marginTop: 2 }}>
            Παράλειψις · {missed.length} missed winner{missed.length === 1 ? "" : "s"} in 14d
          </div>
        </div>
        <div
          className="stoa-mono rounded-lg px-3 py-1.5"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#22c55e",
            background: "color-mix(in oklab, #22c55e 10%, transparent)",
            border: "1px solid color-mix(in oklab, #22c55e 30%, transparent)",
          }}
        >
          +£{totalMissedPnl.toFixed(0)} on the table
        </div>
      </div>

      <div className="space-y-2">
        {missed.slice(0, 4).map((t) => {
          const closed = t.closed_at ? new Date(t.closed_at) : null;
          return (
            <div
              key={t.id}
              className="rounded-xl p-3 flex items-center gap-3 flex-wrap transition-colors hover:bg-[color-mix(in_oklab,var(--stoa-accent)_4%,var(--stoa-bg))]"
              style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)" }}
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in oklab, #22c55e 14%, transparent)", color: "#22c55e" }}
              >
                <TrendingUp size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="stoa-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--stoa-ink)" }}>{t.symbol}</span>
                  <span
                    className="stoa-kicker"
                    style={{
                      fontSize: 9,
                      color: t.direction === "long" ? "#22c55e" : "#ef4444",
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: `color-mix(in oklab, ${t.direction === "long" ? "#22c55e" : "#ef4444"} 10%, transparent)`,
                    }}
                  >
                    {t.direction.toUpperCase()}
                  </span>
                  <span className="stoa-mono" style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>
                    +£{Number(t.pnl).toFixed(0)}
                  </span>
                  {t.pnl_percent !== null && (
                    <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>
                      · {Number(t.pnl_percent).toFixed(1)}%
                    </span>
                  )}
                </div>
                {closed && (
                  <div className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)", marginTop: 2 }}>
                    Closed {closed.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onReflect(t)}
                  className="rounded-lg px-3 py-1.5 text-sm transition-transform hover:scale-[1.02]"
                  style={{ background: "var(--stoa-accent)", color: "var(--stoa-bg)", border: "none", fontWeight: 600 }}
                >
                  Reflect · +5 XP
                </button>
                <button
                  onClick={() => dismiss(t)}
                  aria-label="Dismiss"
                  className="rounded-lg p-1.5 transition-colors hover:bg-[var(--stoa-shine)]"
                  style={{ background: "transparent", border: "1px solid var(--stoa-rule)", color: "var(--stoa-muted)" }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {missed.length > 4 && (
        <div className="stoa-mono mt-2" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>
          +{missed.length - 4} more · honest reflection compounds.
        </div>
      )}
    </div>
  );
};

export default MentorMissedWinners;
