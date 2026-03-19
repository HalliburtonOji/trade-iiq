import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Eye, Loader2, RefreshCw, Flame, TrendingDown, Zap, Brain, XCircle, HeartCrack, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface Bias {
  type: string;
  severity: "high" | "medium" | "low";
  description: string;
  evidence: string;
  count: number;
}

interface DQS {
  overall: number;
  win_rate: { score: number; weight: number };
  plan_adherence: { score: number; weight: number };
  invalidation_usage: { score: number; weight: number };
  rule_following: { score: number; weight: number };
  thesis_completion: { score: number; weight: number };
}

interface DetectorData {
  biases: Bias[];
  decision_quality_score: DQS | null;
  total_trades: number;
  completed_trades: number;
  reviews_count: number;
  rules_count: number;
  message?: string;
}

const biasIcons: Record<string, React.ReactNode> = {
  revenge_trading: <Flame className="h-4 w-4" />,
  overtrading: <Zap className="h-4 w-4" />,
  fomo_chasing: <TrendingDown className="h-4 w-4" />,
  overconfidence: <Brain className="h-4 w-4" />,
  no_exit_plan: <XCircle className="h-4 w-4" />,
  emotional_trading: <HeartCrack className="h-4 w-4" />,
  rule_breaking: <Scale className="h-4 w-4" />,
};

const biasLabels: Record<string, string> = {
  revenge_trading: "Revenge Trading",
  overtrading: "Overtrading",
  fomo_chasing: "FOMO Chasing",
  overconfidence: "Overconfidence",
  no_exit_plan: "No Exit Plan",
  emotional_trading: "Emotional Trading",
  rule_breaking: "Rule Breaking",
};

const severityColors = {
  high: "text-destructive border-destructive/30 bg-destructive/5",
  medium: "text-verdict-avoid border-verdict-avoid/30 bg-verdict-avoid/5",
  low: "text-verdict-wait border-verdict-wait/30 bg-verdict-wait/5",
};

const severityDot = {
  high: "bg-destructive",
  medium: "bg-verdict-avoid",
  low: "bg-verdict-wait",
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] as const } },
};

const dqsLabel = (score: number) => {
  if (score >= 80) return { label: "Excellent", color: "text-verdict-buy" };
  if (score >= 60) return { label: "Good", color: "text-primary" };
  if (score >= 40) return { label: "Developing", color: "text-verdict-wait" };
  return { label: "Needs Work", color: "text-verdict-avoid" };
};

const BiasDetector = () => {
  const [data, setData] = useState<DetectorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke("bias-detector");
      if (fnErr) throw fnErr;
      if (res?.error) throw new Error(res.error);
      setData(res);
    } catch (e: any) {
      setError(e.message || "Failed to run bias detection");
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-10 text-center">
        <Eye className="h-10 w-10 text-primary/30 mb-3" />
        <p className="text-sm font-semibold mb-1">Bias Detector + Decision Quality</p>
        <p className="text-xs text-muted-foreground mb-4">
          Scan your history for revenge trading, FOMO, overconfidence, and calculate your Decision Quality Score
        </p>
        <Button onClick={run} size="sm" className="gap-2">
          <Shield className="h-4 w-4" /> Run Analysis
        </Button>
        {error && <p className="text-xs text-destructive mt-3">{error}</p>}
      </GlassCard>
    );
  }

  if (loading) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Scanning for biases…</p>
      </GlassCard>
    );
  }

  if (!data) return null;

  const dqs = data.decision_quality_score;
  const dqsMeta = dqs ? dqsLabel(dqs.overall) : null;

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
          <h3 className="text-sm font-bold">Bias Detector</h3>
          <p className="text-[10px] text-muted-foreground">
            {data.total_trades} trades · {data.reviews_count} reviews scanned
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={run} className="h-8 w-8">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </motion.div>

      {/* Decision Quality Score */}
      {dqs && dqsMeta && (
        <motion.div variants={fadeUp}>
          <GlassCard className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Decision Quality Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn("text-3xl font-bold font-mono", dqsMeta.color)}>{dqs.overall}</span>
                  <span className={cn("text-xs font-semibold", dqsMeta.color)}>{dqsMeta.label}</span>
                </div>
              </div>
              <div className="relative h-16 w-16">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" className="stroke-secondary" strokeWidth="3" />
                  <motion.path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round"
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${dqs.overall}, 100` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
              </div>
            </div>

            {/* Breakdown bars */}
            <div className="space-y-1.5">
              {[
                { label: "Win Rate", ...dqs.win_rate },
                { label: "Plan Adherence", ...dqs.plan_adherence },
                { label: "Stop-Loss Usage", ...dqs.invalidation_usage },
                { label: "Rule Following", ...dqs.rule_following },
                { label: "Thesis Quality", ...dqs.thesis_completion },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-24 shrink-0">{item.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary/70"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold w-8 text-right">{item.score}%</span>
                  <span className="text-[8px] text-muted-foreground/60 w-6">×{item.weight/100}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Bias warnings */}
      {data.biases.length === 0 ? (
        <motion.div variants={fadeUp}>
          <GlassCard className="flex items-center gap-3 border-verdict-buy/20 bg-verdict-buy/5">
            <Shield className="h-6 w-6 text-verdict-buy" />
            <div>
              <p className="text-sm font-semibold text-verdict-buy">No biases detected</p>
              <p className="text-[10px] text-muted-foreground">Your trading behaviour looks disciplined</p>
            </div>
          </GlassCard>
        </motion.div>
      ) : (
        <>
          <motion.div variants={fadeUp}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              {data.biases.length} Bias{data.biases.length > 1 ? "es" : ""} Detected
            </h3>
          </motion.div>
          <AnimatePresence>
            {data.biases.map((bias, i) => (
              <motion.div key={bias.type} variants={fadeUp}>
                <GlassCard className={cn("border", severityColors[bias.severity])}>
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5", bias.severity === "high" ? "text-destructive" : bias.severity === "medium" ? "text-verdict-avoid" : "text-verdict-wait")}>
                      {biasIcons[bias.type] || <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold">{biasLabels[bias.type] || bias.type}</span>
                        <span className={cn("h-1.5 w-1.5 rounded-full", severityDot[bias.severity])} />
                        <span className="text-[10px] text-muted-foreground capitalize">{bias.severity}</span>
                      </div>
                      <p className="text-xs text-foreground/80 mb-1">{bias.description}</p>
                      <p className="text-[10px] text-muted-foreground">{bias.evidence}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </>
      )}

      {data.message && (
        <motion.div variants={fadeUp}>
          <GlassCard className="text-center py-6">
            <p className="text-sm text-muted-foreground">{data.message}</p>
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BiasDetector;
