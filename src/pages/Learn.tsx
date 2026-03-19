import { useState } from "react";
import PageShell from "@/components/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lessonsData } from "@/data/lessonsData";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import LearnHeader from "@/components/learn/LearnHeader";
import ForYouTab from "@/components/learn/ForYouTab";
import LessonsTab from "@/components/learn/LessonsTab";
import PracticeTab from "@/components/learn/PracticeTab";
import ReviewTab from "@/components/learn/ReviewTab";
import BadgesTab from "@/components/learn/BadgesTab";
import LessonDetail from "@/components/learn/LessonDetail";
import { Skeleton } from "@/components/ui/skeleton";

const Learn = () => {
  const { completedLessons, totalXp, streak, quizAttempts, loading, refetch } = useLearningProgress();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const selectedLesson = selectedLessonId ? lessonsData.find(l => l.id === selectedLessonId) : null;

  const handleSelectLesson = (id: string) => {
    setSelectedLessonId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (selectedLesson) {
    return (
      <PageShell>
        <LessonDetail
          lesson={selectedLesson}
          completed={completedLessons.includes(selectedLesson.id)}
          onBack={() => setSelectedLessonId(null)}
          onLessonComplete={refetch}
          onSelectLesson={handleSelectLesson}
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
            <LessonsTab completedLessons={completedLessons} onSelectLesson={handleSelectLesson} />
          </TabsContent>

          <TabsContent value="practice">
            <PracticeTab completedLessons={completedLessons} />
          </TabsContent>

          <TabsContent value="review">
            <ReviewTab completedLessons={completedLessons} quizAttempts={quizAttempts} onSelectLesson={handleSelectLesson} />
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
