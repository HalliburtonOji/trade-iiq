import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown } from "lucide-react";

type Range = "7d" | "30d" | "90d";
type Stat = {
  slug: string; name: string; greek: string; color: string;
  pnl: number; n: number; wins: number; r_avg: number; max_dd: number;
};

const PERSONA_META: Record<string, { greek: string; color: string }> = {
  sophos:  { greek: "Σοφός",   color: "#c9a86a" },
  thrasys: { greek: "Θρασύς",  color: "#c75450" },
  hesychos:{ greek: "Ἥσυχος",  color: "#5b8c8c" },
};

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
];

const MentorPersonaArena = () => {
  const [range, setRange] = useState<Range>("30d");
  const [rows, setRows] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const days = RANGES.find((r) => r.key === range)!.days;
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const [{ data: profiles }, { data: closed }] = await Promise.all([
        supabase.from("mentor_profile").select("slug,display_name"),
        supabase.from("mentor_trades")
          .select("mentor_slug,pnl,r_initial,quantity,closed_at")
          .eq("status", "closed").gte("closed_at", since),
      ]);
      const byPersona = new Map<string, any[]>();
      for (const t of closed || []) {
        const arr = byPersona.get(t.mentor_slug) || [];
        arr.push(t); byPersona.set(t.mentor_slug, arr);
      }
      const stats: Stat[] = (profiles || []).map((p: any) => {
        const trades = (byPersona.get(p.slug) || []).sort((a, b) =>
          new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());
        let pnl = 0, wins = 0, rSum = 0, peak = 0, maxDd = 0, run = 0;
        for (const t of trades) {
          const p_ = Number(t.pnl || 0);
          pnl += p_;
          if (p_ > 0) wins++;
          if (t.r_initial && t.quantity) {
            rSum += p_ / (Number(t.r_initial) * Number(t.quantity));
          }
          run += p_;
          peak = Math.max(peak, run);
          maxDd = Math.min(maxDd, run - peak);
        }
        const meta = PERSONA_META[p.slug] || { greek: "", color: "var(--stoa-accent)" };
        return {
          slug: p.slug, name: p.display_name, greek: meta.greek, color: meta.color,
          pnl, n: trades.length, wins,
          r_avg: trades.length ? rSum / trades.length : 0,
          max_dd: maxDd,
        };
      });
      stats.sort((a, b) => b.pnl - a.pnl);
      setRows(stats); setLoading(false);
    })();
  }, [range]);

  const leader = useMemo(() => rows.find((r) => r.n > 0)?.slug, [rows]);
  const maxAbsPnl = useMemo(() => Math.max(1, ...rows.map((r) => Math.abs(r.pnl))), [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: "var(--stoa-surface)", border: "1px solid var(--stoa-rule)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} style={{ color: "var(--stoa-accent)" }} />
          <div className="stoa-kicker" style={{ color: "var(--stoa-ink)" }}>PERSONA ARENA</div>
          <div className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-accent)", marginLeft: "auto" }}>Ἀγών</div>
        </div>
        <div className="flex gap-1 mb-4">
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <button key={r.key} onClick={() => setRange(r.key)}
                className="rounded-md px-3 py-1 stoa-mono"
                style={{
                  fontSize: 11, fontWeight: 600,
                  background: active ? "var(--stoa-accent)" : "var(--stoa-bg)",
                  color: active ? "var(--stoa-bg)" : "var(--stoa-ink)",
                  border: `1px solid ${active ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
                }}>
                {r.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ color: "var(--stoa-muted)", fontSize: 13, padding: 12 }}>Tallying…</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const wr = r.n ? (r.wins / r.n) * 100 : 0;
              const isLeader = r.slug === leader && r.n > 0;
              const barWidth = (Math.abs(r.pnl) / maxAbsPnl) * 100;
              const positive = r.pnl >= 0;
              return (
                <div key={r.slug} className="rounded-lg p-3" style={{
                  background: "var(--stoa-bg)",
                  border: `1px solid ${isLeader ? r.color : "var(--stoa-rule)"}`,
                }}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {isLeader && <Crown size={12} style={{ color: r.color }} />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--stoa-ink)" }}>{r.name}</span>
                    <span className="stoa-greek" style={{ fontSize: 11, color: r.color }}>{r.greek}</span>
                    <span className="stoa-mono" style={{ fontSize: 11, color: positive ? "var(--stoa-secondary)" : "var(--stoa-signal)", marginLeft: "auto", fontWeight: 600 }}>
                      {positive ? "+" : ""}£{r.pnl.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full mb-2" style={{ background: "var(--stoa-surface)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${barWidth}%`,
                      background: positive ? "var(--stoa-secondary)" : "var(--stoa-signal)",
                    }} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>
                    <span>n {r.n}</span>
                    <span>WR {wr.toFixed(0)}%</span>
                    <span>avg {r.r_avg >= 0 ? "+" : ""}{r.r_avg.toFixed(2)}R</span>
                    <span>maxDD £{r.max_dd.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
            {rows.every((r) => r.n === 0) && (
              <div style={{ color: "var(--stoa-muted)", fontSize: 12, padding: 8 }}>
                No closed trades yet in this window. Three personas, all watching.
              </div>
            )}
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--stoa-muted)", marginTop: 12, lineHeight: 1.5 }}>
          Choose your voice with evidence — then follow or mirror the persona whose edge matches your taste.
        </div>
      </div>
    </div>
  );
};

export default MentorPersonaArena;
