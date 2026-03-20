import { useMemo } from "react";
import { lessonsData } from "@/data/lessonsData";
import { drillsData } from "@/data/drillsData";
import { type QuizAttemptRecord } from "@/hooks/use-learning-progress";
import { type PracticeProgressRecord } from "@/hooks/use-practice-progress";

export type CoachingState =
  | "foundation_needs_work"
  | "technical_weakness"
  | "risk_slipping"
  | "psychology_issue"
  | "strategy_mismatch"
  | "confidence_miscalibrated"
  | "process_improving"
  | "strong_progress";

export type CoachingCardType =
  | "strength" | "weakness" | "pattern" | "risk" | "process"
  | "confidence" | "strategy_fit" | "screenshot" | "rule_break"
  | "improvement" | "milestone";

export interface CoachingCard {
  id: string;
  type: CoachingCardType;
  priority: number; // lower = higher
  title: string;
  description: string;
  why: string;
  relevanceLabel: string;
  icon: string;
  color: string; // tailwind token
  cta?: { label: string; lessonId?: string; drillId?: string; route?: string };
}

export interface TradeRow {
  id: string;
  symbol: string;
  asset_type: string;
  decision: string;
  outcome: string;
  confidence: number | null;
  invalidation_point: number | null;
  thesis_why: string | null;
  notes: string | null;
  time_horizon: string | null;
}

export interface ReviewRow {
  trade_decision_id: string;
  verdict_correct: boolean | null;
  timing_correct: boolean | null;
  followed_plan: boolean | null;
  emotion: string | null;
  mistake_type: string | null;
  execution_quality: string | null;
}

export interface ChartAnalysisRow {
  id: string;
  symbol: string | null;
  analysis_json: any;
}

export interface TradingRuleRow {
  rule_text: string;
  category: string;
  is_active: boolean;
}

export interface CoachingSignals {
  cards: CoachingCard[];
  coachingState: CoachingState;
  currentStrength: string | null;
  currentWeakness: string | null;
  improvementSuggestion: string | null;
  weeklyCoachingSummary: {
    strength: string;
    weakness: string;
    pattern: string;
    nextFocus: string;
    recommendedLessonId: string | null;
  };
  conceptMastery: ConceptMastery[];
  categoryMastery: CategoryMastery[];
  studyPlan: StudyPlanDay[];
}

export interface ConceptMastery {
  concept: string;
  category: string;
  state: "not_started" | "emerging" | "building" | "solid" | "needs_review" | "slipping";
  score: number; // 0-100
}

export interface CategoryMastery {
  category: string;
  progress: number; // 0-100
  strengthState: string;
  weaknessState: string | null;
  recommendedAction: string;
}

export interface StudyPlanDay {
  day: string;
  focus: string;
  lessonId: string | null;
  drillId: string | null;
  reviewTask: string | null;
  estimatedMinutes: number;
}

// ─── Coaching Engine ──────────────────────────────────

function getConfidenceCalibration(trades: TradeRow[]): { overconfident: boolean; underconfident: boolean; message: string | null } {
  const highConf = trades.filter(t => (t.confidence || 0) >= 4 && t.outcome !== "PENDING");
  const medConf = trades.filter(t => (t.confidence || 0) >= 2 && (t.confidence || 0) <= 3 && t.outcome !== "PENDING");
  const highWins = highConf.filter(t => t.outcome === "WIN").length;
  const medWins = medConf.filter(t => t.outcome === "WIN").length;
  const highWR = highConf.length >= 3 ? highWins / highConf.length : null;
  const medWR = medConf.length >= 3 ? medWins / medConf.length : null;

  if (highWR !== null && medWR !== null && highWR < medWR) {
    return { overconfident: true, underconfident: false, message: `Your high-confidence trades win ${Math.round(highWR * 100)}% vs ${Math.round(medWR * 100)}% for medium. Confidence is outrunning process.` };
  }
  if (highWR !== null && highWR < 0.4) {
    return { overconfident: true, underconfident: false, message: "Your most confident trades win less than 40%. Confidence is not confirmation." };
  }
  return { overconfident: false, underconfident: false, message: null };
}

