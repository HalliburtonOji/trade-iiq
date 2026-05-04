// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const STOCKS = ["AAPL","NVDA","TSLA","MSFT","META","GOOGL","AMZN","AMD","NFLX","JPM","COIN","PLTR","DIS","BA","CRM"];
const CRYPTO = ["BTC","ETH","SOL","XRP","DOGE","AVAX","LINK","MATIC"];
const FOREX  = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","EUR/JPY"];

const MAX_OPEN = 5;
const MAX_INTENTS = 4;
const RISK_PCT = 0.01;

function isUSSession(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = et.getHours(), m = et.getMinutes(), day = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = h * 60 + m;
  return mins >= 570 && mins < 960; // 9:30–16:00 ET
}

async function fetchQuote(symbol: string, asset_type: string) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/live-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({ symbols: [symbol], asset_type }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const q = j?.quotes?.[symbol] ?? (Array.isArray(j?.quotes) ? j.quotes[0] : null) ?? j?.[0] ?? j;
    const price = q?.current_price ?? q?.price ?? null;
    return price ? Number(price) : null;
  } catch { return null; }
}

// ── Context: real OHLCV-derived features so Sophos can actually reason. ──
type Ctx = {
  symbol: string; price: number; asset_type: string;
  ema20: number; ema50: number; rsi14: number; atr14: number;
  vol_regime: "high" | "normal" | "low";
  high30: number; low30: number;
  trend: "up" | "down" | "side";
  pct_from_high30: number; pct_from_low30: number;
  bars: number;
};

