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
  if (mins < 240) return "closed";
  if (mins < 570) return "premarket";
  if (mins < 960) return "open";
  if (mins < 1200) return "after_hours";
  return "closed";
}

function getForexSession(): string {
  const now = new Date();
  const day = now.getUTCDay();
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

const providerHealth: Record<string, { failures: number; lastFail: number }> = {
  finnhub: { failures: 0, lastFail: 0 },
};

function isProviderHealthy(name: string): boolean {
  const h = providerHealth[name];
  if (!h || h.failures < 3) return true;
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

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const FINNHUB_KEY = Deno.env.get("FINNHUB_API_KEY");
    const session = getSession(asset_type);
    const upperSymbols = symbols.map((s: string) => s.toUpperCase());

    // ── 60s quote_cache check (bulk) ──
    const { data: quoteCacheRows } = await supa
      .from("quote_cache")
      .select("symbol, payload, cached_at")
      .in("symbol", upperSymbols);

    const now = Date.now();
    const results: Record<string, any> = {};
    const stale: string[] = [];

    for (const symbol of upperSymbols) {
      const hit = quoteCacheRows?.find((r: any) => r.symbol === symbol);
      if (hit?.cached_at && now - new Date(hit.cached_at).getTime() < 60_000) {
        results[symbol] = { ...(hit.payload || {}), from_cache: true };
      } else {
        stale.push(symbol);
      }
    }

    // ── Forex: disabled on free tier (Alpha Vantage removed) ──
    if (asset_type === "forex") {
      for (const symbol of stale) {
        results[symbol] = {
          symbol,
          asset_type: "forex",
          current_price: null,
          percent_change: null,
          absolute_change: null,
          source: "none",
          timestamp: new Date().toISOString(),
          session_status: session,
          freshness: "unavailable",
          is_fallback: false,
          is_stale: true,
          error: "forex_unavailable",
          message: "Forex quotes disabled on free tier",
        };
      }
      return new Response(
        JSON.stringify({ quotes: results, session, provider_status: { finnhub: isProviderHealthy("finnhub") } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Fetch stale symbols ──
    for (const symbol of stale) {
      let price: number | null = null;
      let change: number | null = null;
      let absChange: number | null = null;
      let source = "none";
      let dayHigh: number | null = null;
      let dayLow: number | null = null;
      let volume: number | null = null;
      let prevClose: number | null = null;

      // Finnhub (stocks)
      if (FINNHUB_KEY && asset_type !== "crypto" && isProviderHealthy("finnhub")) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
            { signal: controller.signal },
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

      // CoinGecko (crypto, free, no key)
      if (!price && asset_type === "crypto") {
        const COINGECKO_IDS: Record<string, string> = {
          BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple",
          DOGE: "dogecoin", ADA: "cardano", AVAX: "avalanche-2", DOT: "polkadot",
          MATIC: "matic-network", LINK: "chainlink", UNI: "uniswap", ATOM: "cosmos",
          LTC: "litecoin", BCH: "bitcoin-cash", NEAR: "near", APT: "aptos",
          ARB: "arbitrum", OP: "optimism", SUI: "sui", FIL: "filecoin",
          AAVE: "aave", MKR: "maker", SNX: "synthetix-network-token",
          PEPE: "pepe", SHIB: "shiba-inu", BNB: "binancecoin",
        };
        const cgId = COINGECKO_IDS[symbol];
        if (cgId) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
              { signal: controller.signal },
            );
            clearTimeout(timeout);
            const data = await res.json();
            const coin = data[cgId];
            if (coin && coin.usd && coin.usd > 0) {
              price = coin.usd;
              change = coin.usd_24h_change ? Math.round(coin.usd_24h_change * 100) / 100 : 0;
              volume = coin.usd_24h_vol || null;
              source = "coingecko";
            }
          } catch (e) {
            console.error("CoinGecko error:", e);
          }
        }
      }

      if (!price) {
        // Serve aged cache as last resort
        const staleHit = quoteCacheRows?.find((r: any) => r.symbol === symbol);
        if (staleHit?.payload) {
          results[symbol] = { ...(staleHit.payload as any), is_stale: true, freshness: "stale" };
          continue;
        }
        results[symbol] = {
          symbol,
          asset_type,
          current_price: null,
          percent_change: null,
          absolute_change: null,
          source: "none",
          timestamp: new Date().toISOString(),
          session_status: session,
          freshness: "unavailable",
          is_fallback: false,
          is_stale: true,
        };
        continue;
      }

      const ts = new Date().toISOString();
      const responsePayload = {
        symbol,
        asset_type,
        current_price: price,
        price,
        percent_change: change,
        change_pct: change,
        absolute_change: absChange,
        currency: "USD",
        source,
        timestamp: ts,
        session_status: session,
        freshness: "live",
        is_fallback: false,
        is_stale: false,
        cache_age_seconds: 0,
        day_high: dayHigh,
        day_low: dayLow,
        volume,
        prev_close: prevClose,
      };
      results[symbol] = responsePayload;

      // Upsert 60s cache
      await supa.from("quote_cache").upsert({
        symbol,
        price: price ?? null,
        change_pct: change ?? null,
        payload: responsePayload,
        cached_at: ts,
      }, { onConflict: "symbol" });

      // Keep legacy analysis_cache in sync for other consumers
      await supa.from("analysis_cache").upsert({
        symbol,
        asset_type: asset_type || "stock",
        live_price: price,
        price_change: change,
        last_updated: ts,
      }, { onConflict: "symbol" });
    }

    return new Response(
      JSON.stringify({ quotes: results, session, provider_status: { finnhub: isProviderHealthy("finnhub") } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("live-quote error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
