import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { focusMentor } from "@/hooks/useMentorFocus";
import { ChevronRight, Activity, Eye, CheckCircle2, MinusCircle, BookOpen } from "lucide-react";

type Entry = { id: string; kind: string; symbol: string | null; body_text: string; created_at: string; trade_id: string | null; intent_id: string | null };

const minsAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
};

const ICONS: Record<string, React.ReactNode> = {
  open: <Activity size={11} />,
  close: <CheckCircle2 size={11} />,
  intent_published: <Eye size={11} />,
  intent_resolved: <CheckCircle2 size={11} />,
  skip: <MinusCircle size={11} />,
  letter_published: <BookOpen size={11} />,
};

const TINT: Record<string, string> = {
  open: "var(--stoa-accent)",
  close: "var(--stoa-accent)",
  intent_published: "var(--stoa-accent)",
  intent_resolved: "var(--stoa-accent)",
  skip: "var(--stoa-muted)",
  letter_published: "var(--stoa-accent)",
};

const KICKER: Record<string, string> = {
  open: "OPENED",
  close: "CLOSED",
  intent_published: "PUBLISHED",
  intent_resolved: "TRIGGERED",
  skip: "SKIPPED",
  letter_published: "LETTER",
};

export default function MentorTodayStrip() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancel = false;
    (async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("mentor_journal")
        .select("id,kind,symbol,body_text,created_at,trade_id,intent_id")
        .gte("created_at", since.toISOString())
        .in("kind", ["open", "close", "intent_published", "intent_resolved", "letter_published"])
        .order("created_at", { ascending: false })
        .limit(4);
      if (cancel) return;
      setEntries((data as any) || []);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  if (loading) return null;

  const onTap = (e: Entry) => {
    if (e.kind === "letter_published") { focusMentor("journal", null); }
    else if (e.kind === "open" || e.kind === "close") { focusMentor(e.kind === "open" ? "now" : "past", e.trade_id); }
    else { focusMentor("next", e.intent_id); }
    navigate("/mentor");
  };

  return (
    <div
      style={{
        background: "var(--stoa-shine)",
        border: "1px solid var(--stoa-rule)",
        borderRadius: 2,
        padding: 14,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 10 }}>SOPHOS TODAY</span>
          <span className="stoa-greek" style={{ color: "var(--stoa-accent)", fontSize: 11 }}>Σήμερον</span>
        </div>
        <button
          onClick={() => navigate("/mentor")}
          className="stoa-kicker"
          style={{ background: "transparent", border: "none", color: "var(--stoa-accent)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}
        >
          VISIT MENTOR <ChevronRight size={11} />
        </button>
      </div>

      {entries.length === 0 ? (
        <div style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "var(--stoa-muted)", fontStyle: "italic" }}>
          Sophos rests. No movements yet today — patience is also a position.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((e) => (
            <button
              key={e.id}
              onClick={() => onTap(e)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px",
                background: "var(--stoa-bg)",
                border: "1px solid var(--stoa-rule)",
                borderLeft: `3px solid ${TINT[e.kind] || "var(--stoa-rule)"}`,
                borderRadius: 2,
                textAlign: "left", cursor: "pointer", fontFamily: "inherit", width: "100%",
              }}
            >
              <span style={{ color: TINT[e.kind], display: "flex" }}>{ICONS[e.kind] || <Activity size={11} />}</span>
              <span className="stoa-kicker" style={{ fontSize: 9, color: TINT[e.kind], minWidth: 70 }}>
                {KICKER[e.kind] || e.kind.toUpperCase()}
              </span>
              {e.symbol && (
                <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-ink)", fontWeight: 600, minWidth: 56 }}>
                  {e.symbol}
                </span>
              )}
              <span style={{ flex: 1, fontSize: 12, color: "var(--stoa-ink)", fontFamily: "Georgia, serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.body_text}
              </span>
              <span className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>{minsAgo(e.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
