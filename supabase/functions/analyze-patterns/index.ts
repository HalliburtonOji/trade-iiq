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

    // Fetch trade decisions and reviews
    const [tradesRes, reviewsRes] = await Promise.all([
      supabase.from("trade_decisions").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("decision_reviews").select("*").eq("user_id", user.id),
    ]);

    const trades = tradesRes.data || [];
    const reviews = reviewsRes.data || [];

    if (trades.length < 3) {
      return new Response(JSON.stringify({
        insights: null,
        message: "Log at least 3 trades to unlock AI pattern detection.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build context for AI
    const tradesSummary = trades.map(t => ({
      symbol: t.symbol,
      type: t.asset_type,
      decision: t.decision,
      outcome: t.outcome,
      confidence: t.confidence,
      time_horizon: t.time_horizon,
      entry_price: t.entry_price,
      pnl_percent: t.pnl_percent,
      date: t.date,
      thesis: t.thesis_why,
    }));

    const reviewsSummary = reviews.map(r => ({
      emotion: r.emotion,
      mistake_type: r.mistake_type,
      followed_plan: r.followed_plan,
      verdict_correct: r.verdict_correct,
      execution_quality: r.execution_quality,
      lesson_learned: r.lesson_learned,
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a trading coach AI. Analyze the user's trade history and post-mortem reviews. Return structured JSON insights. Be specific, reference actual symbols and patterns from the data. Keep language punchy and actionable.`,
          },
          {
            role: "user",
            content: `Analyze my trading history and identify patterns:\n\nTrades (${trades.length} total):\n${JSON.stringify(tradesSummary)}\n\nPost-Mortem Reviews (${reviews.length}):\n${JSON.stringify(reviewsSummary)}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_insights",
            description: "Return structured trading pattern insights",
            parameters: {
              type: "object",
              properties: {
                most_profitable_setup: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    win_rate: { type: "number" },
                    symbols: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "description", "win_rate", "symbols"],
                },
                worst_times: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    pattern: { type: "string" },
                  },
                  required: ["title", "description", "pattern"],
                },
                recurring_mistakes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      mistake: { type: "string" },
                      frequency: { type: "number" },
                      fix: { type: "string" },
                    },
                    required: ["mistake", "frequency", "fix"],
                  },
                },
                edge_summary: { type: "string" },
                risk_warning: { type: "string" },
                actionable_tips: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["most_profitable_setup", "worst_times", "recurring_mistakes", "edge_summary", "actionable_tips"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limited. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const insights = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-patterns error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
