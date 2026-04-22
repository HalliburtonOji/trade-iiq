import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DecisionShape {
  invalidation_point?: number | null;
  symbol?: string | null;
}

interface ReviewShape {
  mistake_type?: string | null;
}

const MISTAKE_TO_LESSON: Record<string, { lessonId: string; reason: string }> = {
  no_stop: { lessonId: "position-sizing-edge", reason: "no_stop_mistake" },
  no_stop_loss: { lessonId: "position-sizing-edge", reason: "no_stop_mistake" },
  oversizing: { lessonId: "position-sizing-edge", reason: "oversizing" },
  fomo: { lessonId: "position-sizing-edge", reason: "fomo" },
};

export function useLearnNudges() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const checkDecisionForNudge = useCallback(
    (decision: DecisionShape) => {
      if (decision.invalidation_point == null) {
        toast.warning("⚠️ No invalidation plan?", {
          description: "A trade without a stop is a hope, not a thesis.",
          action: {
            label: "See Lesson",
            onClick: () => navigate("/learn?lesson=position-sizing-edge"),
          },
          duration: 6000,
        });
      }
    },
    [navigate]
  );

  const checkReviewForRemediation = useCallback(
    async (review: ReviewShape) => {
      if (!user || !review.mistake_type) return;
      const map = MISTAKE_TO_LESSON[review.mistake_type];
      if (!map) return;

      // Avoid duplicates: insert via upsert-like check
      const { data: existing } = await (supabase as any)
        .from("recommended_lessons")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", map.lessonId)
        .is("dismissed_at", null)
        .maybeSingle();

      if (existing) return;

      await (supabase as any).from("recommended_lessons").insert({
        user_id: user.id,
        lesson_id: map.lessonId,
        reason: map.reason,
      });
    },
    [user]
  );

  return { checkDecisionForNudge, checkReviewForRemediation };
}

export interface RecommendedLessonRow {
  id: string;
  lesson_id: string;
  reason: string | null;
  created_at: string;
}

export async function fetchActiveRecommendations(userId: string): Promise<RecommendedLessonRow[]> {
  const { data } = await (supabase as any)
    .from("recommended_lessons")
    .select("id,lesson_id,reason,created_at")
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });
  return (data || []) as RecommendedLessonRow[];
}

export async function dismissRecommendation(id: string) {
  await (supabase as any)
    .from("recommended_lessons")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id);
}
