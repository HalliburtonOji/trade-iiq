import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gauge } from "lucide-react";

type Row = { conviction: number; n: number; wins: number; r_sum: number };

const MentorConvictionScorecard = ({ mentorSlug }: { mentorSlug: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: closed } = await supabase
        .from("mentor_trades")
        .select("intent_id,pnl,r_initial,quantity,entry_price,exit_price,direction")
        .eq("mentor_slug", mentorSlug).eq("status", "closed");
      const intentIds = Array.from(new Set((closed || []).map((t: any) => t.intent_id).filter(Boolean)));
      if (!intentIds.length) { setRows([]); setLoading(false); return; }
      const { data: intents } = await supabase
        .from("mentor_intents").select("id,conviction").in("id", intentIds);
      const byIntent = new Map((intents || []).map((i: any) => [i.id, Number(i.conviction || 0)]));
      const buckets = new Map<number, Row>();
      for (const t of closed || []) {
        const c = byIntent.get(t.intent_id) || 0;
        if (!c) continue;
        const r = t.r_initial && Number(t.r_initial) > 0 && t.quantity
          ? Number(t.pnl) / (Number(t.r_initial) * Number(t.quantity))
          : 0;
        const cur = buckets.get(c) || { conviction: c, n: 0, wins: 0, r_sum: 0 };
        cur.n++;
        if (Number(t.pnl) > 0) cur.wins++;
        cur.r_sum += isFinite(r) ? r : 0;
        buckets.set(c, cur);
      }
      setRows(Array.from(buckets.values()).sort((a, b) => a.conviction - b.conviction));
      setLoading(false);
    })();
  }, [mentorSlug]);

  const totalN = useMemo(() => rows.reduce((s, r) => s + r.n, 0), [rows]);
  if (loading || totalN < 3) return null;

  return (
    <div className="rounded-2xl p-4 mt-6" style={{ background: "var(--stoa-surface)", border: "1px solid var(--stoa-rule)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Gauge size={14} style={{ color: "var(--stoa-accent)" }} />
        <div className="stoa-kicker" style={{ color: "var(--stoa-ink)" }}>CONVICTION CALIBRATION</div>
        <div className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-accent)", marginLeft: "auto" }}>Πεποίθησις</div>
      </div>
      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5].map((c) => {
          const r = rows.find((x) => x.conviction === c);
          if (!r) return (
            <div key={c} className="flex items-center gap-2" style={{ opacity: 0.4 }}>
              <span className="stoa-mono" style={{ width: 24, fontSize: 11, color: "var(--stoa-muted)" }}>{c}/5</span>
              <span style={{ fontSize: 11, color: "var(--stoa-muted)" }}>no trades yet</span>
            </div>
          );
          const wr = (r.wins / r.n) * 100;
          const avgR = r.r_sum / r.n;
          const color = wr >= 60 ? "var(--stoa-secondary)" : wr >= 40 ? "var(--stoa-accent)" : "var(--stoa-signal)";
          return (
            <div key={c} className="flex items-center gap-2">
              <span className="stoa-mono" style={{ width: 24, fontSize: 11, color: "var(--stoa-ink)" }}>{c}/5</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: "var(--stoa-bg)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, wr)}%`, background: color }} />
              </div>
              <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-ink)", width: 44, textAlign: "right" }}>{wr.toFixed(0)}%</span>
              <span className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)", width: 56, textAlign: "right" }}>{avgR >= 0 ? "+" : ""}{avgR.toFixed(2)}R</span>
              <span className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)", width: 26, textAlign: "right" }}>n{r.n}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--stoa-muted)", marginTop: 8, lineHeight: 1.5 }}>
        Higher bars = Sophos's conviction number is honest at that level. Use it as a filter when copying intents.
      </div>
    </div>
  );
};

export default MentorConvictionScorecard;
