import { useEffect, useMemo, useState } from "react";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Skip = { id: string; symbol: string | null; body_text: string; created_at: string; payload: any };

const REASON_BUCKETS: { key: string; label: string; tone: string; match: RegExp }[] = [
  { key: "vol",   label: "Awaiting volume",      tone: "var(--stoa-accent)",    match: /volume|vol\b/i },
  { key: "atr",   label: "Volatility too tight", tone: "var(--stoa-secondary)", match: /atr|tight|narrow|range-bound/i },
  { key: "mid",   label: "Mid-range, no edge",   tone: "var(--stoa-muted)",     match: /mid[- ]?range|no edge|no setup|chop/i },
  { key: "macro", label: "Macro / news risk",    tone: "var(--stoa-signal)",    match: /macro|news|fomc|cpi|earnings|fed/i },
  { key: "trend", label: "Trend unclear",        tone: "var(--stoa-muted)",     match: /trend|direction|unclear|conflict/i },
];

function bucketise(text: string): { label: string; tone: string } {
  for (const b of REASON_BUCKETS) if (b.match.test(text)) return { label: b.label, tone: b.tone };
  return { label: "Patience", tone: "var(--stoa-muted)" };
}

function ageLabel(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const MentorWatchlistRadar = () => {
  const [skips, setSkips] = useState<Skip[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    supabase
      .from("mentor_journal")
      .select("id, symbol, body_text, created_at, payload")
      .eq("kind", "skip")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setSkips((data || []) as Skip[]));

    const ch = supabase
      .channel("mentor-skips")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mentor_journal", filter: "kind=eq.skip" }, (p: any) => {
        setSkips((prev) => [p.new as Skip, ...prev].slice(0, 60));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Group by symbol — most recent reason wins
  const grouped = useMemo(() => {
    const map = new Map<string, Skip>();
    for (const s of skips) {
      const sym = s.symbol || "—";
      if (!map.has(sym)) map.set(sym, s);
    }
    return Array.from(map.values()).slice(0, 12);
  }, [skips]);

  if (!grouped.length) return null;

  return (
    <div className="rounded-xl mb-6" style={{ border: "1px solid var(--stoa-rule)", background: "var(--stoa-shine)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Eye size={13} style={{ color: "var(--stoa-accent)" }} />
          <span className="stoa-kicker" style={{ color: "var(--stoa-ink)" }}>WATCHLIST RADAR</span>
          <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>
            · {grouped.length} symbols watched · last 24h
          </span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: "var(--stoa-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--stoa-muted)" }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-1.5">
          {grouped.map((s) => {
            const reason = (s.payload?.reason as string) || s.body_text.replace(/^Skipped this cycle\s*[—-]\s*/i, "").replace(/\.$/, "");
            const bucket = bucketise(reason);
            return (
              <div key={s.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg" style={{ background: "var(--stoa-bg)" }}>
                <span className="stoa-mono shrink-0" style={{ fontSize: 12, fontWeight: 600, color: "var(--stoa-ink)", minWidth: 56 }}>
                  {s.symbol}
                </span>
                <span className="stoa-kicker shrink-0" style={{ color: bucket.tone, fontSize: 10 }}>
                  {bucket.label}
                </span>
                <span className="truncate flex-1" style={{ fontSize: 12, color: "var(--stoa-muted)", lineHeight: 1.35 }}>
                  {reason}
                </span>
                <span className="stoa-mono shrink-0" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>
                  {ageLabel(s.created_at)}
                </span>
              </div>
            );
          })}
          <p className="stoa-mono pt-2" style={{ fontSize: 10, color: "var(--stoa-muted)", fontStyle: "italic" }}>
            Sophos scans constantly. Skipping is also a decision.
          </p>
        </div>
      )}
    </div>
  );
};

export default MentorWatchlistRadar;
