import { useMemo } from "react";
import { flashcardsData, type Flashcard } from "@/data/flashcardsData";
import { lessonsData } from "@/data/lessonsData";
import { type QuizAttemptRecord } from "@/hooks/use-learning-progress";
import { type PracticeProgressRecord } from "@/hooks/use-practice-progress";

// Spaced repetition intervals in days
const SR_INTERVALS = [1, 3, 7, 14, 30];

export type ConceptFreshness = "fresh" | "due_soon" | "getting_rusty" | "needs_review";
export type ReviewItemType = "flashcard" | "quick_recap" | "lesson_revisit" | "missed_topic" | "mini_drill" | "weekly_pack" | "foundation_refresher";
export type FlashcardRating = "easy" | "okay" | "again";

export interface FlashcardProgress {
  flashcard_id: string;
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  confidence_rating: FlashcardRating | null;
  interval_stage: number; // index into SR_INTERVALS
  times_reviewed: number;
  needs_review: boolean;
}

export interface ReviewQueueItem {
  id: string;
  review_type: ReviewItemType;
  source_id: string;
  title: string;
  category: string;
  reason: string;
  priority: number; // lower = higher priority
  estimated_minutes: number;
  due: boolean;
}

export interface WeeklyPack {
  weakConcepts: { concept: string; category: string }[];
  reviewFlashcards: Flashcard[];
  revisitLesson: { id: string; title: string; category: string } | null;
  practicalReminder: string;
}

export interface ReviewSignals {
  reviewDueCount: number;
  flashcardsDueCount: number;
  weakConcepts: string[];
  weakCategories: string[];
  reviewQueue: ReviewQueueItem[];
  dueFlashcards: Flashcard[];
  allFlashcards: Flashcard[];
  flashcardProgress: Map<string, FlashcardProgress>;
  weeklyPack: WeeklyPack;
  conceptFreshness: Map<string, ConceptFreshness>;
  lastReviewedAt: string | null;
  recapCards: RecapCard[];
}

export interface RecapCard {
  id: string;
  headline: string;
  explanation: string;
  category: string;
  related_lesson_id: string;
}

const recapCardsData: RecapCard[] = [
  { id: "rc-1", headline: "Support is a zone, not a laser line", explanation: "Price rarely reverses at an exact pixel. Draw zones with a range and give your trades room to breathe.", category: "Technical", related_lesson_id: "support-resistance" },
  { id: "rc-2", headline: "A breakout without confirmation is just a suggestion", explanation: "Volume confirms intent. Without it, the breakout is noise. Wait for a candle close above the level with conviction.", category: "Strategy", related_lesson_id: "breakouts-vs-fakeouts" },
  { id: "rc-3", headline: "Your invalidation is where your thesis dies", explanation: "Not your entry, not your hope — the structural level where your logic no longer holds. That's where the stop goes.", category: "Risk", related_lesson_id: "risk-management" },
  { id: "rc-4", headline: "FOMO is strongest after price already moved", explanation: "The urge to chase hits hardest when the easy money is already gone. Your edge is in the next pullback, not the current panic.", category: "Psychology", related_lesson_id: "fomo-and-chasing" },
  { id: "rc-5", headline: "A high win rate means nothing with oversized losses", explanation: "Winning 80% of trades doesn't help if your average loss is 5x your average win. Risk-reward matters more than accuracy.", category: "Risk", related_lesson_id: "risk-management" },
  { id: "rc-6", headline: "RSI above 70 is not a sell signal", explanation: "In strong uptrends, RSI stays overbought for weeks. Selling at 70 means missing the best part of momentum moves.", category: "Technical", related_lesson_id: "understanding-rsi" },
  { id: "rc-7", headline: "Dead-cat bounces trap impatient buyers", explanation: "A 5% bounce inside a clear downtrend is noise until structure confirms a higher high. Don't mistake relief for reversal.", category: "Technical", related_lesson_id: "bull-bear-markets" },
  { id: "rc-8", headline: "Position size = Risk ÷ Stop Distance", explanation: "This formula keeps your dollar risk consistent regardless of stock price. Forget 'buying 100 shares' — size by risk.", category: "Risk", related_lesson_id: "position-sizing" },
  { id: "rc-9", headline: "Revenge trading compounds damage", explanation: "After a loss, the best next trade is often no trade. Doubling down emotionally turns one mistake into a pattern.", category: "Psychology", related_lesson_id: "fomo-and-chasing" },
  { id: "rc-10", headline: "The close tells truth, the wick tells lies", explanation: "A candle wick above resistance that closes below means buyers failed. Confirmation needs a body close, not just a touch.", category: "Strategy", related_lesson_id: "breakouts-vs-fakeouts" },
  { id: "rc-11", headline: "Market timing matters more than beginners think", explanation: "Trading during Asia session for US stocks means low liquidity, wider spreads, and more false signals. Match your session.", category: "Beginner", related_lesson_id: "market-sessions" },
  { id: "rc-12", headline: "Winning streaks end — your sizing shouldn't inflate", explanation: "Five wins doesn't change the probability of the next trade. Keep consistent sizing so the inevitable loss doesn't erase progress.", category: "Risk", related_lesson_id: "position-sizing" },
];

