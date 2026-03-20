import { useMemo } from "react";
import { motion } from "framer-motion";
import { RotateCcw, BookOpen, Clock, AlertTriangle, Target } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { lessonsData } from "@/data/lessonsData";
import { getWeakCategories, type QuizAttemptRecord } from "@/hooks/use-learning-progress";
import { useRecommendationEngine } from "@/hooks/use-recommendation-engine";

interface Props {
  completedLessons: string[];
  quizAttempts: QuizAttemptRecord[];
  onSelectLesson: (lessonId: string) => void;
  totalXp?: number;
  streak?: number;
}

const ReviewTab = ({ completedLessons, quizAttempts, onSelectLesson, totalXp = 0, streak = 0 }: Props) => {
  const signals = useRecommendationEngine(completedLessons, totalXp, streak, quizAttempts);

  const weakCats = signals.weakCategories;
  const weakLessons = useMemo(
    () => lessonsData.filter(l => weakCats.includes(l.category) && completedLessons.includes(l.id)),
    [weakCats, completedLessons]
  );

  const reviewLessons = signals.recommendedReviewLessons;

  // Empty state
  if (completedLessons.length === 0) {
    return (
      <div className="flex flex-col gap-3 mt-3">
        <GlassCard className="text-center py-8">
          <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground/70">No lessons completed yet</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px] mx-auto">
            Complete your first lesson and it will appear here for review. Start with the Beginner category!
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* Weak areas section */}
      {weakCats.length > 0 && (
        <>
          <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Weak Areas
          </p>
          <GlassCard className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15">
                <Target className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-400 mb-1">Topics to Review</p>
                <p className="text-[11px] text-muted-foreground">
                  Based on recent quiz results: {weakCats.join(", ")}
                </p>
                {signals.weakConcepts.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1 italic">
                    Weak concepts: {signals.weakConcepts.slice(0, 3).join(", ")}
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
          {weakLessons.map((lesson, i) => (
            <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard hoverable onClick={() => onSelectLesson(lesson.id)} className="border-amber-500/10">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lesson.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{lesson.title}</p>
                    <p className="text-[10px] text-amber-400/80 italic mt-0.5">Because you struggled in {lesson.category}</p>
                    <span className="text-[10px] text-muted-foreground">+{lesson.xp_reward} XP earned</span>
                  </div>
                  <RotateCcw className="h-4 w-4 text-amber-400 shrink-0" />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </>
      )}

      {/* Review recommended */}
      {reviewLessons.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs font-semibold text-muted-foreground">Review Recommended</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              {reviewLessons.length}
            </span>
          </div>

          {/* Spaced review placeholder */}
          <GlassCard className="border-accent/15">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-accent/15">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-accent mb-0.5">Spaced Review</p>
                <p className="text-[11px] text-muted-foreground">
                  Flashcards and spaced repetition coming soon. Your completed lessons will automatically generate review cards.
                </p>
              </div>
            </div>
          </GlassCard>

          {reviewLessons.map((lesson, i) => {
            const isWeak = weakCats.includes(lesson.category);
            return (
              <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <GlassCard hoverable onClick={() => onSelectLesson(lesson.id)}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{lesson.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{lesson.title}</p>
                      <p className="text-[10px] text-muted-foreground/60 italic mt-0.5">
                        {isWeak ? "Review recommended — weak area" : "Revisit to reinforce"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {lesson.category}
                        </span>
                      </div>
                    </div>
                    <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </>
      )}

      {/* Keep momentum fallback */}
      {completedLessons.length > 0 && reviewLessons.length === 0 && weakCats.length === 0 && (
        <GlassCard className="border-verdict-buy/15 text-center py-6">
          <p className="text-sm font-semibold text-verdict-buy">No reviews needed right now</p>
          <p className="text-[11px] text-muted-foreground mt-1">Keep your momentum going — start the next lesson.</p>
        </GlassCard>
      )}
    </div>
  );
};

export default ReviewTab;
