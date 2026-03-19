import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, asset_type } = await req.json();
    if (!symbol) throw new Error("Symbol is required");

    const ALPHA_VANTAGE_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    if (!ALPHA_VANTAGE_KEY) throw new Error("ALPHA_VANTAGE_API_KEY is not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Check cache first
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cached } = await supabase
      .from("analysis_cache")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .single();

    const cacheAge = cached ? (Date.now() - new Date(cached.last_updated).getTime()) / 1000 / 60 : Infinity;

    let livePrice = cached?.live_price;
    let priceChange = cached?.price_change;
    let technicals: Record<string, unknown> = {};

    // Fetch from Alpha Vantage if cache is stale (>15 min)
    if (cacheAge > 15) {
      try {
        const fn = asset_type === "crypto" ? "CURRENCY_EXCHANGE_RATE" : "GLOBAL_QUOTE";
        let avUrl: string;
        
        if (asset_type === "crypto") {
          avUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${ALPHA_VANTAGE_KEY}`;
        } else if (asset_type === "forex") {
          const [from, to] = symbol.split("/");
          avUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${ALPHA_VANTAGE_KEY}`;
        } else {
          avUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
        }

        const avRes = await fetch(avUrl);
        const avData = await avRes.json();

        if (avData["Global Quote"]) {
          livePrice = parseFloat(avData["Global Quote"]["05. price"]) || livePrice;
          priceChange = parseFloat(avData["Global Quote"]["10. change percent"]?.replace("%", "")) || priceChange;
        } else if (avData["Realtime Currency Exchange Rate"]) {
          livePrice = parseFloat(avData["Realtime Currency Exchange Rate"]["5. Exchange Rate"]) || livePrice;
          priceChange = 0;
        }

        // Get RSI
        const rsiUrl = asset_type === "crypto"
          ? `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`
          : `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`;
        
        const rsiRes = await fetch(rsiUrl);
        const rsiData = await rsiRes.json();
        const rsiValues = rsiData["Technical Analysis: RSI"];
        if (rsiValues) {
          const latestDate = Object.keys(rsiValues)[0];
          technicals.rsi = parseFloat(rsiValues[latestDate]?.RSI) || null;
        }
      } catch (e) {
        console.error("Alpha Vantage error:", e);
      }
    }

    // AI signal generation
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
            content: `You are a professional trading signal analyst. Given market data, provide actionable trading signals. Be specific about entry, exit, stop loss, and take profit levels. Always include risk warnings. Use percentages relative to current price for stop loss and targets. Never guarantee profits. This is educational analysis, not financial advice.`,
          },
          {
            role: "user",
            content: `Analyze ${symbol} (${asset_type}):\n- Current Price: $${livePrice || "unknown"}\n- Change: ${priceChange || 0}%\n- RSI: ${technicals.rsi || "N/A"}\n\nProvide trading signals with specific levels.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_signals",
            description: "Return structured market signals",
            parameters: {
              type: "object",
              properties: {
                signal: { type: "string", enum: ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"] },
                confidence: { type: "number" },
                entry_zone: {
                  type: "object",
                  properties: {
                    low: { type: "number" },
                    high: { type: "number" },
                  },
                  required: ["low", "high"],
                },
                stop_loss: { type: "number" },
                take_profit: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      level: { type: "number" },
                      label: { type: "string" },
                    },
                    required: ["level", "label"],
                  },
                },
                time_horizon: { type: "string" },
                reasoning: { type: "string" },
                risk_reward_ratio: { type: "string" },
                key_levels: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      price: { type: "number" },
                      type: { type: "string" },
                      note: { type: "string" },
                    },
                    required: ["price", "type", "note"],
                  },
                },
                disclaimer: { type: "string" },
              },
              required: ["signal", "confidence", "stop_loss", "take_profit", "time_horizon", "reasoning", "disclaimer"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_signals" } },
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
      throw new Error("Signal generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const signals = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    // Update cache
    if (livePrice) {
      await supabase.from("analysis_cache").upsert({
        symbol: symbol.toUpperCase(),
        asset_type: asset_type || "stock",
        live_price: livePrice,
        price_change: priceChange,
        technicals_json: technicals,
        last_updated: new Date().toISOString(),
        verdict: signals?.signal?.includes("BUY") ? "BUY" : signals?.signal?.includes("SELL") ? "AVOID" : "WAIT",
        setup_score: signals?.confidence ? Math.round(signals.confidence * 10) : null,
      }, { onConflict: "symbol" });
    }

    return new Response(JSON.stringify({
      symbol: symbol.toUpperCase(),
      live_price: livePrice,
      price_change: priceChange,
      technicals,
      signals,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("market-signals error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