function getConceptFreshness(lastDate: string | null): ConceptFreshness {
  if (!lastDate) return "needs_review";
  const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince <= 3) return "fresh";
  if (daysSince <= 7) return "due_soon";
  if (daysSince <= 14) return "getting_rusty";
  return "needs_review";
}

export function computeNextReviewDate(rating: FlashcardRating, currentStage: number): { nextStage: number; nextDate: Date } {
  let nextStage = currentStage;
  if (rating === "easy") nextStage = Math.min(currentStage + 2, SR_INTERVALS.length - 1);
  else if (rating === "okay") nextStage = Math.min(currentStage + 1, SR_INTERVALS.length - 1);
  else nextStage = 0; // "again" resets

  const days = SR_INTERVALS[nextStage];
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + days);
  return { nextStage, nextDate };
}

export function useReviewEngine(
  completedLessons: string[],
  quizAttempts: QuizAttemptRecord[],
  practiceRecords: PracticeProgressRecord[],
  flashcardProgressMap: Map<string, FlashcardProgress>,
  learningDates: Map<string, string>, // lessonId -> completed_date
): ReviewSignals {
  return useMemo(() => {
    const now = new Date();

    // Weak categories from quiz
    const catMisses: Record<string, number> = {};
    quizAttempts.forEach(a => {
      if (!a.passed) {
        const lesson = lessonsData.find(l => l.id === a.lesson_id);
        if (lesson) catMisses[lesson.category] = (catMisses[lesson.category] || 0) + 1;
      }
      (a.weak_tags || []).forEach(tag => {
        catMisses[tag] = (catMisses[tag] || 0) + 1;
      });
    });

    // Weak from practice
    practiceRecords.forEach(r => {
      if (!r.passed && r.category) {
        catMisses[r.category] = (catMisses[r.category] || 0) + 1;
      }
    });

    const weakConcepts = Object.entries(catMisses)
      .filter(([, v]) => v >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    const weakCategories = [...new Set(
      weakConcepts
        .map(c => {
          const lesson = lessonsData.find(l => l.quiz.some(q => q.tags.includes(c)));
          return lesson?.category;
        })
        .filter(Boolean) as string[]
    )];

    // Concept freshness
    const conceptFreshness = new Map<string, ConceptFreshness>();
    completedLessons.forEach(lid => {
      const date = learningDates.get(lid) || null;
      conceptFreshness.set(lid, getConceptFreshness(date));
    });

    // Flashcards due
    const dueFlashcards: Flashcard[] = [];
    flashcardsData.forEach(fc => {
      const progress = flashcardProgressMap.get(fc.id);
      if (!progress) {
        // New card — only due if lesson is completed
        if (completedLessons.includes(fc.related_lesson_id)) {
          dueFlashcards.push(fc);
        }
      } else if (progress.needs_review) {
        dueFlashcards.push(fc);
      } else if (progress.next_review_due_at) {
        const dueDate = new Date(progress.next_review_due_at);
        if (dueDate <= now) dueFlashcards.push(fc);
      }
    });

    // All flashcards available (for lessons completed)
    const allFlashcards = flashcardsData.filter(fc =>
      completedLessons.includes(fc.related_lesson_id)
    );

    // Build review queue
    const queue: ReviewQueueItem[] = [];

    // 1. Missed topics repeated
    weakConcepts.slice(0, 3).forEach((concept, i) => {
      queue.push({
        id: `missed-${concept}`,
        review_type: "missed_topic",
        source_id: concept,
        title: `Review: ${concept}`,
        category: weakCategories[0] || "General",
        reason: "Based on missed questions",
        priority: 1 + i,
        estimated_minutes: 2,
        due: true,
      });
    });

    // 2. Flashcards due
    if (dueFlashcards.length > 0) {
      queue.push({
        id: "flashcards-due",
        review_type: "flashcard",
        source_id: "all",
        title: `${dueFlashcards.length} flashcards due`,
        category: "Mixed",
        reason: "Due now",
        priority: 2,
        estimated_minutes: Math.ceil(dueFlashcards.length * 0.3),
        due: true,
      });
    }

    // 3. Foundation refreshers
    const foundationIds = ["what-is-stock-market", "crypto-vs-stocks-forex", "market-sessions", "bull-bear-markets"];
    foundationIds.forEach(fid => {
      const freshness = conceptFreshness.get(fid);
      if (freshness === "getting_rusty" || freshness === "needs_review") {
        const lesson = lessonsData.find(l => l.id === fid);
        if (lesson) {
          queue.push({
            id: `foundation-${fid}`,
            review_type: "foundation_refresher",
            source_id: fid,
            title: lesson.title,
            category: "Beginner",
            reason: "Foundation refresher",
            priority: 3,
            estimated_minutes: 3,
            due: true,
          });
        }
      }
    });

    // 4. Lessons getting rusty
    completedLessons.forEach(lid => {
      const freshness = conceptFreshness.get(lid);
      if (freshness === "getting_rusty" || freshness === "needs_review") {
        if (!foundationIds.includes(lid)) {
          const lesson = lessonsData.find(l => l.id === lid);
          if (lesson) {
            queue.push({
              id: `revisit-${lid}`,
              review_type: "lesson_revisit",
              source_id: lid,
              title: lesson.title,
              category: lesson.category,
              reason: freshness === "needs_review" ? "Not reviewed recently" : "Getting rusty",
              priority: freshness === "needs_review" ? 5 : 6,
              estimated_minutes: 3,
              due: freshness === "needs_review",
            });
          }
        }
      }
    });

    // Sort queue by priority
    queue.sort((a, b) => a.priority - b.priority);

    // Weekly pack
    const weeklyPack: WeeklyPack = {
      weakConcepts: weakConcepts.slice(0, 3).map(c => ({
        concept: c,
        category: lessonsData.find(l => l.quiz.some(q => q.tags.includes(c)))?.category || "General",
      })),
      reviewFlashcards: dueFlashcards.slice(0, 2),
      revisitLesson: completedLessons.length > 0
        ? (() => {
          const rusty = completedLessons
            .map(id => ({ id, freshness: conceptFreshness.get(id) }))
            .filter(x => x.freshness === "needs_review" || x.freshness === "getting_rusty")
            .map(x => lessonsData.find(l => l.id === x.id))
            .filter(Boolean)[0];
          return rusty ? { id: rusty.id, title: rusty.title, category: rusty.category } : null;
        })()
        : null,
      practicalReminder: recapCardsData[Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % recapCardsData.length].explanation,
    };

    // Last reviewed
    let lastReviewedAt: string | null = null;
    flashcardProgressMap.forEach(p => {
      if (p.last_reviewed_at && (!lastReviewedAt || p.last_reviewed_at > lastReviewedAt)) {
        lastReviewedAt = p.last_reviewed_at;
      }
    });

    return {
      reviewDueCount: queue.filter(q => q.due).length,
      flashcardsDueCount: dueFlashcards.length,
      weakConcepts,
      weakCategories,
      reviewQueue: queue.slice(0, 10),
      dueFlashcards,
      allFlashcards,
      flashcardProgress: flashcardProgressMap,
      weeklyPack,
      conceptFreshness,
      lastReviewedAt,
      recapCards: recapCardsData,
    };
  }, [completedLessons, quizAttempts, practiceRecords, flashcardProgressMap, learningDates]);
}
