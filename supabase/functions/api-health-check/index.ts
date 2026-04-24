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
      model: "claude-sonnet-4-6",
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    return { status: "error", detail: `HTTP ${r.status}: ${t.slice(0, 200)}` };
  }
  await r.text();
  return { status: "ok", detail: "Sonnet 4.6 reachable" };
}

async function checkOpenAI(): Promise<CheckResult> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return { status: "missing", detail: "OPENAI_API_KEY not set" };
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: "ping" }),
  });
  if (!r.ok) {
    const t = await r.text();
    return { status: "error", detail: `HTTP ${r.status}: ${t.slice(0, 200)}` };
  }
  await r.text();
  return { status: "ok", detail: "Embeddings reachable" };
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

async function checkAlphaVantage(): Promise<CheckResult> {
  const key = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (!key) return { status: "missing", detail: "ALPHA_VANTAGE_API_KEY not set (optional fallback)" };
  const r = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${key}`,
  );
  const j = await r.json();
  if (j.Note || j.Information) return { status: "error", detail: j.Note || j.Information };
  if (!j["Global Quote"]) return { status: "error", detail: "No quote" };
  return { status: "ok", detail: "AAPL fetched" };
}

async function checkLovable(): Promise<CheckResult> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { status: "missing", detail: "LOVABLE_API_KEY not set" };
  return { status: "ok", detail: "Key present" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const [anthropic, openai, finnhub, alpha_vantage, lovable] = await Promise.all([
    safeRun(checkAnthropic),
    safeRun(checkOpenAI),
    safeRun(checkFinnhub),
    safeRun(checkAlphaVantage),
    safeRun(checkLovable),
  ]);

  return new Response(
    JSON.stringify({
      anthropic,
      openai,
      finnhub,
      alpha_vantage,
      lovable,
      checked_at: new Date().toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