function ema(values: number[], period: number): number {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}
function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}
function atr(candles: any[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = Number(candles[i].high), l = Number(candles[i].low), pc = Number(candles[i - 1].close);
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

async function fetchContext(symbol: string, asset_type: string, price: number): Promise<Ctx | null> {
  try {
    // Disambiguate per asset_type so historical-candles doesn't grab a same-ticker stock.
    let candleSym = symbol;
    if (asset_type === "crypto") candleSym = `${symbol.replace(/USD[TC]?$/i, "")}-USD`;
    else if (asset_type === "forex") candleSym = `${symbol.replace(/[^A-Za-z]/g, "").toUpperCase()}=X`;

    const end = new Date();
    const start = new Date(end.getTime() - 90 * 24 * 3600_000);
    const r = await fetch(`${SUPABASE_URL}/functions/v1/historical-candles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({
        symbol: candleSym,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const candles: any[] = Array.isArray(j?.candles) ? j.candles : [];
    if (candles.length < 25) return null;
    const closes = candles.map((c) => Number(c.close)).filter((x) => Number.isFinite(x));
    const vols = candles.map((c) => Number(c.volume) || 0);
    const last30 = candles.slice(-30);
    const high30 = Math.max(...last30.map((c) => Number(c.high)));
    const low30 = Math.min(...last30.map((c) => Number(c.low)));
    // Sanity: candle universe and live quote must match scale (within 5×). Otherwise wrong instrument.
    const lastClose = closes[closes.length - 1];
    if (lastClose && (price > lastClose * 5 || price < lastClose / 5)) {
      console.log(`[mentor-tick] ${symbol} (${asset_type}) candle/quote mismatch — px ${price} vs lastClose ${lastClose}; dropping`);
      return null;
    }
    const ema20 = ema(closes.slice(-40), 20);
    const ema50 = ema(closes.slice(-80), 50);
    const rsi14 = rsi(closes.slice(-30), 14);
    const atr14 = atr(candles.slice(-30), 14);
    const v20 = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const vLast = vols[vols.length - 1] || v20;
    const vol_regime: Ctx["vol_regime"] = vLast > v20 * 1.4 ? "high" : vLast < v20 * 0.6 ? "low" : "normal";
    const trend: Ctx["trend"] =
      ema20 > ema50 * 1.005 && price > ema20 ? "up" :
      ema20 < ema50 * 0.995 && price < ema20 ? "down" : "side";
    return {
      symbol, price, asset_type,
      ema20: +ema20.toFixed(4), ema50: +ema50.toFixed(4),
      rsi14: +rsi14.toFixed(1), atr14: +atr14.toFixed(4),
      vol_regime, high30: +high30.toFixed(4), low30: +low30.toFixed(4),
      trend,
      pct_from_high30: +(((price - high30) / high30) * 100).toFixed(2),
      pct_from_low30: +(((price - low30) / low30) * 100).toFixed(2),
      bars: candles.length,
    };
  } catch (e) {
    console.error("[mentor-tick] fetchContext failed", symbol, e);
    return null;
  }
}

async function aiPlan(opts: {
  candidates: Ctx[];
  equity: number;
  openCount: number;
  intentCount: number;
  recentJournal: string[];
}) {
  const sys = `You are Σοφός (Sophos), a disciplined stoic swing trader publishing trade plans for students.
You publish FORWARD-LOOKING INTENTS, not immediate trades. Each intent is a conditional plan with a clear trigger.
Risk strictly ≤ 1% per trade. Mandatory stop-loss derived from structure (e.g. swing low, 1.5×ATR, prior support). Take-profit ≥ 1.5R.
Voice: stoic, second person, ≤ 3 sentences thesis. Reference the actual structure (trend, RSI, ATR, 30-day range) you see — never vague.
For every INTENT include a conviction 1–5 and 1–3 specific fail_reasons grounded in the data shown.
SKIP only when the data genuinely offers no edge — give ONE short specific reason citing the data (e.g. "RSI 52 mid-range, ATR compressed", "price 4% from 30d high with weakening volume").
Never say "no setup earned its place" or "single price point — no context": you DO have context now.`;

  const candLines = opts.candidates.map((c) => {
    return `- ${c.symbol} (${c.asset_type}) px ${c.price}
    trend ${c.trend} | EMA20 ${c.ema20} EMA50 ${c.ema50} | RSI14 ${c.rsi14} | ATR14 ${c.atr14} | vol ${c.vol_regime}
    30d range [${c.low30} → ${c.high30}] · ${c.pct_from_high30}% from high · ${c.pct_from_low30}% from low · ${c.bars} bars`;
  }).join("\n");

  const userMsg = `Current equity: £${opts.equity.toFixed(0)}.
Open positions: ${opts.openCount}/${MAX_OPEN}. Pending intents: ${opts.intentCount}/${MAX_INTENTS}.

Candidates with structural context:
${candLines}

Recent decisions:
${opts.recentJournal.slice(0,5).map(t => `- ${t}`).join("\n") || "- (none yet)"}

Choose ONE candidate to publish a pending intent for, OR skip with a data-grounded reason.
When sizing the stop, use ATR or visible structure. When choosing trigger price, prefer breakout above 30d high, reclaim of EMA, or pullback to support.`;

  const tools = [{
    type: "function",
    function: {
      name: "publish_intent_or_skip",
      description: "Publish a forward-looking trade plan or skip the cycle.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["INTENT","SKIP"] },
          symbol: { type: "string" },
          asset_type: { type: "string", enum: ["stock","crypto","forex"] },
          direction: { type: "string", enum: ["long","short"] },
          trigger_kind: { type: "string", enum: ["price_above","price_below","time","manual"] },
          trigger_value: { type: "number", description: "Price level for trigger (omit for time/manual)" },
          trigger_condition_text: { type: "string", description: "Human-readable trigger, e.g. 'If NVDA closes above 480 on > avg volume'" },
          entry_hint: { type: "number" },
          stop_loss: { type: "number" },
          take_profit: { type: "number" },
          size_pct: { type: "number", description: "Risk percent of equity, ≤ 1" },
          invalidation_text: { type: "string" },
          thesis: { type: "string", description: "≤ 3 sentence stoic rationale" },
          conviction: { type: "integer", description: "1-5 confidence in this plan. 1=speculative, 5=textbook setup", minimum: 1, maximum: 5 },
          fail_reasons: { type: "array", items: { type: "string" }, description: "1-3 specific ways this plan could fail (e.g. 'macro print Wed could spike volatility')" },
          valid_hours: { type: "number", description: "How many hours the intent stays valid" },
          skip_reason: { type: "string", description: "If action=SKIP, ONE short specific reason (e.g. 'ATR too tight', 'awaiting volume confirmation', 'price mid-range — no edge')" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  }];

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      tools,
      tool_choice: { type: "function", function: { name: "publish_intent_or_skip" } },
    }),
  });
  if (!resp.ok) {
    console.error("AI plan error", resp.status, await resp.text());
    return null;
  }
  const j = await resp.json();
  const call = j.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  try { return JSON.parse(call.function.arguments); } catch { return null; }
}

async function aiReflection(prompt: string): Promise<string> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are Σοφός. Write ONE stoic, plain-English sentence reflecting on this trading event. Second person, no fluff." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!resp.ok) return "";
    const j = await resp.json();
    return (j.choices?.[0]?.message?.content || "").trim();
  } catch { return ""; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Acquire lock
  const lockId = crypto.randomUUID();
  const { data: lockRow } = await sb.from("mentor_locks").select("locked_at").eq("id", 1).maybeSingle();
  if (lockRow?.locked_at && Date.now() - new Date(lockRow.locked_at).getTime() < 4 * 60_000) {
    return new Response(JSON.stringify({ ok: true, skipped: "locked" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  await sb.from("mentor_locks").update({ locked_at: new Date().toISOString(), locked_by: lockId }).eq("id", 1);

  const summary: any = { observed: 0, closed: 0, triggered: 0, expired: 0, planned: 0 };

  try {
    // Load profile
    const { data: prof } = await sb.from("mentor_profile").select("*").eq("slug","sophos").maybeSingle();
    let equity = Number(prof?.equity ?? 10000);

    // ── 1. OBSERVE + 2. MANAGE ──
    const { data: openTrades } = await sb.from("mentor_trades").select("*").eq("status","open");
    let realizedDelta = 0;
    let unrealized = 0;
    for (const t of openTrades || []) {
      const price = await fetchQuote(t.symbol, t.asset_type);
      if (!price) continue;
      summary.observed++;
      const dir = t.direction === "long" ? 1 : -1;
      const pnl = (price - Number(t.entry_price)) * dir * Number(t.quantity);
      const hitSL = (t.direction === "long" && price <= Number(t.stop_loss)) || (t.direction === "short" && price >= Number(t.stop_loss));
      const hitTP = (t.direction === "long" && price >= Number(t.take_profit)) || (t.direction === "short" && price <= Number(t.take_profit));
      if (hitSL || hitTP) {
        const exitPrice = hitTP ? Number(t.take_profit) : Number(t.stop_loss);
        const realized = (exitPrice - Number(t.entry_price)) * dir * Number(t.quantity);
        const pct = ((exitPrice / Number(t.entry_price) - 1) * 100) * dir;
        const reflection = await aiReflection(
          `${t.symbol} ${t.direction} closed ${hitTP?"at TARGET":"at STOP"}. Entry ${t.entry_price}, exit ${exitPrice}, P&L £${realized.toFixed(0)}. Original thesis: "${t.thesis}".`,
        );
        await sb.from("mentor_trades").update({
          status: "closed", exit_price: exitPrice, pnl: realized, pnl_percent: pct,
          closed_at: new Date().toISOString(), close_reflection: reflection,
        }).eq("id", t.id);
        await sb.from("mentor_journal").insert({
          kind: "close", trade_id: t.id, symbol: t.symbol,
          body_text: `Closed ${t.symbol} ${t.direction} ${hitTP?"at target":"at stop"} for ${realized>=0?"+":""}£${realized.toFixed(0)}. ${reflection}`,
          payload: { exit: exitPrice, pnl: realized, hit: hitTP?"target":"stop" },
        });
        // Fire-and-forget case-study generation. Don't await — keep tick snappy.
        try {
          fetch(`${SUPABASE_URL}/functions/v1/mentor-case-study`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SERVICE_ROLE}`,
            },
            body: JSON.stringify({ trade_id: t.id }),
          }).catch((e) => console.error("[mentor-tick] case-study trigger failed:", e));
        } catch (e) { console.error("[mentor-tick] case-study trigger error:", e); }
        realizedDelta += realized;
        summary.closed++;
      } else {
        unrealized += pnl;
      }
    }

    // ── 3. RESOLVE intents ──
    const nowIso = new Date().toISOString();
    const { data: intents } = await sb.from("mentor_intents").select("*").eq("status","pending");
    for (const i of intents || []) {
      // expired?
      if (new Date(i.valid_until).getTime() < Date.now()) {
        const note = "Window passed without trigger. Patience over force.";
        await sb.from("mentor_intents").update({ status: "expired", resolved_at: nowIso, resolution_note: note }).eq("id", i.id);
        await sb.from("mentor_journal").insert({
          kind: "intent_resolved", intent_id: i.id, symbol: i.symbol,
          body_text: `Intent on ${i.symbol} expired — ${note}`,
          payload: { resolution: "expired" },
        });
        summary.expired++;
        continue;
      }
      // trigger?
      if (i.trigger_kind === "price_above" || i.trigger_kind === "price_below") {
        const price = await fetchQuote(i.symbol, i.asset_type);
        if (!price) continue;
        const fires = i.trigger_kind === "price_above"
          ? price >= Number(i.trigger_value)
          : price <= Number(i.trigger_value);
        if (!fires) continue;

        // Check capacity
        const { count: openCount } = await sb.from("mentor_trades").select("*",{count:"exact",head:true}).eq("status","open");
        if ((openCount || 0) >= MAX_OPEN) continue;

        const sl = Number(i.stop_loss);
        const tp = Number(i.take_profit);
        const riskPerUnit = Math.abs(price - sl);
        if (!riskPerUnit) continue;
        const riskBudget = equity * Math.min(Number(i.size_pct || 1), 1) / 100;
        const qty = Math.max(0.0001, Number((riskBudget / riskPerUnit).toFixed(6)));

        const { data: tradeRow } = await sb.from("mentor_trades").insert({
          symbol: i.symbol, asset_type: i.asset_type, direction: i.direction,
          entry_price: price, quantity: qty, stop_loss: sl, take_profit: tp,
          status: "open", thesis: i.thesis, intent_id: i.id, opened_at: nowIso,
        }).select().single();

        await sb.from("mentor_intents").update({ status: "triggered", resolved_at: nowIso, resolution_note: `Triggered at ${price}` }).eq("id", i.id);
        await sb.from("mentor_journal").insert({
          kind: "intent_resolved", intent_id: i.id, symbol: i.symbol,
          body_text: `Intent on ${i.symbol} triggered at ${price}. Opening ${i.direction} per plan.`,
          payload: { resolution: "triggered", trigger_price: price, trigger_kind: i.trigger_kind, trigger_value: Number(i.trigger_value) },
        });
        await sb.from("mentor_journal").insert({
          kind: "open", trade_id: tradeRow?.id, intent_id: i.id, symbol: i.symbol,
          body_text: `Opened ${i.symbol} ${i.direction} at ${price}. ${i.thesis}`,
          payload: { entry: price, sl, tp, qty, direction: i.direction },
        });
        // Mirror Mode fanout — auto-copy this trade to every follower with mirror_enabled
        if (tradeRow?.id) {
          fetch(`${SUPABASE_URL}/functions/v1/mentor-mirror-fanout`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE}` },
            body: JSON.stringify({ trade_id: tradeRow.id }),
          }).catch((e) => console.error("[mentor-tick] mirror fanout failed:", e));
        }
        // Notify both intent watchers AND general mentor followers about the open
        const [{ data: watchers }, { data: followers }] = await Promise.all([
          sb.from("mentor_intent_watchers").select("user_id").eq("intent_id", i.id),
          sb.from("mentor_followers").select("user_id"),
        ]);
        const recipients = new Set<string>();
        (watchers || []).forEach((w: any) => recipients.add(w.user_id));
        (followers || []).forEach((f: any) => recipients.add(f.user_id));
        if (recipients.size) {
          await sb.from("notifications").insert(Array.from(recipients).map((uid) => ({
            user_id: uid,
            type: "info",
            title: `Sophos opened ${i.symbol}`,
            body: `${i.direction.toUpperCase()} at ${price}. ${(i.thesis || "").slice(0,140)}`,
            link: `/mentor?missed=${encodeURIComponent(i.symbol)}&dir=${i.direction}&price=${price}`,
          })));
        }
        summary.triggered++;
      }
    }

    // ── recompute equity (closed pnl deltas already realized via trades; we cache mark-to-market) ──
    if (realizedDelta !== 0) equity += realizedDelta;
    await sb.from("mentor_profile").update({
      equity,
      stats_json: { ...(prof?.stats_json||{}), unrealized, last_tick: nowIso },
      updated_at: nowIso,
    }).eq("slug","sophos");

    // ── 4. PLAN new intent ──
    const { count: pendingCount } = await sb.from("mentor_intents").select("*",{count:"exact",head:true}).eq("status","pending");
    const { count: openNow } = await sb.from("mentor_trades").select("*",{count:"exact",head:true}).eq("status","open");

    if ((pendingCount || 0) < MAX_INTENTS && (openNow || 0) < MAX_OPEN) {
      // Pick a small candidate slice
      const useStocks = isUSSession();
      const pool = useStocks
        ? STOCKS.map(s => ({ symbol: s, asset_type: "stock" }))
        : [...CRYPTO.map(s => ({ symbol: s, asset_type: "crypto" })), ...FOREX.map(s => ({ symbol: s, asset_type: "forex" }))];
      // rotate by minute
      const offset = Math.floor(Date.now() / 60_000) % pool.length;
      const slice = [pool[offset], pool[(offset+3)%pool.length], pool[(offset+7)%pool.length]];
      const candidates: Ctx[] = [];
      for (const c of slice) {
        const p = await fetchQuote(c.symbol, c.asset_type);
        if (!p) continue;
        const ctx = await fetchContext(c.symbol, c.asset_type, p);
        if (ctx) candidates.push(ctx);
        else console.log(`[mentor-tick] no context for ${c.symbol} — dropped from candidate set`);
      }
      if (candidates.length) {
        const { data: recent } = await sb.from("mentor_journal").select("body_text").order("created_at",{ascending:false}).limit(5);
        const plan = await aiPlan({
          candidates, equity, openCount: openNow || 0, intentCount: pendingCount || 0,
          recentJournal: (recent||[]).map(r => r.body_text),
        });
        if (plan && plan.action === "INTENT" && plan.symbol && plan.stop_loss && plan.take_profit) {
          // Don't double up on same symbol
          const { count: dupe } = await sb.from("mentor_intents")
            .select("*",{count:"exact",head:true})
            .eq("symbol", plan.symbol).eq("status","pending");
          if (!dupe) {
            const validHours = Math.min(Math.max(Number(plan.valid_hours||24), 2), 96);
            const { data: intentRow } = await sb.from("mentor_intents").insert({
              symbol: plan.symbol,
              asset_type: plan.asset_type || candidates[0].asset_type,
              direction: plan.direction,
              trigger_kind: plan.trigger_kind || "price_above",
              trigger_value: plan.trigger_value ?? plan.entry_hint ?? candidates.find(c=>c.symbol===plan.symbol)?.price,
              trigger_condition_text: plan.trigger_condition_text || `Trigger at ${plan.entry_hint}`,
              entry_hint: plan.entry_hint,
              stop_loss: plan.stop_loss,
              take_profit: plan.take_profit,
              size_pct: Math.min(Number(plan.size_pct||1), 1),
              invalidation_text: plan.invalidation_text || "",
              thesis: plan.thesis || "",
              conviction: plan.conviction ? Math.max(1, Math.min(5, Math.round(Number(plan.conviction)))) : null,
              fail_reasons: Array.isArray(plan.fail_reasons) ? plan.fail_reasons.slice(0,3) : [],
              valid_until: new Date(Date.now() + validHours * 3600_000).toISOString(),
              status: "pending",
            }).select().single();
            await sb.from("mentor_journal").insert({
              kind: "intent_published", intent_id: intentRow?.id, symbol: plan.symbol,
              body_text: `New plan on ${plan.symbol}: ${plan.trigger_condition_text}. ${plan.thesis}`,
              payload: { trigger: plan.trigger_condition_text, conviction: plan.conviction || null },
            });
            // Notify followers of new intent (low-frequency event — already throttled by MAX_INTENTS)
            const { data: followers } = await sb.from("mentor_followers").select("user_id");
            if (followers && followers.length) {
              await sb.from("notifications").insert(followers.map((f: any) => ({
                user_id: f.user_id,
                type: "info",
                title: `Sophos is watching ${plan.symbol}`,
                body: `${plan.trigger_condition_text} · conviction ${plan.conviction ?? "?"}/5`,
                link: "/mentor",
              })));
            }
            summary.planned++;
          }
        } else if (plan?.action === "SKIP") {
          await sb.from("mentor_journal").insert({
            kind: "skip", symbol: candidates[0].symbol,
            body_text: `Skipped this cycle — ${plan.skip_reason || "no setup earned its place"}.`,
            payload: { reason: plan.skip_reason },
          });
        }
      }
    }
  } catch (e) {
    console.error("mentor-tick error", e);
  } finally {
    await sb.from("mentor_locks").update({ locked_at: null, locked_by: null }).eq("id", 1);
  }

  return new Response(JSON.stringify({ ok: true, summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
