// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const userTradeId = body?.user_trade_id;
    if (!userTradeId) return new Response(JSON.stringify({ error: "user_trade_id required" }), { status: 400, headers: corsHeaders });

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: trade } = await sb.from("paper_trades").select("*").eq("id", userTradeId).eq("user_id", user.id).maybeSingle();
    if (!trade) return new Response(JSON.stringify({ error: "trade not found" }), { status: 404, headers: corsHeaders });

    // Sophos's stance on this symbol around when user closed
    const closedAt = trade.closed_at || new Date().toISOString();
    const since = new Date(new Date(closedAt).getTime() - 7 * 86400_000).toISOString();
    const [{ data: sophOpen }, { data: sophClosed }, { data: sophIntents }, { data: sophSkips }] = await Promise.all([
      sb.from("mentor_trades").select("symbol,direction,entry_price,stop_loss,take_profit,opened_at,thesis").eq("mentor_slug","sophos").eq("status","open").eq("symbol", trade.symbol).limit(2),
      sb.from("mentor_trades").select("symbol,direction,entry_price,exit_price,pnl,closed_at,thesis,close_reflection").eq("mentor_slug","sophos").eq("status","closed").eq("symbol", trade.symbol).gte("closed_at", since).order("closed_at",{ascending:false}).limit(2),
      sb.from("mentor_intents").select("symbol,direction,trigger_condition_text,thesis,created_at,status").eq("mentor_slug","sophos").eq("symbol", trade.symbol).gte("created_at", since).order("created_at",{ascending:false}).limit(3),
      sb.from("mentor_journal").select("symbol,body_text,created_at").eq("mentor_slug","sophos").eq("kind","skip").eq("symbol", trade.symbol).gte("created_at", since).order("created_at",{ascending:false}).limit(2),
    ]);

    const ctx = {
      user_trade: {
        symbol: trade.symbol, direction: trade.direction,
        entry: trade.entry_price, exit: trade.exit_price,
        pnl: trade.pnl, pnl_pct: trade.pnl_percent,
        opened: trade.opened_at, closed: closedAt,
        thesis: trade.thesis, emotion: trade.emotion, post_notes: trade.post_notes,
        sl: trade.stop_loss, tp: trade.take_profit,
      },
      sophos_open: sophOpen || [],
      sophos_closed: sophClosed || [],
      sophos_intents: sophIntents || [],
      sophos_skips: sophSkips || [],
    };

    const sys = `You are Sophos, a calm Stoic trading mentor. The user just closed a trade. Compare their decision to your own stance on the same symbol if you have one. If you have no stance, comment on their thesis quality and discipline. Keep it 2 short sentences max. Speak in 2nd person ("you"). Avoid jargon. End with one piece of useful guidance, not praise.`;
    const userMsg = `Context JSON:\n${JSON.stringify(ctx)}\n\nReturn JSON: {"tone":"praise|caution|critique|neutral","headline":"<6 words","body":"<= 2 sentences"}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: "ai failed", detail: t }), { status: 502, headers: corsHeaders });
    }
    const j = await resp.json();
    let parsed: any = {};
    try { parsed = JSON.parse(j.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }
    const tone = parsed.tone || "neutral";
    const headline = parsed.headline || "A note on your trade";
    const body_text = parsed.body || "Reflect on whether your exit matched your plan.";

    // Insert as user (RLS: user_id = auth.uid())
    const { data: inserted, error: insErr } = await userClient.from("mentor_coach_notes").insert({
      user_id: user.id,
      mentor_slug: "sophos",
      user_trade_id: userTradeId,
      symbol: trade.symbol,
      tone, headline, body_text,
      payload: { sophos_had_stance: (sophOpen?.length || 0) + (sophIntents?.length || 0) + (sophClosed?.length || 0) > 0 },
    }).select().single();
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, note: inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
