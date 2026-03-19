import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString();

    const [tradesRes, reviewsRes, lessonsRes, profileRes] = await Promise.all([
      supabase.from("trade_decisions").select("*").eq("user_id", user.id).gte("date", weekStr).order("date", { ascending: false }),
      supabase.from("decision_reviews").select("*").eq("user_id", user.id).gte("reviewed_date", weekStr),
      supabase.from("learning_progress").select("*").eq("user_id", user.id).eq("completed", true).gte("completed_date", weekStr),
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    ]);

    const trades = tradesRes.data || [];
    const reviews = reviewsRes.data || [];
    const lessons = lessonsRes.data || [];
    const profile = profileRes.data;

    const completed = trades.filter(t => t.outcome === "WIN" || t.outcome === "LOSS");
    const wins = completed.filter(t => t.outcome === "WIN");
    const losses = completed.filter(t => t.outcome === "LOSS");
    const winRate = completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0;

    // Best trade (highest PnL or first win)
    const bestTrade = trades
      .filter(t => t.outcome === "WIN")
      .sort((a, b) => (b.pnl_percent || 0) - (a.pnl_percent || 0))[0] || null;

    // Worst habit
    const mistakeCounts: Record<string, number> = {};
    reviews.forEach(r => {
      if (r.mistake_type && r.mistake_type !== "none") {
        mistakeCounts[r.mistake_type] = (mistakeCounts[r.mistake_type] || 0) + 1;
      }
    });
    const worstHabit = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0];

    // XP earned this week
    const weekXp = lessons.reduce((sum, l) => sum + (l.xp_earned || 0), 0);

    const digest = {
      period: {
        from: weekAgo.toISOString().split("T")[0],
        to: new Date().toISOString().split("T")[0],
      },
      stats: {
        total_decisions: trades.length,
        completed_trades: completed.length,
        wins: wins.length,
        losses: losses.length,
        win_rate: winRate,
        pending: trades.filter(t => t.outcome === "PENDING").length,
      },
      best_trade: bestTrade ? {
        symbol: bestTrade.symbol,
        decision: bestTrade.decision,
        pnl_percent: bestTrade.pnl_percent,
        date: bestTrade.date,
      } : null,
      worst_habit: worstHabit ? {
        type: worstHabit[0],
        count: worstHabit[1],
      } : null,
      xp: {
        earned_this_week: weekXp,
        total: profile?.xp_total || 0,
        streak: profile?.streak_count || 0,
        level: profile?.level || "Novice",
      },
      lessons_completed: lessons.length,
      reviews_written: reviews.length,
      top_symbols: [...new Set(trades.map(t => t.symbol))].slice(0, 5),
    };

    return new Response(JSON.stringify(digest), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-digest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
