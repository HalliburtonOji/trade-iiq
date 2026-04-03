import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import GlassCard from "@/components/GlassCard";

interface Trade {
  id: string; symbol: string; direction: string; entry_price: number; quantity: number;
  exit_price: number | null; pnl: number | null; pnl_percent: number | null;
  stop_loss: number | null; take_profit: number | null; opened_at: string;
  closed_at: string | null; status: string; asset_type: string; emotion?: string | null;
}

interface Props {
  trades: Trade[];
  balance: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

const PerformanceStats = ({ trades, balance }: Props) => {
  const closed = useMemo(() => trades.filter(t => t.status !== "open" && t.pnl !== null), [trades]);

  const winRate = useMemo(() => {
    if (closed.length === 0) return 0;
    return Math.round((closed.filter(t => (t.pnl || 0) > 0).length / closed.length) * 100);
  }, [closed]);

  const equityCurve = useMemo(() => {
    let running = 10000;
    return closed.map((t, i) => {
      running += t.pnl || 0;
      return { trade: i + 1, balance: Math.round(running * 100) / 100 };
    });
  }, [closed]);

  const pieData = useMemo(() => {
    const wins = closed.filter(t => (t.pnl || 0) > 0).length;
    const losses = closed.length - wins;
    return [
      { name: "Wins", value: wins },
      { name: "Losses", value: losses },
    ];
  }, [closed]);

  const assetData = useMemo(() => {
    const map: Record<string, number> = {};
    closed.forEach(t => { map[t.asset_type] = (map[t.asset_type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [closed]);

  const bestTrade = useMemo(() => closed.reduce((best, t) => (t.pnl || 0) > (best?.pnl || -Infinity) ? t : best, closed[0]), [closed]);
  const worstTrade = useMemo(() => closed.reduce((worst, t) => (t.pnl || 0) < (worst?.pnl || Infinity) ? t : worst, closed[0]), [closed]);

  const avgHoldMin = useMemo(() => {
    const holds = closed.filter(t => t.closed_at && t.opened_at).map(t =>
      (new Date(t.closed_at!).getTime() - new Date(t.opened_at).getTime()) / 60000
    );
    return holds.length ? Math.round(holds.reduce((a, b) => a + b, 0) / holds.length) : 0;
  }, [closed]);

  const totalPnl = useMemo(() => closed.reduce((sum, t) => sum + (t.pnl || 0), 0), [closed]);

  // Streak
  const streak = useMemo(() => {
    let current = 0;
    let type: "win" | "loss" | null = null;
    for (let i = closed.length - 1; i >= 0; i--) {
      const isWin = (closed[i].pnl || 0) > 0;
      if (type === null) { type = isWin ? "win" : "loss"; current = 1; }
      else if ((isWin && type === "win") || (!isWin && type === "loss")) { current++; }
      else break;
    }
    return { count: current, type };
  }, [closed]);

  if (closed.length < 2) {
    return (
      <GlassCard className="text-center py-8">
        <p className="text-sm text-muted-foreground">Complete at least 2 trades to see stats</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {/* Key metrics */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Win Rate", value: `${winRate}%`, color: winRate >= 50 ? "text-verdict-buy" : "text-verdict-avoid" },
          { label: "Total P&L", value: `${totalPnl >= 0 ? "+" : ""}£${totalPnl.toFixed(0)}`, color: totalPnl >= 0 ? "text-verdict-buy" : "text-verdict-avoid" },
          { label: "Avg Hold", value: `${avgHoldMin}m`, color: "text-foreground" },
          { label: "Streak", value: `${streak.count} ${streak.type || ""}`, color: streak.type === "win" ? "text-verdict-buy" : "text-verdict-avoid" },
        ].map((m) => (
          <GlassCard key={m.label} className="text-center p-2">
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
            <p className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Equity curve */}
      <GlassCard className="p-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Equity Curve</p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={equityCurve}>
            <XAxis dataKey="trade" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
            <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Win/Loss pie + Asset distribution */}
      <div className="grid grid-cols-2 gap-2">
        <GlassCard className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Win/Loss</p>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={4}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
        <GlassCard className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">By Asset</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={assetData}>
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Best/Worst */}
      <div className="grid grid-cols-2 gap-2">
        {bestTrade && (
          <GlassCard className="p-2 border-verdict-buy/20">
            <p className="text-[10px] text-muted-foreground">Best Trade</p>
            <p className="text-xs font-bold font-mono">{bestTrade.symbol}</p>
            <p className="text-xs font-bold text-verdict-buy font-mono">+£{(bestTrade.pnl || 0).toFixed(2)}</p>
          </GlassCard>
        )}
        {worstTrade && (
          <GlassCard className="p-2 border-verdict-avoid/20">
            <p className="text-[10px] text-muted-foreground">Worst Trade</p>
            <p className="text-xs font-bold font-mono">{worstTrade.symbol}</p>
            <p className="text-xs font-bold text-verdict-avoid font-mono">£{(worstTrade.pnl || 0).toFixed(2)}</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default PerformanceStats;
