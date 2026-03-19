import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Trophy, AlertTriangle, Target, TrendingUp, TrendingDown, BarChart3, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

interface MonthlyData {
  period: string;
  totalTrades: number;
  completed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  bestSymbol: string | null;
  worstSymbol: string | null;
  byStrategy: { decision: string; total: number; wins: number; rate: number }[];
  byAsset: { type: string; total: number; wins: number; rate: number }[];
  ruleBreaks: number;
  lessonsCompleted: number;
  xpEarned: number;
  reviewsWritten: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] as const } },
};

const MonthlyReport = () => {
  const { user } = useAuth();
  const [data, setData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthStr = monthAgo.toISOString();

      const [tradesRes, reviewsRes, lessonsRes] = await Promise.all([
        supabase.from("trade_decisions").select("*").eq("user_id", user.id).gte("date", monthStr),
        supabase.from("decision_reviews").select("followed_plan").eq("user_id", user.id).gte("reviewed_date", monthStr),
        supabase.from("learning_progress").select("xp_earned").eq("user_id", user.id).eq("completed", true).gte("completed_date", monthStr),
      ]);

      const trades = tradesRes.data || [];
      const reviews = reviewsRes.data || [];
      const lessons = lessonsRes.data || [];

      const completed = trades.filter(t => t.outcome === "WIN" || t.outcome === "LOSS");
      const wins = completed.filter(t => t.outcome === "WIN");
      const losses = completed.filter(t => t.outcome === "LOSS");
      const pnls = completed.filter(t => t.pnl_percent != null).map(t => t.pnl_percent!);
      const avgPnl = pnls.length > 0 ? Math.round(pnls.reduce((s, v) => s + v, 0) / pnls.length * 10) / 10 : 0;

      // Best/worst symbol
      const bySymbol: Record<string, { w: number; t: number }> = {};
      completed.forEach(t => {
        if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { w: 0, t: 0 };
        bySymbol[t.symbol].t++;
        if (t.outcome === "WIN") bySymbol[t.symbol].w++;
      });
      const sortedSymbols = Object.entries(bySymbol).filter(([, v]) => v.t >= 2).sort((a, b) => (b[1].w / b[1].t) - (a[1].w / a[1].t));

      // By strategy
      const byDecision: Record<string, { w: number; t: number }> = {};
      completed.forEach(t => {
        if (!byDecision[t.decision]) byDecision[t.decision] = { w: 0, t: 0 };
        byDecision[t.decision].t++;
        if (t.outcome === "WIN") byDecision[t.decision].w++;
      });
      const byStrategy = Object.entries(byDecision).map(([d, v]) => ({
        decision: d, total: v.t, wins: v.w, rate: Math.round((v.w / v.t) * 100),
      })).sort((a, b) => b.rate - a.rate);

      // By asset
      const byAssetMap: Record<string, { w: number; t: number }> = {};
      completed.forEach(t => {
        if (!byAssetMap[t.asset_type]) byAssetMap[t.asset_type] = { w: 0, t: 0 };
        byAssetMap[t.asset_type].t++;
        if (t.outcome === "WIN") byAssetMap[t.asset_type].w++;
      });
      const byAsset = Object.entries(byAssetMap).map(([type, v]) => ({
        type, total: v.t, wins: v.w, rate: Math.round((v.w / v.t) * 100),
      })).sort((a, b) => b.rate - a.rate);

      const ruleBreaks = reviews.filter(r => r.followed_plan === false).length;

      setData({
        period: `${monthAgo.toLocaleDateString("en-GB", { month: "short", year: "numeric" })} — ${new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`,
        totalTrades: trades.length,
        completed: completed.length,
        wins: wins.length,
        losses: losses.length,
        winRate: completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0,
        avgPnl,
        bestSymbol: sortedSymbols[0]?.[0] || null,
        worstSymbol: sortedSymbols.length > 1 ? sortedSymbols[sortedSymbols.length - 1][0] : null,
        byStrategy,
        byAsset,
        ruleBreaks,
        lessonsCompleted: lessons.length,
        xpEarned: lessons.reduce((s, l) => s + (l.xp_earned || 0), 0),
        reviewsWritten: reviews.length,
      });
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-10 text-center">
        <FileText className="h-10 w-10 text-primary/30 mb-3" />
        <p className="text-sm font-semibold mb-1">Monthly Report</p>
        <p className="text-xs text-muted-foreground mb-4">Generate a comprehensive monthly performance summary</p>
        <Button onClick={generate} size="sm" className="gap-2">
          <BarChart3 className="h-4 w-4" /> Generate Report
        </Button>
      </GlassCard>
    );
  }

  if (loading) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Generating monthly report…</p>
      </GlassCard>
    );
  }

  if (!data) return null;

  return (
    <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="flex flex-col gap-3">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Monthly Report</h3>
          <p className="text-[10px] text-muted-foreground">{data.period}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={generate} className="text-xs">Refresh</Button>
      </motion.div>

      {/* Win rate */}
      <motion.div variants={fadeUp}>
        <GlassCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Win Rate</span>
            <span className="text-xl font-bold font-mono">{data.winRate}%</span>
          </div>
          <Progress value={data.winRate} className="h-2" />
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>{data.wins}W / {data.losses}L</span>
            <span>{data.totalTrades} total · Avg P&L: {data.avgPnl > 0 ? "+" : ""}{data.avgPnl}%</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Best & worst */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
        <GlassCard className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-verdict-buy" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Best Symbol</span>
          </div>
          <p className="text-sm font-bold font-mono text-verdict-buy">{data.bestSymbol || "—"}</p>
        </GlassCard>
        <GlassCard className="space-y-1">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-verdict-avoid" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Worst Symbol</span>
          </div>
          <p className="text-sm font-bold font-mono text-verdict-avoid">{data.worstSymbol || "—"}</p>
        </GlassCard>
      </motion.div>

      {/* Strategy ranking */}
      {data.byStrategy.length > 0 && (
        <motion.div variants={fadeUp}>
          <GlassCard>
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Strategy Ranking</h4>
            <div className="space-y-2">
              {data.byStrategy.map((s, i) => (
                <div key={s.decision} className="flex items-center gap-2">
                  <span className="text-xs font-bold w-6">{i + 1}.</span>
                  <span className="text-xs font-semibold w-12">{s.decision}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary/70" initial={{ width: 0 }} animate={{ width: `${s.rate}%` }} transition={{ duration: 0.6 }} />
                  </div>
                  <span className="text-[10px] font-mono font-bold w-10 text-right">{s.rate}%</span>
                  <span className="text-[9px] text-muted-foreground w-10">({s.total})</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Asset breakdown */}
      {data.byAsset.length > 0 && (
        <motion.div variants={fadeUp}>
          <GlassCard>
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Asset Class Performance</h4>
            <div className="grid grid-cols-3 gap-2">
              {data.byAsset.map((a) => (
                <div key={a.type} className="text-center">
                  <p className={cn("text-lg font-bold font-mono", a.rate >= 50 ? "text-verdict-buy" : "text-verdict-avoid")}>{a.rate}%</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{a.type}</p>
                  <p className="text-[9px] text-muted-foreground">{a.total} trades</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Activity */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
        <GlassCard className="text-center py-2">
          <p className="text-lg font-bold font-mono">{data.reviewsWritten}</p>
          <p className="text-[9px] text-muted-foreground">Reviews</p>
        </GlassCard>
        <GlassCard className="text-center py-2">
          <p className="text-lg font-bold font-mono text-verdict-avoid">{data.ruleBreaks}</p>
          <p className="text-[9px] text-muted-foreground">Rule Breaks</p>
        </GlassCard>
        <GlassCard className="text-center py-2">
          <p className="text-lg font-bold font-mono">{data.lessonsCompleted}</p>
          <p className="text-[9px] text-muted-foreground">Lessons</p>
        </GlassCard>
        <GlassCard className="text-center py-2">
          <p className="text-lg font-bold font-mono text-primary">{data.xpEarned}</p>
          <p className="text-[9px] text-muted-foreground">XP</p>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default MonthlyReport;