function getStrategyStats(trades: TradeRow[]) {
  const completed = trades.filter(t => t.outcome !== "PENDING");
  const decisionCounts: Record<string, { wins: number; total: number }> = {};
  completed.forEach(t => {
    if (!decisionCounts[t.decision]) decisionCounts[t.decision] = { wins: 0, total: 0 };
    decisionCounts[t.decision].total++;
    if (t.outcome === "WIN") decisionCounts[t.decision].wins++;
  });
  const sorted = Object.entries(decisionCounts).sort((a, b) => {
    const aWR = a[1].total >= 2 ? a[1].wins / a[1].total : 0;
    const bWR = b[1].total >= 2 ? b[1].wins / b[1].total : 0;
    return bWR - aWR;
  });
  return { best: sorted[0]?.[0] || null, worst: sorted[sorted.length - 1]?.[0] || null, stats: decisionCounts };
}

function getAssetStats(trades: TradeRow[]) {
  const completed = trades.filter(t => t.outcome !== "PENDING");
  const assetCounts: Record<string, { wins: number; total: number }> = {};
  completed.forEach(t => {
    if (!assetCounts[t.asset_type]) assetCounts[t.asset_type] = { wins: 0, total: 0 };
    assetCounts[t.asset_type].total++;
    if (t.outcome === "WIN") assetCounts[t.asset_type].wins++;
  });
  const sorted = Object.entries(assetCounts).sort((a, b) => {
    const aWR = a[1].total >= 2 ? a[1].wins / a[1].total : 0;
    const bWR = b[1].total >= 2 ? b[1].wins / b[1].total : 0;
    return bWR - aWR;
  });
  return { best: sorted[0]?.[0] || null, worst: sorted[sorted.length - 1]?.[0] || null };
}

function getMistakePatterns(reviews: ReviewRow[]) {
  const mistakes: Record<string, number> = {};
  reviews.forEach(r => {
    if (r.mistake_type) mistakes[r.mistake_type] = (mistakes[r.mistake_type] || 0) + 1;
  });
  return Object.entries(mistakes).sort((a, b) => b[1] - a[1]);
}

function getEmotionPatterns(reviews: ReviewRow[]) {
  const emotions: Record<string, number> = {};
  reviews.forEach(r => {
    if (r.emotion) emotions[r.emotion] = (emotions[r.emotion] || 0) + 1;
  });
  return Object.entries(emotions).sort((a, b) => b[1] - a[1]);
}

function getScreenshotPatterns(analyses: ChartAnalysisRow[]) {
  const patterns: Record<string, number> = {};
  analyses.forEach(a => {
    const json = a.analysis_json;
    if (!json) return;
    if (json.trend) patterns[`trend:${json.trend}`] = (patterns[`trend:${json.trend}`] || 0) + 1;
    if (json.patterns && Array.isArray(json.patterns)) {
      json.patterns.forEach((p: any) => {
        const name = typeof p === "string" ? p : p?.name;
        if (name) patterns[`pattern:${name}`] = (patterns[`pattern:${name}`] || 0) + 1;
      });
    }
    if (json.bias) patterns[`bias:${json.bias}`] = (patterns[`bias:${json.bias}`] || 0) + 1;
  });
  return Object.entries(patterns).sort((a, b) => b[1] - a[1]);
}

