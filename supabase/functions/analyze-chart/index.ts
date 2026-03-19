import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const modePrompts: Record<string, string> = {
  quick: "Give a fast, concise summary of the chart. Focus on trend direction, key levels, and one-line verdict.",
  full: "Provide a comprehensive breakdown: trend, support/resistance, patterns, indicators, candle formations, invalidation zones, bull/bear cases, and entry ideas.",
  setup: "Evaluate whether this is a good trade setup. Focus on risk/reward, entry quality, invalidation, and whether the setup follows proper structure.",
  bias: "Determine the chart bias: bullish, bearish, or neutral. Provide 3 concrete reasons supporting your bias and 2 reasons it could be wrong.",
  teach: "Explain this chart like a lesson to a beginner trader. Point out what each element means, what patterns are forming, and what a student should learn from this chart.",
  risk: "Focus exclusively on risk: worst-case scenarios, invalidation zones, maximum drawdown potential, position sizing considerations, and what could go wrong.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { image_url, symbol, mode = "full", context, follow_up, analysis_id } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Follow-up question on existing analysis
    if (follow_up && analysis_id) {
      const { data: existing } = await supabase
        .from("chart_analyses")
        .select("*")
        .eq("id", analysis_id)
        .eq("user_id", user.id)
        .single();

      if (!existing) throw new Error("Analysis not found");

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
              content: `You are an expert technical analyst. The user previously uploaded a chart and received this analysis:\n\n${JSON.stringify(existing.analysis_json)}\n\nAnswer their follow-up question concisely and precisely. This is educational, not financial advice.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: follow_up },
                { type: "image_url", image_url: { url: existing.image_url } },
              ],
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("Follow-up failed");
      }

      const aiData = await aiResponse.json();
      const answer = aiData.choices?.[0]?.message?.content || "No response generated.";
      return new Response(JSON.stringify({ answer, analysis_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!image_url) throw new Error("image_url is required");

    const modeKey = mode in modePrompts ? mode : "full";
    const modeInstruction = modePrompts[modeKey];

    // Build context string from optional user-provided context
    let contextStr = "";
    if (context) {
      const parts: string[] = [];
      if (context.timeframe) parts.push(`Timeframe: ${context.timeframe}`);
      if (context.asset_type) parts.push(`Asset type: ${context.asset_type}`);
      if (context.user_observation) parts.push(`User sees: ${context.user_observation}`);
      if (context.question) parts.push(`User asks: ${context.question}`);
      if (context.strategy) parts.push(`Strategy: ${context.strategy}`);
      if (context.bias) parts.push(`User's current bias: ${context.bias}`);
      if (context.indicators_used) parts.push(`Indicators on chart: ${context.indicators_used.join(", ")}`);
      if (parts.length) contextStr = `\n\nUser-provided context:\n${parts.join("\n")}`;
    }

    const systemPrompt = `You are an expert technical analyst and trading coach. Analyze trading chart screenshots with precision. ${modeInstruction}${contextStr}\n\nIMPORTANT: Always include risk warnings. This is educational analysis, not financial advice. If the screenshot is blurry or unclear, note that in screenshot_quality_score and quality_notes.`;

    const userText = `Analyze this trading chart${symbol ? ` for ${symbol}` : ""}. Mode: ${modeKey.toUpperCase()}.${context?.question ? `\n\nSpecific question: ${context.question}` : ""}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_chart_analysis",
            description: "Return structured chart analysis results",
            parameters: {
              type: "object",
              properties: {
                symbol_detected: { type: "string", description: "Ticker symbol detected from the chart, if visible" },
                timeframe_detected: { type: "string", description: "Chart timeframe detected (1m, 5m, 15m, 1H, 4H, 1D, 1W, 1M)" },
                platform_detected: { type: "string", description: "Charting platform detected (TradingView, MetaTrader, Thinkorswim, etc.)" },
                chart_type: { type: "string", enum: ["candlestick", "line", "bar", "heikin_ashi", "renko", "other"] },
                trend_direction: { type: "string", enum: ["STRONG_UPTREND", "UPTREND", "SIDEWAYS", "DOWNTREND", "STRONG_DOWNTREND"] },
                trend_strength: { type: "number", description: "1-10 scale of trend strength" },
                key_patterns: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                      confidence: { type: "number" },
                      description: { type: "string" },
                    },
                    required: ["name", "type", "confidence"],
                  },
                },
                support_levels: { type: "array", items: { type: "number" } },
                resistance_levels: { type: "array", items: { type: "number" } },
                indicator_readings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      value: { type: "string" },
                      signal: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                    },
                    required: ["name", "value", "signal"],
                  },
                },
                notable_candles: { type: "array", items: { type: "string" }, description: "Notable candle patterns (doji, hammer, engulfing, etc.)" },
                likely_bias: { type: "string", enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
                bull_case: { type: "string", description: "The bullish scenario" },
                bear_case: { type: "string", description: "The bearish scenario" },
                invalidation_zone: { type: "string", description: "Price level or zone that invalidates the current thesis" },
                entry_ideas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["long", "short"] },
                      entry: { type: "string" },
                      stop_loss: { type: "string" },
                      target: { type: "string" },
                      rationale: { type: "string" },
                    },
                    required: ["type", "entry", "rationale"],
                  },
                },
                risk_warnings: { type: "array", items: { type: "string" } },
                confidence_score: { type: "number", description: "0-1 overall confidence in the analysis" },
                confidence_label: { type: "string", enum: ["HIGH", "MEDIUM", "LOW", "UNCLEAR"] },
                analysis_summary: { type: "string", description: "2-3 sentence summary" },
                ocr_text: { type: "array", items: { type: "string" }, description: "Any text read from the screenshot (prices, labels, indicator values)" },
                screenshot_quality_score: { type: "number", description: "1-10 quality of the screenshot for analysis" },
                quality_notes: { type: "string", description: "Notes about screenshot quality issues if any" },
                teaching: {
                  type: "object",
                  properties: {
                    things_spotted: { type: "array", items: { type: "string" }, description: "3 key things spotted on the chart" },
                    risks: { type: "array", items: { type: "string" }, description: "2 key risks" },
                    key_lesson: { type: "string", description: "1 key lesson from this chart" },
                    suggested_action: { type: "string", enum: ["watch", "wait", "avoid", "set_alert", "paper_trade_only"] },
                  },
                  required: ["things_spotted", "risks", "key_lesson", "suggested_action"],
                },
              },
              required: [
                "trend_direction", "key_patterns", "support_levels", "resistance_levels",
                "likely_bias", "risk_warnings", "confidence_score", "confidence_label",
                "analysis_summary", "screenshot_quality_score", "teaching",
              ],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_chart_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("Chart analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const analysis = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    // Save analysis to database
    let savedId: string | null = null;
    if (analysis) {
      const { data: inserted } = await supabase.from("chart_analyses").insert({
        user_id: user.id,
        image_url,
        symbol: (symbol || analysis.symbol_detected || "").toUpperCase() || null,
        analysis_json: { ...analysis, mode: modeKey },
      }).select("id").single();
      savedId = inserted?.id || null;
    }

    return new Response(JSON.stringify({ analysis, image_url, symbol, mode: modeKey, id: savedId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-chart error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
