import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { image_url, symbol } = await req.json();
    if (!image_url) throw new Error("image_url is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Call AI with image for chart analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are an expert technical analyst. Analyze trading chart screenshots with precision. Identify patterns, support/resistance levels, indicators, and provide actionable insights. Always include risk warnings. This is educational analysis, not financial advice.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this trading chart${symbol ? ` for ${symbol}` : ""}. Identify the trend, chart patterns, support/resistance levels, any visible indicators, and provide your verdict.`,
              },
              {
                type: "image_url",
                image_url: { url: image_url },
              },
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
                trend: { type: "string", enum: ["STRONG_UPTREND", "UPTREND", "SIDEWAYS", "DOWNTREND", "STRONG_DOWNTREND"] },
                patterns: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                      confidence: { type: "number" },
                    },
                    required: ["name", "type", "confidence"],
                  },
                },
                support_levels: { type: "array", items: { type: "number" } },
                resistance_levels: { type: "array", items: { type: "number" } },
                indicators_spotted: { type: "array", items: { type: "string" } },
                verdict: { type: "string", enum: ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"] },
                confidence: { type: "number" },
                reasoning: { type: "string" },
                warnings: { type: "array", items: { type: "string" } },
              },
              required: ["trend", "patterns", "support_levels", "resistance_levels", "verdict", "confidence", "reasoning", "warnings"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_chart_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("Chart analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const analysis = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    // Save analysis to database
    if (analysis) {
      await supabase.from("chart_analyses").insert({
        user_id: user.id,
        image_url,
        symbol: symbol?.toUpperCase() || null,
        analysis_json: analysis,
      });
    }

    return new Response(JSON.stringify({ analysis, image_url, symbol }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-chart error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
