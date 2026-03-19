import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import GlassCard from "@/components/GlassCard";

interface Trade {
  id: string;
  decision: string;
  outcome: string;
  confidence: number | null;
  asset_type: string;
  date: string;
  pnl_percent: number | null;
}

interface Review {
  emotion: string | null;
  trade_decision_id: string;
}

interface PerformanceChartsProps {
  trades: Trade[];
  reviews: Review[];
}

const CHART_COLORS = {
  primary: "hsl(239, 84%, 67%)",
  accent: "hsl(258, 90%, 66%)",
  buy: "hsl(142, 71%, 45%)",
  wait: "hsl(45, 93%, 47%)",
  avoid: "hsl(0, 72%, 51%)",
  muted: "hsl(220, 15%, 50%)",
};

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.accent, CHART_COLORS.buy, CHART_COLORS.wait, CHART_COLORS.avoid];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          {p.name.includes("Rate") || p.name.includes("P&L") ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

const PerformanceCharts = ({ trades, reviews }: PerformanceChartsProps) => {
  const completed = useMemo(() =>
    trades.filter(t => t.outcome === "WIN" || t.outcome === "LOSS")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [trades]
  );

  // Win Rate Trend (cumulative)
  const winRateData = useMemo(() => {
    if (completed.length < 2) return [];
    let wins = 0;
    return completed.map((t, i) => {
      if (t.outcome === "WIN") wins++;
      const rate = Math.round((wins / (i + 1)) * 100);
      const d = new Date(t.date);
      return { name: `${d.getDate()}/${d.getMonth() + 1}`, rate, trade: i + 1 };
    });
  }, [completed]);

  // Cumulative P&L
  const pnlData = useMemo(() => {
    const withPnl = completed.filter(t => t.pnl_percent != null);
    if (withPnl.length < 2) return [];
    let cumPnl = 0;
    return withPnl.map((t) => {
      cumPnl += t.pnl_percent || 0;
      const d = new Date(t.date);
      return { name: `${d.getDate()}/${d.getMonth() + 1}`, pnl: Math.round(cumPnl * 10) / 10 };
    });
  }, [completed]);

  // Confidence Calibration
  const calibrationData = useMemo(() => {
    const groups: Record<number, { wins: number; total: number }> = {};
    completed.forEach(t => {
      const c = t.confidence || 3;
      if (!groups[c]) groups[c] = { wins: 0, total: 0 };
      groups[c].total++;
      if (t.outcome === "WIN") groups[c].wins++;
    });
    return [1, 2, 3, 4, 5].map(c => ({
      name: `⚡${c}`,
      "Win Rate": groups[c] ? Math.round((groups[c].wins / groups[c].total) * 100) : 0,
      count: groups[c]?.total || 0,
    }));
  }, [completed]);

  // Asset Breakdown (pie)
  const assetData = useMemo(() => {
    const counts: Record<string, number> = {};
    completed.forEach(t => {
      counts[t.asset_type] = (counts[t.asset_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [completed]);

  // Emotion Distribution (pie)
  const emotionData = useMemo(() => {
    const counts: Record<string, number> = {};
    reviews.forEach(r => {
      if (r.emotion) counts[r.emotion] = (counts[r.emotion] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reviews]);

  if (completed.length < 2) {
    return (
      <GlassCard className="text-center py-8">
        <p className="text-sm text-muted-foreground">Need at least 2 completed trades to show charts</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Log trades and mark them as Win/Loss</p>
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Win Rate Trend */}
      {winRateData.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Win Rate Over Time</h3>
          <GlassCard className="p-3">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={winRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="rate" name="Win Rate" stroke={CHART_COLORS.buy} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Cumulative P&L */}
      {pnlData.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cumulative P&L</h3>
          <GlassCard className="p-3">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={pnlData}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pnl" name="Cumulative P&L" stroke={CHART_COLORS.primary} fill="url(#pnlGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Confidence Calibration Bar */}
      <motion.div variants={fadeUp}>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Confidence vs Win Rate</h3>
        <GlassCard className="p-3">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={calibrationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Win Rate" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>

      {/* Asset + Emotion Pies */}
      <div className="grid grid-cols-2 gap-3">
        {assetData.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Asset</h3>
            <GlassCard className="p-3 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={assetData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={3}>
                    {assetData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-1">
                {assetData.map((a, i) => (
                  <span key={a.name} className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {a.name}
                  </span>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {emotionData.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Emotions</h3>
            <GlassCard className="p-3 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={emotionData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={3}>
                    {emotionData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-1 justify-center">
                {emotionData.map((e, i) => (
                  <span key={e.name} className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {e.name}
                  </span>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PerformanceCharts;
