import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, BookOpen, Sparkles, TrendingUp, Trophy, Zap,
  Target, RotateCcw, Compass, Award, Calendar
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import CoachingCardsComponent from "./CoachingCards";
import WeeklyCoachingSummary from "./WeeklyCoachingSummary";
import StudyPlanCard from "./StudyPlanCard";
import { lessonsData, microLessons } from "@/data/lessonsData";
import { getLevel, type QuizAttemptRecord } from "@/hooks/use-learning-progress";
import {
  useRecommendationEngine,
  getStateLabel,
} from "@/hooks/use-recommendation-engine";
import { type CoachingCard, type StudyPlanDay } from "@/hooks/use-coaching-engine";

interface Props {
  completedLessons: string[];
  totalXp: number;
  streak: number;
  quizAttempts: QuizAttemptRecord[];
  onSelectLesson: (lessonId: string) => void;
  onSelectDrill?: (drillId: string) => void;
  coachingCards?: CoachingCard[];
  weeklyCoachingSummary?: { strength: string; weakness: string; pattern: string; nextFocus: string; recommendedLessonId: string | null };
  studyPlan?: StudyPlanDay[];
}

const MAX_CARDS = 10;

const ForYouTab = ({ completedLessons, totalXp, streak, quizAttempts, onSelectLesson, onSelectDrill, coachingCards = [], weeklyCoachingSummary, studyPlan }: Props) => {
  const signals = useRecommendationEngine(completedLessons, totalXp, streak, quizAttempts);
  const level = getLevel(totalXp);
  const stateLabel = getStateLabel(signals.learnerState);

  const dailyMicro = useMemo(() => {
    const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return microLessons[day % microLessons.length];
  }, []);

  const cards = useMemo(() => {
    const result: React.ReactNode[] = [];

    // P0: Study Plan (if has data)
    if (studyPlan && studyPlan.length > 0 && completedLessons.length >= 1) {
      result.push(
        <div key="study-plan">
          <StudyPlanCard plan={studyPlan} onSelectLesson={onSelectLesson} onSelectDrill={onSelectDrill} />
        </div>
      );
    }

    // P1: Continue / Recommended Next
    if (signals.recommendedNextLesson) {
      const lesson = signals.recommendedNextLesson;
      const isNewUser = completedLessons.length === 0;
      const label = isNewUser
        ? "Start here"
        : signals.weakCategories.includes(lesson.category)
          ? `Because you struggled in ${lesson.category}`
          : signals.isBeginner ? "Strong foundation builder" : "Best next step";

      result.push(
        <GlassCard key="next" hoverable onClick={() => onSelectLesson(lesson.id)}
          className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/15">
              {isNewUser ? <Sparkles className="h-5 w-5 text-primary" /> : <BookOpen className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary">
                {isNewUser ? "Recommended for You" : "Continue Learning"}
              </p>
              <p className="text-sm font-bold truncate">{lesson.title}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{lesson.summary}</p>
              <div className="flex items-center gap-1 mt-2 text-primary text-xs font-medium">
                {isNewUser ? "Start Lesson" : "Continue"} <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </GlassCard>
      );
    }

    // P1.5: Coaching cards (top 3)
    if (coachingCards.length > 0) {
      result.push(
        <div key="coaching">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Personal Coaching
          </p>
          <CoachingCardsComponent cards={coachingCards.slice(0, 3)} onSelectLesson={onSelectLesson} />
        </div>
      );
    }

    // P2: Weakest Category
    if (signals.weakCategories.length > 0) {
      const weakCat = signals.weakCategories[0];
      const weakLesson = lessonsData.find(l => l.category === weakCat && !completedLessons.includes(l.id));
      result.push(
        <GlassCard key="weak" hoverable={!!weakLesson}
          onClick={weakLesson ? () => onSelectLesson(weakLesson.id) : undefined}
          className="border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15"><Target className="h-5 w-5 text-amber-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-400 mb-0.5">Weakest Area</p>
              <p className="text-sm font-bold">{weakCat}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">Based on recent quiz results</p>
              {weakLesson && (
                <div className="flex items-center gap-1 mt-2 text-amber-400 text-xs font-medium">
                  Review Category <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      );
    } else if (completedLessons.length === 0) {
      result.push(
        <GlassCard key="foundation" className="border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15"><Target className="h-5 w-5 text-amber-400" /></div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-400 mb-0.5">Build Your Foundation</p>
              <p className="text-sm text-foreground/85 mt-1">Start with Beginner lessons before the indicators start chatting nonsense.</p>
            </div>
          </div>
        </GlassCard>
      );
    }

    // P3: Weekly coaching summary
    if (weeklyCoachingSummary && completedLessons.length >= 3) {
      result.push(
        <div key="weekly-coaching">
          <WeeklyCoachingSummary summary={weeklyCoachingSummary} onSelectLesson={onSelectLesson} />
        </div>
      );
    }

    // P4: Review Due
    if (signals.reviewDueCount > 0 && completedLessons.length >= 3) {
      const reviewLesson = signals.recommendedReviewLessons[0];
      if (reviewLesson) {
        result.push(
          <GlassCard key="review" hoverable onClick={() => onSelectLesson(reviewLesson.id)} className="border-accent/15">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-accent/15"><RotateCcw className="h-5 w-5 text-accent" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-accent mb-0.5">Review Due</p>
                <p className="text-sm font-bold truncate">{reviewLesson.title}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">Review recommended</p>
                <div className="flex items-center gap-1 mt-2 text-accent text-xs font-medium">
                  Review Now <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </GlassCard>
        );
      }
    }

    // P5: Focus Area
    if (completedLessons.length >= 1) {
      result.push(
        <GlassCard key="focus" className="border-primary/10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/15"><Compass className="h-5 w-5 text-primary" /></div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-primary mb-0.5">Current Focus</p>
              <p className="text-sm font-bold">{signals.currentFocusArea}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{stateLabel}</p>
            </div>
          </div>
        </GlassCard>
      );
    }

    // P6: Daily Micro
    result.push(
      <GlassCard key="micro" className="border-accent/15 bg-gradient-to-br from-accent/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-accent/15"><Zap className="h-5 w-5 text-accent" /></div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-accent mb-1">Daily Concept</p>
            <p className="text-sm text-foreground/85 leading-relaxed">{dailyMicro.text}</p>
            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{dailyMicro.category}</span>
          </div>
        </div>
      </GlassCard>
    );

    // P7: Progress Summary
    result.push(
      <GlassCard key="summary">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/15"><Trophy className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-primary mb-2">Your Progress</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center"><p className="text-lg font-bold">{completedLessons.length}</p><p className="text-[10px] text-muted-foreground">Lessons</p></div>
              <div className="text-center"><p className="text-lg font-bold">{signals.totalQuizPasses}</p><p className="text-[10px] text-muted-foreground">Quizzes</p></div>
              <div className="text-center"><p className="text-lg font-bold">{totalXp}</p><p className="text-[10px] text-muted-foreground">XP</p></div>
              <div className="text-center"><p className="text-lg font-bold">{streak}</p><p className="text-[10px] text-muted-foreground">Streak</p></div>
            </div>
          </div>
        </div>
      </GlassCard>
    );

    return result.slice(0, MAX_CARDS);
  }, [signals, completedLessons, totalXp, streak, dailyMicro, onSelectLesson, stateLabel, level, coachingCards, weeklyCoachingSummary, studyPlan, onSelectDrill]);

  return (
    <div className="flex flex-col gap-3 mt-3">
      {cards.map((card, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          {card}
        </motion.div>
      ))}
    </div>
  );
};

export default ForYouTab;
