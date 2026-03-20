import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RotateCcw, BookOpen, Clock, AlertTriangle, Target, Brain,
  Layers, Zap, ArrowRight, Eye, Sparkles, CheckCircle2, Flame
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import FlashcardFlow from "./FlashcardFlow";
import { lessonsData } from "@/data/lessonsData";
import { type QuizAttemptRecord } from "@/hooks/use-learning-progress";
import { type PracticeProgressRecord } from "@/hooks/use-practice-progress";
import {
  useReviewEngine,
  computeNextReviewDate,
  type FlashcardProgress,
  type FlashcardRating,
  type ConceptFreshness,
} from "@/hooks/use-review-engine";

interface Props {
  completedLessons: string[];
  quizAttempts: QuizAttemptRecord[];
  practiceRecords: PracticeProgressRecord[];
  learningDates: Map<string, string>;
  onSelectLesson: (lessonId: string) => void;
  totalXp?: number;
  streak?: number;
}

const freshnessLabels: Record<ConceptFreshness, { label: string; color: string }> = {
  fresh: { label: "Fresh", color: "text-verdict-buy" },
  due_soon: { label: "Due soon", color: "text-amber-400" },
  getting_rusty: { label: "Getting rusty", color: "text-orange-400" },
  needs_review: { label: "Needs review", color: "text-verdict-avoid" },
};

