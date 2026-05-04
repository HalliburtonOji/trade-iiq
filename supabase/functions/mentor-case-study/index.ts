// mentor-case-study — generates a teaching case study from a closed Sophos trade.
// Called by mentor-tick on close, or manually with { trade_id }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const trade_id = body?.trade_id as string | undefined;
    if (!trade_id) {
      return json({ error: "trade_id required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Idempotency
    const { data: existing } = await sb
      .from("mentor_case_studies")
      .select("id")
      .eq("trade_id", trade_id)
      .maybeSingle();
    if (existing) return json({ ok: true, id: existing.id, existed: true });

    const { data: trade, error: tErr } = await sb
      .from("mentor_trades").select("*").eq("id", trade_id).maybeSingle();
    if (tErr || !trade) return json({ error: "trade not found" }, 404);
    if (trade.status !== "closed") return json({ error: "trade not closed" }, 400);

    // Pull intent (if any) and surrounding journal entries for that symbol.
    const [intentRes, journalRes] = await Promise.all([
      trade.intent_id
        ? sb.from("mentor_intents").select("*").eq("id", trade.intent_id).maybeSingle()
        : Promise.resolve({ data: null }),
      sb.from("mentor_journal")
        .select("kind,body_text,payload,created_at")
        .eq("symbol", trade.symbol)
        .order("created_at", { ascending: true })
        .limit(20),
    ]);

    const intent = intentRes.data;
    const journal = journalRes.data || [];

    // Compute R-multiple & outcome
    const dir = trade.direction === "long" ? 1 : -1;
    const stopDist = Math.abs(Number(trade.entry_price) - Number(trade.stop_loss));
    const moveDist = (Number(trade.exit_price) - Number(trade.entry_price)) * dir;
    const rMultiple = stopDist > 0 ? moveDist / stopDist : 0;
    const pnlPct = Number(trade.pnl_percent ?? 0);
    const outcome = pnlPct > 0.05 ? "win" : pnlPct < -0.05 ? "loss" : "breakeven";

    // Build prompt
    const ctx = {
      symbol: trade.symbol,
      asset_type: trade.asset_type,
      direction: trade.direction,
      entry: trade.entry_price,
      stop: trade.stop_loss,
      target: trade.take_profit,
      exit: trade.exit_price,
      pnl_pct: pnlPct,
      r_multiple: rMultiple,
      outcome,
      original_thesis: trade.thesis,
      close_reflection: trade.close_reflection,
      intent: intent ? {
        trigger: intent.trigger_condition_text,
        invalidation: intent.invalidation_text,
        thesis: intent.thesis,
        conviction: intent.conviction,
        fail_reasons: intent.fail_reasons,
      } : null,
      journal_timeline: journal.map((j: any) => ({
        kind: j.kind, at: j.created_at, note: j.body_text,
      })),
    };

    const prompt = `You are Sophos, a stoic AI trader writing a teaching case study about a trade you JUST closed.
Write for a learner who will read this in the Codex. Be honest about what worked and what didn't.

TRADE CONTEXT:
${JSON.stringify(ctx, null, 2)}

Return STRICT JSON with these fields and nothing else:
{
  "title": "<6-9 word title that names the lesson, e.g. 'NVDA breakout: trusted the trigger, sized too small'>",
  "hook": "<one-sentence teaser, max 110 chars>",
  "setup": "<2-3 sentences describing the market setup that made this trade attractive>",
  "entry_rationale": "<2-3 sentences on WHY entry, including the trigger that fired>",
  "what_happened": "<3-5 sentences narrating how it played out, in order>",
  "lesson": "<3-5 sentences on the generalisable lesson — what a student should INTERNALISE>",
  "key_takeaway": "<one bold sentence the student should remember, max 140 chars>",
  "tags": ["<3-6 lowercase tags like 'breakout','trend-follow','stop-hunt','macro-news','overconfidence'>"],
  "greek_phrase": "<one short Greek phrase (1-3 words) that captures the lesson, e.g. 'Σωφροσύνη' (sophrosyne, sound-mindedness)>"
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a disciplined stoic trader-teacher. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[mentor-case-study] AI error:", aiRes.status, errText);
      return json({ error: "ai_failed", detail: errText }, 502);
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch (e) {
      console.error("[mentor-case-study] parse error:", e, raw);
      return json({ error: "parse_failed" }, 502);
    }

    const insert = {
      trade_id: trade.id,
      intent_id: trade.intent_id ?? null,
      symbol: trade.symbol,
      asset_type: trade.asset_type,
      direction: trade.direction,
      outcome,
      r_multiple: rMultiple,
      pnl_pct: pnlPct,
      title: String(parsed.title || `${trade.symbol} ${trade.direction} — ${outcome}`),
      hook: String(parsed.hook || ""),
      setup: String(parsed.setup || ""),
      entry_rationale: String(parsed.entry_rationale || ""),
      what_happened: String(parsed.what_happened || ""),
      lesson: String(parsed.lesson || ""),
      key_takeaway: String(parsed.key_takeaway || ""),
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      greek_phrase: parsed.greek_phrase ? String(parsed.greek_phrase) : null,
    };

    const { data: row, error: insErr } = await sb
      .from("mentor_case_studies")
      .insert(insert)
      .select("id")
      .single();
    if (insErr) {
      console.error("[mentor-case-study] insert error:", insErr);
      return json({ error: "insert_failed", detail: insErr.message }, 500);
    }

    // Add a journal entry so the ticker / public profile surface it.
    await sb.from("mentor_journal").insert({
      kind: "case_study",
      trade_id: trade.id,
      symbol: trade.symbol,
      body_text: `New case study published: "${insert.title}".`,
      payload: { case_study_id: row.id, outcome, r_multiple: rMultiple, tags: insert.tags },
    });

    return json({ ok: true, id: row.id, created: true });
  } catch (e: any) {
    console.error("[mentor-case-study] fatal:", e);
    return json({ error: e?.message || "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
