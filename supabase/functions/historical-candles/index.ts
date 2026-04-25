// Historical daily candles via Stooq (free, keyless) with Finnhub fallback + 24h DB cache.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type Candle = { time: string; open: number; high: number; low: number; close: number; volume: number };

function toStooqSymbol(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return s;
  // Already namespaced (e.g. "spy.us") — pass through
  if (s.includes(".")) return s;
  // Crypto pairs (btcusd, ethusdt, btcusdc) — Stooq uses lowercase pair like btcusd
  if (/^[a-z]{2,6}(usd|usdt|usdc|btc|eth)$/.test(s)) {
    // Stooq supports btcusd / ethusd etc. Strip trailing t/c if usdt/usdc → fall back to usd
    return s.replace(/usdt$|usdc$/, "usd");
  }
  // Forex 6-letter (eurusd) — Stooq accepts as-is
  if (/^[a-z]{6}$/.test(s)) return s;
  // Default: treat as US equity
  return `${s}.us`;
}

function stripDashes(d: string): string {
  return d.replace(/-/g, "");
}

function parseStooqCsv(csv: string): Candle[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  if (!header.startsWith("date")) return [];
  const out: Candle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    const [date, o, h, l, c, v] = cols;
    const open = Number(o), high = Number(h), low = Number(l), close = Number(c);
    if (![open, high, low, close].every(Number.isFinite)) continue;
    out.push({
      time: date,
      open, high, low, close,
      volume: Number(v) || 0,
    });
  }
  return out;
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
        return new Response(JSON.stringify({ symbol, candles: cached.candles, from_cache: true, source: cached.source }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    console.log(`[candles] cache MISS ${symbol} ${start_date}→${end_date} force=${!!force}`);

    const tried: string[] = [];

    // PRIMARY: Stooq
    tried.push("stooq");
    const stooqSym = toStooqSymbol(symbol);
    const stooqUrl = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSym)}&d1=${stripDashes(start_date)}&d2=${stripDashes(end_date)}&i=d`;
    let stooqCandles: Candle[] = [];
    try {
      const r = await fetch(stooqUrl);
      const text = await r.text();
      console.log(`[candles] stooq ${stooqSym} status=${r.status} bytes=${text.length}`);
      stooqCandles = parseStooqCsv(text);
      console.log(`[candles] stooq parsed rows=${stooqCandles.length}`);
    } catch (e) {
      console.error(`[candles] stooq fetch error`, e);
    }

    if (stooqCandles.length > 5) {
      await supa.from("candle_cache").upsert({
        symbol, start_date, end_date,
        candles: stooqCandles,
        source: "stooq",
        cached_at: new Date().toISOString(),
      }, { onConflict: "symbol,start_date,end_date" });
      return new Response(JSON.stringify({ symbol, candles: stooqCandles, from_cache: false, source: "stooq" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FALLBACK: Finnhub
    const key = Deno.env.get("FINNHUB_API_KEY");
    if (key) {
      tried.push("finnhub");
      try {
        const s = Math.floor(new Date(start_date).getTime() / 1000);
        const e = Math.floor(new Date(end_date).getTime() / 1000);
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${s}&to=${e}&token=${key}`;
        const r = await fetch(url);
        const d = await r.json();
        console.log(`[candles] finnhub ${symbol} status=${r.status} s=${d.s}`);
        if (d.s === "ok" && Array.isArray(d.t) && d.t.length > 0) {
          const candles: Candle[] = d.t.map((ts: number, i: number) => ({
            time: new Date(ts * 1000).toISOString().slice(0, 10),
            open: d.o[i], high: d.h[i], low: d.l[i], close: d.c[i],
            volume: d.v[i] || 0,
          }));
          await supa.from("candle_cache").upsert({
            symbol, start_date, end_date,
            candles, source: "finnhub",
            cached_at: new Date().toISOString(),
          }, { onConflict: "symbol,start_date,end_date" });
          return new Response(JSON.stringify({ symbol, candles, from_cache: false, source: "finnhub" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.error(`[candles] finnhub error`, e);
      }
    }

    console.log(`[candles] FAIL ${symbol} tried=${tried.join(",")}`);
    return new Response(JSON.stringify({
      error: "no_data",
      tried,
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
