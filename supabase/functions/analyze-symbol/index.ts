import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, asset_type = "stock" } = await req.json();
    if (!symbol) throw new Error("symbol is required");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const upperSymbol = symbol.toUpperCase();

    // Check cache (15-min TTL)
    const { data: cached } = await supabase
      .from("analysis_cache")
      .select("*")
      .eq("symbol", upperSymbol)
      .single();

    if (cached && cached.verdict && cached.summary) {
      const age = (Date.now() - new Date(cached.last_updated).getTime()) / 1000 / 60;
      if (age < 15) {
        return new Response(JSON.stringify({
          symbol: upperSymbol,
          price: cached.live_price || 0,
          change: cached.price_change || 0,
          verdict: cached.verdict,
          setupScore: cached.setup_score || 50,
          riskScore: cached.risk_score || 5,
          summary: cached.summary,
          macroPoints: cached.macro_json?.macroPoints || [],
          technicals: cached.technicals_json || {},
          macroFactors: cached.macro_json?.macroFactors || [],
          targets: cached.targets_json || { bear: 0, base: 0, bull: 0 },
          source: "cache",
          cache_age_minutes: Math.round(age),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Fetch live price via live-quote
    let livePrice = 0;
    let priceChange = 0;
    let dayHigh: number | null = null;
    let dayLow: number | null = null;
    let volume: number | null = null;
    let prevClose: number | null = null;

    try {
      const quoteRes = await fetch(`${SUPABASE_URL}/functions/v1/live-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ symbols: [upperSymbol], asset_type }),
      });
      const quoteData = await quoteRes.json();
      const q = quoteData.quotes?.[upperSymbol];
      if (q) {
        livePrice = q.current_price || 0;
        priceChange = q.percent_change || 0;
        dayHigh = q.day_high;
        dayLow = q.day_low;
        volume = q.volume;
        prevClose = q.prev_close;
      }
    } catch (e) {
      console.error("live-quote fetch failed:", e);
    }

    // Fetch RSI if available
    let rsi: number | null = null;
    const FINNHUB_KEY = Deno.env.get("FINNHUB_API_KEY");
    if (FINNHUB_KEY && asset_type === "stock") {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `https://finnhub.io/api/v1/indicator?symbol=${upperSymbol}&resolution=D&from=${Math.floor(Date.now() / 1000) - 86400 * 30}&to=${Math.floor(Date.now() / 1000)}&indicator=rsi&timeperiod=14&token=${FINNHUB_KEY}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        const data = await res.json();
        if (data.rsi?.length) rsi = Math.round(data.rsi[data.rsi.length - 1] * 10) / 10;
      } catch (e) {
        console.error("RSI fetch failed:", e);
      }
    }

    // Build context for AI
    const priceAvailable = livePrice > 0;
    const priceContext = `Symbol: ${upperSymbol} (${asset_type})
${priceAvailable ? `Current Price: $${livePrice}` : "Current Price: UNAVAILABLE — use your knowledge to estimate current market price and provide reasonable targets"}
${priceAvailable ? `Price Change: ${priceChange}%` : ""}
${dayHigh ? `Day High: $${dayHigh}` : ""}
${dayLow ? `Day Low: $${dayLow}` : ""}
${volume ? `Volume: ${volume.toLocaleString()}` : ""}
${prevClose ? `Previous Close: $${prevClose}` : ""}
${rsi ? `RSI(14): ${rsi}` : ""}`;

    // Call AI for analysis
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a professional financial analyst. Analyze the given asset and return structured analysis. Be concise but insightful. Base your analysis on the real market data provided. If price is $0, still provide general analysis based on your knowledge of the asset.`
          },
          {
            role: "user",
            content: `Analyze this asset:\n${priceContext}\n\nProvide a comprehensive trading analysis.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_analysis",
            description: "Return structured analysis for the asset",
            parameters: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["BUY", "WAIT", "AVOID"], description: "Trading verdict" },
                setupScore: { type: "number", description: "Setup quality score 0-100" },
                riskScore: { type: "number", description: "Risk score 1-10 (10 = highest risk)" },
                summary: { type: "string", description: "2-3 sentence analysis summary" },
                macroPoints: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-5 key analysis points"
                },
                technicals: {
                  type: "object",
                  properties: {
                    RSI: { type: "string" },
                    MACD: { type: "string" },
                    "Bollinger Bands": { type: "string" },
                    Trend: { type: "string" },
                    Volume: { type: "string" },
                    "Support": { type: "string" },
                    "Resistance": { type: "string" }
                  },
                  description: "Technical indicator readings"
                },
                macroFactors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      icon: { type: "string" },
                      label: { type: "string" },
                      detail: { type: "string" }
                    },
                    required: ["icon", "label", "detail"]
                  },
                  description: "3-4 macro factors affecting the asset"
                },
                targets: {
                  type: "object",
                  properties: {
                    bear: { type: "number", description: "Bear case price target" },
                    base: { type: "number", description: "Base case price target" },
                    bull: { type: "number", description: "Bull case price target" }
                  },
                  required: ["bear", "base", "bull"]
                }
              },
              required: ["verdict", "setupScore", "riskScore", "summary", "macroPoints", "technicals", "macroFactors", "targets"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const analysis = JSON.parse(toolCall.function.arguments);

    // Use live price if available, otherwise use AI's understanding
    const finalPrice = livePrice > 0 ? livePrice : 0;
    const finalChange = livePrice > 0 ? priceChange : 0;

    const result = {
      symbol: upperSymbol,
      price: finalPrice,
      change: finalChange,
      verdict: analysis.verdict,
      setupScore: analysis.setupScore,
      riskScore: analysis.riskScore,
      summary: analysis.summary,
      macroPoints: analysis.macroPoints,
      technicals: analysis.technicals,
      macroFactors: analysis.macroFactors,
      targets: analysis.targets,
      source: "ai",
    };

    // Cache the result
    await supabase.from("analysis_cache").upsert({
      symbol: upperSymbol,
      asset_type,
      live_price: finalPrice,
      price_change: finalChange,
      verdict: analysis.verdict,
      setup_score: analysis.setupScore,
      risk_score: analysis.riskScore,
      summary: analysis.summary,
      technicals_json: analysis.technicals,
      macro_json: { macroPoints: analysis.macroPoints, macroFactors: analysis.macroFactors },
      targets_json: analysis.targets,
      confidence: analysis.setupScore,
      last_updated: new Date().toISOString(),
    }, { onConflict: "symbol" });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-symbol error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
