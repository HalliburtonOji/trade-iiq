import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import { cn } from "@/lib/utils";

const dqsLabel = (score: number) => {
  if (score >= 80) return { label: "Excellent", color: "text-verdict-buy" };
  if (score >= 60) return { label: "Good", color: "text-primary" };
  if (score >= 40) return { label: "Developing", color: "text-verdict-wait" };
  return { label: "Needs Work", color: "text-verdict-avoid" };
};

const DQSWidget = () => {
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("bias-detector");
        if (data?.decision_quality_score) {
          const dqs = data.decision_quality_score.overall;
          setScore(dqs);
          const meta = dqsLabel(dqs);
          setLabel(meta.label);
          setColor(meta.color);
        }
      } catch {
        // silently fail on dashboard
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <GlassCard className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Calculating DQS…</span>
      </GlassCard>
    );
  }

  if (score === null) return null;

  return (
    <GlassCard className="flex items-center gap-3 border-primary/10 bg-gradient-to-r from-primary/5 to-accent/5">
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" className="stroke-secondary" strokeWidth="3.5" />
          <motion.path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" className="stroke-primary" strokeWidth="3.5" strokeLinecap="round"
            initial={{ strokeDasharray: "0, 100" }}
            animate={{ strokeDasharray: `${score}, 100` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold font-mono", color)}>
          {score}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold">Decision Quality</p>
        <p className={cn("text-[10px] font-medium", color)}>{label}</p>
      </div>
      <Shield className="h-4 w-4 text-muted-foreground/30 ml-auto" />
    </GlassCard>
  );
};

export default DQSWidget;
