import { useMemo } from "react";
import { lessonsData, type Lesson, badges } from "@/data/lessonsData";
import { getLevel, getWeakCategories, type QuizAttemptRecord } from "@/hooks/use-learning-progress";

// Curriculum progression order
const CURRICULUM_ORDER = [
  "what-is-stock-market",
  "crypto-vs-stocks-forex",
  "market-sessions",
  "bull-bear-markets",
  "support-resistance",
  "trend-market-structure",
  "understanding-rsi",
  "understanding-macd",
  "risk-management",
  "position-sizing",
  "fomo-and-chasing",
  "breakouts-vs-fakeouts",
];

const FOUNDATION_IDS = [
  "what-is-stock-market",
  "crypto-vs-stocks-forex",
  "market-sessions",
  "bull-bear-markets",
];

export type LearnerState =
  | "new_learner"
  | "foundation_learner"
  | "active_learner"
  | "building_consistency"
  | "strong_progress";

export interface UserLearningSignals {
  learnerState: LearnerState;
  weakCategories: string[];
  weakConcepts: string[];
  strongCategories: string[];
  recommendedNextLesson: Lesson | null;
  recommendedReviewLessons: Lesson[];
  currentFocusArea: string;
  isBeginner: boolean;
  totalQuizPasses: number;
  reviewDueCount: number;
  foundationsComplete: boolean;
  categoryStats: Record<string, { completed: number; total: number; weak: boolean; strong: boolean; label: string }>;
  badgeProgress: { id: string; name: string; icon: string; current: number; target: number; close: boolean }[];
}

export interface SmartCard {
  id: string;
  priority: number;
  type: string;
  label: string; // recommendation reason
}

function getLearnerState(completedCount: number, totalXp: number, streak: number): LearnerState {
  if (completedCount === 0) return "new_learner";
  if (completedCount < 4) return "foundation_learner";
  if (completedCount < 7) return "active_learner";
  if (completedCount < 10) return "building_consistency";
  return "strong_progress";
}

function getWeakConcepts(attempts: QuizAttemptRecord[]): string[] {
  const tagStats: Record<string, { correct: number; total: number }> = {};
  attempts.forEach(a => {
    (a.weak_tags || []).forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { correct: 0, total: 0 };
      tagStats[tag].total += 1;
    });
  });
  // Also scan by tags from quiz questions via lesson data
  attempts.forEach(a => {
    const lesson = lessonsData.find(l => l.id === a.lesson_id);
    if (!lesson) return;
    lesson.quiz.forEach(q => {
      q.tags.forEach(tag => {
        if (!tagStats[tag]) tagStats[tag] = { correct: 0, total: 0 };
        tagStats[tag].total += 1;
      });
    });
    // If they passed, mark tags as somewhat correct
    if (a.passed) {
      lesson.quiz.forEach(q => {
        q.tags.forEach(tag => {
          if (tagStats[tag]) tagStats[tag].correct += 1;
        });
      });
    }
  });
  return Object.entries(tagStats)
    .filter(([, v]) => v.total >= 2 && v.correct / v.total < 0.5)
    .map(([k]) => k);
}

function getCategoryStats(completed: string[]) {
  const categories = ["Beginner", "Technical", "Risk", "Psychology", "Strategy"] as const;
  const stats: Record<string, { completed: number; total: number; weak: boolean; strong: boolean; label: string }> = {};

  categories.forEach(cat => {
    const catLessons = lessonsData.filter(l => l.category === cat);
    const catCompleted = catLessons.filter(l => completed.includes(l.id)).length;
    const ratio = catLessons.length > 0 ? catCompleted / catLessons.length : 0;
    stats[cat] = {
      completed: catCompleted,
      total: catLessons.length,
      weak: false,
      strong: ratio >= 0.75,
      label: ratio === 0 ? "Not started" : ratio < 0.5 ? "Needs attention" : ratio < 1 ? "Building momentum" : "Strong progress",
    };
  });
  return stats;
}

function getStrongCategories(completed: string[]): string[] {
  const stats = getCategoryStats(completed);
  return Object.entries(stats).filter(([, v]) => v.strong).map(([k]) => k);
}

function getBadgeProgress(completed: string[]): UserLearningSignals["badgeProgress"] {
  return [
    { id: "first-steps", name: "First Steps", icon: "🎯", current: Math.min(completed.length, 1), target: 1, close: completed.length === 0 },
    { id: "bookworm", name: "Bookworm", icon: "📚", current: Math.min(completed.length, 3), target: 3, close: completed.length === 2 },
    { id: "beginner-foundations", name: "Beginner Foundations", icon: "🏠", current: lessonsData.filter(l => l.category === "Beginner" && completed.includes(l.id)).length, target: lessonsData.filter(l => l.category === "Beginner").length, close: false },
    { id: "half-way", name: "Half Way", icon: "🌗", current: Math.min(completed.length, 6), target: 6, close: completed.length === 5 },
  ].map(b => ({ ...b, close: b.close || (b.current >= b.target - 1 && b.current < b.target) }));
}

