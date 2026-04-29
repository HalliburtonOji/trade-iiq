// Council — weekly Stoic review for the calling user.
// Aggregates the last 7 days from paper_trades, xp_ledger, quiz_attempts,
// rule_violations, playbooks. Calls Lovable AI Gateway (gemini-2.5-flash) for a
// short Stoic-voiced verdict + one suggested decree. Caches per (user, week).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Aggregates = {
  trades: {
    count: number;
    wins: number;
    losses: number;
    win_rate: number;
    total_pnl: number;
    best: { symbol: string; pnl: number } | null;
    worst: { symbol: string; pnl: number } | null;
  };
  xp: { total: number; by_source: Record<string, number> };
  quizzes: { count: number; avg_score: number; weak_tags: string[] };
  rules: { violations: number };
  playbooks: { used: number };
};

function startOfWeek(d: Date): string {
  // ISO Monday-as-start. Returns YYYY-MM-DD.
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Authenticate
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const force = (() => {
      try {
        const url = new URL(req.url);
        return url.searchParams.get("force") === "1";
      } catch {
        return false;
      }
    })();

    const week = startOfWeek(new Date());
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Cache hit?
    if (!force) {
      const { data: cached } = await supa
        .from("council_reviews")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_starting", week)
        .maybeSingle();
      if (cached && cached.ai_summary) {
        return new Response(JSON.stringify({ review: cached, cached: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Aggregate last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [tradesRes, xpRes, quizRes, rulesRes, pbRes] = await Promise.all([
      supa.from("paper_trades").select("symbol,pnl,closed_at,thesis_json")
        .eq("user_id", user.id).eq("status", "closed").gte("closed_at", since),
      supa.from("xp_ledger").select("amount,source")
        .eq("user_id", user.id).gte("awarded_at", since),
      supa.from("quiz_attempts").select("score,total_questions,weak_tags")
        .eq("user_id", user.id).gte("completed_at", since),
      supa.from("rule_violations").select("id")
        .eq("user_id", user.id).gte("created_at", since),
      supa.from("playbooks").select("id").eq("user_id", user.id),
    ]);

    const trades = tradesRes.data || [];
    const wins = trades.filter((t: any) => Number(t.pnl) > 0).length;
    const losses = trades.filter((t: any) => Number(t.pnl) < 0).length;
    const totalPnl = trades.reduce((s: number, t: any) => s + Number(t.pnl || 0), 0);
    const sortedByPnl = [...trades].sort(
      (a: any, b: any) => Number(b.pnl || 0) - Number(a.pnl || 0),
    );
    const best = sortedByPnl[0]
      ? { symbol: sortedByPnl[0].symbol, pnl: Number(sortedByPnl[0].pnl) }
      : null;
    const worst = sortedByPnl.length
      ? {
        symbol: sortedByPnl[sortedByPnl.length - 1].symbol,
        pnl: Number(sortedByPnl[sortedByPnl.length - 1].pnl),
      }
      : null;

    const xpRows = xpRes.data || [];
    const xpBySource: Record<string, number> = {};
    let xpTotal = 0;
    for (const r of xpRows as Array<{ amount: number; source: string }>) {
      xpBySource[r.source] = (xpBySource[r.source] || 0) + r.amount;
      xpTotal += r.amount;
    }

    const quizzes = quizRes.data || [];
    const quizAvg = quizzes.length
      ? Math.round(
        quizzes.reduce(
          (s: number, q: any) =>
            s + (q.total_questions ? (q.score / q.total_questions) * 100 : 0),
          0,
        ) / quizzes.length,
      )
      : 0;
    const weakTagSet = new Set<string>();
    for (const q of quizzes as any[]) {
      (q.weak_tags || []).forEach((t: string) => weakTagSet.add(t));
    }

    const aggregates: Aggregates = {
      trades: {
        count: trades.length,
        wins,
        losses,
        win_rate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
        total_pnl: Math.round(totalPnl * 100) / 100,
        best,
        worst,
      },
      xp: { total: xpTotal, by_source: xpBySource },
      quizzes: { count: quizzes.length, avg_score: quizAvg, weak_tags: Array.from(weakTagSet).slice(0, 5) },
      rules: { violations: (rulesRes.data || []).length },
      playbooks: { used: (pbRes.data || []).length },
    };

    // 3. Ask Gemini for a Stoic verdict + decree
    let ai_summary = "";
    let decree = "";
    if (LOVABLE_API_KEY) {
      const prompt = `You are the Stoic Council inside the Stoa trading platform. Given this trader's last 7 days, return STRICT JSON:
{ "verdict": "<one sentence, second person, archaic-modern Stoic voice, no emojis, max 30 words>", "decree": "<one rule for next week, imperative voice, max 18 words>" }
Data: ${JSON.stringify(aggregates)}
Tone examples — verdict: "This week thy hand was steady, but thy thesis weak." decree: "Before each entry, write the price that proves thee wrong."
Return JSON only, no fences.`;
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            max_tokens: 300,
            temperature: 0.6,
          }),
        });
        if (r.ok) {
          const j = await r.json();
          let raw: string = j.choices?.[0]?.message?.content || "";
          raw = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
          try {
            const parsed = JSON.parse(raw);
            ai_summary = String(parsed.verdict || "").trim();
            decree = String(parsed.decree || "").trim();
          } catch (_e) {
            ai_summary = raw.slice(0, 240);
          }
        } else {
          const t = await r.text();
          console.error("Council AI gateway error", r.status, t.slice(0, 200));
        }
      } catch (e) {
        console.error("Council AI fetch failed", e);
      }
    }

    if (!ai_summary) {
      ai_summary = trades.length
        ? `Thou closed ${trades.length} trades, ${wins} won. Hold this rhythm.`
        : `No trades this week. The market rewards patience, not absence — return.`;
    }
    if (!decree) {
      decree = aggregates.rules.violations > 0
        ? "Honour every rule before each entry; none may be skipped."
        : "Begin each session by writing a single sentence thesis.";
    }

    // 4. Upsert cache
    const { data: upserted, error: upErr } = await supa
      .from("council_reviews")
      .upsert(
        {
          user_id: user.id,
          week_starting: week,
          ai_summary,
          decree,
          aggregates: aggregates as unknown as Record<string, unknown>,
        },
        { onConflict: "user_id,week_starting" },
      )
      .select("*")
      .single();

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ review: upserted, cached: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
