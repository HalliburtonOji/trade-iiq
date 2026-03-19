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

    // Best trade (highest PnL)
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

    // Confidence accuracy
    const confGroups: Record<number, { wins: number; total: number }> = {};
    completed.forEach(t => {
      const c = t.confidence || 3;
      if (!confGroups[c]) confGroups[c] = { wins: 0, total: 0 };
      confGroups[c].total++;
      if (t.outcome === "WIN") confGroups[c].wins++;
    });
    const calibration = [1, 2, 3, 4, 5].map(c => ({
      level: c,
      rate: confGroups[c] ? Math.round((confGroups[c].wins / confGroups[c].total) * 100) : 0,
      count: confGroups[c]?.total || 0,
    }));
    const highConfRate = confGroups[5] ? Math.round((confGroups[5].wins / confGroups[5].total) * 100) : null;
    const lowConfRate = confGroups[1] || confGroups[2]
      ? Math.round(((confGroups[1]?.wins || 0) + (confGroups[2]?.wins || 0)) / ((confGroups[1]?.total || 0) + (confGroups[2]?.total || 0)) * 100)
      : null;

    const weekXp = lessons.reduce((sum, l) => sum + (l.xp_earned || 0), 0);

    // Build digest object
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
      worst_habit: worstHabit ? { type: worstHabit[0], count: worstHabit[1] } : null,
      confidence_accuracy: { calibration, high_conf_rate: highConfRate, low_conf_rate: lowConfRate },
      xp: {
        earned_this_week: weekXp,
        total: profile?.xp_total || 0,
        streak: profile?.streak_count || 0,
        level: profile?.level || "Novice",
      },
      lessons_completed: lessons.length,
      reviews_written: reviews.length,
      top_symbols: [...new Set(trades.map(t => t.symbol))].slice(0, 5),
      ai_focus: null as string | null,
    };

    // Generate AI personalised focus for next week
    if (trades.length >= 1) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const prompt = `You are a trading coach. Based on this trader's weekly performance, write a short, personalised 2-3 sentence focus for next week. Be specific and actionable.

Stats: ${winRate}% win rate, ${wins.length}W/${losses.length}L, ${trades.length} decisions.
Best trade: ${bestTrade ? `${bestTrade.symbol} ${bestTrade.decision} (+${bestTrade.pnl_percent}%)` : "None"}
Worst habit: ${worstHabit ? `${worstHabit[0]} (${worstHabit[1]}x this week)` : "None identified"}
High-confidence accuracy: ${highConfRate !== null ? `${highConfRate}%` : "N/A"}
Reviews written: ${reviews.length}
Lessons completed: ${lessons.length}

Give a direct, motivating focus. No fluff. Start with "Next week:"`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            digest.ai_focus = aiData.choices?.[0]?.message?.content || null;
          }
        }
      } catch (e) {
        console.error("AI focus generation failed:", e);
      }
    }

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
