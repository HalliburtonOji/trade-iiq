import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Trophy, AlertTriangle, Target, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface DigestData {
  period: { from: string; to: string };
  stats: {
    total_decisions: number;
    completed_trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    pending: number;
  };
  best_trade: { symbol: string; decision: string; pnl_percent: number; date: string } | null;
  worst_habit: { type: string; count: number } | null;
  confidence_accuracy: {
    calibration: { level: number; rate: number; count: number }[];
    high_conf_rate: number | null;
    low_conf_rate: number | null;
  };
  xp: { earned_this_week: number; total: number; streak: number; level: string };
  lessons_completed: number;
  reviews_written: number;
  top_symbols: string[];
  ai_focus: string | null;
}

const mistakeLabels: Record<string, string> = {
  entered_early: "Entered Early",
  ignored_macro: "Ignored Macro",
  fomo: "FOMO",
  oversizing: "Oversizing",
  no_stop: "No Stop Loss",
  revenge_trade: "Revenge Trade",
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] as const } },
};

const WeeklyRecap = () => {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDigest = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("weekly-digest");
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setDigest(data);
    } catch (e: any) {
      setError(e.message || "Failed to load weekly recap");
    } finally {
      setLoading(false);
    }
  };

  if (!digest && !loading) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-10 text-center">
        <Calendar className="h-10 w-10 text-primary/30 mb-3" />
        <p className="text-sm font-semibold mb-1">Weekly Recap</p>
        <p className="text-xs text-muted-foreground mb-4">
          Generate your AI-powered weekly trading summary
        </p>
        <Button onClick={fetchDigest} size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" /> Generate Recap
        </Button>
        {error && <p className="text-xs text-destructive mt-3">{error}</p>}
      </GlassCard>
    );
  }

  if (loading) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Analysing your week…</p>
      </GlassCard>
    );
  }

  if (!digest) return null;

  const { stats, best_trade, worst_habit, confidence_accuracy, xp, ai_focus } = digest;

  return (
    <motion.div
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-3"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Weekly Recap</h3>
          <p className="text-[10px] text-muted-foreground">
            {digest.period.from} → {digest.period.to}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchDigest} className="h-8 w-8">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </motion.div>

      {/* Win/Loss bar */}
      <motion.div variants={fadeUp}>
        <GlassCard className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Performance</span>
            <span className="text-sm font-bold font-mono">
              {stats.win_rate}% <span className="text-[10px] text-muted-foreground font-normal">win rate</span>
            </span>
          </div>
          <Progress value={stats.win_rate} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{stats.wins}W / {stats.losses}L</span>
            <span>{stats.total_decisions} decisions · {stats.pending} pending</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Best Trade & Worst Habit side by side */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
        <GlassCard className="space-y-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="h-4 w-4 text-verdict-buy" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Best Trade</span>
          </div>
          {best_trade ? (
            <>
              <p className="text-sm font-bold font-mono text-verdict-buy">{best_trade.symbol}</p>
              <p className="text-[10px] text-muted-foreground">
                {best_trade.decision} · +{best_trade.pnl_percent}%
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No wins this week</p>
          )}
        </GlassCard>

        <GlassCard className="space-y-1">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4 text-verdict-avoid" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Worst Habit</span>
          </div>
          {worst_habit ? (
            <>
              <p className="text-sm font-bold text-verdict-avoid">
                {mistakeLabels[worst_habit.type] || worst_habit.type}
              </p>
              <p className="text-[10px] text-muted-foreground">{worst_habit.count}× this week</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No mistakes logged</p>
          )}
        </GlassCard>
      </motion.div>

      {/* Confidence Accuracy */}
      <motion.div variants={fadeUp}>
        <GlassCard className="space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Confidence Accuracy
            </span>
          </div>
          <div className="flex gap-1">
            {confidence_accuracy.calibration.map((c) => (
              <div key={c.level} className="flex-1 text-center">
                <div className="relative h-16 bg-secondary/30 rounded overflow-hidden flex items-end justify-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${c.rate}%` }}
                    transition={{ duration: 0.6, delay: c.level * 0.08 }}
                    className="w-full bg-primary/60 rounded-t"
                  />
                </div>
                <p className="text-[10px] font-mono font-bold mt-1">{c.level}/5</p>
                <p className="text-[8px] text-muted-foreground">
                  {c.count > 0 ? `${c.rate}%` : "—"}
                </p>
              </div>
            ))}
          </div>
          {confidence_accuracy.high_conf_rate !== null && (
            <p className="text-[10px] text-muted-foreground">
              High-confidence (5/5) accuracy: <span className="font-bold font-mono text-foreground">{confidence_accuracy.high_conf_rate}%</span>
            </p>
          )}
        </GlassCard>
      </motion.div>

      {/* AI Focus for Next Week */}
      <AnimatePresence>
        {ai_focus && (
          <motion.div variants={fadeUp}>
            <GlassCard className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  AI Focus — Next Week
                </span>
              </div>
              <p className="text-xs leading-relaxed text-foreground">{ai_focus}</p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick stats footer */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
        <GlassCard className="text-center py-2">
          <p className="text-lg font-bold font-mono">{xp.earned_this_week}</p>
          <p className="text-[9px] text-muted-foreground">XP Earned</p>
        </GlassCard>
        <GlassCard className="text-center py-2">
          <p className="text-lg font-bold font-mono">{digest.reviews_written}</p>
          <p className="text-[9px] text-muted-foreground">Reviews</p>
        </GlassCard>
        <GlassCard className="text-center py-2">
          <p className="text-lg font-bold font-mono">{digest.lessons_completed}</p>
          <p className="text-[9px] text-muted-foreground">Lessons</p>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default WeeklyRecap;
