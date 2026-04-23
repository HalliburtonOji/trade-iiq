import { useState, useEffect, useMemo, useCallback } from "react";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lessonsData } from "@/data/lessonsData";
import { drillsData } from "@/data/drillsData";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { usePracticeProgress } from "@/hooks/use-practice-progress";
import { useCoachingEngine, type TradeRow, type ReviewRow, type ChartAnalysisRow, type TradingRuleRow } from "@/hooks/use-coaching-engine";
import { useRecommendationEngine } from "@/hooks/use-recommendation-engine";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LearnHeader from "@/components/learn/LearnHeader";
import ForYouTab from "@/components/learn/ForYouTab";
import LessonsTab from "@/components/learn/LessonsTab";
import PracticeTab from "@/components/learn/PracticeTab";
import ReviewTab from "@/components/learn/ReviewTab";
import BadgesTab from "@/components/learn/BadgesTab";
import LessonDetail from "@/components/learn/LessonDetail";
import DrillDetail from "@/components/learn/DrillDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const Learn = () => {
  const { user } = useAuth();
  const { completedLessons, totalXp, streak, quizAttempts, loading, refetch, learningDates } = useLearningProgress();
  const { completedDrills, records: practiceRecords, saveDrillResult } = usePracticeProgress();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const { toast } = useToast();

  // Coaching data
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [chartAnalyses, setChartAnalyses] = useState<ChartAnalysisRow[]>([]);
  const [tradingRules, setTradingRules] = useState<TradingRuleRow[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("trade_decisions").select("id,symbol,asset_type,decision,outcome,confidence,invalidation_point,thesis_why,notes,time_horizon").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
      supabase.from("decision_reviews").select("trade_decision_id,verdict_correct,timing_correct,followed_plan,emotion,mistake_type,execution_quality").eq("user_id", user.id).limit(100),
      supabase.from("chart_analyses").select("id,symbol,analysis_json").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("trading_rules").select("rule_text,category,is_active").eq("user_id", user.id).eq("is_active", true),
    ]).then(([t, r, c, ru]) => {
      if (t.data) setTrades(t.data as TradeRow[]);
      if (r.data) setReviews(r.data as ReviewRow[]);
      if (c.data) setChartAnalyses(c.data as ChartAnalysisRow[]);
      if (ru.data) setTradingRules(ru.data as TradingRuleRow[]);
    });
  }, [user]);

  const recSignals = useRecommendationEngine(completedLessons, totalXp, streak, quizAttempts);
  const learningDatesMap = useMemo(() => learningDates || new Map<string, string>(), [learningDates]);

  const coaching = useCoachingEngine(
    trades, reviews, chartAnalyses, tradingRules,
    completedLessons, quizAttempts, practiceRecords, learningDatesMap,
    recSignals.weakCategories
  );

  const selectedLesson = selectedLessonId ? lessonsData.find(l => l.id === selectedLessonId) : null;
  const selectedDrill = selectedDrillId ? drillsData.find(d => d.id === selectedDrillId) : null;

  const handleSelectLesson = useCallback((id: string) => {
    setSelectedLessonId(id);
    setSelectedDrillId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSelectDrill = useCallback((drillId: string) => {
    setSelectedDrillId(drillId);
    setSelectedLessonId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDrillComplete = useCallback(async (passed: boolean) => {
    if (!selectedDrill) return;
    const alreadyDone = completedDrills.includes(selectedDrill.id);
    const xp = passed && !alreadyDone ? selectedDrill.xp_reward : 0;
    await saveDrillResult(selectedDrill.id, selectedDrill.practice_type, selectedDrill.category, passed, xp, passed ? [] : selectedDrill.concept_tags);
    if (passed && !alreadyDone) {
      toast({ title: `⚡ +${selectedDrill.xp_reward} XP`, description: `"${selectedDrill.title}" completed!` });
    }
  }, [selectedDrill, completedDrills, saveDrillResult, toast]);

  const stoaCrumb = (
    <span>
      <span className="stoa-greek">Κῶδιξ</span> · Learn
    </span>
  );

  if (selectedDrill) {
    return (
      <StoaShell palette="delphi" crumb={stoaCrumb}>
        <DrillDetail
          drill={selectedDrill}
          alreadyCompleted={completedDrills.includes(selectedDrill.id)}
          onComplete={handleDrillComplete}
          onBack={() => setSelectedDrillId(null)}
          onSelectLesson={handleSelectLesson}
        />
      </StoaShell>
    );
  }

  if (selectedLesson) {
    return (
      <StoaShell palette="delphi" crumb={stoaCrumb}>
        <LessonDetail
          lesson={selectedLesson}
          completed={completedLessons.includes(selectedLesson.id)}
          onBack={() => setSelectedLessonId(null)}
          onLessonComplete={refetch}
          onSelectLesson={handleSelectLesson}
          onSelectDrill={handleSelectDrill}
        />
      </StoaShell>
    );
  }

  if (loading) {
    return (
      <StoaShell palette="delphi" crumb={stoaCrumb}>
        <div className="flex flex-col gap-4 px-4 pt-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </StoaShell>
    );
  }

  return (
    <StoaShell palette="delphi" crumb={stoaCrumb}>
      <div className="flex flex-col gap-2 mb-2 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">GROW · THE CODEX</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Learn</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Κῶδιξ</span>
        </div>
        <p className="text-sm" style={{ color: "var(--stoa-muted)" }}>read · drill · review</p>
      </div>
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        <LearnHeader totalXp={totalXp} streak={streak} completedCount={completedLessons.length} />

        <Tabs defaultValue="foryou">
          <TabsList className="w-full h-10" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 }}>
            <TabsTrigger value="foryou" className="flex-1 text-[11px] stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">✨ For You</TabsTrigger>
            <TabsTrigger value="lessons" className="flex-1 text-[11px] stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Lessons</TabsTrigger>
            <TabsTrigger value="practice" className="flex-1 text-[11px] stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Practice</TabsTrigger>
            <TabsTrigger value="review" className="flex-1 text-[11px] stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Review</TabsTrigger>
            <TabsTrigger value="badges" className="flex-1 text-[11px] stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Badges</TabsTrigger>
          </TabsList>

          <TabsContent value="foryou">
            <ForYouTab
              completedLessons={completedLessons}
              totalXp={totalXp}
              streak={streak}
              quizAttempts={quizAttempts}
              onSelectLesson={handleSelectLesson}
              onSelectDrill={handleSelectDrill}
              coachingCards={coaching.cards}
              weeklyCoachingSummary={coaching.weeklyCoachingSummary}
              studyPlan={coaching.studyPlan}
            />
          </TabsContent>

          <TabsContent value="lessons">
            <LessonsTab
              completedLessons={completedLessons}
              onSelectLesson={handleSelectLesson}
              quizAttempts={quizAttempts}
              totalXp={totalXp}
              streak={streak}
            />
          </TabsContent>

          <TabsContent value="practice">
            <PracticeTab
              completedLessons={completedLessons}
              quizAttempts={quizAttempts}
              totalXp={totalXp}
              streak={streak}
              onSelectLesson={handleSelectLesson}
            />
          </TabsContent>

          <TabsContent value="review">
            <ReviewTab
              completedLessons={completedLessons}
              quizAttempts={quizAttempts}
              practiceRecords={practiceRecords}
              learningDates={learningDatesMap}
              onSelectLesson={handleSelectLesson}
              totalXp={totalXp}
              streak={streak}
            />
          </TabsContent>

          <TabsContent value="badges">
            <BadgesTab
              completedLessons={completedLessons}
              conceptMastery={coaching.conceptMastery}
              categoryMastery={coaching.categoryMastery}
            />
          </TabsContent>
        </Tabs>
      </div>
    </StoaShell>
  );
};

export default Learn;