const ReviewTab = ({ completedLessons, quizAttempts, practiceRecords, learningDates, onSelectLesson, totalXp = 0, streak = 0 }: Props) => {
  // Local flashcard progress stored in localStorage for Phase 4
  const [flashcardProgressMap, setFlashcardProgressMap] = useState<Map<string, FlashcardProgress>>(() => {
    try {
      const stored = localStorage.getItem("tradeiq_flashcard_progress");
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, FlashcardProgress>;
        return new Map(Object.entries(parsed));
      }
    } catch {}
    return new Map();
  });

  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showWeeklyPack, setShowWeeklyPack] = useState(false);

  // Persist flashcard progress
  useEffect(() => {
    const obj: Record<string, FlashcardProgress> = {};
    flashcardProgressMap.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem("tradeiq_flashcard_progress", JSON.stringify(obj));
  }, [flashcardProgressMap]);

  const signals = useReviewEngine(
    completedLessons, quizAttempts, practiceRecords, flashcardProgressMap, learningDates
  );

  const handleFlashcardRate = useCallback((flashcardId: string, rating: FlashcardRating) => {
    setFlashcardProgressMap(prev => {
      const next = new Map(prev);
      const existing = next.get(flashcardId);
      const currentStage = existing?.interval_stage ?? 0;
      const { nextStage, nextDate } = computeNextReviewDate(rating, currentStage);

      next.set(flashcardId, {
        flashcard_id: flashcardId,
        last_reviewed_at: new Date().toISOString(),
        next_review_due_at: nextDate.toISOString(),
        confidence_rating: rating,
        interval_stage: nextStage,
        times_reviewed: (existing?.times_reviewed ?? 0) + 1,
        needs_review: rating === "again",
      });
      return next;
    });
  }, []);

  // Flashcard view
  if (showFlashcards) {
    const cards = signals.dueFlashcards.length > 0 ? signals.dueFlashcards : signals.allFlashcards;
    return (
      <FlashcardFlow
        flashcards={cards}
        onRate={handleFlashcardRate}
        onBack={() => setShowFlashcards(false)}
        onSelectLesson={onSelectLesson}
      />
    );
  }

  // Empty state
  if (completedLessons.length === 0) {
    return (
      <div className="flex flex-col gap-3 mt-3">
        <GlassCard className="text-center py-8">
          <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground/70">Finish your first lesson to unlock Review</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px] mx-auto">
            Complete a lesson, take the quiz, and your review cards will appear here automatically.
          </p>
        </GlassCard>
      </div>
    );
  }

  // Weekly pack view
  if (showWeeklyPack) {
    const pack = signals.weeklyPack;
    return (
      <div className="flex flex-col gap-3 mt-3">
        <button onClick={() => setShowWeeklyPack(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw className="h-4 w-4" /> Back to Review
        </button>
        <GlassCard className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-5 w-5 text-primary" />
            <p className="text-sm font-bold">Weekly Revision Pack</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Tighten your weak spots. Estimated 5–8 minutes.</p>
        </GlassCard>

        {pack.weakConcepts.length > 0 && (
          <>
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Weak Concepts</p>
            {pack.weakConcepts.map(wc => (
              <GlassCard key={wc.concept} className="border-amber-500/15">
                <p className="text-sm font-semibold">{wc.concept}</p>
                <p className="text-[10px] text-muted-foreground">{wc.category} · Review recommended</p>
              </GlassCard>
            ))}
          </>
        )}

        {pack.reviewFlashcards.length > 0 && (
          <>
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Flashcards</p>
            <GlassCard hoverable onClick={() => { setShowWeeklyPack(false); setShowFlashcards(true); }} className="border-primary/15">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{pack.reviewFlashcards.length} flashcards to review</p>
                  <p className="text-[10px] text-muted-foreground">Strengthen your recall</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </GlassCard>
          </>
        )}

        {pack.revisitLesson && (
          <>
            <p className="text-xs font-semibold text-accent flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Revisit</p>
            <GlassCard hoverable onClick={() => onSelectLesson(pack.revisitLesson!.id)} className="border-accent/15">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{pack.revisitLesson.title}</p>
                  <p className="text-[10px] text-muted-foreground">{pack.revisitLesson.category} · Refresh your understanding</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </GlassCard>
          </>
        )}

        <GlassCard className="border-accent/10">
          <p className="text-xs font-bold text-accent mb-1">💡 Practical Reminder</p>
          <p className="text-[13px] text-foreground/80 leading-relaxed">{pack.practicalReminder}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* Review Summary */}
      <GlassCard className="border-primary/15 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/15">
            <RotateCcw className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Review Hub</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{signals.reviewDueCount}</p>
                <p className="text-[9px] text-muted-foreground">Due</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-accent">{signals.flashcardsDueCount}</p>
                <p className="text-[9px] text-muted-foreground">Flashcards</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-400">{signals.weakConcepts.length}</p>
                <p className="text-[9px] text-muted-foreground">Weak</p>
              </div>
              {signals.lastReviewedAt && (
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Last review</p>
                  <p className="text-[10px] font-medium">{new Date(signals.lastReviewedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Flashcards CTA */}
      {signals.allFlashcards.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard
            hoverable
            onClick={() => setShowFlashcards(true)}
            className={signals.dueFlashcards.length > 0 ? "border-primary/25 bg-gradient-to-br from-primary/10 to-transparent" : ""}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/15">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">
                  {signals.dueFlashcards.length > 0
                    ? `${signals.dueFlashcards.length} flashcards due`
                    : "Review flashcards"
                  }
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {signals.dueFlashcards.length > 0 ? "Due now · Strengthen your recall" : `${signals.allFlashcards.length} cards available`}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Weekly Pack */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard hoverable onClick={() => setShowWeeklyPack(true)} className="border-accent/15">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/15">
              <Layers className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Weekly Revision Pack</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {signals.weeklyPack.weakConcepts.length} concepts · {signals.weeklyPack.reviewFlashcards.length} flashcards · ~5 min
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-accent" />
          </div>
        </GlassCard>
      </motion.div>

      {/* Weak areas */}
      {signals.weakConcepts.length > 0 && (
        <>
          <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mt-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Missed Topics
          </p>
          {signals.weakConcepts.slice(0, 4).map((concept, i) => {
            const relatedLesson = lessonsData.find(l => l.quiz.some(q => q.tags.includes(concept)));
            return (
              <motion.div key={concept} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <GlassCard
                  hoverable
                  onClick={() => relatedLesson && onSelectLesson(relatedLesson.id)}
                  className="border-amber-500/10"
                >
                  <div className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{concept}</p>
                      <p className="text-[10px] text-amber-400/80 italic">Based on missed questions</p>
                      {relatedLesson && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Review: {relatedLesson.title}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-400/50" />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </>
      )}

      {/* Review Queue */}
      {signals.reviewQueue.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs font-semibold text-muted-foreground">Review Queue</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {signals.reviewQueue.length}
            </span>
          </div>
          {signals.reviewQueue.slice(0, 6).map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <GlassCard
                hoverable
                onClick={() => {
                  if (item.review_type === "flashcard") setShowFlashcards(true);
                  else if (item.source_id) onSelectLesson(item.source_id);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-muted/20">
                    {item.review_type === "flashcard" ? <Brain className="h-4 w-4 text-primary" /> :
                     item.review_type === "missed_topic" ? <Target className="h-4 w-4 text-amber-400" /> :
                     item.review_type === "foundation_refresher" ? <Sparkles className="h-4 w-4 text-accent" /> :
                     <BookOpen className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-primary/80 italic">{item.reason}</span>
                      <span className="text-[10px] text-muted-foreground">~{item.estimated_minutes} min</span>
                    </div>
                  </div>
                  {item.due && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium shrink-0">Due</span>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </>
      )}

      {/* Quick Recap Cards */}
      <div className="flex items-center gap-2 mt-2">
        <p className="text-xs font-semibold text-muted-foreground">Quick Recaps</p>
      </div>
      {signals.recapCards.slice(0, 4).map((rc, i) => (
        <motion.div key={rc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
          <GlassCard hoverable onClick={() => onSelectLesson(rc.related_lesson_id)}>
            <p className="text-sm font-semibold mb-1">{rc.headline}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{rc.explanation}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{rc.category}</span>
              <span className="text-[10px] text-primary/60 flex items-center gap-0.5"><BookOpen className="h-3 w-3" /> Review lesson</span>
            </div>
          </GlassCard>
        </motion.div>
      ))}

      {/* Completed Lessons with Freshness */}
      {completedLessons.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs font-semibold text-muted-foreground">Completed Lessons</p>
          </div>
          {completedLessons.slice(0, 8).map((lid, i) => {
            const lesson = lessonsData.find(l => l.id === lid);
            if (!lesson) return null;
            const freshness = signals.conceptFreshness.get(lid) || "needs_review";
            const fInfo = freshnessLabels[freshness];
            const date = learningDates.get(lid);

            return (
              <motion.div key={lid} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard hoverable onClick={() => onSelectLesson(lid)}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{lesson.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{lesson.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium ${fInfo.color}`}>{fInfo.label}</span>
                        {date && <span className="text-[10px] text-muted-foreground">{new Date(date).toLocaleDateString()}</span>}
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

      {/* All clear state */}
      {signals.reviewDueCount === 0 && signals.flashcardsDueCount === 0 && signals.weakConcepts.length === 0 && (
        <GlassCard className="border-verdict-buy/15 text-center py-6">
          <CheckCircle2 className="h-6 w-6 text-verdict-buy mx-auto mb-1" />
          <p className="text-sm font-semibold text-verdict-buy">Keep concepts fresh</p>
          <p className="text-[11px] text-muted-foreground mt-1">No urgent reviews. Explore flashcards or the weekly pack to stay sharp.</p>
        </GlassCard>
      )}
    </div>
  );
};

export default ReviewTab;
