// Historical daily candles via Finnhub, with permanent DB cache (daily candles don't change).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, start_date, end_date } = await req.json();
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

    // L1: DB cache (daily candles are immutable)
    const { data: cached } = await supa
      .from("candle_cache")
      .select("candles")
      .eq("symbol", symbol)
      .eq("start_date", start_date)
      .eq("end_date", end_date)
      .maybeSingle();
    if (cached?.candles) {
      return new Response(JSON.stringify({ symbol, candles: cached.candles, from_cache: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("FINNHUB_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "no_key" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const s = Math.floor(new Date(start_date).getTime() / 1000);
    const e = Math.floor(new Date(end_date).getTime() / 1000);
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${s}&to=${e}&token=${key}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.s !== "ok") {
      return new Response(JSON.stringify({ error: "no_data", symbol, candles: [], from_cache: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const candles = d.t.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      o: d.o[i], h: d.h[i], l: d.l[i], c: d.c[i], v: d.v[i],
    }));

    // Cache for future invocations
    await supa.from("candle_cache").upsert({
      symbol, start_date, end_date, candles, cached_at: new Date().toISOString(),
    }, { onConflict: "symbol,start_date,end_date" });

    return new Response(JSON.stringify({ symbol, candles, from_cache: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
