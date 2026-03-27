import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Zap, CheckCircle2, ArrowRight, Sparkles, Clock, Eye, BarChart3 } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import DrillDetail from "./DrillDetail";
import TimedChallenge from "./TimedChallenge";
import ScenarioReplay from "./ScenarioReplay";
import PatternDrillComponent from "./PatternDrill";
import { drillsData, practiceTypeLabels, practiceTypeIcons, type PracticeType, type Drill } from "@/data/drillsData";
import { scenarioData, type TradeScenario } from "@/data/scenarioData";
import { patternDrills, type PatternDrill } from "@/data/patternDrills";
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

const practiceFilters: Array<{ label: string; value: PracticeType | "all" | "scenario" | "pattern" }> = [
  { label: "All", value: "all" },
  { label: "Scenarios", value: "scenario" },
  { label: "Patterns", value: "pattern" },
  { label: "Chart Reading", value: "chart_reading" },
  { label: "Risk", value: "risk" },
  { label: "Bias", value: "bias" },
  { label: "Quick Checks", value: "quick_check" },
  { label: "Invalidation", value: "invalidation" },
];

const PracticeTab = ({ completedLessons, quizAttempts = [], totalXp = 0, streak = 0, onSelectLesson }: Props) => {
  const [filter, setFilter] = useState<string>("all");
  const [activeDrill, setActiveDrill] = useState<Drill | null>(null);
  const [activeScenario, setActiveScenario] = useState<TradeScenario | null>(null);
  const [activePattern, setActivePattern] = useState<PatternDrill | null>(null);
  const [showTimedChallenge, setShowTimedChallenge] = useState(false);
  const { completedDrills, totalPracticeXp, saveDrillResult } = usePracticeProgress();
  const signals = useRecommendationEngine(completedLessons, totalXp, streak, quizAttempts);
  const { toast } = useToast();

  // Track completed scenarios and patterns locally
  const [completedScenarios, setCompletedScenarios] = useState<string[]>([]);
  const [completedPatterns, setCompletedPatterns] = useState<string[]>([]);

  const totalCompleted = completedDrills.length + completedScenarios.length + completedPatterns.length;
  const totalAvailable = drillsData.length + scenarioData.length + patternDrills.length;

  const categoryProgress = useMemo(() => {
    const types: Array<{ type: string; label: string; icon: string; total: number; done: number }> = [
      { type: "scenario", label: "Scenarios", icon: "🎬", total: scenarioData.length, done: completedScenarios.length },
      { type: "pattern", label: "Patterns", icon: "📊", total: patternDrills.length, done: completedPatterns.length },
    ];
    const drillTypes: PracticeType[] = ["chart_reading", "risk", "bias", "quick_check", "invalidation"];
    drillTypes.forEach(t => {
      const total = drillsData.filter(d => d.practice_type === t).length;
      const done = drillsData.filter(d => d.practice_type === t && completedDrills.includes(d.id)).length;
      types.push({ type: t, label: practiceTypeLabels[t], icon: practiceTypeIcons[t], total, done });
    });
    return types;
  }, [completedDrills, completedScenarios, completedPatterns]);

  const filteredDrills = useMemo(() => {
    if (filter === "scenario" || filter === "pattern") return [];
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

  const filteredScenarios = useMemo(() => {
    if (filter !== "all" && filter !== "scenario") return [];
    return scenarioData.sort((a, b) => {
      const aDone = completedScenarios.includes(a.id) ? 1 : 0;
      const bDone = completedScenarios.includes(b.id) ? 1 : 0;
      return aDone - bDone;
    });
  }, [filter, completedScenarios]);

  const filteredPatterns = useMemo(() => {
    if (filter !== "all" && filter !== "pattern") return [];
    return patternDrills.sort((a, b) => {
      const aDone = completedPatterns.includes(a.id) ? 1 : 0;
      const bDone = completedPatterns.includes(b.id) ? 1 : 0;
      return aDone - bDone;
    });
  }, [filter, completedPatterns]);

  const handleDrillComplete = useCallback(async (drill: Drill, passed: boolean) => {
    const alreadyDone = completedDrills.includes(drill.id);
    const xp = passed && !alreadyDone ? drill.xp_reward : 0;
    await saveDrillResult(drill.id, drill.practice_type, drill.category, passed, xp, passed ? [] : drill.concept_tags);
    if (passed && !alreadyDone) {
      toast({ title: `⚡ +${drill.xp_reward} XP`, description: `"${drill.title}" completed!` });
    }
  }, [completedDrills, saveDrillResult, toast]);

  const handleScenarioComplete = useCallback((scenario: TradeScenario, passed: boolean) => {
    if (passed && !completedScenarios.includes(scenario.id)) {
      setCompletedScenarios(prev => [...prev, scenario.id]);
      toast({ title: `🎬 +${scenario.xp_reward} XP`, description: `"${scenario.title}" completed!` });
    }
  }, [completedScenarios, toast]);

  const handlePatternComplete = useCallback((pattern: PatternDrill, passed: boolean) => {
    if (passed && !completedPatterns.includes(pattern.id)) {
      setCompletedPatterns(prev => [...prev, pattern.id]);
      toast({ title: `📊 +${pattern.xp_reward} XP`, description: `"${pattern.title}" completed!` });
    }
  }, [completedPatterns, toast]);

  const handleTimedComplete = useCallback((correct: number, total: number, xp: number) => {
    if (xp > 0) {
      toast({ title: `🏎️ +${xp} XP`, description: `Speed round: ${correct}/${total} correct!` });
    }
    setShowTimedChallenge(false);
  }, [toast]);

  // Timed challenge view
  if (showTimedChallenge) return <TimedChallenge onComplete={handleTimedComplete} onBack={() => setShowTimedChallenge(false)} />;

  // Scenario view
  if (activeScenario) {
    return (
      <ScenarioReplay
        scenario={activeScenario}
        alreadyCompleted={completedScenarios.includes(activeScenario.id)}
        onComplete={(passed) => handleScenarioComplete(activeScenario, passed)}
        onBack={() => setActiveScenario(null)}
      />
    );
  }

  // Pattern drill view
  if (activePattern) {
    return (
      <PatternDrillComponent
        drill={activePattern}
        alreadyCompleted={completedPatterns.includes(activePattern.id)}
        onComplete={(passed) => handlePatternComplete(activePattern, passed)}
        onBack={() => setActivePattern(null)}
      />
    );
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
              Drills, scenarios & pattern recognition. {totalCompleted}/{totalAvailable} completed · {totalPracticeXp} XP earned
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Speed Round CTA */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard hoverable onClick={() => setShowTimedChallenge(true)} className="border-accent/20 bg-gradient-to-br from-accent/10 to-primary/5">
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
              <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${cp.total > 0 ? (cp.done / cp.total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Scenario drills */}
      {filteredScenarios.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">🎬 Trade Scenarios — What Would You Do?</p>
          {filteredScenarios.map((s, i) => {
            const done = completedScenarios.includes(s.id);
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard hoverable onClick={() => setActiveScenario(s)} className={done ? "opacity-50" : ""}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">🎬</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{s.title}</span>
                        {done && <CheckCircle2 className="h-4 w-4 text-verdict-buy shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.context.slice(0, 100)}...</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium border border-accent/15">Scenario</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                          s.difficulty === "Easy" ? "bg-verdict-buy/15 text-verdict-buy border-verdict-buy/20"
                            : s.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                            : "bg-verdict-avoid/15 text-verdict-avoid border-verdict-avoid/20"
                        }`}>{s.difficulty}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">+{s.xp_reward} XP</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </>
      )}

      {/* Pattern drills */}
      {filteredPatterns.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">📊 Pattern Recognition</p>
          {filteredPatterns.map((p, i) => {
            const done = completedPatterns.includes(p.id);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard hoverable onClick={() => setActivePattern(p)} className={done ? "opacity-50" : ""}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">📊</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{p.title}</span>
                        {done && <CheckCircle2 className="h-4 w-4 text-verdict-buy shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{p.description.slice(0, 80)}...</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/15">Pattern ID</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                          p.difficulty === "Easy" ? "bg-verdict-buy/15 text-verdict-buy border-verdict-buy/20"
                            : p.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                            : "bg-verdict-avoid/15 text-verdict-avoid border-verdict-avoid/20"
                        }`}>{p.difficulty}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">+{p.xp_reward} XP</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </>
      )}

      {/* Regular drills */}
      {filteredDrills.length > 0 && (filter === "all" ? (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">🧠 Concept Drills</p>
      ) : null)}
      {filteredDrills.map((drill, i) => {
        const done = completedDrills.includes(drill.id);
        return (
          <motion.div key={drill.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <GlassCard hoverable onClick={() => setActiveDrill(drill)} className={done ? "opacity-50" : ""}>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{practiceTypeIcons[drill.practice_type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{drill.title}</span>
                    {done && <CheckCircle2 className="h-4 w-4 text-verdict-buy shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{drill.summary}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/15">
                      {practiceTypeLabels[drill.practice_type]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                      drill.difficulty === "Easy" ? "bg-verdict-buy/15 text-verdict-buy border-verdict-buy/20"
                        : drill.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                        : "bg-verdict-avoid/15 text-verdict-avoid border-verdict-avoid/20"
                    }`}>{drill.difficulty}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">+{drill.xp_reward} XP</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}

      {/* All done state */}
      {totalCompleted >= totalAvailable && (
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
