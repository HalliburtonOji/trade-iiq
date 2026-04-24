// Codex v2 — generate-codex-module
// Expands compact specs into fully-populated learn_modules rows via Anthropic Claude.
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
  "content_md":   "<900-1400 word lesson. Structure: opening paragraph → 3-5 sections with '## ' headings → closing paragraph. Each section MUST include at least one callout block using GFM blockquote alert syntax: '> [!TAKEAWAY]\\n> one-sentence insight.' OR '> [!EXAMPLE]\\n> concrete scenario with real numbers.' OR '> [!REMEMBER]\\n> a rule phrased memorably.' OR '> [!WARNING]\\n> a common mistake as a short directive.' At least 3 callouts total per lesson. Use **bold** for key terms. Tone: classical, precise, instructive — Stoic mentor. Include exactly one numeric worked example. End with a paragraph starting with 'Next' that hints at what to drill or apply. No fluff, no emojis, no marketing.>",
  "drill_json":   { "questions": [ { "prompt":"...", "options":["A","B","C","D"], "correct":0, "explanation":"..." } ] },
  "quiz_json":    { "pass_score": 70, "questions": [ { "prompt":"...", "options":["A","B","C","D"], "correct":0, "explanation":"..." } ] },
  "scenario_json":{ "symbol":"SPY", "timeframe":"1D", "start_date":"2023-09-15", "end_date":"2023-10-20", "ask":"<one-sentence decision ask>", "ideal_entry_day":5, "ideal_stop_pct":2, "ideal_target_pct":6 }
}

Rules:
- drill_json has exactly 6 questions; quiz_json has exactly 10 questions.
- "correct" is the 0-based index of the right option in "options".
- Each question's "explanation" is one sentence and teaches the concept, not just states the answer.
- Pick a real, plausible symbol/date range for scenario_json relevant to the lesson topic.
- Output JSON only — no prose, no code fences.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    // Support both batch ({ specs: [...] }) and single-spec ({ track, level, slug, ... }) calls.
    const specs: Spec[] = Array.isArray(body?.specs)
      ? body.specs
      : body?.track && body?.slug
        ? [body as Spec]
        : [];
    const auto_publish: boolean = body?.auto_publish !== false; // default true

    if (specs.length === 0) {
      return new Response(JSON.stringify({ error: "specs[] or single spec required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ slug: string; ok: boolean; id?: string; error?: string }> = [];

    for (const spec of specs) {
      try {
        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 3000,
            system:
              SYSTEM_PROMPT +
              "\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No markdown code fences, no prose before or after.",
            messages: [{ role: "user", content: userPrompt(spec) }],
          }),
        });

        if (!anthropicRes.ok) {
          const errText = await anthropicRes.text();
          console.error("Anthropic error:", spec.slug, anthropicRes.status, errText);
          results.push({
            slug: spec.slug,
            ok: false,
            error: `Anthropic ${anthropicRes.status}: ${errText.slice(0, 300)}`,
          });
          continue;
        }

        const anthropicData = await anthropicRes.json();
        let rawText: string = anthropicData.content?.[0]?.text || "";

        // Strip markdown code fences if Claude wrapped the JSON.
        rawText = rawText.trim();
        if (rawText.startsWith("```")) {
          rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
        }

        let moduleData: any;
        try {
          moduleData = JSON.parse(rawText);
        } catch (_e) {
          console.error("JSON parse failed for", spec.slug, "Raw:", rawText.slice(0, 500));
          results.push({
            slug: spec.slug,
            ok: false,
            error: `Claude returned invalid JSON: ${rawText.slice(0, 200)}`,
          });
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
          content_md: moduleData.content_md ?? null,
          drill_json: moduleData.drill_json ?? null,
          quiz_json: moduleData.quiz_json ?? null,
          scenario_json: moduleData.scenario_json ?? null,
          is_published: auto_publish,
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
