import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Market session detection ──
function getStockSession(): string {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = et.getHours(), m = et.getMinutes(), day = et.getDay();
  if (day === 0 || day === 6) return "closed";
  const mins = h * 60 + m;
  if (mins < 240) return "closed";       // before 4am
  if (mins < 570) return "premarket";     // 4am-9:30am
  if (mins < 960) return "open";          // 9:30am-4pm
  if (mins < 1200) return "after_hours";  // 4pm-8pm
  return "closed";
}

function getForexSession(): string {
  const now = new Date();
  const day = now.getUTCDay();
  // Forex: Sun 5pm ET to Fri 5pm ET
  if (day === 0 || day === 6) {
    if (day === 0) {
      const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      return et.getHours() >= 17 ? "active" : "inactive";
    }
    return "inactive";
  }
  if (day === 5) {
    const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    return et.getHours() < 17 ? "active" : "inactive";
  }
  return "active";
}

function getSession(assetType: string): string {
  if (assetType === "crypto") return "24/7";
  if (assetType === "forex") return getForexSession();
  return getStockSession();
}

// ── Cache TTLs by asset type ──
function getCacheTtlMinutes(assetType: string, session: string): number {
  if (assetType === "crypto") return 2;
  if (assetType === "forex") return session === "active" ? 3 : 15;
  if (session === "open") return 3;
  if (session === "premarket" || session === "after_hours") return 5;
  return 30; // closed
}

// ── Freshness status ──
function getFreshness(ageMinutes: number, assetType: string, session: string): string {
  const ttl = getCacheTtlMinutes(assetType, session);
  if (ageMinutes < ttl) return "live";
  if (ageMinutes < ttl * 2) return "delayed";
  if (ageMinutes < ttl * 5) return "cached";
  if (ageMinutes < 60) return "stale";
  return "unavailable";
}

// ── Provider health tracking (in-memory per invocation group) ──
const providerHealth: Record<string, { failures: number; lastFail: number }> = {
  finnhub: { failures: 0, lastFail: 0 },
  alphavantage: { failures: 0, lastFail: 0 },
};

function isProviderHealthy(name: string): boolean {
  const h = providerHealth[name];
  if (!h || h.failures < 3) return true;
  // Circuit breaker: if 3+ recent failures, wait 2 min before retrying
  return Date.now() - h.lastFail > 120_000;
}

function recordFailure(name: string) {
  providerHealth[name].failures++;
  providerHealth[name].lastFail = Date.now();
}

