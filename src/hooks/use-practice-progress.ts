import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PracticeProgressRecord {
  drill_id: string;
  practice_type: string;
  category: string;
  completed: boolean;
  passed: boolean;
  score: number;
  xp_earned: number;
  attempt_count: number;
  completed_at: string | null;
}

export interface PracticeProgressData {
  completedDrills: string[];
  records: PracticeProgressRecord[];
  totalPracticeXp: number;
  loading: boolean;
  refetch: () => Promise<void>;
  saveDrillResult: (drillId: string, practiceType: string, category: string, passed: boolean, xp: number, weakTags: string[]) => Promise<void>;
}

export function usePracticeProgress(): PracticeProgressData {
  const { user } = useAuth();
  const [records, setRecords] = useState<PracticeProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("practice_progress")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      setRecords(data as any);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const completedDrills = records.filter(r => r.completed).map(r => r.drill_id);
  const totalPracticeXp = records.reduce((sum, r) => sum + (r.xp_earned || 0), 0);

  const saveDrillResult = useCallback(async (
    drillId: string, practiceType: string, category: string,
    passed: boolean, xp: number, weakTags: string[]
  ) => {
    if (!user) return;
    const existing = records.find(r => r.drill_id === drillId);

    if (existing) {
      // Only award XP on first completion
      await supabase.from("practice_progress").update({
        completed: true,
        passed,
        score: passed ? 1 : 0,
        attempt_count: (existing.attempt_count || 1) + 1,
        completed_at: new Date().toISOString(),
        weak_tags: weakTags,
      }).eq("user_id", user.id).eq("drill_id", drillId);
    } else {
      await supabase.from("practice_progress").insert({
        user_id: user.id,
        drill_id: drillId,
        practice_type: practiceType,
        category,
        completed: true,
        passed,
        score: passed ? 1 : 0,
        xp_earned: xp,
        weak_tags: weakTags,
        completed_at: new Date().toISOString(),
      });
    }
    await fetchProgress();
  }, [user, records, fetchProgress]);

  return { completedDrills, records, totalPracticeXp, loading, refetch: fetchProgress, saveDrillResult };
}
