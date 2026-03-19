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

    // Fetch all trades and reviews
    const [tradesRes, reviewsRes, rulesRes] = await Promise.all([
      supabase.from("trade_decisions").select("*").eq("user_id", user.id).order("date", { ascending: true }),
      supabase.from("decision_reviews").select("*").eq("user_id", user.id),
      supabase.from("trading_rules").select("*").eq("user_id", user.id).eq("is_active", true),
    ]);

    const trades = tradesRes.data || [];
    const reviews = reviewsRes.data || [];
    const rules = rulesRes.data || [];

    if (trades.length < 3) {
      return new Response(JSON.stringify({
        biases: [],
        decision_quality_score: null,
        message: "Need at least 3 trades for analysis",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== BIAS DETECTION (algorithmic, no AI needed) =====
    const biases: Array<{ type: string; severity: "high" | "medium" | "low"; description: string; evidence: string; count: number }> = [];

    // 1. Revenge Trading: trade within 2 hours of a LOSS
    let revengeCount = 0;
    const completedTrades = trades.filter(t => t.outcome === "WIN" || t.outcome === "LOSS");
    for (let i = 1; i < trades.length; i++) {
      const prev = trades[i - 1];
      const curr = trades[i];
      if (prev.outcome === "LOSS") {
        const gap = new Date(curr.date).getTime() - new Date(prev.date).getTime();
        if (gap < 2 * 60 * 60 * 1000 && gap > 0) revengeCount++;
      }
    }
    if (revengeCount > 0) {
      biases.push({
        type: "revenge_trading",
        severity: revengeCount >= 3 ? "high" : revengeCount >= 2 ? "medium" : "low",
        description: "You tend to enter trades shortly after a loss",
        evidence: `${revengeCount} trades placed within 2 hours of a losing trade`,
        count: revengeCount,
      });
    }

    // 2. Overtrading: more than 3 trades in a single day
    const tradesByDay: Record<string, number> = {};
    trades.forEach(t => {
      const day = new Date(t.date).toISOString().split("T")[0];
      tradesByDay[day] = (tradesByDay[day] || 0) + 1;
    });
    const overtradeDays = Object.entries(tradesByDay).filter(([, c]) => c > 3);
    if (overtradeDays.length > 0) {
      biases.push({
        type: "overtrading",
        severity: overtradeDays.length >= 5 ? "high" : overtradeDays.length >= 2 ? "medium" : "low",
        description: "You place too many trades in a single day",
        evidence: `${overtradeDays.length} days with more than 3 trades (max: ${Math.max(...overtradeDays.map(([, c]) => c))})`,
        count: overtradeDays.length,
      });
    }

    // 3. FOMO Chasing: high-confidence BUY decisions that end up as losses
    const fomoTrades = completedTrades.filter(
      t => t.decision === "BUY" && (t.confidence || 0) >= 4 && t.outcome === "LOSS"
    );
    if (fomoTrades.length >= 2) {
      biases.push({
        type: "fomo_chasing",
        severity: fomoTrades.length >= 5 ? "high" : fomoTrades.length >= 3 ? "medium" : "low",
        description: "High-confidence BUY calls frequently result in losses",
        evidence: `${fomoTrades.length} high-confidence BUY decisions lost — possible FOMO entries`,
        count: fomoTrades.length,
      });
    }

    // 4. Overconfidence: confidence 5/5 trades losing more than winning
    const conf5 = completedTrades.filter(t => t.confidence === 5);
    const conf5Losses = conf5.filter(t => t.outcome === "LOSS").length;
    if (conf5.length >= 3 && conf5Losses > conf5.length / 2) {
      biases.push({
        type: "overconfidence",
        severity: "high",
        description: "Your maximum-confidence trades lose more than they win",
        evidence: `${conf5Losses}/${conf5.length} of your 5/5 confidence trades were losses`,
        count: conf5Losses,
      });
    }

    // 5. No invalidation: trades without invalidation_point set
    const noInvalidation = trades.filter(t => !t.invalidation_point && t.decision === "BUY");
    if (noInvalidation.length >= 3) {
      const noInvLosses = noInvalidation.filter(t => t.outcome === "LOSS").length;
      const withInvLosses = completedTrades.filter(t => t.invalidation_point && t.outcome === "LOSS").length;
      const withInvTotal = completedTrades.filter(t => t.invalidation_point).length;
      biases.push({
        type: "no_exit_plan",
        severity: noInvalidation.length >= 6 ? "high" : "medium",
        description: "Many BUY trades lack an invalidation point",
        evidence: `${noInvalidation.length} BUY trades without a stop-loss level. ${noInvLosses} of those lost.`,
        count: noInvalidation.length,
      });
    }

    // 6. Emotional trading from reviews
    const emotionCounts: Record<string, number> = {};
    reviews.forEach(r => {
      if (r.emotion && r.emotion !== "calm" && r.emotion !== "confident") {
        emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1;
      }
    });
    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
    if (topEmotion && topEmotion[1] >= 2) {
      biases.push({
        type: "emotional_trading",
        severity: topEmotion[1] >= 5 ? "high" : topEmotion[1] >= 3 ? "medium" : "low",
        description: `"${topEmotion[0]}" is your most frequent negative emotional state when trading`,
        evidence: `Recorded ${topEmotion[1]} times across your trade reviews`,
        count: topEmotion[1],
      });
    }

    // 7. Ignoring own rules (from reviews)
    const notFollowed = reviews.filter(r => r.followed_plan === false).length;
    if (notFollowed >= 2) {
      biases.push({
        type: "rule_breaking",
        severity: notFollowed >= 5 ? "high" : notFollowed >= 3 ? "medium" : "low",
        description: "You frequently don't follow your own trading plan",
        evidence: `${notFollowed} trades where you admitted not following your plan`,
        count: notFollowed,
      });
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    biases.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // ===== DECISION QUALITY SCORE =====
    const wins = completedTrades.filter(t => t.outcome === "WIN").length;
    const winRate = completedTrades.length > 0 ? wins / completedTrades.length : 0;

    // Plan adherence (from reviews)
    const planTotal = reviews.filter(r => r.followed_plan !== null).length;
    const planFollowed = reviews.filter(r => r.followed_plan === true).length;
    const planAdherence = planTotal > 0 ? planFollowed / planTotal : 0.5; // default 50% if no reviews

    // Invalidation usage
    const buyTrades = trades.filter(t => t.decision === "BUY");
    const withInvalidation = buyTrades.filter(t => t.invalidation_point).length;
    const invalidationRate = buyTrades.length > 0 ? withInvalidation / buyTrades.length : 0.5;

    // Rule following (inverse of rule breaks)
    const ruleScore = planTotal > 0 ? 1 - (notFollowed / planTotal) : 0.5;

    // Thesis completion
    const withThesis = trades.filter(t => t.thesis_why && t.thesis_why.length > 5).length;
    const thesisRate = trades.length > 0 ? withThesis / trades.length : 0;

    // Composite: winRate 30%, planAdherence 25%, invalidation 20%, ruleScore 15%, thesis 10%
    const dqs = Math.round(
      (winRate * 30 + planAdherence * 25 + invalidationRate * 20 + ruleScore * 15 + thesisRate * 10)
    );

    const dqsBreakdown = {
      overall: dqs,
      win_rate: { score: Math.round(winRate * 100), weight: 30 },
      plan_adherence: { score: Math.round(planAdherence * 100), weight: 25 },
      invalidation_usage: { score: Math.round(invalidationRate * 100), weight: 20 },
      rule_following: { score: Math.round(ruleScore * 100), weight: 15 },
      thesis_completion: { score: Math.round(thesisRate * 100), weight: 10 },
    };

    return new Response(JSON.stringify({
      biases,
      decision_quality_score: dqsBreakdown,
      total_trades: trades.length,
      completed_trades: completedTrades.length,
      reviews_count: reviews.length,
      rules_count: rules.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("bias-detector error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
