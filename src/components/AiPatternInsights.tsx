import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, TrendingUp, AlertTriangle, Lightbulb, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import { useToast } from "@/hooks/use-toast";

interface PatternInsights {
  most_profitable_setup: {
    title: string;
    description: string;
    win_rate: number;
    symbols: string[];
  };
  worst_times: {
    title: string;
    description: string;
    pattern: string;
  };
  recurring_mistakes: {
    mistake: string;
    frequency: number;
    fix: string;
  }[];
  edge_summary: string;
  risk_warning?: string;
  actionable_tips: string[];
}

const AiPatternInsights = () => {
  const { toast } = useToast();
  const [insights, setInsights] = useState<PatternInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [noData, setNoData] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setNoData(false);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-patterns");
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (!data.insights) {
        setNoData(true);
        toast({ title: "Not enough data", description: data.message || "Log more trades first." });
      } else {
        setInsights(data.insights);
      }
    } catch (e: any) {
      toast({ title: "Analysis Error", description: e.message || "Failed to analyze", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs w-full"
        onClick={analyze}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
        {loading ? "AI Analyzing Your Trades..." : "🧠 Run AI Pattern Detection"}
      </Button>

      {noData && (
        <GlassCard className="text-center py-6">
          <Brain className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Log at least 3 trades to unlock</p>
        </GlassCard>
      )}

      <AnimatePresence>
        {insights && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            {/* Edge Summary */}
            <GlassCard className="bg-primary/5 border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1">Your Trading Edge</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{insights.edge_summary}</p>
            </GlassCard>

            {/* Most Profitable Setup */}
            <GlassCard className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-verdict-buy/10">
                <TrendingUp className="h-5 w-5 text-verdict-buy" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Most Profitable Setup</p>
                <p className="text-sm font-bold text-verdict-buy">{insights.most_profitable_setup.title}</p>
                <p className="text-[11px] text-foreground/70 mt-0.5">{insights.most_profitable_setup.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-verdict-buy">{insights.most_profitable_setup.win_rate}% win rate</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{insights.most_profitable_setup.symbols.join(", ")}</span>
                </div>
              </div>
            </GlassCard>

            {/* Worst Times */}
            <GlassCard className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-verdict-avoid/10">
                <AlertTriangle className="h-5 w-5 text-verdict-avoid" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Danger Zone</p>
                <p className="text-sm font-bold text-verdict-avoid">{insights.worst_times.title}</p>
                <p className="text-[11px] text-foreground/70 mt-0.5">{insights.worst_times.description}</p>
                <p className="text-[10px] font-mono text-verdict-avoid/70 mt-1">{insights.worst_times.pattern}</p>
              </div>
            </GlassCard>

            {/* Recurring Mistakes */}
            {insights.recurring_mistakes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recurring Mistakes</p>
                <div className="flex flex-col gap-2">
                  {insights.recurring_mistakes.map((m, i) => (
                    <GlassCard key={i} className="flex items-start gap-3">
                      <span className="text-sm mt-0.5">🔴</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{m.mistake}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{m.frequency}×</span>
                        </div>
                        <p className="text-[11px] text-verdict-buy mt-0.5">💡 {m.fix}</p>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Tips */}
            {insights.actionable_tips.length > 0 && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-verdict-wait" />
                  <p className="text-xs font-semibold">Action Items</p>
                </div>
                <ul className="space-y-1.5">
                  {insights.actionable_tips.map((tip, i) => (
                    <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span> {tip}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            {/* Risk Warning */}
            {insights.risk_warning && (
              <div className="p-2 rounded-lg bg-verdict-avoid/5 border border-verdict-avoid/10 flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-verdict-avoid shrink-0 mt-0.5" />
                <p className="text-[9px] text-verdict-avoid/70 leading-relaxed">{insights.risk_warning}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AiPatternInsights;
