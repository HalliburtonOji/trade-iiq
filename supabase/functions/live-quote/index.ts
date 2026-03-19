import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbols, asset_type } = await req.json();
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("symbols array is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const FINNHUB_KEY = Deno.env.get("FINNHUB_API_KEY");
    const ALPHA_VANTAGE_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");

    // Check cache first (< 5 min old)
    const { data: cached } = await supabase
      .from("analysis_cache")
      .select("symbol, live_price, price_change, last_updated")
      .in("symbol", symbols.map((s: string) => s.toUpperCase()));

    const now = Date.now();
    const results: Record<string, { price: number | null; change: number | null; source: string; cached_at: string }> = {};
    const staleSymbols: string[] = [];

    for (const symbol of symbols) {
      const upper = symbol.toUpperCase();
      const hit = cached?.find((c: any) => c.symbol === upper);
      const age = hit ? (now - new Date(hit.last_updated).getTime()) / 1000 / 60 : Infinity;

      if (hit && age < 5) {
        results[upper] = {
          price: hit.live_price,
          change: hit.price_change,
          source: "cache",
          cached_at: hit.last_updated,
        };
      } else {
        staleSymbols.push(upper);
      }
    }

    // Fetch stale symbols
    for (const symbol of staleSymbols) {
      let price: number | null = null;
      let change: number | null = null;
      let source = "none";

      // Try Finnhub first (stocks only)
      if (FINNHUB_KEY && asset_type !== "crypto" && asset_type !== "forex") {
        try {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
          const data = await res.json();
          if (data.c && data.c > 0) {
            price = data.c;
            change = data.dp; // percent change
            source = "finnhub";
          }
        } catch (e) {
          console.error("Finnhub error:", e);
        }
      }

      // Fallback to Alpha Vantage
      if (!price && ALPHA_VANTAGE_KEY) {
        try {
          let avUrl: string;
          if (asset_type === "crypto") {
            avUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${ALPHA_VANTAGE_KEY}`;
          } else if (asset_type === "forex") {
            const [from, to] = symbol.split("/");
            avUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${ALPHA_VANTAGE_KEY}`;
          } else {
            avUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
          }

          const res = await fetch(avUrl);
          const data = await res.json();

          if (data["Global Quote"]) {
            price = parseFloat(data["Global Quote"]["05. price"]) || null;
            change = parseFloat(data["Global Quote"]["10. change percent"]?.replace("%", "")) || null;
            source = "alphavantage";
          } else if (data["Realtime Currency Exchange Rate"]) {
            price = parseFloat(data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]) || null;
            change = 0;
            source = "alphavantage";
          }
        } catch (e) {
          console.error("Alpha Vantage error:", e);
        }
      }

      results[symbol] = {
        price,
        change,
        source,
        cached_at: new Date().toISOString(),
      };

      // Update cache
      if (price) {
        await supabase.from("analysis_cache").upsert({
          symbol,
          asset_type: asset_type || "stock",
          live_price: price,
          price_change: change,
          last_updated: new Date().toISOString(),
        }, { onConflict: "symbol" });
      }
    }

    return new Response(JSON.stringify({ quotes: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live-quote error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
