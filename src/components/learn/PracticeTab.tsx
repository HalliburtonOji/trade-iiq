import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Zap, CheckCircle2, ArrowRight, Sparkles, Clock } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import DrillDetail from "./DrillDetail";
import TimedChallenge from "./TimedChallenge";
import { drillsData, practiceTypeLabels, practiceTypeIcons, type PracticeType, type Drill } from "@/data/drillsData";
import { usePracticeProgress } from "@/hooks/use-practice-progress";
import { useRecommendationEngine } from "@/hooks/use-recommendation-engine";
import { type QuizAttemptRecord } from "@/hooks/use-learning-progress";
import { useToast } from "@/hooks/use-toast";

interface Props {
  completedLessons: string[];
  quizAttempts?: QuizAttemptRecord[];
  totalXp?: number;
  streak?: number;
  onSelectLesson?: (id: string) => void;
}

const practiceFilters: Array<{ label: string; value: PracticeType | "all" }> = [
  { label: "All", value: "all" },
  { label: "Scenarios", value: "scenario" },
  { label: "Chart Reading", value: "chart_reading" },
  { label: "Risk", value: "risk" },
  { label: "Bias", value: "bias" },
  { label: "Quick Checks", value: "quick_check" },
  { label: "Invalidation", value: "invalidation" },
];

