import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import GlassCard from "@/components/GlassCard";
import ChartInsight from "@/components/charts/ChartInsight";
import TimeRangeFilter, { type TimeRange } from "@/components/charts/TimeRangeFilter";
import TradeDetailSheet from "@/components/charts/TradeDetailSheet";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  type Trade, type Review,
  CHART_COLORS, PIE_COLORS,
  filterByTimeRange, getCompleted, fmtDate,
  generateWinRateInsight, generatePnlInsight, generateConfidenceInsight,
  generateAssetInsight, generateEmotionInsight,
} from "@/components/charts/chartUtils";

interface PerformanceChartsProps {
  trades: Trade[];
  reviews: Review[];
}

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
          {p.name.includes("Rate") || p.name.includes("P&L") || p.name.includes("pnl") ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{children}</h3>
);

const PerformanceCharts = ({ trades, reviews }: PerformanceChartsProps) => {
  const [range, setRange] = useState<TimeRange>("ALL");
  const [drillTrades, setDrillTrades] = useState<Trade[]>([]);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillOpen, setDrillOpen] = useState(false);

  const filtered = useMemo(() => filterByTimeRange(trades, range), [trades, range]);
  const completed = useMemo(() => getCompleted(filtered), [filtered]);

  const openDrill = useCallback((trades: Trade[], title: string) => {
    setDrillTrades(trades);
    setDrillTitle(title);
    setDrillOpen(true);
  }, []);

  // === WIN RATE TREND ===
  const winRateData = useMemo(() => {
    if (completed.length < 2) return [];
    let wins = 0;
    return completed.map((t, i) => {
      if (t.outcome === "WIN") wins++;
      return { name: fmtDate(new Date(t.date)), rate: Math.round((wins / (i + 1)) * 100), trade: i + 1 };
    });
  }, [completed]);

  // === CUMULATIVE P&L ===
  const pnlData = useMemo(() => {
    const withPnl = completed.filter(t => t.pnl_percent != null);
    if (withPnl.length < 2) return [];
    let cumPnl = 0;
    return withPnl.map((t) => {
      cumPnl += t.pnl_percent || 0;
      return { name: fmtDate(new Date(t.date)), pnl: Math.round(cumPnl * 10) / 10 };
    });
  }, [completed]);

  // === CONFIDENCE CALIBRATION ===
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
      level: c,
      "Win Rate": groups[c] ? Math.round((groups[c].wins / groups[c].total) * 100) : 0,
      count: groups[c]?.total || 0,
    }));
  }, [completed]);

  // === ASSET PIE ===
  const assetData = useMemo(() => {
    const counts: Record<string, number> = {};
    completed.forEach(t => { counts[t.asset_type] = (counts[t.asset_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [completed]);

  // === EMOTION PIE ===
  const emotionData = useMemo(() => {
    const tradeIds = new Set(filtered.map(t => t.id));
    const relevant = reviews.filter(r => tradeIds.has(r.trade_decision_id));
    const counts: Record<string, number> = {};
    relevant.forEach(r => { if (r.emotion) counts[r.emotion] = (counts[r.emotion] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reviews, filtered]);

  // === DRAWDOWN ===
  const drawdownData = useMemo(() => {
    const withPnl = completed.filter(t => t.pnl_percent != null);
    if (withPnl.length < 3) return [];
    let peak = 0, cum = 0;
    return withPnl.map(t => {
      cum += t.pnl_percent || 0;
      if (cum > peak) peak = cum;
      const dd = peak > 0 ? Math.round(((cum - peak) / peak) * 100 * 10) / 10 : 0;
      return { name: fmtDate(new Date(t.date)), drawdown: Math.min(dd, 0) };
    });
  }, [completed]);

  // === LOSS STREAK ===
  const lossStreakData = useMemo(() => {
    if (completed.length < 5) return [];
    let streak = 0, maxStreak = 0;
    const points: { name: string; streak: number }[] = [];
    completed.forEach(t => {
      if (t.outcome === "LOSS") { streak++; if (streak > maxStreak) maxStreak = streak; }
      else streak = 0;
      points.push({ name: fmtDate(new Date(t.date)), streak });
    });
    return points;
  }, [completed]);

  // === P&L BY WEEKDAY ===
  const weekdayData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const groups: Record<number, { pnl: number; count: number }> = {};
    completed.forEach(t => {
      if (t.pnl_percent == null) return;
      const d = new Date(t.date).getDay();
      if (!groups[d]) groups[d] = { pnl: 0, count: 0 };
      groups[d].pnl += t.pnl_percent;
      groups[d].count++;
    });
    return [1, 2, 3, 4, 5, 6, 0].map(d => ({
      name: days[d],
      "Avg P&L": groups[d] ? Math.round((groups[d].pnl / groups[d].count) * 10) / 10 : 0,
      count: groups[d]?.count || 0,
    })).filter(d => d.count > 0);
  }, [completed]);

  // === STRATEGY PERFORMANCE ===
  const strategyData = useMemo(() => {
    const groups: Record<string, { wins: number; total: number; pnl: number }> = {};
    completed.forEach(t => {
      if (!groups[t.decision]) groups[t.decision] = { wins: 0, total: 0, pnl: 0 };
      groups[t.decision].total++;
      if (t.outcome === "WIN") groups[t.decision].wins++;
      groups[t.decision].pnl += t.pnl_percent || 0;
    });
    return Object.entries(groups).map(([name, v]) => ({
      name,
      "Win Rate": Math.round((v.wins / v.total) * 100),
      "Avg P&L": v.total > 0 ? Math.round((v.pnl / v.total) * 10) / 10 : 0,
      count: v.total,
    }));
  }, [completed]);

  // === AVG GAIN VS AVG LOSS ===
  const gainLossData = useMemo(() => {
    const gains = completed.filter(t => t.pnl_percent != null && t.pnl_percent > 0).map(t => t.pnl_percent!);
    const losses = completed.filter(t => t.pnl_percent != null && t.pnl_percent < 0).map(t => t.pnl_percent!);
    if (gains.length === 0 && losses.length === 0) return null;
    const avgGain = gains.length > 0 ? Math.round(gains.reduce((s, v) => s + v, 0) / gains.length * 10) / 10 : 0;
    const avgLoss = losses.length > 0 ? Math.round(Math.abs(losses.reduce((s, v) => s + v, 0) / losses.length) * 10) / 10 : 0;
    return { avgGain, avgLoss, profitFactor: avgLoss > 0 ? Math.round((avgGain / avgLoss) * 10) / 10 : avgGain > 0 ? Infinity : 0 };
  }, [completed]);

  // === CONFIDENCE VS P&L SCATTER ===
  const scatterData = useMemo(() => {
    return completed
      .filter(t => t.confidence != null && t.pnl_percent != null)
      .map(t => ({ confidence: t.confidence!, pnl: t.pnl_percent!, outcome: t.outcome, symbol: t.symbol || "—" }));
  }, [completed]);

  // === RULE ADHERENCE (from reviews) ===
  const ruleAdherenceData = useMemo(() => {
    const tradeIds = new Set(filtered.map(t => t.id));
    const relevant = reviews.filter(r => tradeIds.has(r.trade_decision_id) && r.followed_plan != null);
    if (relevant.length < 3) return [];
    let followed = 0;
    return relevant.map((r, i) => {
      if (r.followed_plan) followed++;
      return { name: `#${i + 1}`, rate: Math.round((followed / (i + 1)) * 100) };
    });
  }, [reviews, filtered]);

  // === INSIGHTS ===
  const winRateInsight = useMemo(() => generateWinRateInsight(winRateData), [winRateData]);
  const pnlInsight = useMemo(() => generatePnlInsight(completed), [completed]);
  const confInsight = useMemo(() => generateConfidenceInsight(
    calibrationData.map(c => ({ level: c.level, rate: c["Win Rate"], count: c.count }))
  ), [calibrationData]);
  const assetInsight = useMemo(() => generateAssetInsight(completed), [completed]);
  const emotionInsight = useMemo(() => generateEmotionInsight(reviews, trades), [reviews, trades]);

  // === CSV EXPORT ===
  const exportCSV = useCallback(() => {
    const headers = "Date,Symbol,Type,Decision,Outcome,Confidence,P&L%";
    const rows = completed.map(t =>
      `${new Date(t.date).toLocaleDateString()},${t.symbol || ""},${t.asset_type},${t.decision},${t.outcome},${t.confidence || ""},${t.pnl_percent || ""}`
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradeiq-charts-${range}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [completed, range]);

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
      {/* Controls */}
      <div className="flex items-center justify-between">
        <TimeRangeFilter value={range} onChange={setRange} />
        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={exportCSV}>
          <Download className="h-3 w-3" /> CSV
        </Button>
      </div>

      {/* Win Rate Trend */}
      {winRateData.length > 0 && (
        <motion.div variants={fadeUp}>
          <SectionTitle>Win Rate Over Time</SectionTitle>
          <ChartInsight text={winRateInsight} />
          <GlassCard className="p-3 cursor-pointer" onClick={() => openDrill(completed, "All Completed Trades")}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={winRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={50} stroke="hsl(220, 15%, 30%)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="rate" name="Win Rate" stroke={CHART_COLORS.buy} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Cumulative P&L */}
      {pnlData.length > 0 && (
        <motion.div variants={fadeUp}>
          <SectionTitle>Cumulative P&L</SectionTitle>
          <ChartInsight text={pnlInsight} />
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
                <ReferenceLine y={0} stroke="hsl(220, 15%, 30%)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="pnl" name="Cumulative P&L" stroke={CHART_COLORS.primary} fill="url(#pnlGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Drawdown */}
      {drawdownData.length > 0 && (
        <motion.div variants={fadeUp}>
          <SectionTitle>Max Drawdown</SectionTitle>
          <ChartInsight text={
            (() => {
              const maxDD = Math.min(...drawdownData.map(d => d.drawdown));
              return maxDD < 0 ? `Worst drawdown: ${maxDD}% — know your pain threshold.` : "No drawdown recorded — great discipline.";
            })()
          } />
          <GlassCard className="p-3">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.avoid} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.avoid} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="drawdown" name="Drawdown" stroke={CHART_COLORS.avoid} fill="url(#ddGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Loss Streak */}
      {lossStreakData.length > 0 && (
        <motion.div variants={fadeUp}>
          <SectionTitle>Loss Streak</SectionTitle>
          <ChartInsight text={
            (() => {
              const max = Math.max(...lossStreakData.map(d => d.streak));
              return max >= 3 ? `Max consecutive losses: ${max} — set a "3 losses = stop" rule.` : `Max consecutive losses: ${max} — solid risk control.`;
            })()
          } />
          <GlassCard className="p-3">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={lossStreakData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="streak" name="Loss Streak" fill={CHART_COLORS.avoid} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Confidence Calibration */}
      <motion.div variants={fadeUp}>
        <SectionTitle>Confidence vs Win Rate</SectionTitle>
        <ChartInsight text={confInsight} />
        <GlassCard className="p-3">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={calibrationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Win Rate" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]}
                onClick={(data) => {
                  const level = data?.level;
                  if (level) openDrill(completed.filter(t => (t.confidence || 3) === level), `Confidence ${level}/5 Trades`);
                }}
                className="cursor-pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>

      {/* Strategy Performance */}
      {strategyData.length > 0 && (
        <motion.div variants={fadeUp}>
          <SectionTitle>Strategy Performance</SectionTitle>
          <GlassCard className="p-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={strategyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Win Rate" fill={CHART_COLORS.buy} radius={[4, 4, 0, 0]}
                  onClick={(data) => openDrill(completed.filter(t => t.decision === data?.name), `${data?.name} Trades`)}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Avg Gain vs Avg Loss */}
      {gainLossData && (
        <motion.div variants={fadeUp}>
          <SectionTitle>Avg Gain vs Avg Loss</SectionTitle>
          <ChartInsight text={
            gainLossData.profitFactor === Infinity
              ? "No losses recorded — you're on fire (or haven't closed losers yet)."
              : gainLossData.profitFactor >= 1.5
                ? `Profit factor ${gainLossData.profitFactor}x — your winners outsize your losers.`
                : gainLossData.profitFactor >= 1
                  ? `Profit factor ${gainLossData.profitFactor}x — barely edge-positive. Cut losses faster.`
                  : `Profit factor ${gainLossData.profitFactor}x — losses outsize gains. Review position sizing.`
          } />
          <GlassCard className="p-3">
            <div className="flex items-end gap-4 justify-center h-[120px]">
              <div className="flex flex-col items-center gap-1">
                <div className="bg-verdict-buy/20 border border-verdict-buy/30 rounded-lg w-16 flex items-end justify-center"
                  style={{ height: `${Math.min(gainLossData.avgGain * 8, 100)}px` }}>
                  <span className="text-xs font-mono font-bold text-verdict-buy pb-1">+{gainLossData.avgGain}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Avg Gain</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="bg-verdict-avoid/20 border border-verdict-avoid/30 rounded-lg w-16 flex items-end justify-center"
                  style={{ height: `${Math.min(gainLossData.avgLoss * 8, 100)}px` }}>
                  <span className="text-xs font-mono font-bold text-verdict-avoid pb-1">-{gainLossData.avgLoss}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Avg Loss</span>
              </div>
              <div className="flex flex-col items-center gap-1 self-center">
                <span className="text-lg font-bold font-mono text-primary">
                  {gainLossData.profitFactor === Infinity ? "∞" : `${gainLossData.profitFactor}x`}
                </span>
                <span className="text-[10px] text-muted-foreground">Profit Factor</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* P&L by Weekday */}
      {weekdayData.length > 0 && (
        <motion.div variants={fadeUp}>
          <SectionTitle>P&L by Weekday</SectionTitle>
          <GlassCard className="p-3">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(220, 15%, 30%)" />
                <Bar dataKey="Avg P&L" radius={[4, 4, 0, 0]}>
                  {weekdayData.map((entry, i) => (
                    <Cell key={i} fill={entry["Avg P&L"] >= 0 ? CHART_COLORS.buy : CHART_COLORS.avoid} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Confidence vs P&L Scatter */}
      {scatterData.length >= 3 && (
        <motion.div variants={fadeUp}>
          <SectionTitle>Confidence vs P&L Scatter</SectionTitle>
          <GlassCard className="p-3">
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis type="number" dataKey="confidence" name="Confidence" domain={[0, 6]} tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <YAxis type="number" dataKey="pnl" name="P&L %" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(220, 15%, 30%)" strokeDasharray="4 4" />
                <Scatter data={scatterData} fill={CHART_COLORS.primary}>
                  {scatterData.map((entry, i) => (
                    <Cell key={i} fill={entry.outcome === "WIN" ? CHART_COLORS.buy : CHART_COLORS.avoid} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Rule Adherence Trend */}
      {ruleAdherenceData.length > 0 && (
        <motion.div variants={fadeUp}>
          <SectionTitle>Plan Adherence Trend</SectionTitle>
          <GlassCard className="p-3">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={ruleAdherenceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(220, 15%, 50%)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="rate" name="Adherence Rate" stroke={CHART_COLORS.accent} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* Asset + Emotion Pies */}
      <div className="grid grid-cols-2 gap-3">
        {assetData.length > 0 && (
          <motion.div variants={fadeUp}>
            <SectionTitle>By Asset</SectionTitle>
            <ChartInsight text={assetInsight} />
            <GlassCard className="p-3 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={assetData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={3}
                    onClick={(_, i) => openDrill(completed.filter(t => t.asset_type === assetData[i].name), `${assetData[i].name} Trades`)}
                    className="cursor-pointer"
                  >
                    {assetData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
            <SectionTitle>Emotions</SectionTitle>
            <ChartInsight text={emotionInsight} />
            <GlassCard className="p-3 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={emotionData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={3}>
                    {emotionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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

      {/* Drill-down sheet */}
      <TradeDetailSheet open={drillOpen} onOpenChange={setDrillOpen} trades={drillTrades} title={drillTitle} />
    </div>
  );
};

export default PerformanceCharts;
