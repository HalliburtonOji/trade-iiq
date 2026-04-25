// Historical daily candles via Yahoo Finance v8 (keyless) with 24h DB cache.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type Candle = { time: string; open: number; high: number; low: number; close: number; volume: number };

function toYahooSymbol(input: string): string {
  const raw = (input || "").trim();
  if (!raw) return raw;
  // Already Yahoo-shaped: index, crypto-dash, or forex =X
  if (raw.startsWith("^") || raw.includes("-USD") || raw.endsWith("=X")) return raw.toUpperCase();
  const upper = raw.toUpperCase();
  // Crypto: e.g. BTCUSD, ETHUSDT, ETHUSDC, SOLUSD → BTC-USD
  const cryptoMatch = upper.match(/^([A-Z]{2,6})(USDT|USDC|USD)$/);
  if (cryptoMatch) {
    return `${cryptoMatch[1]}-USD`;
  }
  // Forex: 6 letters all alpha, e.g. EURUSD → EURUSD=X
  if (/^[A-Z]{6}$/.test(upper)) return `${upper}=X`;
  // Default: equity / ETF
  return upper;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, start_date, end_date, force } = await req.json();
    if (!symbol || !start_date || !end_date) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // L1: 24h DB cache
    if (!force) {
      const { data: cached } = await supa
        .from("candle_cache")
        .select("candles, source, cached_at")
        .eq("symbol", symbol)
        .eq("start_date", start_date)
        .eq("end_date", end_date)
        .gt("cached_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (cached?.candles && Array.isArray(cached.candles) && cached.candles.length > 0) {
        console.log(`[candles] cache HIT ${symbol} ${start_date}→${end_date} src=${cached.source} rows=${cached.candles.length}`);
        return new Response(JSON.stringify({ symbol, candles: cached.candles, from_cache: true, source: cached.source ?? "yahoo" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    console.log(`[candles] cache MISS ${symbol} ${start_date}→${end_date} force=${!!force}`);

    // PRIMARY: Yahoo Finance v8 (keyless)
    const yhSymbol = toYahooSymbol(symbol);
    const period1 = Math.floor(new Date(start_date).getTime() / 1000);
    const period2 = Math.floor(new Date(end_date).getTime() / 1000) + 86400; // inclusive of end day
    const yhUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yhSymbol)}?period1=${period1}&period2=${period2}&interval=1d`;

    let candles: Candle[] = [];
    let yhStatus = 0;
    try {
      const r = await fetch(yhUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
      });
      yhStatus = r.status;
      const j = await r.json();
      const result = j?.chart?.result?.[0];
      if (result) {
        const ts: number[] = result.timestamp ?? [];
        const q = result.indicators?.quote?.[0] ?? {};
        candles = ts.map((t: number, i: number) => {
          const date = new Date(t * 1000).toISOString().slice(0, 10);
          const open = q.open?.[i];
          const high = q.high?.[i];
          const low = q.low?.[i];
          const close = q.close?.[i];
          const volume = q.volume?.[i] ?? 0;
          return {
            time: date, date,
            open, high, low, close, volume,
            o: open, h: high, l: low, c: close, v: volume,
          } as any;
        }).filter((c: any) =>
          c.open != null && c.high != null && c.low != null && c.close != null
        );
      } else if (j?.chart?.error) {
        console.error(`[candles] yahoo error payload`, j.chart.error);
      }
      console.log(`[candles] yahoo`, { yhSymbol, status: yhStatus, rows: candles.length });
    } catch (e) {
      console.error(`[candles] yahoo fetch error`, e);
    }

    if (candles.length >= 2) {
      await supa.from("candle_cache").upsert({
        symbol, start_date, end_date,
        candles,
        source: "yahoo",
        cached_at: new Date().toISOString(),
      }, { onConflict: "symbol,start_date,end_date" });
      return new Response(JSON.stringify({ symbol, candles, from_cache: false, source: "yahoo" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[candles] FAIL ${symbol} (yahoo rows=${candles.length} status=${yhStatus})`);
    return new Response(JSON.stringify({
      error: "no_data",
      tried: ["yahoo"],
      symbol,
      candles: [],
      range: [start_date, end_date],
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[candles] fatal", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
