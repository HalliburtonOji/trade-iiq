import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, asset_type } = await req.json();
    if (!symbol) throw new Error("Symbol is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Step 1: Get live price from live-quote (Finnhub → AV → cache) ──
    let livePrice: number | null = null;
    let priceChange: number | null = null;
    let dayHigh: number | null = null;
    let dayLow: number | null = null;
    let volume: number | null = null;
    let sessionStatus = "unknown";

    try {
      const quoteRes = await fetch(`${SUPABASE_URL}/functions/v1/live-quote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbols: [symbol.toUpperCase()], asset_type: asset_type || "stock" }),
      });

      if (quoteRes.ok) {
        const quoteData = await quoteRes.json();
        const q = quoteData.quotes?.[symbol.toUpperCase()];
        if (q) {
          livePrice = q.current_price;
          priceChange = q.percent_change;
          dayHigh = q.day_high;
          dayLow = q.day_low;
          volume = q.volume;
          sessionStatus = q.session_status || "unknown";
        }
      }
    } catch (e) {
      console.error("live-quote call failed:", e);
    }

    // ── Step 2: Get RSI (try Finnhub first, then Alpha Vantage) ──
    let rsi: number | null = null;

    const FINNHUB_KEY = Deno.env.get("FINNHUB_API_KEY");
    if (FINNHUB_KEY && asset_type !== "crypto" && asset_type !== "forex") {
      try {
        const now = Math.floor(Date.now() / 1000);
        const from = now - 30 * 86400; // 30 days
        const res = await fetch(
          `https://finnhub.io/api/v1/indicator?symbol=${symbol.toUpperCase()}&resolution=D&from=${from}&to=${now}&indicator=rsi&timeperiod=14&token=${FINNHUB_KEY}`
        );
        const data = await res.json();
        if (data.rsi && data.rsi.length > 0) {
          rsi = Math.round(data.rsi[data.rsi.length - 1] * 100) / 100;
        }
      } catch (e) {
        console.error("Finnhub RSI error:", e);
      }
    }

    // Fallback: Alpha Vantage RSI
    if (rsi === null) {
      const AV_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");
      if (AV_KEY) {
        try {
          const rsiUrl = `https://www.alphavantage.co/query?function=RSI&symbol=${symbol.toUpperCase()}&interval=daily&time_period=14&series_type=close&apikey=${AV_KEY}`;
          const res = await fetch(rsiUrl);
          const data = await res.json();
          const rsiValues = data["Technical Analysis: RSI"];
          if (rsiValues) {
            const latestDate = Object.keys(rsiValues)[0];
            rsi = parseFloat(rsiValues[latestDate]?.RSI) || null;
          }
        } catch (e) {
          console.error("AV RSI error:", e);
        }
      }
    }

    // ── Step 3: Build rich context for AI ──
    const priceContext = livePrice
      ? `Current Price: $${livePrice.toFixed(2)}`
      : "Current Price: unavailable";

    const changeContext = priceChange !== null
      ? `Change: ${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%`
      : "Change: N/A";

    const extraContext = [
      dayHigh ? `Day High: $${dayHigh}` : null,
      dayLow ? `Day Low: $${dayLow}` : null,
      volume ? `Volume: ${volume.toLocaleString()}` : null,
      rsi !== null ? `RSI(14): ${rsi}` : null,
      `Session: ${sessionStatus}`,
    ].filter(Boolean).join("\n- ");

    // ── Step 4: AI signal generation ──
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
            content: `Analyze ${symbol.toUpperCase()} (${asset_type || "stock"}):\n- ${priceContext}\n- ${changeContext}\n- ${extraContext}\n\nProvide trading signals with specific price levels.`,
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
                  properties: { low: { type: "number" }, high: { type: "number" } },
                  required: ["low", "high"],
                },
                stop_loss: { type: "number" },
                take_profit: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { level: { type: "number" }, label: { type: "string" } },
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
                    properties: { price: { type: "number" }, type: { type: "string" }, note: { type: "string" } },
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

    return new Response(JSON.stringify({
      symbol: symbol.toUpperCase(),
      live_price: livePrice,
      price_change: priceChange,
      session_status: sessionStatus,
      technicals: { rsi },
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
