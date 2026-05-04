import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MENTOR = "sophos";

function lastSundayUTC(d = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0 = Sun
  x.setUTCDate(x.getUTCDate() - day);
  return x;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const force = new URL(req.url).searchParams.get("force") === "1";

    const weekEnd = lastSundayUTC();
    const weekStart = new Date(weekEnd); weekStart.setUTCDate(weekStart.getUTCDate() - 7);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // already have this week's letter?
    const { data: existing } = await sb.from("mentor_letters")
      .select("id").eq("mentor_slug", MENTOR).eq("week_starting", weekStartStr).maybeSingle();
    if (existing && !force) {
      return new Response(JSON.stringify({ ok: true, skipped: "already exists", id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // gather week's data (these tables are single-mentor; no slug filter needed)
    const [{ data: closed }, { data: intents }, { data: journal }] = await Promise.all([
      sb.from("mentor_trades").select("symbol,direction,pnl_percent,closed_at,thesis,close_reflection")
        .eq("status", "closed")
        .gte("closed_at", weekStart.toISOString()).lt("closed_at", weekEnd.toISOString()),
      sb.from("mentor_intents").select("symbol,direction,thesis,status,created_at")
        .gte("created_at", weekStart.toISOString()).lt("created_at", weekEnd.toISOString()),
      sb.from("mentor_journal").select("kind,payload,created_at")
        .gte("created_at", weekStart.toISOString()).lt("created_at", weekEnd.toISOString())
        .limit(300),
    ]);

    const won = (closed || []).filter((t) => Number(t.pnl_percent) > 0).length;
    const lost = (closed || []).filter((t) => Number(t.pnl_percent) <= 0).length;
    const pubCount = (intents || []).length;
    const skipCount = (journal || []).filter((j) => j.kind === "skip").length;
    const pnlPct = (closed || []).reduce((s, t) => s + Number(t.pnl_percent || 0), 0);

    const skipReasons: Record<string, number> = {};
    for (const j of journal || []) {
      if (j.kind !== "skip") continue;
      const r = ((j.payload as any)?.skip_reason || "unspecified").toString().slice(0, 80);
      skipReasons[r] = (skipReasons[r] || 0) + 1;
    }
    const topSkips = Object.entries(skipReasons).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const tradeLines = (closed || []).slice(0, 8).map((t) =>
      `- ${t.symbol} ${t.direction} → ${Number(t.pnl_percent).toFixed(2)}% (${t.close_reflection ? "reflected" : "no note"})`
    ).join("\n") || "- (no trades closed)";

    const prompt = `You are Σοφός (Sophos), a stoic Greek trading mentor. Write a SHORT weekly letter to your followers reflecting on this week. Be calm, ancient-wise, and brutally honest. Reference Stoic philosophy (Epictetus, Marcus Aurelius, Seneca) sparingly.

WEEK STATS:
- Closed: ${won} winners, ${lost} losers
- Net P&L: ${pnlPct.toFixed(2)}%
- Intents published: ${pubCount}
- Setups skipped: ${skipCount}
- Top skip reasons: ${topSkips.map(([r, n]) => `${r} (${n}×)`).join(", ") || "—"}

TRADES:
${tradeLines}

Return ONLY valid JSON:
{
  "title": "5-9 word title (no quotes around it)",
  "greek_phrase": "one short Greek phrase in Greek script",
  "body": "180-300 words. 3 short paragraphs. Plain text, no markdown headings. Talk about: (1) what worked or failed, (2) what you watched but skipped and why that mattered, (3) one stoic lesson for the coming week."
}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "letter",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                greek_phrase: { type: "string" },
                body: { type: "string" },
              },
              required: ["title", "greek_phrase", "body"],
            },
          },
        },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`AI ${r.status}: ${t.slice(0, 200)}`);
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    const insertRow = {
      mentor_slug: MENTOR,
      week_starting: weekStartStr,
      title: parsed.title?.slice(0, 200) || "Reflections from the Stoa",
      greek_phrase: parsed.greek_phrase?.slice(0, 80) || null,
      body_md: parsed.body || "",
      stats: { won, lost, pubCount, skipCount, topSkips },
      trades_won: won,
      trades_lost: lost,
      intents_published: pubCount,
      intents_skipped: skipCount,
      pnl_pct: pnlPct,
    };

    const { data: saved, error: ie } = await sb.from("mentor_letters")
      .upsert(insertRow, { onConflict: "mentor_slug,week_starting" })
      .select().single();
    if (ie) throw ie;

    // journal entry so the ticker can show "letter published"
    await sb.from("mentor_journal").insert({
      kind: "letter_published",
      payload: { letter_id: saved.id, title: saved.title, week_starting: weekStartStr, pnl_pct: pnlPct },
    });

    return new Response(JSON.stringify({ ok: true, id: saved.id, title: saved.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("mentor-weekly error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
