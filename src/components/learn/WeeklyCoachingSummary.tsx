import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, AlertTriangle, Target, Sparkles } from "lucide-react";
import GlassCard from "@/components/GlassCard";

interface Props {
  summary: {
    strength: string;
    weakness: string;
    pattern: string;
    nextFocus: string;
    recommendedLessonId: string | null;
  };
  onSelectLesson?: (id: string) => void;
}

const WeeklyCoachingSummary = ({ summary, onSelectLesson }: Props) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard className="border-primary/15 bg-gradient-to-br from-primary/5 to-accent/3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-primary">Weekly Coaching Summary</p>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-verdict-buy shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-verdict-buy">Strength</p>
              <p className="text-[11px] text-foreground/80">{summary.strength}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-amber-400">Weakness</p>
              <p className="text-[11px] text-foreground/80">{summary.weakness}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">Pattern</p>
              <p className="text-[11px] text-foreground/80">{summary.pattern}</p>
            </div>
          </div>
          {summary.recommendedLessonId && (
            <button
              onClick={() => onSelectLesson?.(summary.recommendedLessonId!)}
              className="flex items-center gap-1 text-xs text-primary font-medium mt-1 hover:underline"
            >
              {summary.nextFocus} <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default WeeklyCoachingSummary;
