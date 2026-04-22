import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen, BarChart3, Shield, LineChart, Brain, Sparkles, CheckCircle2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import LearnHeader from "@/components/learn/LearnHeader";
import AdaptiveWeakTagsSidebar from "@/components/learn/AdaptiveWeakTagsSidebar";
import WeeklyRecapCard from "@/components/learn/WeeklyRecapCard";
import LessonDetailV2 from "@/components/learn/LessonDetailV2";
import DrillDetail from "@/components/learn/DrillDetail";
import GlassCard from "@/components/GlassCard";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { lessonsData, difficultyColors, type Lesson } from "@/data/lessonsData";
import { drillsData } from "@/data/drillsData";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { usePracticeProgress } from "@/hooks/use-practice-progress";
import { useToast } from "@/hooks/use-toast";

interface CategoryDef {
  key: string;
  label: string;
  icon: typeof BookOpen;
  match: (l: Lesson) => boolean;
}

const CATEGORIES: CategoryDef[] = [
  { key: "Foundations", label: "Foundations", icon: BookOpen, match: (l) => l.category === "Beginner" },
  { key: "Market Structure", label: "Market Structure", icon: BarChart3, match: (l) => l.id === "trend-market-structure" || l.id === "support-resistance" || l.id === "bull-bear-markets" },
  { key: "Risk", label: "Risk Management", icon: Shield, match: (l) => l.category === "Risk" },
  { key: "Technical", label: "Technical", icon: LineChart, match: (l) => l.category === "Technical" && l.id !== "trend-market-structure" && l.id !== "support-resistance" },
  { key: "Psychology", label: "Psychology", icon: Brain, match: (l) => l.category === "Psychology" },
  { key: "Advanced", label: "Advanced", icon: Sparkles, match: (l) => l.category === "Advanced" || l.category === "Strategy" },
];

const Learn = () => {
  const { completedLessons, totalXp, streak, quizAttempts, loading, refetch } = useLearningProgress();
  const { completedDrills, saveDrillResult } = usePracticeProgress();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Deep-link support: ?lesson=xxx
  useEffect(() => {
    const lid = searchParams.get("lesson");
    if (lid && lessonsData.some((l) => l.id === lid)) {
      setSelectedLessonId(lid);
    }
  }, [searchParams]);

  const selectedLesson = selectedLessonId ? lessonsData.find((l) => l.id === selectedLessonId) : null;
  const selectedDrill = selectedDrillId ? drillsData.find((d) => d.id === selectedDrillId) : null;

  const handleSelectLesson = useCallback(
    (id: string) => {
      setSelectedLessonId(id);
      setSelectedDrillId(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  const handleSelectDrill = useCallback((drillId: string) => {
    setSelectedDrillId(drillId);
    setSelectedLessonId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBackFromLesson = useCallback(() => {
    setSelectedLessonId(null);
    if (searchParams.get("lesson")) {
      searchParams.delete("lesson");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDrillComplete = useCallback(
    async (passed: boolean) => {
      if (!selectedDrill) return;
      const alreadyDone = completedDrills.includes(selectedDrill.id);
      const xp = passed && !alreadyDone ? selectedDrill.xp_reward : 0;
      await saveDrillResult(
        selectedDrill.id,
        selectedDrill.practice_type,
        selectedDrill.category,
        passed,
        xp,
        passed ? [] : selectedDrill.concept_tags
      );
      if (passed && !alreadyDone) {
        toast({ title: `⚡ +${selectedDrill.xp_reward} XP`, description: `"${selectedDrill.title}" completed!` });
      }
    },
    [selectedDrill, completedDrills, saveDrillResult, toast]
  );

  const categoryStats = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const lessons = lessonsData.filter(cat.match);
      const done = lessons.filter((l) => completedLessons.includes(l.id)).length;
      return { ...cat, lessons, done, total: lessons.length };
    });
  }, [completedLessons]);

  if (selectedDrill) {
    return (
      <PageShell>
        <DrillDetail
          drill={selectedDrill}
          alreadyCompleted={completedDrills.includes(selectedDrill.id)}
          onComplete={handleDrillComplete}
          onBack={() => setSelectedDrillId(null)}
          onSelectLesson={handleSelectLesson}
        />
      </PageShell>
    );
  }

  if (selectedLesson) {
    return (
      <PageShell>
        <LessonDetailV2
          lesson={selectedLesson}
          completed={completedLessons.includes(selectedLesson.id)}
          onBack={handleBackFromLesson}
          onLessonComplete={refetch}
          onSelectLesson={handleSelectLesson}
          onSelectDrill={handleSelectDrill}
        />
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col gap-4 px-4 pt-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-24 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-4">
          <LearnHeader totalXp={totalXp} streak={streak} completedCount={completedLessons.length} />
        </div>

        {/* 3-column grid (lg+); single-column on mobile/tablet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: weak tags sidebar (desktop only, on top of stack on mobile) */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <AdaptiveWeakTagsSidebar
              quizAttempts={quizAttempts}
              completedLessons={completedLessons}
              onSelectLesson={handleSelectLesson}
            />
          </aside>

          {/* Center: category grid */}
          <main className="lg:col-span-6 order-1 lg:order-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoryStats.map((cat, i) => {
                const Icon = cat.icon;
                const pct = cat.total > 0 ? (cat.done / cat.total) * 100 : 0;
                const isExpanded = expandedCategory === cat.key;
                const isComplete = cat.done === cat.total && cat.total > 0;
                return (
                  <motion.div
                    key={cat.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <GlassCard
                      hoverable
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                      className={`flex flex-col gap-2 ${isExpanded ? "border-primary/40" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{cat.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {cat.done}/{cat.total} lessons complete
                          </p>
                        </div>
                        {isComplete && <CheckCircle2 className="h-4 w-4 text-verdict-buy shrink-0" />}
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>

            {/* Expanded category lessons */}
            <AnimatePresence>
              {expandedCategory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <div className="flex flex-col gap-2">
                    {categoryStats
                      .find((c) => c.key === expandedCategory)
                      ?.lessons.map((lesson, i) => {
                        const done = completedLessons.includes(lesson.id);
                        return (
                          <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <GlassCard hoverable onClick={() => handleSelectLesson(lesson.id)}>
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{lesson.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    {done && <CheckCircle2 className="h-3.5 w-3.5 text-verdict-buy shrink-0" />}
                                    <p className="text-sm font-semibold truncate">{lesson.title}</p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${difficultyColors[lesson.difficulty]}`}
                                    >
                                      {lesson.difficulty}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {lesson.duration_minutes} min · +{lesson.xp_reward} XP
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </GlassCard>
                          </motion.div>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Right: weekly recap (desktop only) */}
          <aside className="lg:col-span-3 order-3 lg:order-3">
            <WeeklyRecapCard />
          </aside>
        </div>
      </div>
    </PageShell>
  );
};

export default Learn;
