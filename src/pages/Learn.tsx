import { useState, useMemo, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lessonsData } from "@/data/lessonsData";
import { drillsData } from "@/data/drillsData";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { usePracticeProgress } from "@/hooks/use-practice-progress";
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
  const { completedLessons, totalXp, streak, quizAttempts, loading, refetch, learningDates } = useLearningProgress();
  const { completedDrills, records: practiceRecords, saveDrillResult } = usePracticeProgress();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const { toast } = useToast();

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

  // Learning dates map
  const learningDatesMap = useMemo(() => {
    return learningDates || new Map<string, string>();
  }, [learningDates]);

  // Drill detail view
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
        <LessonDetail
          lesson={selectedLesson}
          completed={completedLessons.includes(selectedLesson.id)}
          onBack={() => setSelectedLessonId(null)}
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
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        <LearnHeader
          totalXp={totalXp}
          streak={streak}
          completedCount={completedLessons.length}
        />

        <Tabs defaultValue="foryou">
          <TabsList className="w-full bg-secondary/50 h-10">
            <TabsTrigger value="foryou" className="flex-1 text-[11px]">✨ For You</TabsTrigger>
            <TabsTrigger value="lessons" className="flex-1 text-[11px]">Lessons</TabsTrigger>
            <TabsTrigger value="practice" className="flex-1 text-[11px]">Practice</TabsTrigger>
            <TabsTrigger value="review" className="flex-1 text-[11px]">Review</TabsTrigger>
            <TabsTrigger value="badges" className="flex-1 text-[11px]">Badges</TabsTrigger>
          </TabsList>

          <TabsContent value="foryou">
            <ForYouTab
              completedLessons={completedLessons}
              totalXp={totalXp}
              streak={streak}
              quizAttempts={quizAttempts}
              onSelectLesson={handleSelectLesson}
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
            <BadgesTab completedLessons={completedLessons} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
};

export default Learn;
