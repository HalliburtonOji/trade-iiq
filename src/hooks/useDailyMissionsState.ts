import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DailyMissionsState {
  analysed: boolean;
  logged: boolean;
  lessoned: boolean;
  watchlisted: boolean;
  reviewed: boolean;
  mentorVisited: boolean;
  mentorDiffed: boolean;
}

const startOfTodayIso = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export function useDailyMissionsState(): DailyMissionsState {
  const { user } = useAuth();
  const [state, setState] = useState<DailyMissionsState>({
    analysed: false,
    logged: false,
    lessoned: false,
    watchlisted: false,
    reviewed: false,
    mentorVisited: false,
    mentorDiffed: false,
  });

  useEffect(() => {
    if (!user) return;
    const since = startOfTodayIso();
    const today = new Date().toISOString().slice(0, 10);

    const load = async () => {
      const [analysed, logged, lessoned, watchlisted, reviewed, mentorLedger] = await Promise.all([
        supabase
          .from("chart_analyses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", since),
        supabase
          .from("trade_decisions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", since),
        supabase
          .from("learn_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("mode", "lesson")
          .eq("status", "completed")
          .gte("completed_at", since),
        supabase
          .from("watchlist")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("added_date", since),
        supabase
          .from("decision_reviews")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("reviewed_date", since),
        // Mentor missions tracked via XP ledger (idempotent per day)
        supabase
          .from("xp_ledger")
          .select("source,ref_id")
          .eq("user_id", user.id)
          .in("source", ["mentor_visit", "mentor_plan_diff"])
          .gte("created_at", since),
      ]);

      const ledgerSources = new Set((mentorLedger.data || []).map((r: any) => r.source));

      const next: DailyMissionsState = {
        analysed: (analysed.count ?? 0) > 0,
        logged: (logged.count ?? 0) > 0,
        lessoned: (lessoned.count ?? 0) > 0,
        watchlisted: (watchlisted.count ?? 0) > 0,
        reviewed: (reviewed.count ?? 0) > 0,
        mentorVisited: ledgerSources.has("mentor_visit"),
        mentorDiffed: ledgerSources.has("mentor_plan_diff"),
      };
      setState(next);

      const ticked = (Object.entries(next) as [keyof DailyMissionsState, boolean][])
        .filter(([k, v]) => v && k !== "mentorVisited" && k !== "mentorDiffed")
        .map(([k]) => k);
      for (const flag of ticked) {
        await supabase.rpc("award_xp", {
          p_amount: 10,
          p_source: "daily_mission",
          p_ref_id: `${flag}_${today}`,
          p_ref_table: null as any,
        });
      }
    };

    load();
  }, [user]);

  return state;
}