function recordSuccess(name: string) {
  providerHealth[name].failures = 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbols, asset_type = "stock" } = await req.json();
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("symbols array is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const FINNHUB_KEY = Deno.env.get("FINNHUB_API_KEY");
    const ALPHA_VANTAGE_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");

    const session = getSession(asset_type);
    const cacheTtl = getCacheTtlMinutes(asset_type, session);

    // ── L2: Database cache check ──
    const { data: cached } = await supabase
      .from("analysis_cache")
      .select("symbol, live_price, price_change, last_updated")
      .in("symbol", symbols.map((s: string) => s.toUpperCase()));

    const now = Date.now();
    const results: Record<string, any> = {};
    const staleSymbols: string[] = [];

    for (const symbol of symbols) {
      const upper = symbol.toUpperCase();
      const hit = cached?.find((c: any) => c.symbol === upper);
      const ageMs = hit ? now - new Date(hit.last_updated).getTime() : Infinity;
      const ageMin = ageMs / 1000 / 60;

      if (hit && ageMin < cacheTtl) {
        results[upper] = {
          symbol: upper,
          asset_type,
          current_price: hit.live_price,
          absolute_change: null,
          percent_change: hit.price_change,
          currency: "USD",
          source: "cache",
          timestamp: hit.last_updated,
          session_status: session,
          freshness: getFreshness(ageMin, asset_type, session),
          is_fallback: false,
          is_stale: false,
          cache_age_seconds: Math.round(ageMs / 1000),
          day_high: null,
          day_low: null,
          volume: null,
          prev_close: null,
        };
      } else {
        staleSymbols.push(upper);
      }
    }

    // ── Fetch stale symbols ──
    for (const symbol of staleSymbols) {
      let price: number | null = null;
      let change: number | null = null;
      let absChange: number | null = null;
      let source = "none";
      let isFallback = false;
      let dayHigh: number | null = null;
      let dayLow: number | null = null;
      let volume: number | null = null;
      let prevClose: number | null = null;

      // ── Try Finnhub (stocks only) ──
      if (FINNHUB_KEY && asset_type !== "crypto" && asset_type !== "forex" && isProviderHealthy("finnhub")) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          const data = await res.json();
          if (data.c && data.c > 0) {
            price = data.c;
            change = data.dp;
            absChange = data.d;
            dayHigh = data.h || null;
            dayLow = data.l || null;
            prevClose = data.pc || null;
            source = "finnhub";
            recordSuccess("finnhub");
          }
        } catch (e) {
          console.error("Finnhub error:", e);
          recordFailure("finnhub");
        }
      }

      // ── Fallback: Alpha Vantage ──
      if (!price && ALPHA_VANTAGE_KEY && isProviderHealthy("alphavantage")) {
        isFallback = source === "none" ? false : true; // only fallback if finnhub was tried
        if (source !== "none") isFallback = true;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          let avUrl: string;
          if (asset_type === "crypto") {
            avUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${ALPHA_VANTAGE_KEY}`;
          } else if (asset_type === "forex") {
            const [from, to] = symbol.split("/");
            avUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${ALPHA_VANTAGE_KEY}`;
          } else {
            avUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
          }

          const res = await fetch(avUrl, { signal: controller.signal });
          clearTimeout(timeout);
          const data = await res.json();

          if (data["Global Quote"]) {
            const gq = data["Global Quote"];
            price = parseFloat(gq["05. price"]) || null;
            change = parseFloat(gq["10. change percent"]?.replace("%", "")) || null;
            absChange = parseFloat(gq["09. change"]) || null;
            dayHigh = parseFloat(gq["03. high"]) || null;
            dayLow = parseFloat(gq["04. low"]) || null;
            volume = parseInt(gq["06. volume"]) || null;
            prevClose = parseFloat(gq["08. previous close"]) || null;
            source = "alphavantage";
            recordSuccess("alphavantage");
          } else if (data["Realtime Currency Exchange Rate"]) {
            price = parseFloat(data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]) || null;
            change = 0;
            source = "alphavantage";
            recordSuccess("alphavantage");
          }
        } catch (e) {
          console.error("Alpha Vantage error:", e);
          recordFailure("alphavantage");
        }
      }

      // ── If both fail, serve last known cache even if stale ──
      if (!price) {
        const staleHit = cached?.find((c: any) => c.symbol === symbol);
        if (staleHit) {
          const staleAge = (now - new Date(staleHit.last_updated).getTime()) / 1000;
          results[symbol] = {
            symbol,
            asset_type,
            current_price: staleHit.live_price,
            absolute_change: null,
            percent_change: staleHit.price_change,
            currency: "USD",
            source: "cache",
            timestamp: staleHit.last_updated,
            session_status: session,
            freshness: "stale",
            is_fallback: true,
            is_stale: true,
            cache_age_seconds: Math.round(staleAge),
            day_high: null,
            day_low: null,
            volume: null,
            prev_close: null,
          };
          continue;
        }
        // Truly unavailable
        results[symbol] = {
          symbol,
          asset_type,
          current_price: null,
          absolute_change: null,
          percent_change: null,
          currency: "USD",
          source: "none",
          timestamp: new Date().toISOString(),
          session_status: session,
          freshness: "unavailable",
          is_fallback: false,
          is_stale: true,
          cache_age_seconds: 0,
          day_high: null,
          day_low: null,
          volume: null,
          prev_close: null,
        };
        continue;
      }

      const ts = new Date().toISOString();
      results[symbol] = {
        symbol,
        asset_type,
        current_price: price,
        absolute_change: absChange,
        percent_change: change,
        currency: "USD",
        source,
        timestamp: ts,
        session_status: session,
        freshness: "live",
        is_fallback: isFallback,
        is_stale: false,
        cache_age_seconds: 0,
        day_high: dayHigh,
        day_low: dayLow,
        volume,
        prev_close: prevClose,
      };

      // ── Update L2 cache ──
      await supabase.from("analysis_cache").upsert({
        symbol,
        asset_type: asset_type || "stock",
        live_price: price,
        price_change: change,
        last_updated: ts,
      }, { onConflict: "symbol" });
    }

    return new Response(JSON.stringify({ quotes: results, session, provider_status: { finnhub: isProviderHealthy("finnhub"), alphavantage: isProviderHealthy("alphavantage") } }), {
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
