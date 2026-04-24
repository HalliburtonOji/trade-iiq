const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CheckResult = { status: "ok" | "missing" | "error"; detail: string };

function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

async function safeRun(fn: () => Promise<CheckResult>): Promise<CheckResult> {
  try {
    return await withTimeout(fn());
  } catch (e: any) {
    return { status: "error", detail: e?.message ?? String(e) };
  }
}

async function checkAnthropic(): Promise<CheckResult> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { status: "missing", detail: "ANTHROPIC_API_KEY not set" };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    return { status: "error", detail: `HTTP ${r.status}: ${t.slice(0, 200)}` };
  }
  await r.text();
  return { status: "ok", detail: "Claude Haiku reachable" };
}

async function checkFinnhub(): Promise<CheckResult> {
  const key = Deno.env.get("FINNHUB_API_KEY");
  if (!key) return { status: "missing", detail: "FINNHUB_API_KEY not set" };
  const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key}`);
  if (!r.ok) return { status: "error", detail: `HTTP ${r.status}` };
  const j = await r.json();
  if (j.c == null) return { status: "error", detail: "No price in response" };
  return { status: "ok", detail: `AAPL=$${j.c}` };
}

async function checkLovable(): Promise<CheckResult> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { status: "missing", detail: "LOVABLE_API_KEY not set" };
  return { status: "ok", detail: "Key present" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const [anthropic, finnhub, lovable] = await Promise.all([
    safeRun(checkAnthropic),
    safeRun(checkFinnhub),
    safeRun(checkLovable),
  ]);

  return new Response(
    JSON.stringify({
      anthropic,
      finnhub,
      lovable,
      checked_at: new Date().toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