// Concept mastery from quiz+drill+lesson data
function buildConceptMastery(
  completedLessons: string[],
  quizAttempts: QuizAttemptRecord[],
  practiceRecords: PracticeProgressRecord[],
  learningDates: Map<string, string>
): ConceptMastery[] {
  const concepts = [
    { concept: "RSI", category: "Technical", lessonIds: ["understanding-rsi"], tags: ["Technical"] },
    { concept: "MACD", category: "Technical", lessonIds: ["understanding-macd"], tags: ["Technical"] },
    { concept: "Support & Resistance", category: "Technical", lessonIds: ["support-resistance"], tags: ["Technical"] },
    { concept: "Trend Structure", category: "Technical", lessonIds: ["trend-market-structure"], tags: ["Technical"] },
    { concept: "Volume", category: "Technical", lessonIds: ["volume-analysis"], tags: ["Technical"] },
    { concept: "Candlesticks", category: "Technical", lessonIds: ["candlestick-patterns"], tags: ["Technical"] },
    { concept: "Moving Averages", category: "Technical", lessonIds: ["moving-averages"], tags: ["Technical"] },
    { concept: "Risk Management", category: "Risk", lessonIds: ["risk-management"], tags: ["Risk"] },
    { concept: "Position Sizing", category: "Risk", lessonIds: ["position-sizing"], tags: ["Risk"] },
    { concept: "FOMO", category: "Psychology", lessonIds: ["fomo-and-chasing"], tags: ["Psychology"] },
    { concept: "Breakouts", category: "Strategy", lessonIds: ["breakouts-vs-fakeouts"], tags: ["Strategy"] },
    { concept: "Market Sessions", category: "Beginner", lessonIds: ["market-sessions"], tags: ["Beginner"] },
    { concept: "Bull vs Bear", category: "Beginner", lessonIds: ["bull-bear-markets"], tags: ["Beginner"] },
    { concept: "Correlation", category: "Advanced", lessonIds: ["correlation-trading"], tags: ["Advanced"] },
    { concept: "Trade Journaling", category: "Advanced", lessonIds: ["trade-journaling"], tags: ["Advanced"] },
    { concept: "Trading Plan", category: "Advanced", lessonIds: ["building-trading-plan"], tags: ["Advanced"] },
  ];

  return concepts.map(c => {
    let score = 0;
    const completed = c.lessonIds.some(id => completedLessons.includes(id));
    if (completed) score += 40;

    // Quiz performance
    const relatedQuizzes = quizAttempts.filter(a => c.lessonIds.includes(a.lesson_id));
    const passed = relatedQuizzes.filter(a => a.passed).length;
    if (passed > 0) score += 25;
    const failed = relatedQuizzes.filter(a => !a.passed).length;
    if (failed > passed) score -= 15;

    // Drill performance
    const relatedDrills = drillsData.filter(d =>
      d.related_lesson_ids.some(id => c.lessonIds.includes(id)) ||
      d.concept_tags.some(t => c.tags.includes(t))
    );
    const doneCount = practiceRecords.filter(r =>
      relatedDrills.some(d => d.id === r.drill_id) && r.passed
    ).length;
    if (doneCount > 0) score += Math.min(doneCount * 10, 20);

    // Freshness penalty
    const dates = c.lessonIds.map(id => learningDates.get(id)).filter(Boolean) as string[];
    if (dates.length > 0) {
      const latestDate = dates.sort().reverse()[0];
      const daysSince = Math.floor((Date.now() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 14) score -= 10;
      if (daysSince > 30) score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    let state: ConceptMastery["state"];
    if (!completed) state = "not_started";
    else if (score >= 70) state = "solid";
    else if (score >= 50) state = "building";
    else if (score >= 30) state = "emerging";
    else if (failed > passed) state = "slipping";
    else state = "needs_review";

    return { concept: c.concept, category: c.category, state, score };
  });
}

function buildCategoryMastery(conceptMastery: ConceptMastery[], completedLessons: string[]): CategoryMastery[] {
  const categories = ["Beginner", "Technical", "Risk", "Psychology", "Strategy", "Advanced"];
  return categories.map(cat => {
    const catLessons = lessonsData.filter(l => l.category === cat);
    const catCompleted = catLessons.filter(l => completedLessons.includes(l.id)).length;
    const progress = catLessons.length > 0 ? Math.round((catCompleted / catLessons.length) * 100) : 0;
    const catConcepts = conceptMastery.filter(c => c.category === cat);
    const avgScore = catConcepts.length > 0 ? catConcepts.reduce((s, c) => s + c.score, 0) / catConcepts.length : 0;

    let strengthState = "Not started";
    if (progress === 100) strengthState = "Completed";
    else if (avgScore >= 60) strengthState = "Strong progress";
    else if (avgScore >= 40) strengthState = "Building";
    else if (progress > 0) strengthState = "Emerging";

    const weakConcept = catConcepts.find(c => c.state === "slipping" || c.state === "needs_review");
    const weaknessState = weakConcept ? `${weakConcept.concept} needs review` : null;

    let recommendedAction = "Start exploring";
    if (progress === 0) recommendedAction = "Begin first lesson";
    else if (weakConcept) recommendedAction = `Review ${weakConcept.concept}`;
    else if (progress < 100) recommendedAction = "Continue next lesson";
    else recommendedAction = "Maintain with reviews";

    return { category: cat, progress, strengthState, weaknessState, recommendedAction };
  });
}

function buildStudyPlan(
  completedLessons: string[],
  weakCategories: string[],
  conceptMastery: ConceptMastery[]
): StudyPlanDay[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const weakConcepts = conceptMastery.filter(c => c.state === "slipping" || c.state === "needs_review" || c.state === "emerging");
  const unfinished = lessonsData.filter(l => !completedLessons.includes(l.id));

  return days.map((day, i) => {
    let focus = "";
    let lessonId: string | null = null;
    let drillId: string | null = null;
    let reviewTask: string | null = null;
    let minutes = 5;

    if (i % 3 === 0 && unfinished.length > 0) {
      // Lesson day
      const next = weakCategories.length > 0
        ? unfinished.find(l => weakCategories.includes(l.category)) || unfinished[0]
        : unfinished[Math.min(i, unfinished.length - 1)] || unfinished[0];
      focus = `Complete "${next.title}"`;
      lessonId = next.id;
      minutes = next.duration_minutes;
    } else if (i % 3 === 1) {
      // Drill day
      const drills = drillsData.filter(d => {
        if (weakCategories.includes(d.category)) return true;
        return d.related_lesson_ids.some(id => completedLessons.includes(id));
      });
      const drill = drills[i % drills.length] || drillsData[0];
      focus = `Practice: ${drill.title}`;
      drillId = drill.id;
      minutes = Math.ceil(drill.estimated_seconds / 60);
    } else {
      // Review day
      const weak = weakConcepts[i % Math.max(weakConcepts.length, 1)];
      if (weak) {
        focus = `Review ${weak.concept}`;
        reviewTask = `Revise ${weak.concept} concepts`;
        const relatedLesson = lessonsData.find(l =>
          l.quiz.some(q => q.tags.some(t => t.toLowerCase().includes(weak.concept.toLowerCase())))
        );
        lessonId = relatedLesson?.id || null;
      } else {
        focus = "Flashcard session + recap";
        reviewTask = "Complete 5 flashcards";
      }
      minutes = 5;
    }

    return { day, focus, lessonId, drillId, reviewTask, estimatedMinutes: minutes };
  });
}

export function useCoachingEngine(
  trades: TradeRow[],
  reviews: ReviewRow[],
  chartAnalyses: ChartAnalysisRow[],
  rules: TradingRuleRow[],
  completedLessons: string[],
  quizAttempts: QuizAttemptRecord[],
  practiceRecords: PracticeProgressRecord[],
  learningDates: Map<string, string>,
  weakCategories: string[]
): CoachingSignals {
  return useMemo(() => {
    const cards: CoachingCard[] = [];
    const completedTrades = trades.filter(t => t.outcome !== "PENDING");
    const confCal = getConfidenceCalibration(trades);
    const stratStats = getStrategyStats(trades);
    const assetStats = getAssetStats(trades);
    const mistakes = getMistakePatterns(reviews);
    const emotions = getEmotionPatterns(reviews);
    const screenshotPatterns = getScreenshotPatterns(chartAnalyses);
    const conceptMastery = buildConceptMastery(completedLessons, quizAttempts, practiceRecords, learningDates);
    const categoryMastery = buildCategoryMastery(conceptMastery, completedLessons);

    // No-invalidation pattern
    const noInvalidation = trades.filter(t => t.invalidation_point === null && t.decision === "BUY");
    if (noInvalidation.length >= 3) {
      cards.push({
        id: "coach-no-invalidation",
        type: "process",
        priority: 1,
        title: "Missing invalidation structure",
        description: `${noInvalidation.length} BUY entries without invalidation. That means your entries have less structure than they should.`,
        why: "No invalidation means weak structure. Review the lesson before this becomes a habit.",
        relevanceLabel: "Based on your trade log",
        icon: "🎯",
        color: "text-verdict-avoid",
        cta: { label: "Review Risk Management", lessonId: "risk-management" },
      });
    }

    // Confidence calibration
    if (confCal.overconfident && confCal.message) {
      cards.push({
        id: "coach-confidence",
        type: "confidence",
        priority: 2,
        title: "Confidence is outrunning process",
        description: confCal.message,
        why: "Your most confident trades are underperforming. Confidence is not confirmation.",
        relevanceLabel: "Based on trade outcomes",
        icon: "📊",
        color: "text-amber-400",
        cta: { label: "Review Psychology", lessonId: "fomo-and-chasing" },
      });
    }

    // Repeated mistakes
    if (mistakes.length > 0 && mistakes[0][1] >= 2) {
      const [mistakeType, count] = mistakes[0];
      const mistakeLabels: Record<string, string> = {
        fomo: "FOMO entries", overconfidence: "overconfident sizing", no_stop: "no stop losses",
        revenge: "revenge trades", emotional: "emotional entries", poor_timing: "poor timing",
        no_plan: "no plan entries", chasing: "chasing price",
      };
      const label = mistakeLabels[mistakeType] || mistakeType;
      cards.push({
        id: "coach-mistake-pattern",
        type: "pattern",
        priority: 1,
        title: `Repeated pattern: ${label}`,
        description: `${count} instances of ${label} in your reviews. This is costing you.`,
        why: "Repeated mistakes become expensive habits. Fix the pattern now.",
        relevanceLabel: "From your post-mortem reviews",
        icon: "🔁",
        color: "text-verdict-avoid",
        cta: mistakeType === "fomo" || mistakeType === "chasing"
          ? { label: "Review FOMO lesson", lessonId: "fomo-and-chasing" }
          : { label: "Review Risk Management", lessonId: "risk-management" },
      });
    }

    // Screenshot patterns
    const breakoutPattern = screenshotPatterns.find(([k]) => k.includes("breakout"));
    if (breakoutPattern && breakoutPattern[1] >= 2) {
      cards.push({
        id: "coach-screenshot-breakout",
        type: "screenshot",
        priority: 4,
        title: "Breakout bias in your charts",
        description: `Breakout-style patterns appear often in your chart uploads. Time to sharpen fake breakout recognition.`,
        why: "60-70% of breakouts fail. Make sure you're confirming, not chasing.",
        relevanceLabel: "From screenshot analysis",
        icon: "📸",
        color: "text-accent",
        cta: { label: "Review Breakouts", lessonId: "breakouts-vs-fakeouts" },
      });
    }

    // Strategy fit
    if (stratStats.best && stratStats.worst && stratStats.best !== stratStats.worst && completedTrades.length >= 5) {
      const bestStats = stratStats.stats[stratStats.best];
      const worstStats = stratStats.stats[stratStats.worst];
      if (worstStats && worstStats.total >= 2) {
        const bestWR = Math.round((bestStats.wins / bestStats.total) * 100);
        const worstWR = Math.round((worstStats.wins / worstStats.total) * 100);
        if (bestWR - worstWR > 20) {
          cards.push({
            id: "coach-strategy-fit",
            type: "strategy_fit",
            priority: 5,
            title: `${stratStats.best} > ${stratStats.worst}`,
            description: `Your ${stratStats.best} calls win ${bestWR}% vs ${worstWR}% for ${stratStats.worst}. Lean into what works.`,
            why: "Strategy fit matters. Double down on your strongest approach.",
            relevanceLabel: "Based on outcome data",
            icon: "⚡",
            color: "text-primary",
          });
        }
      }
    }

    // Asset weakness
    if (assetStats.worst && completedTrades.length >= 4) {
      const worstAsset = assetStats.worst;
      const assetTrades = completedTrades.filter(t => t.asset_type === worstAsset);
      const assetWins = assetTrades.filter(t => t.outcome === "WIN").length;
      if (assetTrades.length >= 3 && assetWins / assetTrades.length < 0.4) {
        cards.push({
          id: "coach-weak-asset",
          type: "weakness",
          priority: 3,
          title: `${worstAsset} is your weakest asset class`,
          description: `Your ${worstAsset} trades win only ${Math.round((assetWins / assetTrades.length) * 100)}%. Tighten risk before you keep donating.`,
          why: "Weak asset performance = edge leak. Either fix the approach or reduce exposure.",
          relevanceLabel: "Based on trade history",
          icon: "📉",
          color: "text-verdict-avoid",
          cta: { label: "Review Risk", lessonId: "risk-management" },
        });
      }
    }

    // Strength card - best decision type
    if (stratStats.best && completedTrades.length >= 4) {
      const best = stratStats.stats[stratStats.best];
      if (best && best.total >= 2) {
        const wr = Math.round((best.wins / best.total) * 100);
        if (wr >= 55) {
          cards.push({
            id: "coach-strength",
            type: "strength",
            priority: 7,
            title: `${stratStats.best} is your edge`,
            description: `Your ${stratStats.best} decisions win at ${wr}%. This discipline is paying off. Keep leaning into it.`,
            why: "Your best results come from this approach. Protect it.",
            relevanceLabel: "Your strongest pattern",
            icon: "💪",
            color: "text-verdict-buy",
          });
        }
      }
    }

    // Emotion-linked coaching
    if (emotions.length > 0 && emotions[0][1] >= 2) {
      const [emotion, count] = emotions[0];
      if (emotion === "fomo" || emotion === "fear" || emotion === "greed" || emotion === "revenge") {
        cards.push({
          id: "coach-emotion",
          type: "pattern",
          priority: 3,
          title: `${emotion} keeps showing up`,
          description: `${count} trades tagged with ${emotion}. Emotional entries are process leaks.`,
          why: "Emotions don't disqualify a trade, but they change your sizing and timing.",
          relevanceLabel: "From your emotional log",
          icon: "🧠",
          color: "text-amber-400",
          cta: { label: "Review Psychology", lessonId: "fomo-and-chasing" },
        });
      }
    }

    // Missed thesis
    const noThesis = trades.filter(t => !t.thesis_why || t.thesis_why.trim().length < 5);
    if (noThesis.length >= 3 && trades.length >= 5) {
      cards.push({
        id: "coach-no-thesis",
        type: "process",
        priority: 2,
        title: "Entries without a thesis",
        description: `${noThesis.length} trades without a clear reason. A good lesson means nothing if your execution still freelances.`,
        why: "No thesis = no accountability. Fix this before adding more trades.",
        relevanceLabel: "Based on your trade log",
        icon: "📝",
        color: "text-amber-400",
        cta: { label: "Review Trade Journaling", lessonId: "trade-journaling" },
      });
    }

    // Learning-performance link: completed risk lesson but still no invalidation
    if (completedLessons.includes("risk-management") && noInvalidation.length >= 2) {
      cards.push({
        id: "coach-learn-vs-execute",
        type: "improvement",
        priority: 6,
        title: "Knowledge vs execution gap",
        description: "You studied Risk Management, but your recent entries still skip invalidation. Knowledge needs to become habit.",
        why: "Learning without application is entertainment, not improvement.",
        relevanceLabel: "Learning-behaviour mismatch",
        icon: "🔗",
        color: "text-primary",
        cta: { label: "Practice Risk Drills", route: "/learn" },
      });
    }

    // Sort by priority
    cards.sort((a, b) => a.priority - b.priority);

    // Determine coaching state
    let coachingState: CoachingState = "strong_progress";
    const slippingConcepts = conceptMastery.filter(c => c.state === "slipping");
    if (completedLessons.length < 3) coachingState = "foundation_needs_work";
    else if (weakCategories.includes("Technical") || slippingConcepts.some(c => c.category === "Technical")) coachingState = "technical_weakness";
    else if (weakCategories.includes("Risk")) coachingState = "risk_slipping";
    else if (emotions.length > 0 && emotions[0][1] >= 3) coachingState = "psychology_issue";
    else if (confCal.overconfident) coachingState = "confidence_miscalibrated";
    else if (stratStats.worst && stratStats.best !== stratStats.worst) coachingState = "strategy_mismatch";
    else if (cards.some(c => c.type === "improvement")) coachingState = "process_improving";

    // Summaries
    const currentStrength = cards.find(c => c.type === "strength")?.title || (completedLessons.length >= 3 ? "Consistent learning progress" : null);
    const currentWeakness = cards.find(c => c.type === "weakness" || c.type === "pattern")?.title || (weakCategories.length > 0 ? `${weakCategories[0]} concepts need work` : null);
    const improvementSuggestion = cards.find(c => c.cta?.lessonId)
      ? `Review ${lessonsData.find(l => l.id === cards.find(c => c.cta?.lessonId)?.cta?.lessonId)?.title || "key concepts"}`
      : weakCategories.length > 0 ? `Focus on ${weakCategories[0]}` : "Keep your review streak alive";

    const studyPlan = buildStudyPlan(completedLessons, weakCategories, conceptMastery);

    return {
      cards: cards.slice(0, 6),
      coachingState,
      currentStrength,
      currentWeakness,
      improvementSuggestion,
      weeklyCoachingSummary: {
        strength: currentStrength || "Building learning consistency",
        weakness: currentWeakness || "No major weaknesses detected yet",
        pattern: confCal.message || (mistakes.length > 0 ? `${mistakes[0][0]} is your most common mistake` : "Not enough data for pattern detection"),
        nextFocus: improvementSuggestion,
        recommendedLessonId: cards.find(c => c.cta?.lessonId)?.cta?.lessonId || null,
      },
      conceptMastery,
      categoryMastery,
      studyPlan,
    };
  }, [trades, reviews, chartAnalyses, rules, completedLessons, quizAttempts, practiceRecords, learningDates, weakCategories]);
}

// Export for cross-app use
export { buildConceptMastery, buildCategoryMastery, buildStudyPlan };
