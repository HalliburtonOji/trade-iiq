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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader || "" } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's trade data
    const [tradesRes, reviewsRes, rulesRes] = await Promise.all([
      supabase.from("trade_decisions").select("*").eq("user_id", user.id),
      supabase.from("decision_reviews").select("*").eq("user_id", user.id),
      supabase.from("trading_rules").select("*").eq("user_id", user.id).eq("is_active", true),
    ]);

    const trades = tradesRes.data || [];
    const reviews = reviewsRes.data || [];

    if (trades.length < 3) {
      return new Response(JSON.stringify({ error: "Need at least 3 trades to generate DNA profile" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Analyse this trader's history and generate a Trading DNA profile.

TRADES (${trades.length} total):
${JSON.stringify(trades.slice(0, 50).map(t => ({
  symbol: t.symbol, asset_type: t.asset_type, decision: t.decision, outcome: t.outcome,
  confidence: t.confidence, pnl_percent: t.pnl_percent, time_horizon: t.time_horizon,
  thesis_why: t.thesis_why, date: t.date,
})), null, 2)}

REVIEWS (${reviews.length} total):
${JSON.stringify(reviews.slice(0, 30).map(r => ({
  emotion: r.emotion, mistake_type: r.mistake_type, followed_plan: r.followed_plan,
  execution_quality: r.execution_quality, verdict_correct: r.verdict_correct,
})), null, 2)}

Return a JSON object with these fields:
- best_asset_class: which asset type they perform best with
- worst_asset_class: which asset type they lose most on
- favourite_strategy: their most-used decision pattern
- most_common_mistake: their repeat offence
- best_confidence_range: confidence level range where they win most
- worst_emotional_trigger: emotion that correlates with losses
- overconfidence_score: 0-100, how overconfident they are
- strengths: array of 3 short strength statements
- weaknesses: array of 3 short weakness statements
- personality_type: one of "cautious", "balanced", "aggressive", "learner"
- edge_statement: one sentence describing their trading edge
- danger_zone: one sentence about when they're most at risk`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a trading psychologist and performance analyst. Return ONLY valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_trading_dna",
            description: "Save the trader's DNA profile",
            parameters: {
              type: "object",
              properties: {
                best_asset_class: { type: "string" },
                worst_asset_class: { type: "string" },
                favourite_strategy: { type: "string" },
                most_common_mistake: { type: "string" },
                best_confidence_range: { type: "string" },
                worst_emotional_trigger: { type: "string" },
                overconfidence_score: { type: "number" },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                personality_type: { type: "string", enum: ["cautious", "balanced", "aggressive", "learner"] },
                edge_statement: { type: "string" },
                danger_zone: { type: "string" },
              },
              required: ["best_asset_class", "worst_asset_class", "favourite_strategy", "most_common_mistake", "best_confidence_range", "worst_emotional_trigger", "overconfidence_score", "strengths", "weaknesses", "personality_type", "edge_statement", "danger_zone"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_trading_dna" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const dna = JSON.parse(toolCall.function.arguments);

    // Upsert into trading_dna
    const { error: upsertError } = await supabase.from("trading_dna").upsert({
      user_id: user.id,
      best_asset_class: dna.best_asset_class,
      worst_asset_class: dna.worst_asset_class,
      favourite_strategy: dna.favourite_strategy,
      most_common_mistake: dna.most_common_mistake,
      best_confidence_range: dna.best_confidence_range,
      worst_emotional_trigger: dna.worst_emotional_trigger,
      overconfidence_score: dna.overconfidence_score,
      dna_json: dna,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, dna }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trading-dna error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
