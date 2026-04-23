import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Brain, Flame, Target, BarChart3, AlertTriangle, Zap, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import GlassCard from "@/components/GlassCard";
import AiPatternInsights from "@/components/AiPatternInsights";
import TradingDNACard from "@/components/TradingDNACard";
import Rulebook from "@/components/Rulebook";
import WeeklyRecap from "@/components/WeeklyRecap";
import BiasDetector from "@/components/BiasDetector";
import MonthlyReport from "@/components/MonthlyReport";
import PerformanceCharts from "@/components/PerformanceCharts";
import StatCard from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TradeRow {
  id: string;
  symbol: string;
  decision: string;
  outcome: string;
  confidence: number | null;
  asset_type: string;
  time_horizon: string | null;
  date: string;
  pnl_percent: number | null;
  notes: string | null;
  thesis_why: string | null;
}

interface ReviewRow {
  emotion: string | null;
  mistake_type: string | null;
  verdict_correct: boolean | null;
  timing_correct: boolean | null;
  followed_plan: boolean | null;
  trade_decision_id: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] as const } },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

const Insights = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [lessonsCount, setLessonsCount] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [tRes, rRes, lRes, pRes] = await Promise.all([
        supabase.from("trade_decisions").select("id,symbol,decision,outcome,confidence,asset_type,time_horizon,date,pnl_percent,notes,thesis_why").eq("user_id", user.id),
        supabase.from("decision_reviews").select("emotion,mistake_type,verdict_correct,timing_correct,followed_plan,trade_decision_id").eq("user_id", user.id),
        supabase.from("learning_progress").select("lesson_id,xp_earned").eq("user_id", user.id).eq("completed", true),
        supabase.from("profiles").select("streak_count,xp_total").eq("user_id", user.id).single(),
      ]);
      if (tRes.data) setTrades(tRes.data);
      if (rRes.data) setReviews(rRes.data);
      if (lRes.data) {
        setLessonsCount(lRes.data.length);
        setTotalXp(lRes.data.reduce((s, d) => s + (d.xp_earned || 0), 0));
      }
      if (pRes.data) {
        setStreak(pRes.data.streak_count || 0);
        if (pRes.data.xp_total) setTotalXp(pRes.data.xp_total);
      }
    };
    load();
  }, [user]);

  const analysis = useMemo(() => {
    const completed = trades.filter(t => t.outcome === "WIN" || t.outcome === "LOSS");
    const wins = completed.filter(t => t.outcome === "WIN");
    const losses = completed.filter(t => t.outcome === "LOSS");
    const winRate = completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0;

    // Best strategy by decision type
    const strategyStats = (["BUY", "WAIT", "AVOID"] as const).map(d => {
      const subset = completed.filter(t => t.decision === d);
      const subWins = subset.filter(t => t.outcome === "WIN").length;
      return { decision: d, total: subset.length, wins: subWins, rate: subset.length > 0 ? Math.round((subWins / subset.length) * 100) : 0 };
    }).filter(s => s.total > 0);
    const bestStrategy = strategyStats.sort((a, b) => b.rate - a.rate)[0] || null;

    // Worst habit from reviews
    const mistakeCounts: Record<string, number> = {};
    reviews.forEach(r => {
      if (r.mistake_type && r.mistake_type !== "none") {
        mistakeCounts[r.mistake_type] = (mistakeCounts[r.mistake_type] || 0) + 1;
      }
    });
    const worstHabit = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0] || null;

    // Emotion breakdown
    const emotionCounts: Record<string, number> = {};
    reviews.forEach(r => {
      if (r.emotion) emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1;
    });

    // Confidence calibration
    const confGroups: Record<number, { wins: number; total: number }> = {};
    completed.forEach(t => {
      const c = t.confidence || 3;
      if (!confGroups[c]) confGroups[c] = { wins: 0, total: 0 };
      confGroups[c].total++;
      if (t.outcome === "WIN") confGroups[c].wins++;
    });
    const calibration = [1, 2, 3, 4, 5].map(c => ({
      level: c,
      rate: confGroups[c] ? Math.round((confGroups[c].wins / confGroups[c].total) * 100) : 0,
      count: confGroups[c]?.total || 0,
    }));

    // Weekly summary (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekTrades = trades.filter(t => new Date(t.date) >= weekAgo);
    const weekCompleted = weekTrades.filter(t => t.outcome === "WIN" || t.outcome === "LOSS");
    const weekWins = weekCompleted.filter(t => t.outcome === "WIN").length;

    // Asset breakdown
    const assetStats = (["stock", "crypto", "forex"] as const).map(a => {
      const subset = completed.filter(t => t.asset_type === a);
      const subWins = subset.filter(t => t.outcome === "WIN").length;
      return { type: a, total: subset.length, rate: subset.length > 0 ? Math.round((subWins / subset.length) * 100) : 0 };
    }).filter(s => s.total > 0);

    // Plan adherence
    const planFollowed = reviews.filter(r => r.followed_plan === true).length;
    const planTotal = reviews.filter(r => r.followed_plan !== null).length;

    return {
      winRate, wins: wins.length, losses: losses.length, total: completed.length,
      bestStrategy, worstHabit, emotionCounts, calibration,
      weekTrades: weekTrades.length, weekWins, weekCompleted: weekCompleted.length,
      assetStats, strategyStats,
      planAdherence: planTotal > 0 ? Math.round((planFollowed / planTotal) * 100) : 0,
      planTotal,
    };
  }, [trades, reviews]);

  const mistakeLabels: Record<string, string> = {
    entered_early: "Entered Early", ignored_macro: "Ignored Macro", fomo: "FOMO",
    oversizing: "Oversizing", no_stop: "No Stop Loss", revenge_trade: "Revenge Trade",
  };

  return (
    <StoaShell
      palette="delphi"
      crumb={
        <span>
          <span className="stoa-greek">Νόησις</span> · Insights
        </span>
      }
    >
      <div className="flex flex-col gap-2 mb-2 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">GROW · THE NOESIS</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Insights</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Νόησις</span>
        </div>
        <p className="text-sm" style={{ color: "var(--stoa-muted)" }}>patterns in thy conduct</p>
      </div>
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4 px-4 pt-6 pb-24">
        {/* Top Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
          <StatCard label="Win Rate" value={`${analysis.winRate}%`} icon={<TrendingUp className="h-3.5 w-3.5" />} trend={analysis.winRate >= 50 ? "up" : analysis.total > 0 ? "down" : "neutral"} />
          <StatCard label="Trades" value={analysis.total} icon={<BarChart3 className="h-3.5 w-3.5" />} />
          <StatCard label="Streak" value={streak} icon={<Flame className="h-3.5 w-3.5" />} />
          <StatCard label="XP" value={totalXp} icon={<Zap className="h-3.5 w-3.5" />} />
        </motion.div>

        <Tabs defaultValue="dna">
          <TabsList className="w-full flex-wrap h-auto gap-0.5 p-1" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 }}>
            <TabsTrigger value="dna" className="flex-1 text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">🧬 DNA</TabsTrigger>
            <TabsTrigger value="bias" className="flex-1 text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">🛡️ Bias</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">🧠 AI</TabsTrigger>
            <TabsTrigger value="charts" className="flex-1 text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">📊 Charts</TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">🏆 Perf</TabsTrigger>
            <TabsTrigger value="psychology" className="flex-1 text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">🧘 Psych</TabsTrigger>
            <TabsTrigger value="rules" className="flex-1 text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">📖 Rules</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1 text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">📅 Week</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1 text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">📈 Month</TabsTrigger>
          </TabsList>

          {/* DNA TAB */}
          <TabsContent value="dna" className="mt-3">
            <TradingDNACard />
          </TabsContent>

          {/* BIAS TAB */}
          <TabsContent value="bias" className="mt-3">
            <BiasDetector />
          </TabsContent>

          {/* AI TAB */}
          <TabsContent value="ai" className="mt-3">
            <AiPatternInsights />
          </TabsContent>

          {/* CHARTS TAB */}
          <TabsContent value="charts" className="mt-3">
            <PerformanceCharts trades={trades} reviews={reviews} />
          </TabsContent>

          {/* PERFORMANCE TAB */}
          <TabsContent value="performance" className="mt-3 flex flex-col gap-3">
            {/* Best Strategy */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-3" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderLeft: "3px solid hsl(var(--verdict-buy))", borderRadius: 2, padding: 14 }}>
                <div className="flex h-10 w-10 items-center justify-center" style={{ border: "1px solid var(--stoa-rule)", borderRadius: 2 }}>
                  <Target className="h-5 w-5 text-verdict-buy" />
                </div>
                <div className="flex-1">
                  <p className="stoa-kicker">Best Strategy</p>
                  {analysis.bestStrategy ? (
                    <>
                      <p className="text-sm font-bold text-verdict-buy">{analysis.bestStrategy.decision}</p>
                      <p className="stoa-kicker">{analysis.bestStrategy.rate}% win rate across {analysis.bestStrategy.total} trades</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Log more trades to see</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Confidence Calibration */}
            <motion.div variants={fadeUp}>
              <div className="mb-2"><span className="stoa-kicker">CALIBRATION · Μέτρον</span></div>
              <div className="flex flex-col gap-2" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 14 }}>
                {analysis.calibration.map(c => (
                  <div key={c.level} className="flex items-center gap-3">
                    <span className="stoa-mono font-bold w-6 text-[color:var(--stoa-accent)]" style={{ fontSize: 12 }}>⚡{c.level}</span>
                    <div className="flex-1">
                      <Progress value={c.rate} className="h-2" />
                    </div>
                    <span className="stoa-mono w-16 text-right" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>
                      {c.count > 0 ? `${c.rate}% (${c.count})` : "—"}
                    </span>
                  </div>
                ))}
                <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 12, color: "var(--stoa-muted)", marginTop: 6 }}>
                  Are high-confidence trades actually winning more? Calibrate your gut.
                </p>
              </div>
            </motion.div>

            {/* Asset Breakdown */}
            {analysis.assetStats.length > 0 && (
              <motion.div variants={fadeUp}>
                <div className="mb-2"><span className="stoa-kicker">BY ASSET · Ὕλη</span></div>
                <div className="grid grid-cols-3 gap-2">
                  {analysis.assetStats.map(a => (
                    <div key={a.type} className="text-center" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: "14px 8px" }}>
                      <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 18 }}>{a.rate}%</p>
                      <p className="stoa-kicker capitalize" style={{ color: "var(--stoa-muted)" }}>{a.type} ({a.total})</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Strategy Breakdown */}
            {analysis.strategyStats.length > 0 && (
              <motion.div variants={fadeUp}>
                <div className="mb-2"><span className="stoa-kicker">BY DECISION · Κρίσις</span></div>
                <div className="flex flex-col gap-2">
                  {analysis.strategyStats.map(s => (
                    <div key={s.decision} className="flex items-center justify-between" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 12 }}>
                      <div className="flex items-center gap-2">
                        <span className={`stoa-display font-bold ${s.decision === "BUY" ? "text-verdict-buy" : s.decision === "WAIT" ? "text-verdict-wait" : "text-verdict-avoid"}`} style={{ fontSize: 13 }}>{s.decision}</span>
                        <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>{s.total} trades</span>
                      </div>
                      <span className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 15 }}>{s.rate}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* PSYCHOLOGY TAB */}
          <TabsContent value="psychology" className="mt-3 flex flex-col gap-3">
            {/* Worst Habit */}
            <motion.div variants={fadeUp}>
              <GlassCard className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-verdict-avoid/10">
                  <AlertTriangle className="h-5 w-5 text-verdict-avoid" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Worst Habit</p>
                  {analysis.worstHabit ? (
                    <>
                      <p className="text-sm font-bold text-verdict-avoid">{mistakeLabels[analysis.worstHabit[0]] || analysis.worstHabit[0]}</p>
                      <p className="text-[10px] text-muted-foreground">Occurred {analysis.worstHabit[1]} times in your reviews</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Complete post-mortems to track habits</p>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Plan Adherence */}
            <motion.div variants={fadeUp}>
              <GlassCard>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold">Plan Adherence</p>
                  <span className="text-sm font-bold font-mono text-primary">{analysis.planAdherence}%</span>
                </div>
                <Progress value={analysis.planAdherence} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {analysis.planTotal > 0 ? `Based on ${analysis.planTotal} reviewed trades` : "Review completed trades to track this"}
                </p>
              </GlassCard>
            </motion.div>

            {/* Emotion Breakdown */}
            {Object.keys(analysis.emotionCounts).length > 0 && (
              <motion.div variants={fadeUp}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Emotions at Entry</h3>
                <div className="flex flex-col gap-2">
                  {Object.entries(analysis.emotionCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([emotion, count]) => {
                      const total = Object.values(analysis.emotionCounts).reduce((a, b) => a + b, 0);
                      const pct = Math.round((count / total) * 100);
                      return (
                        <GlassCard key={emotion} className="flex items-center gap-3">
                          <span className="text-sm capitalize">{emotion === "fomo" ? "😰" : emotion === "calm" ? "😌" : emotion === "confident" ? "💪" : emotion === "stressed" ? "😤" : "🔥"}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium capitalize">{emotion}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{pct}%</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        </GlassCard>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {reviews.length === 0 && (
              <GlassCard className="text-center py-8">
                <Brain className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No post-mortems yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Complete trade reviews to unlock psychology insights</p>
              </GlassCard>
            )}
          </TabsContent>

          {/* WEEKLY TAB */}
          <TabsContent value="weekly" className="mt-3">
            <WeeklyRecap />
          </TabsContent>

          {/* RULES TAB */}
          <TabsContent value="rules" className="mt-3">
            <Rulebook />
          </TabsContent>

          {/* MONTHLY TAB */}
          <TabsContent value="monthly" className="mt-3">
            <MonthlyReport />
          </TabsContent>
        </Tabs>
      </motion.div>
    </StoaShell>
  );
};

export default Insights;
