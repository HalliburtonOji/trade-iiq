// Generate next-best Codex module recommendation using Claude Sonnet (or OpenAI fallback).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { user_id, force } = body || {};
    if (!user_id) {
      return new Response(JSON.stringify({ error: "missing_user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 24h rate limit: return the most recent non-dismissed recommendation if it's fresh
    const { data: recent } = await supabase
      .from("learn_recommendations")
      .select("module_id, reason, generated_at")
      .eq("user_id", user_id)
      .is("dismissed_at", null)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!force && recent?.generated_at && Date.now() - new Date(recent.generated_at).getTime() < 24 * 60 * 60 * 1000) {
      return new Response(JSON.stringify({
        module_id: recent.module_id,
        reason: recent.reason,
        from_cache: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure latest signature; if missing, invoke compute fn
    let { data: sigRow } = await supabase.from("trading_signatures")
      .select("signature, computed_at").eq("user_id", user_id).maybeSingle();
    if (!sigRow) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-trading-signature`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ user_id }),
        });
        const r = await supabase.from("trading_signatures")
          .select("signature, computed_at").eq("user_id", user_id).maybeSingle();
        sigRow = r.data;
      } catch (_) { /* ignore */ }
    }
    const signature = sigRow?.signature ?? { win_rate: 0, total_trades: 0, bias_vec: [0,0,0,0], risk_vec: [0,0,0,0], craft_vec: [0,0,0] };

    // Candidate modules: published + not-yet-quiz-completed
    const { data: completedQuiz } = await supabase.from("learn_progress")
      .select("module_id").eq("user_id", user_id).eq("mode", "quiz").eq("status", "completed");
    const completedIds = new Set((completedQuiz || []).map((r: any) => r.module_id));

    const { data: allMods } = await supabase.from("learn_modules")
      .select("id, slug, track, level, title_en, summary")
      .eq("is_published", true);
    const candidates = (allMods || []).filter((m: any) => !completedIds.has(m.id));

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ error: "no_candidates" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = JSON.stringify({
      signature,
      candidate_modules: candidates.map((m: any) => ({
        id: m.id, slug: m.slug, track: m.track, level: m.level, title_en: m.title_en, summary: m.summary,
      })),
    });

    const sysPrompt = "You are a trading-discipline tutor choosing a user's next Codex module. Pick the SINGLE best module to address the user's weakest area or next logical progression.";
    const userInstruction = `${userMsg}\n\nReturn JSON only: {"module_id": "<uuid>", "reason": "<one-sentence why, second person>", "reason_detail": {"driver": "<bias_vec|risk_vec|craft_vec|progression>", "metric_value": <number>, "target_metric_value": <number>}}`;

    let parsed: any = null;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (anthropicKey) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 600,
            system: sysPrompt,
            messages: [{ role: "user", content: userInstruction }],
          }),
        });
        const d = await r.json();
        const text = d?.content?.[0]?.text || "";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch (_) { parsed = null; }
    }

    if (!parsed) {
      const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "no_llm_key" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isLovable = !Deno.env.get("OPENAI_API_KEY");
      const url = isLovable ? "https://ai.gateway.lovable.dev/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
      const model = isLovable ? "google/gemini-2.5-flash" : "gpt-4o-mini";
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model, temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: userInstruction },
          ],
        }),
      });
      const d = await r.json();
      try { parsed = JSON.parse(d?.choices?.[0]?.message?.content || "{}"); } catch { parsed = null; }
    }

    if (!parsed?.module_id) {
      return new Response(JSON.stringify({ error: "llm_no_module" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist (dismiss prior open recs)
    await supabase.from("learn_recommendations")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("user_id", user_id).is("dismissed_at", null);

    await supabase.from("learn_recommendations").insert({
      user_id,
      module_id: parsed.module_id,
      reason: parsed.reason || "Recommended by your trading signature.",
      reason_detail: parsed.reason_detail || null,
    });

    return new Response(JSON.stringify({ module_id: parsed.module_id, reason: parsed.reason }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
