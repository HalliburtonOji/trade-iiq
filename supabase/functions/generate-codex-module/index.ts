// Codex v2 — generate-codex-module
// Expands compact specs into fully-populated learn_modules rows via AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Spec {
  track: "markets" | "chart" | "risk" | "mind" | "craft";
  level: 1 | 2 | 3;
  slug: string;
  title_en: string;
  title_gr: string;
  summary?: string;
  ordinal?: number;
  learn_minutes?: number;
  xp_reward?: number;
}

const audienceFor = (level: number) =>
  level === 1 ? "beginners" : level === 2 ? "practitioners" : "advanced traders";

const SYSTEM_PROMPT = `You are a senior trading curriculum author for the "Codex" learning system in TradeIQ.
You write tight, calm, no-fluff lessons in the voice of a Stoic mentor — clear, numeric, decisive.
You ALWAYS return STRICT JSON matching the requested schema. No markdown fences, no commentary.`;

function userPrompt(spec: Spec) {
  const audience = audienceFor(spec.level);
  return `Build one Codex module.

Track: ${spec.track}
Level: ${spec.level} (audience: ${audience})
Title: ${spec.title_en}
Greek title: ${spec.title_gr}
Summary: ${spec.summary ?? ""}

Return STRICT JSON of shape:
{
  "content_md":   "<6-10 minute lesson. 2-3 section headings using '## '. Include exactly one numeric worked example. End with a paragraph starting with 'Next' that hints at what to drill or apply. No fluff, no emojis, no marketing.>",
  "drill_json":   { "questions": [ { "prompt":"...", "options":["A","B","C","D"], "correct":0, "explanation":"..." } ] },   // exactly 6 questions
  "quiz_json":    { "pass_score": 70, "questions": [ { "prompt":"...", "options":["A","B","C","D"], "correct":0, "explanation":"..." } ] },   // exactly 10 questions
  "scenario_json":{ "symbol":"SPY", "timeframe":"1D", "start_date":"2023-09-15", "end_date":"2023-10-20", "ask":"<one-sentence decision ask>", "ideal_entry_day":5, "ideal_stop_pct":2, "ideal_target_pct":6 }
}

Rules:
- "correct" is the 0-based index of the right option in "options".
- Each question's "explanation" is one sentence and teaches the concept, not just states the answer.
- Pick a real, plausible symbol/date range for scenario_json relevant to the lesson topic.
- Output JSON only — no prose, no code fences.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { specs, auto_publish } = (await req.json()) as { specs: Spec[]; auto_publish?: boolean };
    if (!Array.isArray(specs) || specs.length === 0) {
      return new Response(JSON.stringify({ error: "specs[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Prefer OPENAI_API_KEY, fall back to LOVABLE_API_KEY (Lovable AI gateway, OpenAI-compatible).
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const useLovable = !openaiKey && !!lovableKey;
    if (!openaiKey && !lovableKey) {
      return new Response(JSON.stringify({ error: "No AI key (OPENAI_API_KEY or LOVABLE_API_KEY)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = useLovable
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const authKey = useLovable ? lovableKey! : openaiKey!;
    const model = useLovable ? "openai/gpt-5-mini" : "gpt-4o-mini";

    const results: Array<{ slug: string; ok: boolean; id?: string; error?: string }> = [];

    for (const spec of specs) {
      try {
        const aiResp = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.6,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt(spec) },
            ],
          }),
        });

        if (!aiResp.ok) {
          const t = await aiResp.text();
          console.error("AI error", spec.slug, aiResp.status, t);
          results.push({ slug: spec.slug, ok: false, error: `AI ${aiResp.status}` });
          continue;
        }

        const aiJson = await aiResp.json();
        const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          console.error("parse error", spec.slug, raw.slice(0, 200));
          results.push({ slug: spec.slug, ok: false, error: "AI returned non-JSON" });
          continue;
        }

        const row = {
          track: spec.track,
          level: spec.level,
          slug: spec.slug,
          title_en: spec.title_en,
          title_gr: spec.title_gr,
          summary: spec.summary ?? null,
          ordinal: spec.ordinal ?? 0,
          learn_minutes: spec.learn_minutes ?? 8,
          xp_reward: spec.xp_reward ?? 50,
          content_md: parsed.content_md ?? null,
          drill_json: parsed.drill_json ?? null,
          quiz_json: parsed.quiz_json ?? null,
          scenario_json: parsed.scenario_json ?? null,
          is_published: !!auto_publish,
        };

        const { data, error } = await supabase
          .from("learn_modules")
          .upsert(row, { onConflict: "slug" })
          .select("id")
          .single();

        if (error) {
          console.error("upsert error", spec.slug, error.message);
          results.push({ slug: spec.slug, ok: false, error: error.message });
        } else {
          results.push({ slug: spec.slug, ok: true, id: data?.id });
        }
      } catch (innerErr) {
        console.error("module error", spec.slug, innerErr);
        results.push({
          slug: spec.slug,
          ok: false,
          error: innerErr instanceof Error ? innerErr.message : "unknown",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-codex-module fatal", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
