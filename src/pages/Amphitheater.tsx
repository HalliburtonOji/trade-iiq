import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaLayout from "@/layouts/StoaLayout";
import CompressedMasthead from "@/components/stoa/CompressedMasthead";
import PedimentCap from "@/components/stoa/PedimentCap";

interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  entry_price: number | null;
  exit_price: number | null;
  r_multiple: number | null;
  pnl_usd: number | null;
  setup_grade: string | null;
  opened_at: string;
}

type Period = "week" | "lastweek" | "month" | "90d";

const periodStart = (p: Period): Date => {
  const d = new Date();
  if (p === "week") d.setDate(d.getDate() - d.getDay());
  if (p === "lastweek") d.setDate(d.getDate() - d.getDay() - 7);
  if (p === "month") d.setDate(d.getDate() - 30);
  if (p === "90d") d.setDate(d.getDate() - 90);
  d.setHours(0, 0, 0, 0);
  return d;
};

const periodEnd = (p: Period): Date => {
  if (p === "lastweek") {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date();
};

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "lastweek", label: "Last week" },
  { id: "month", label: "Last month" },
  { id: "90d", label: "Last 90d" },
];

const Amphitheater = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const start = periodStart(period).toISOString();
      const end = periodEnd(period).toISOString();
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .gte("opened_at", start)
        .lte("opened_at", end)
        .order("opened_at", { ascending: false });
      setTrades((data ?? []) as Trade[]);
      setPage(1);
    })();
  }, [user, period]);

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.pnl_usd != null);
    const pnl = closed.reduce((s, t) => s + (t.pnl_usd ?? 0), 0);
    const wins = closed.filter((t) => (t.pnl_usd ?? 0) > 0);
    const losses = closed.filter((t) => (t.pnl_usd ?? 0) < 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgR = closed.length
      ? closed.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / closed.length
      : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl_usd ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl_usd ?? 0), 0) / losses.length) : 0;
    const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;

    // Max drawdown from cumulative pnl
    let peak = 0;
    let cum = 0;
    let mdd = 0;
    [...closed].reverse().forEach((t) => {
      cum += t.pnl_usd ?? 0;
      if (cum > peak) peak = cum;
      mdd = Math.min(mdd, cum - peak);
    });

    return { pnl, winRate, avgR, expectancy, mdd, count: closed.length };
  }, [trades]);

  const insights = useMemo(() => {
    const byGrade: Record<string, number> = {};
    const bySymbol: Record<string, number> = {};
    const byDow: Record<string, number> = {};
    const byGradeCount: Record<string, number> = {};
    trades.forEach((t) => {
      const g = t.setup_grade ?? "—";
      byGrade[g] = (byGrade[g] ?? 0) + (t.pnl_usd ?? 0);
      byGradeCount[g] = (byGradeCount[g] ?? 0) + 1;
      bySymbol[t.symbol] = (bySymbol[t.symbol] ?? 0) + (t.pnl_usd ?? 0);
      const dow = new Date(t.opened_at).toLocaleDateString("en-US", { weekday: "long" });
      byDow[dow] = (byDow[dow] ?? 0) + (t.pnl_usd ?? 0);
    });
    const top = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    const bot = (m: Record<string, number>) => Object.entries(m).sort((a, b) => a[1] - b[1])[0];
    return {
      bestGrade: top(byGrade),
      bestSymbol: top(bySymbol),
      bestDow: top(byDow),
      worstGrade: bot(byGrade),
      worstSymbol: bot(bySymbol),
      gradeCounts: byGradeCount,
    };
  }, [trades]);

  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(trades.length / pageSize));
  const pageRows = trades.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const headers = ["Date", "Time", "Symbol", "Side", "Entry", "Exit", "R", "PnL", "Grade"];
    const rows = trades.map((t) => [
      new Date(t.opened_at).toISOString().slice(0, 10),
      new Date(t.opened_at).toISOString().slice(11, 16),
      t.symbol,
      t.side.toUpperCase(),
      t.entry_price ?? "",
      t.exit_price ?? "",
      t.r_multiple ?? "",
      t.pnl_usd ?? "",
      t.setup_grade ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `stoa-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <StoaLayout>
      <CompressedMasthead />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 96px" }}>
        <div className="kicker" style={{ marginBottom: 24 }}>ΘΕΑΤΡΟΝ · AMPHITHEATER · The weekly review</div>

        {/* Period selector */}
        <div style={{ display: "flex", gap: 0, marginBottom: 96, borderBottom: "1px solid var(--rule)" }}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="display"
              style={{
                background: "transparent",
                border: "none",
                color: period === p.id ? "var(--ink)" : "var(--muted)",
                padding: "10px 20px",
                fontSize: 14,
                fontStyle: "italic",
                fontVariant: "small-caps",
                letterSpacing: "0.04em",
                cursor: "pointer",
                borderBottom: period === p.id ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Central stage */}
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <PedimentCap variant="rule" className="mb-6" />
          <section
            style={{
              borderTop: "1px solid var(--gold-rule)",
              borderBottom: "1px solid var(--gold-rule)",
              padding: "64px 48px",
              textAlign: "center",
            }}
          >
            <div className="kicker">SCENE · PERFORMANCE</div>
            <div
              className="display"
              style={{
                fontSize: "clamp(48px, 9vw, 96px)",
                fontWeight: 500,
                margin: "20px 0 32px",
                color: stats.pnl > 0 ? "var(--secondary)" : stats.pnl < 0 ? "var(--signal)" : "var(--ink)",
                lineHeight: 1,
                letterSpacing: "-0.01em",
              }}
            >
              {stats.pnl >= 0 ? "+" : "−"}${Math.abs(stats.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
              {[
                { k: "TRADES", v: String(stats.count) },
                { k: "WIN RATE", v: `${stats.winRate.toFixed(0)}%` },
                { k: "AVG R", v: stats.avgR.toFixed(2) },
                { k: "EXPECTANCY", v: `$${stats.expectancy.toFixed(0)}` },
                { k: "MAX DD", v: `$${stats.mdd.toFixed(0)}` },
                { k: "RULES", v: "—" },
              ].map((kpi) => (
                <div key={kpi.k}>
                  <div className="kicker">{kpi.k}</div>
                  <div className="mono" style={{ fontSize: 18, color: "var(--ink)", marginTop: 4 }}>
                    {kpi.v}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <PedimentCap variant="rule" className="mt-6" />
        </div>

        {/* Tier 1 — Repeats */}
        <section style={{ marginTop: 96 }}>
          <div className="kicker" style={{ marginBottom: 24 }}>ΑΝΑΜΝΗΣΙΣ · WHAT TO REPEAT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <InsightCard kicker="BEST SETUP GRADE" body={insights.bestGrade ? `Grade ${insights.bestGrade[0]} produced your best return.` : "Not enough data yet."} count={insights.bestGrade?.[1]} />
            <InsightCard kicker="BEST SYMBOL" body={insights.bestSymbol ? `${insights.bestSymbol[0]} contributed the most to P&L.` : "Not enough data yet."} count={insights.bestSymbol?.[1]} />
          </div>
        </section>

        {/* Tier 2 — Decisions grid */}
        <section style={{ marginTop: 80 }}>
          <div className="kicker" style={{ marginBottom: 16 }}>ΗΜΕΡΟΛΟΓΙΟ · LEDGER — every decision in {PERIODS.find((p) => p.id === period)?.label.toLowerCase()}</div>
          <div style={{ border: "1px solid var(--rule)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--rule)" }}>
                  {["DATE", "TIME", "SYMBOL", "SIDE", "R PLAN", "R ACTUAL", "GRADE"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted)", fontWeight: 500, fontSize: 11, letterSpacing: "0.12em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--muted)", fontStyle: "italic" }}>
                      No decisions in this period.
                    </td>
                  </tr>
                )}
                {pageRows.map((t) => (
                  <tr
                    key={t.id}
                    style={{ borderBottom: "1px solid var(--rule)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(212,169,74,0.04)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 12px" }}>{new Date(t.opened_at).toISOString().slice(0, 10)}</td>
                    <td style={{ padding: "10px 12px" }}>{new Date(t.opened_at).toISOString().slice(11, 16)}</td>
                    <td style={{ padding: "10px 12px", color: "var(--ink)" }}>{t.symbol}</td>
                    <td style={{ padding: "10px 12px", color: t.side === "long" ? "var(--secondary)" : "var(--signal)" }}>{t.side.toUpperCase()}</td>
                    <td style={{ padding: "10px 12px" }}>{t.r_multiple != null ? `${t.r_multiple.toFixed(1)}R` : "—"}</td>
                    <td style={{ padding: "10px 12px", color: (t.pnl_usd ?? 0) >= 0 ? "var(--secondary)" : "var(--signal)" }}>
                      {t.pnl_usd != null ? `${t.pnl_usd >= 0 ? "+" : "−"}$${Math.abs(t.pnl_usd).toFixed(0)}` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{t.setup_grade ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
              {Array.from({ length: pageCount }).map((_, i) => {
                const n = i + 1;
                const r = n.toString();
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: page === n ? "var(--accent)" : "var(--muted)",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: "4px 8px",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Tier 3 — Teachings */}
        <section style={{ marginTop: 80 }}>
          <div className="kicker" style={{ marginBottom: 24 }}>ΔΙΔΑΓΜΑΤΑ · WHAT TO CHANGE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <InsightCard kicker="WORST SETUP GRADE" body={insights.worstGrade ? `Grade ${insights.worstGrade[0]} cost you the most. Drill it before the next session.` : "Not enough data."} link="/learn" />
            <InsightCard kicker="WORST SYMBOL" body={insights.worstSymbol ? `${insights.worstSymbol[0]} hurt your P&L. Consider removing from playbook.` : "Not enough data."} link="/learn" />
          </div>
        </section>

        <div style={{ marginTop: 64, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={exportCsv} style={{ background: "transparent", border: "1px solid var(--rule)", color: "var(--ink)", padding: "8px 16px", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}>
            Export CSV
          </button>
        </div>
      </div>
    </StoaLayout>
  );
};

const InsightCard = ({ kicker, body, count, link }: { kicker: string; body: string; count?: number; link?: string }) => (
  <div style={{ border: "1px solid var(--rule)", padding: "20px 22px" }}>
    <div className="kicker">{kicker}</div>
    <p className="display" style={{ fontStyle: "italic", fontSize: 18, lineHeight: 1.45, margin: "10px 0 12px", color: "var(--ink)" }}>
      {body}
    </p>
    {count != null && (
      <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
        ${Math.abs(count).toFixed(0)} P&L impact
      </div>
    )}
    {link && (
      <a href={link} className="display" style={{ display: "inline-block", marginTop: 12, color: "var(--accent)", fontStyle: "italic", textDecoration: "none", fontSize: 14 }}>
        Start drill →
      </a>
    )}
  </div>
);

export default Amphitheater;