export function useRecommendationEngine(
  completedLessons: string[],
  totalXp: number,
  streak: number,
  quizAttempts: QuizAttemptRecord[]
): UserLearningSignals {
  return useMemo(() => {
    const learnerState = getLearnerState(completedLessons.length, totalXp, streak);
    const isBeginner = completedLessons.length < 3;
    const foundationsComplete = FOUNDATION_IDS.every(id => completedLessons.includes(id));
    const weakCategories = getWeakCategories(quizAttempts);
    const weakConcepts = getWeakConcepts(quizAttempts);
    const strongCategories = getStrongCategories(completedLessons);
    const totalQuizPasses = quizAttempts.filter(a => a.passed).length;

    const catStats = getCategoryStats(completedLessons);
    // Mark weak categories from quiz data
    weakCategories.forEach(wc => {
      if (catStats[wc]) catStats[wc].weak = true;
    });

    // Recommended next lesson via curriculum progression
    let recommendedNextLesson: Lesson | null = null;

    if (isBeginner && !foundationsComplete) {
      // Beginner protection: stick to foundations
      recommendedNextLesson = lessonsData.find(
        l => FOUNDATION_IDS.includes(l.id) && !completedLessons.includes(l.id)
      ) || null;
    } else if (weakCategories.length > 0) {
      // Prioritise weak category
      recommendedNextLesson = lessonsData.find(
        l => weakCategories.includes(l.category) && !completedLessons.includes(l.id)
      ) || null;
    }

    if (!recommendedNextLesson) {
      // Follow curriculum order
      const nextId = CURRICULUM_ORDER.find(id => !completedLessons.includes(id));
      recommendedNextLesson = nextId ? lessonsData.find(l => l.id === nextId) || null : null;
    }

    // Review recommendations: completed lessons, prioritise weak categories
    const recommendedReviewLessons = lessonsData
      .filter(l => completedLessons.includes(l.id))
      .sort((a, b) => {
        const aWeak = weakCategories.includes(a.category) ? -1 : 0;
        const bWeak = weakCategories.includes(b.category) ? -1 : 0;
        return aWeak - bWeak;
      })
      .slice(0, 5);

    // Focus area
    let currentFocusArea = "Foundations";
    if (foundationsComplete && weakCategories.length > 0) {
      currentFocusArea = weakCategories[0];
    } else if (foundationsComplete) {
      // Find the category with most incomplete lessons
      const incomplete = Object.entries(catStats)
        .filter(([k]) => k !== "Beginner")
        .sort((a, b) => (a[1].completed / a[1].total) - (b[1].completed / b[1].total));
      if (incomplete.length > 0) currentFocusArea = incomplete[0][0];
    }

    const reviewDueCount = completedLessons.length;

    const badgeProgress = getBadgeProgress(completedLessons);

    return {
      learnerState,
      weakCategories,
      weakConcepts,
      strongCategories,
      recommendedNextLesson,
      recommendedReviewLessons,
      currentFocusArea,
      isBeginner,
      totalQuizPasses,
      reviewDueCount,
      foundationsComplete,
      categoryStats: catStats,
      badgeProgress,
    };
  }, [completedLessons, totalXp, streak, quizAttempts]);
}

// Labels by learner state
export function getStateLabel(state: LearnerState): string {
  switch (state) {
    case "new_learner": return "Start here";
    case "foundation_learner": return "Build your base first";
    case "active_learner": return "Good momentum";
    case "building_consistency": return "Keep the streak alive";
    case "strong_progress": return "You're building real understanding";
  }
}

export function getRecommendationLabel(
  lesson: Lesson,
  signals: UserLearningSignals
): string | null {
  if (signals.isBeginner && lesson.category === "Beginner") return "Start here";
  if (signals.weakCategories.includes(lesson.category)) return "Because you struggled in " + lesson.category;
  // Check if it's the recommended next
  if (signals.recommendedNextLesson?.id === lesson.id) return "Best next step";
  // Check curriculum adjacency
  const lastCompleted = CURRICULUM_ORDER.filter(id =>
    signals.recommendedReviewLessons.some(l => l.id === id) ||
    signals.strongCategories.includes(lessonsData.find(x => x.id === id)?.category || "")
  );
  if (lastCompleted.length > 0) {
    const prevLesson = lessonsData.find(l => l.id === lastCompleted[lastCompleted.length - 1]);
    if (prevLesson?.related_lessons.includes(lesson.id)) return "Good next step";
  }
  if (signals.categoryStats[lesson.category]?.weak) return "Review recommended";
  if (lesson.category === "Beginner") return "Strong foundation builder";
  return null;
}

export { FOUNDATION_IDS, CURRICULUM_ORDER };
