import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { focusMentor } from "@/hooks/useMentorFocus";
import { ChevronRight, Activity, Eye, MinusCircle } from "lucide-react";

type Props = { symbol?: string; assetType?: string; compact?: boolean };

type State = {
  openTrade?: any;
  pendingIntent?: any;
  recentSkip?: { reason: string; minsAgo: number };
  loading: boolean;
};

const minsAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export default function MentorSymbolStrip({ symbol, assetType, compact }: Props) {
  const navigate = useNavigate();
  const [s, setS] = useState<State>({ loading: true });

  useEffect(() => {
    if (!symbol) { setS({ loading: false }); return; }
    let cancel = false;
    (async () => {
      setS({ loading: true });
      const sinceIso = new Date(Date.now() - 24 * 3600_000).toISOString();
      const [t, i, j] = await Promise.all([
        supabase.from("mentor_trades").select("*").eq("status", "open").ilike("symbol", symbol).limit(1).maybeSingle(),
        supabase.from("mentor_intents").select("*").eq("status", "pending").ilike("symbol", symbol).limit(1).maybeSingle(),
        supabase.from("mentor_journal").select("body_text,payload,created_at").eq("kind", "skip").ilike("symbol", symbol).gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cancel) return;
      const skip = j.data
        ? { reason: (j.data as any)?.payload?.reason || (j.data as any)?.body_text || "Skipped", minsAgo: minsAgo((j.data as any).created_at) }
        : undefined;
      setS({
        openTrade: t.data || undefined,
        pendingIntent: i.data || undefined,
        recentSkip: skip,
        loading: false,
      });
    })();
    return () => { cancel = true; };
  }, [symbol, assetType]);

  if (!symbol || s.loading) return null;
  const { openTrade, pendingIntent, recentSkip } = s;
  if (!openTrade && !pendingIntent && !recentSkip) return null;

  const goNow = () => { focusMentor("now", openTrade?.id || null); navigate("/mentor"); };
  const goNext = () => { focusMentor("next", pendingIntent?.id || null); navigate("/mentor"); };
  const goJournal = () => { focusMentor("journal", null); navigate("/mentor"); };

  const Item = ({ icon, label, kicker, onClick, tone = "ink" }: { icon: React.ReactNode; label: string; kicker: string; onClick: () => void; tone?: "ink" | "accent" | "muted" }) => (
    <button
      type="button"
      onClick={onClick}
      className="text-left transition-all hover:opacity-90"
      style={{
        flex: compact ? "0 0 auto" : "1 1 200px",
        minWidth: 0,
        padding: "10px 12px",
        background: "var(--stoa-bg)",
        border: "1px solid var(--stoa-rule)",
        borderLeft: `3px solid ${tone === "accent" ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
        borderRadius: 2,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span style={{ color: tone === "accent" ? "var(--stoa-accent)" : "var(--stoa-muted)" }}>{icon}</span>
        <span className="stoa-kicker" style={{ fontSize: 10, color: tone === "accent" ? "var(--stoa-accent)" : "var(--stoa-muted)" }}>{kicker}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--stoa-ink)", lineHeight: 1.4, fontFamily: "Georgia, serif" }}>{label}</div>
    </button>
  );

  return (
    <div
      style={{
        background: "var(--stoa-shine)",
        border: "1px solid var(--stoa-rule)",
        borderRadius: 2,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 10 }}>
          ΣΟΦΟΣ ON {symbol.toUpperCase()}
        </span>
        <button
          onClick={() => navigate("/mentor")}
          className="stoa-kicker"
          style={{ background: "transparent", border: "none", color: "var(--stoa-accent)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}
        >
          OPEN MENTOR <ChevronRight size={11} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: compact ? "nowrap" : "wrap", overflowX: compact ? "auto" : "visible" }}>
        {openTrade && (
          <Item
            tone="accent"
            icon={<Activity size={11} />}
            kicker={`OPEN ${openTrade.direction?.toUpperCase()}`}
            label={`Entered @ ${Number(openTrade.entry_price).toFixed(2)} · ${minsAgo(openTrade.opened_at)}m ago`}
            onClick={goNow}
          />
        )}
        {pendingIntent && (
          <Item
            tone="accent"
            icon={<Eye size={11} />}
            kicker={`WATCHING · CONV ${pendingIntent.conviction ?? "?"}/5`}
            label={pendingIntent.trigger_condition_text || `${pendingIntent.direction} trigger pending`}
            onClick={goNext}
          />
        )}
        {recentSkip && !openTrade && !pendingIntent && (
          <Item
            tone="muted"
            icon={<MinusCircle size={11} />}
            kicker={`SKIPPED · ${recentSkip.minsAgo}m AGO`}
            label={recentSkip.reason}
            onClick={goJournal}
          />
        )}
      </div>
    </div>
  );
}