const PracticeTab = ({ completedLessons, quizAttempts = [], totalXp = 0, streak = 0, onSelectLesson }: Props) => {
  const [filter, setFilter] = useState<PracticeType | "all">("all");
  const [activeDrill, setActiveDrill] = useState<Drill | null>(null);
  const [showTimedChallenge, setShowTimedChallenge] = useState(false);
  const { completedDrills, totalPracticeXp, saveDrillResult } = usePracticeProgress();
  const signals = useRecommendationEngine(completedLessons, totalXp, streak, quizAttempts);
  const { toast } = useToast();

  const categoryProgress = useMemo(() => {
    const types: PracticeType[] = ["scenario", "chart_reading", "risk", "bias", "quick_check", "invalidation"];
    return types.map(t => {
      const total = drillsData.filter(d => d.practice_type === t).length;
      const done = drillsData.filter(d => d.practice_type === t && completedDrills.includes(d.id)).length;
      return { type: t, label: practiceTypeLabels[t], icon: practiceTypeIcons[t], total, done };
    });
  }, [completedDrills]);

  const filteredDrills = useMemo(() => {
    let list = filter === "all" ? [...drillsData] : drillsData.filter(d => d.practice_type === filter);
    return list.sort((a, b) => {
      const aDone = completedDrills.includes(a.id) ? 1 : 0;
      const bDone = completedDrills.includes(b.id) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const aWeak = signals.weakCategories.includes(a.category) ? -1 : 0;
      const bWeak = signals.weakCategories.includes(b.category) ? -1 : 0;
      return aWeak - bWeak;
    });
  }, [filter, completedDrills, signals]);

  const getDrillLabel = (drill: Drill): string | null => {
    if (signals.isBeginner && (drill.practice_type === "quick_check" || drill.practice_type === "scenario")) {
      return "Build your foundation";
    }
    if (signals.weakCategories.includes(drill.category)) return "Needs work";
    if (drill.related_lesson_ids.some(id => completedLessons.includes(id) && completedLessons.indexOf(id) >= completedLessons.length - 2)) {
      return "Based on recent lesson";
    }
    return null;
  };

  const handleDrillComplete = useCallback(async (drill: Drill, passed: boolean) => {
    const alreadyDone = completedDrills.includes(drill.id);
    const xp = passed && !alreadyDone ? drill.xp_reward : 0;
    await saveDrillResult(drill.id, drill.practice_type, drill.category, passed, xp, passed ? [] : drill.concept_tags);
    if (passed && !alreadyDone) {
      toast({ title: `⚡ +${drill.xp_reward} XP`, description: `"${drill.title}" completed!` });
    }
  }, [completedDrills, saveDrillResult, toast]);

  const handleTimedComplete = useCallback((correct: number, total: number, xp: number) => {
    if (xp > 0) {
      toast({ title: `🏎️ +${xp} XP`, description: `Speed round: ${correct}/${total} correct!` });
    }
    setShowTimedChallenge(false);
  }, [toast]);

  // Timed challenge view
  if (showTimedChallenge) {
    return <TimedChallenge onComplete={handleTimedComplete} onBack={() => setShowTimedChallenge(false)} />;
  }

  // Drill detail view
  if (activeDrill) {
    return (
      <DrillDetail
        drill={activeDrill}
        alreadyCompleted={completedDrills.includes(activeDrill.id)}
        onComplete={(passed) => handleDrillComplete(activeDrill, passed)}
        onBack={() => setActiveDrill(null)}
        onSelectLesson={onSelectLesson}
      />
    );
  }

  const recommendedDrill = filteredDrills.find(d => !completedDrills.includes(d.id));

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* Intro card */}
      <GlassCard className="border-primary/15 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/15">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Practice Mode</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Apply what you've learned. Short drills, real scenarios, useful feedback. {completedDrills.length}/{drillsData.length} completed · {totalPracticeXp} XP earned
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Speed Round CTA */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard
          hoverable
          onClick={() => setShowTimedChallenge(true)}
          className="border-accent/20 bg-gradient-to-br from-accent/10 to-primary/5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/15">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">⚡ Speed Round</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">60 seconds. As many quick checks as you can. Bonus XP.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-accent" />
          </div>
        </GlassCard>
      </motion.div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {practiceFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              filter === f.value
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "glass-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Category progress strip */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {categoryProgress.map(cp => (
          <div
            key={cp.type}
            onClick={() => setFilter(cp.type)}
            className="shrink-0 glass-card px-3 py-2 rounded-xl cursor-pointer hover:border-primary/20 transition-all min-w-[80px]"
          >
            <p className="text-sm mb-0.5">{cp.icon}</p>
            <p className="text-[10px] font-semibold text-foreground/80">{cp.label}</p>
            <p className="text-[9px] text-muted-foreground">{cp.done}/{cp.total}</p>
            <div className="w-full h-1 rounded-full bg-muted/30 mt-1.5">
              <div
                className="h-full rounded-full bg-primary/60 transition-all"
                style={{ width: `${cp.total > 0 ? (cp.done / cp.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recommended drill */}
      {recommendedDrill && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard
            hoverable
            onClick={() => setActiveDrill(recommendedDrill)}
            className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/15">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary mb-0.5">Recommended</p>
                <p className="text-sm font-bold truncate">{recommendedDrill.title}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">
                  {getDrillLabel(recommendedDrill) || "Best next step"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{recommendedDrill.summary}</p>
                <div className="flex items-center gap-1 mt-2 text-primary text-xs font-medium">
                  Start Drill <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Drill list */}
      {filteredDrills.map((drill, i) => {
        const done = completedDrills.includes(drill.id);
        const label = !done ? getDrillLabel(drill) : null;

        return (
          <motion.div
            key={drill.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <GlassCard
              hoverable
              onClick={() => setActiveDrill(drill)}
              className={done ? "opacity-50" : ""}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{practiceTypeIcons[drill.practice_type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{drill.title}</span>
                    {done && <CheckCircle2 className="h-4 w-4 text-verdict-buy shrink-0" />}
                  </div>
                  {label && (
                    <p className="text-[10px] text-primary/80 italic mt-0.5">{label}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{drill.summary}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/15">
                      {practiceTypeLabels[drill.practice_type]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                      drill.difficulty === "Easy" ? "bg-verdict-buy/15 text-verdict-buy border-verdict-buy/20"
                        : drill.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                        : "bg-verdict-avoid/15 text-verdict-avoid border-verdict-avoid/20"
                    }`}>
                      {drill.difficulty}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">+{drill.xp_reward} XP</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}

      {/* All done state */}
      {filteredDrills.length > 0 && filteredDrills.every(d => completedDrills.includes(d.id)) && (
        <GlassCard className="text-center py-6 border-verdict-buy/15">
          <Zap className="h-6 w-6 text-verdict-buy mx-auto mb-2" />
          <p className="text-sm font-semibold text-verdict-buy">All drills completed!</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Try the Speed Round or replay drills to reinforce concepts.
          </p>
        </GlassCard>
      )}
    </div>
  );
};

export default PracticeTab;
