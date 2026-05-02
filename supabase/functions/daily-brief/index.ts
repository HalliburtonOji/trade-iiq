import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await supa.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;
    const today = new Date().toISOString().slice(0, 10);

    // Return cached brief if exists for today
    const { data: cached } = await supa.from("daily_briefs")
      .select("*").eq("user_id", user.id).eq("brief_date", today).maybeSingle();
    if (cached) {
      return new Response(JSON.stringify({ brief: cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather context
    const [{ data: playbooks }, { data: rules }, { data: recentTrades }, { data: picks }] = await Promise.all([
      supa.from("playbooks").select("name, strategy_type, conditions").eq("user_id", user.id).limit(5),
      supa.from("trading_rules").select("rule_text").eq("user_id", user.id).eq("is_active", true).limit(10),
      supa.from("paper_trades").select("symbol, direction, pnl_percent, status, closed_at").eq("user_id", user.id).order("opened_at", { ascending: false }).limit(20),
      supa.from("daily_picks_cache").select("stocks, crypto, forex").eq("date", today).maybeSingle(),
    ]);

    // Pull symbols: from open paper trades + first daily pick of each class
    const openSymbols = (recentTrades ?? []).filter(t => t.status === "open").map(t => t.symbol);
    const pickSyms: string[] = [];
    const stockArr = (picks?.stocks as any[]) ?? [];
    const cryptoArr = (picks?.crypto as any[]) ?? [];
    const forexArr = (picks?.forex as any[]) ?? [];
    if (stockArr[0]?.symbol) pickSyms.push(stockArr[0].symbol);
    if (cryptoArr[0]?.symbol) pickSyms.push(cryptoArr[0].symbol);
    if (forexArr[0]?.symbol) pickSyms.push(forexArr[0].symbol);
    const symbols = Array.from(new Set([...openSymbols, ...pickSyms])).slice(0, 3);

    // Default brief if no AI key
    let bias_focus = "Recency bias";
    let bias_explainer = "Recent results cast long shadows. Today, weigh evidence, not memory.";
    let discipline_focus = (rules?.[0]?.rule_text) ?? "Define risk before entry. No exceptions.";
    let ai_summary = "Hold the line. Trade thy plan.";

    if (LOVABLE_API_KEY) {
      const ctx = {
        playbooks: (playbooks ?? []).map(p => p.name),
        active_rules: (rules ?? []).map(r => r.rule_text),
        recent_trades: (recentTrades ?? []).slice(0, 10).map(t => ({
          sym: t.symbol, dir: t.direction, pnl: t.pnl_percent, status: t.status,
        })),
        symbols_today: symbols,
      };
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Thou art the Stoic morning herald of a trader's discipline. Speak in short, archaic English (thee/thou). Three to four sentences max. Identify the most likely cognitive bias today given recent trades, and one rule to honour. No emojis." },
              { role: "user", content: `Context:\n${JSON.stringify(ctx)}\n\nReturn ONLY a JSON object with keys: bias_focus (1-3 words), bias_explainer (one sentence), discipline_focus (one sentence quoting one of their rules verbatim if any), summary (one sentence morning charge).` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (aiResp.ok) {
          const j = await aiResp.json();
          const txt = j.choices?.[0]?.message?.content ?? "{}";
          const parsed = JSON.parse(txt);
          if (parsed.bias_focus) bias_focus = String(parsed.bias_focus).slice(0, 60);
          if (parsed.bias_explainer) bias_explainer = String(parsed.bias_explainer).slice(0, 240);
          if (parsed.discipline_focus) discipline_focus = String(parsed.discipline_focus).slice(0, 240);
          if (parsed.summary) ai_summary = String(parsed.summary).slice(0, 280);
        } else if (aiResp.status === 429 || aiResp.status === 402) {
          console.warn("AI gateway limited:", aiResp.status);
        }
      } catch (e) {
        console.error("AI brief failed:", e);
      }
    }

    const { data: inserted, error: insErr } = await supa.from("daily_briefs").insert({
      user_id: user.id,
      brief_date: today,
      symbols,
      bias_focus,
      bias_explainer,
      discipline_focus,
      ai_summary,
    }).select().single();
    if (insErr) {
      // race: fetch existing
      const { data: again } = await supa.from("daily_briefs").select("*").eq("user_id", user.id).eq("brief_date", today).maybeSingle();
      return new Response(JSON.stringify({ brief: again, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ brief: inserted, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-brief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
