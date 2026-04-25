import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DailyMissionsState {
  analysed: boolean;
  logged: boolean;
  lessoned: boolean;
  watchlisted: boolean;
  reviewed: boolean;
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
  });

  useEffect(() => {
    if (!user) return;
    const since = startOfTodayIso();

    const load = async () => {
      const [analysed, logged, lessoned, watchlisted, reviewed] = await Promise.all([
        // analysed → chart_analyses created today (ChartAnalyzer writes here)
        supabase
          .from("chart_analyses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", since),
        // logged → trade_decisions inserted today
        supabase
          .from("trade_decisions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", since),
        // lessoned → learn_progress completed today
        supabase
          .from("learn_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("mode", "lesson")
          .eq("status", "completed")
          .gte("completed_at", since),
        // watchlisted → watchlist row added today
        supabase
          .from("watchlist")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("added_date", since),
        // reviewed → decision_reviews row created today
        supabase
          .from("decision_reviews")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("reviewed_date", since),
      ]);

      setState({
        analysed: (analysed.count ?? 0) > 0,
        logged: (logged.count ?? 0) > 0,
        lessoned: (lessoned.count ?? 0) > 0,
        watchlisted: (watchlisted.count ?? 0) > 0,
        reviewed: (reviewed.count ?? 0) > 0,
      });
    };

    load();
  }, [user]);

  return state;
}
