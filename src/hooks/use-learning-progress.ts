import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { lessonsData } from "@/data/lessonsData";

export interface LearningProgressData {
  completedLessons: string[];
  totalXp: number;
  streak: number;
  quizAttempts: QuizAttemptRecord[];
  learningDates: Map<string, string>;
  loading: boolean;
  refetch: () => Promise<void>;
}

export interface QuizAttemptRecord {
  lesson_id: string;
  score: number;
  total_questions: number;
  passed: boolean;
  weak_tags: string[];
  completed_at: string;
}

export function useLearningProgress(): LearningProgressData {
  const { user } = useAuth();
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRecord[]>([]);
  const [learningDates, setLearningDates] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [progressRes, quizRes, profileRes] = await Promise.all([
      supabase.from("learning_progress").select("*").eq("user_id", user.id).eq("completed", true),
      supabase.from("quiz_attempts").select("*").eq("user_id", user.id).order("completed_at", { ascending: false }),
      supabase.from("profiles").select("streak_count").eq("user_id", user.id).single(),
    ]);

    if (progressRes.data) {
      setCompletedLessons(progressRes.data.map((d: any) => d.lesson_id));
      setTotalXp(progressRes.data.reduce((s: number, d: any) => s + (d.xp_earned || 0), 0));
      const dates = new Map<string, string>();
      progressRes.data.forEach((d: any) => {
        if (d.completed_date) dates.set(d.lesson_id, d.completed_date);
      });
      setLearningDates(dates);
    }
    if (quizRes.data) {
      setQuizAttempts(quizRes.data as any);
    }
    if (profileRes.data) {
      setStreak(profileRes.data.streak_count || 0);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  return { completedLessons, totalXp, streak, quizAttempts, loading, refetch: fetchProgress };
}

// Levels
export const levels = [
  { name: "Novice", min: 0, next: 100 },
  { name: "Learner", min: 100, next: 250 },
  { name: "Trader", min: 250, next: 500 },
  { name: "Pro Trader", min: 500, next: 800 },
];

export function getLevel(xp: number) {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].min) return { ...levels[i], next: levels[i + 1]?.min || levels[i].min + 300 };
  }
  return { ...levels[0], next: 100 };
}

// Weak categories based on quiz data
export function getWeakCategories(attempts: QuizAttemptRecord[]): string[] {
  const catStats: Record<string, { correct: number; total: number }> = {};
  attempts.forEach(a => {
    const lesson = lessonsData.find(l => l.id === a.lesson_id);
    if (!lesson) return;
    const cat = lesson.category;
    if (!catStats[cat]) catStats[cat] = { correct: 0, total: 0 };
    catStats[cat].total += a.total_questions;
    catStats[cat].correct += a.score;
  });
  return Object.entries(catStats)
    .filter(([, v]) => v.total >= 3 && v.correct / v.total < 0.6)
    .map(([k]) => k);
}
