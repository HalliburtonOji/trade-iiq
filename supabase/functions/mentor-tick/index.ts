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

type Persona = {
  slug: string;
  display_name: string;
  persona_kind: string;
  persona_prompt: string;
  cadence_minutes: number;
  max_open: number;
  max_intents: number;
  risk_pct: number;
  min_valid_hours: number;
  max_valid_hours: number;
  time_stop_hours: number;
  enabled: boolean;
  equity: number;
  stats_json: any;
  last_tick_at: string | null;
};

function isUSSession(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = et.getHours(), m = et.getMinutes(), day = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = h * 60 + m;
  return mins >= 570 && mins < 960;
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
    const lastClose = closes[closes.length - 1];
    if (lastClose && (price > lastClose * 5 || price < lastClose / 5)) {
      console.log(`[mentor-tick] ${symbol} (${asset_type}) candle/quote mismatch — px ${price} vs lastClose ${lastClose}`);
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

async function aiPlan(p: Persona, opts: {
  candidates: Ctx[];
  openCount: number;
  intentCount: number;
  recentJournal: string[];
}) {
  const sys = `${p.persona_prompt}
Hard constraints (system-enforced):
- Risk strictly ≤ ${p.risk_pct}% per trade.
- Mandatory stop_loss derived from structure (swing/ATR/EMA).
- Validity window must be between ${p.min_valid_hours} and ${p.max_valid_hours} hours.
- Conviction 1–5 + 1–3 specific fail_reasons grounded in shown data.
- SKIP only with ONE short specific data-grounded reason. Never say "single price point — no context".`;

  const candLines = opts.candidates.map((c) => {
    return `- ${c.symbol} (${c.asset_type}) px ${c.price}
    trend ${c.trend} | EMA20 ${c.ema20} EMA50 ${c.ema50} | RSI14 ${c.rsi14} | ATR14 ${c.atr14} | vol ${c.vol_regime}
    30d range [${c.low30} → ${c.high30}] · ${c.pct_from_high30}% from high · ${c.pct_from_low30}% from low · ${c.bars} bars`;
  }).join("\n");

  const userMsg = `Equity: £${p.equity.toFixed(0)}. Open ${opts.openCount}/${p.max_open}. Pending ${opts.intentCount}/${p.max_intents}.

Candidates:
${candLines}

Recent decisions:
${opts.recentJournal.slice(0,5).map(t => `- ${t}`).join("\n") || "- (none yet)"}

Choose ONE candidate to publish a pending intent for, OR skip with a data-grounded reason.`;

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
          trigger_value: { type: "number" },
          trigger_condition_text: { type: "string" },
          entry_hint: { type: "number" },
          stop_loss: { type: "number" },
          take_profit: { type: "number" },
          size_pct: { type: "number" },
          invalidation_text: { type: "string" },
          thesis: { type: "string" },
          conviction: { type: "integer", minimum: 1, maximum: 5 },
          fail_reasons: { type: "array", items: { type: "string" } },
          valid_hours: { type: "number" },
          skip_reason: { type: "string" },
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
    console.error(`[${p.slug}] AI plan error`, resp.status, await resp.text());
    return null;
  }
  const j = await resp.json();
  const call = j.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  try { return JSON.parse(call.function.arguments); } catch { return null; }
}

// Resolve user predictions when an intent reaches a terminal outcome
async function resolvePredictions(sb: any, intentId: string | null | undefined, outcome: string) {
  if (!intentId) return;
  await sb.from("mentor_intents").update({ outcome }).eq("id", intentId);
  const { data: preds } = await sb.from("mentor_predictions").select("id,prediction").eq("intent_id", intentId).is("resolved_at", null);
  if (!preds?.length) return;
  for (const pr of preds) {
    await sb.from("mentor_predictions").update({
      resolved_at: new Date().toISOString(),
      outcome,
      correct: pr.prediction === outcome,
    }).eq("id", pr.id);
  }
}

async function aiReflection(displayName: string, prompt: string): Promise<string> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are ${displayName}. Write ONE plain-English sentence reflecting on this trading event. Second person, no fluff.` },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!resp.ok) return "";
    const j = await resp.json();
    return (j.choices?.[0]?.message?.content || "").trim();
  } catch { return ""; }
}

// ── Position management: trailing stop, partial profits at 1R, time-based exits, breakeven ──
async function managePosition(sb: any, p: Persona, t: any, price: number, summary: any) {
  const dir = t.direction === "long" ? 1 : -1;
  const entry = Number(t.entry_price);
  const sl = Number(t.stop_loss);
  const tp = Number(t.take_profit);
  const qtyTotal = Number(t.quantity);
  const partialTaken = !!t.partial_taken;
  const breakevenMoved = !!t.breakeven_moved;
  const remainingQty = partialTaken && t.partial_qty != null ? qtyTotal - Number(t.partial_qty) : qtyTotal;

  // r_initial: distance to stop at entry, used for 1R checkpoints
  const rInit = Number(t.r_initial ?? Math.abs(entry - sl));
  if (!t.r_initial && rInit > 0) {
    await sb.from("mentor_trades").update({ r_initial: rInit }).eq("id", t.id);
  }

  // Hard SL / TP
  const hitSL = (t.direction === "long" && price <= sl) || (t.direction === "short" && price >= sl);
  const hitTP = (t.direction === "long" && price >= tp) || (t.direction === "short" && price <= tp);

  // Time stop
  const opened = new Date(t.opened_at).getTime();
  const ageHours = (Date.now() - opened) / 3600_000;
  const timeStopHit = ageHours >= p.time_stop_hours && !hitTP;

  if (hitSL || hitTP || timeStopHit) {
    const exitPrice = hitTP ? tp : hitSL ? sl : price;
    const reason = hitTP ? "target" : hitSL ? "stop" : "time-stop";
    const realizedRemaining = (exitPrice - entry) * dir * remainingQty;
    const partialPnl = Number(t.partial_pnl || 0);
    const totalPnl = realizedRemaining + partialPnl;
    const pct = ((exitPrice / entry - 1) * 100) * dir;
    const reflection = await aiReflection(
      p.display_name,
      `${t.symbol} ${t.direction} closed at ${reason}. Entry ${entry}, exit ${exitPrice}, total P&L £${totalPnl.toFixed(0)} (partial £${partialPnl.toFixed(0)} + remainder £${realizedRemaining.toFixed(0)}). Thesis: "${t.thesis}".`,
    );
    await sb.from("mentor_trades").update({
      status: "closed", exit_price: exitPrice, pnl: totalPnl, pnl_percent: pct,
      closed_at: new Date().toISOString(), close_reflection: reflection,
    }).eq("id", t.id);
    await sb.from("mentor_journal").insert({
      mentor_slug: p.slug,
      kind: "close", trade_id: t.id, symbol: t.symbol,
      body_text: `Closed ${t.symbol} ${t.direction} (${reason}) for ${totalPnl>=0?"+":""}£${totalPnl.toFixed(0)}. ${reflection}`,
      payload: { exit: exitPrice, pnl: totalPnl, hit: reason, partial_pnl: partialPnl },
    });
    try {
      fetch(`${SUPABASE_URL}/functions/v1/mentor-case-study`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ trade_id: t.id }),
      }).catch((e) => console.error("[mentor-tick] case-study trigger failed:", e));
    } catch {}
    const intentOutcome = hitTP ? "tp_hit" : hitSL ? "sl_hit" : "closed";
    await resolvePredictions(sb, t.intent_id, intentOutcome);
    summary.closed++;
    return { closed: true, realizedDelta: totalPnl, unrealized: 0 };
  }

  // Partial take-profit at +1R (long) or -1R (short)
  const profitDistance = (price - entry) * dir;
  if (!partialTaken && rInit > 0 && profitDistance >= rInit) {
    const partialQty = +(qtyTotal * 0.5).toFixed(6);
    const partialPnl = (price - entry) * dir * partialQty;
    await sb.from("mentor_trades").update({
      partial_taken: true,
      partial_qty: partialQty,
      partial_price: price,
      partial_pnl: partialPnl,
      // Move stop to breakeven on partial
      stop_loss: entry,
      breakeven_moved: true,
    }).eq("id", t.id);
    await sb.from("mentor_journal").insert({
      mentor_slug: p.slug,
      kind: "manage", trade_id: t.id, symbol: t.symbol,
      body_text: `Took half off ${t.symbol} at ${price.toFixed(4)} (+1R, £${partialPnl.toFixed(0)}). Stop moved to breakeven.`,
      payload: { action: "partial_1r", price, qty: partialQty, pnl: partialPnl, new_stop: entry },
    });
    summary.managed++;
  } else if (!breakevenMoved && rInit > 0 && profitDistance >= rInit * 0.75) {
    // Defensive breakeven move at +0.75R if no partial taken yet (e.g. partial was disabled)
    if (!partialTaken) {
      await sb.from("mentor_trades").update({ stop_loss: entry, breakeven_moved: true }).eq("id", t.id);
      await sb.from("mentor_journal").insert({
        mentor_slug: p.slug,
        kind: "manage", trade_id: t.id, symbol: t.symbol,
        body_text: `Moved ${t.symbol} stop to breakeven at +0.75R. Risk eliminated.`,
        payload: { action: "breakeven", new_stop: entry },
      });
      summary.managed++;
    }
  }

  // Trailing stop after partial: trail by ATR-multiple from high water mark
  if (partialTaken || breakevenMoved) {
    // Refresh trade row to get latest sl
    const { data: fresh } = await sb.from("mentor_trades").select("stop_loss, trail_high_water").eq("id", t.id).maybeSingle();
    const curSl = Number(fresh?.stop_loss ?? sl);
    const hwm = Number(fresh?.trail_high_water ?? entry);
    const trailMult = Number(t.trail_atr_mult ?? 2.0);
    // Need ATR — refetch context lightly (may be cached)
    const ctx = await fetchContext(t.symbol, t.asset_type, price);
    const atrV = ctx?.atr14 || 0;
    if (atrV > 0) {
      const newHwm = t.direction === "long" ? Math.max(hwm, price) : Math.min(hwm, price);
      const trailedSl = t.direction === "long"
        ? newHwm - atrV * trailMult
        : newHwm + atrV * trailMult;
      const tighten = t.direction === "long" ? trailedSl > curSl : trailedSl < curSl;
      if (tighten) {
        await sb.from("mentor_trades").update({
          stop_loss: +trailedSl.toFixed(4),
          trail_high_water: +newHwm.toFixed(4),
          trail_atr_mult: trailMult,
        }).eq("id", t.id);
        // Don't journal every tighten — too noisy. Only every 0.5×ATR move.
        const moved = Math.abs(trailedSl - curSl);
        if (moved >= atrV * 0.5) {
          await sb.from("mentor_journal").insert({
            mentor_slug: p.slug,
            kind: "manage", trade_id: t.id, symbol: t.symbol,
            body_text: `Trailing ${t.symbol} stop to ${trailedSl.toFixed(4)} (${trailMult}×ATR from ${newHwm.toFixed(4)}).`,
            payload: { action: "trail", new_stop: trailedSl, hwm: newHwm, atr: atrV },
          });
          summary.managed++;
        }
      } else if (newHwm !== hwm) {
        await sb.from("mentor_trades").update({ trail_high_water: +newHwm.toFixed(4) }).eq("id", t.id);
      }
    }
  }

  const unrealized = (price - entry) * dir * remainingQty;
  return { closed: false, realizedDelta: 0, unrealized };
}

async function runPersona(sb: any, p: Persona) {
  const summary: any = { slug: p.slug, observed: 0, closed: 0, managed: 0, triggered: 0, expired: 0, planned: 0, skipped: 0 };
  let equity = Number(p.equity);

  // 1+2. Observe + manage open trades
  const { data: openTrades } = await sb
    .from("mentor_trades").select("*")
    .eq("mentor_slug", p.slug).eq("status", "open");

  let realizedDelta = 0;
  let unrealized = 0;
  for (const t of openTrades || []) {
    const price = await fetchQuote(t.symbol, t.asset_type);
    if (!price) continue;
    summary.observed++;
    const r = await managePosition(sb, p, t, price, summary);
    realizedDelta += r.realizedDelta;
    unrealized += r.unrealized;
  }

  // 3. Resolve intents
  const nowIso = new Date().toISOString();
  const { data: intents } = await sb
    .from("mentor_intents").select("*")
    .eq("mentor_slug", p.slug).eq("status", "pending");

  for (const i of intents || []) {
    if (new Date(i.valid_until).getTime() < Date.now()) {
      const note = "Window passed without trigger. Patience over force.";
      await sb.from("mentor_intents").update({ status: "expired", outcome: "expired", resolved_at: nowIso, resolution_note: note }).eq("id", i.id);
      await resolvePredictions(sb, i.id, "expired");
      await sb.from("mentor_journal").insert({
        mentor_slug: p.slug, kind: "intent_resolved", intent_id: i.id, symbol: i.symbol,
        body_text: `Intent on ${i.symbol} expired — ${note}`,
        payload: { resolution: "expired" },
      });
      summary.expired++;
      continue;
    }

    if (i.trigger_kind === "price_above" || i.trigger_kind === "price_below") {
      const price = await fetchQuote(i.symbol, i.asset_type);
      if (!price) continue;
      const fires = i.trigger_kind === "price_above"
        ? price >= Number(i.trigger_value)
        : price <= Number(i.trigger_value);
      if (!fires) continue;

      const { count: openCount } = await sb.from("mentor_trades")
        .select("*", { count: "exact", head: true })
        .eq("mentor_slug", p.slug).eq("status", "open");
      if ((openCount || 0) >= p.max_open) continue;

      const sl = Number(i.stop_loss);
      const tp = Number(i.take_profit);
      const riskPerUnit = Math.abs(price - sl);
      if (!riskPerUnit) continue;
      const riskBudget = equity * Math.min(Number(i.size_pct || p.risk_pct), p.risk_pct) / 100;
      const qty = Math.max(0.0001, Number((riskBudget / riskPerUnit).toFixed(6)));

      const timeStopAt = new Date(Date.now() + p.time_stop_hours * 3600_000).toISOString();
      const { data: tradeRow } = await sb.from("mentor_trades").insert({
        mentor_slug: p.slug,
        symbol: i.symbol, asset_type: i.asset_type, direction: i.direction,
        entry_price: price, quantity: qty, stop_loss: sl, take_profit: tp,
        status: "open", thesis: i.thesis, intent_id: i.id, opened_at: nowIso,
        r_initial: riskPerUnit, time_stop_at: timeStopAt,
        trail_atr_mult: p.persona_kind === "scalper" ? 1.2 : p.persona_kind === "longterm" ? 3.0 : 2.0,
        trail_high_water: price,
      }).select().single();

      await sb.from("mentor_intents").update({ status: "triggered", resolved_at: nowIso, resolution_note: `Triggered at ${price}` }).eq("id", i.id);
      await sb.from("mentor_journal").insert({
        mentor_slug: p.slug, kind: "intent_resolved", intent_id: i.id, symbol: i.symbol,
        body_text: `Intent on ${i.symbol} triggered at ${price}. Opening ${i.direction} per plan.`,
        payload: { resolution: "triggered", trigger_price: price, trigger_kind: i.trigger_kind, trigger_value: Number(i.trigger_value) },
      });
      await sb.from("mentor_journal").insert({
        mentor_slug: p.slug, kind: "open", trade_id: tradeRow?.id, intent_id: i.id, symbol: i.symbol,
        body_text: `Opened ${i.symbol} ${i.direction} at ${price}. ${i.thesis}`,
        payload: { entry: price, sl, tp, qty, direction: i.direction },
      });

      // Mirror only Sophos for now (Thrasys frequency / Hesychos rarity make mirror UX brittle)
      if (p.slug === "sophos" && tradeRow?.id) {
        fetch(`${SUPABASE_URL}/functions/v1/mentor-mirror-fanout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE}` },
          body: JSON.stringify({ trade_id: tradeRow.id }),
        }).catch((e) => console.error("[mentor-tick] mirror fanout failed:", e));
      }

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
          title: `${p.display_name} opened ${i.symbol}`,
          body: `${i.direction.toUpperCase()} at ${price}. ${(i.thesis || "").slice(0,140)}`,
          link: `/mentor?missed=${encodeURIComponent(i.symbol)}&dir=${i.direction}&price=${price}`,
        })));
      }
      summary.triggered++;
    }
  }

  if (realizedDelta !== 0) equity += realizedDelta;

  // 4. Plan a new intent
  const { count: pendingCount } = await sb.from("mentor_intents")
    .select("*", { count: "exact", head: true }).eq("mentor_slug", p.slug).eq("status", "pending");
  const { count: openNow } = await sb.from("mentor_trades")
    .select("*", { count: "exact", head: true }).eq("mentor_slug", p.slug).eq("status", "open");

  if ((pendingCount || 0) < p.max_intents && (openNow || 0) < p.max_open) {
    const useStocks = isUSSession();
    const pool = useStocks
      ? STOCKS.map(s => ({ symbol: s, asset_type: "stock" }))
      : [...CRYPTO.map(s => ({ symbol: s, asset_type: "crypto" })), ...FOREX.map(s => ({ symbol: s, asset_type: "forex" }))];
    // Persona-shifted offset so each persona scans different symbols on the same minute.
    const personaShift = p.slug === "thrasys" ? 1 : p.slug === "hesychos" ? 5 : 0;
    const offset = (Math.floor(Date.now() / 60_000) + personaShift) % pool.length;
    const slice = [pool[offset], pool[(offset+3)%pool.length], pool[(offset+7)%pool.length]];
    const candidates: Ctx[] = [];
    for (const c of slice) {
      const px = await fetchQuote(c.symbol, c.asset_type);
      if (!px) continue;
      const ctx = await fetchContext(c.symbol, c.asset_type, px);
      if (ctx) candidates.push(ctx);
    }
    if (candidates.length) {
      const { data: recent } = await sb.from("mentor_journal")
        .select("body_text").eq("mentor_slug", p.slug)
        .order("created_at", { ascending: false }).limit(5);
      const plan = await aiPlan(p, {
        candidates, openCount: openNow || 0, intentCount: pendingCount || 0,
        recentJournal: (recent || []).map((r: any) => r.body_text),
      });
      if (plan && plan.action === "INTENT" && plan.symbol && plan.stop_loss && plan.take_profit) {
        const { count: dupe } = await sb.from("mentor_intents")
          .select("*", { count: "exact", head: true })
          .eq("mentor_slug", p.slug).eq("symbol", plan.symbol).eq("status", "pending");
        if (!dupe) {
          const validHours = Math.min(Math.max(Number(plan.valid_hours || p.min_valid_hours), p.min_valid_hours), p.max_valid_hours);
          const { data: intentRow } = await sb.from("mentor_intents").insert({
            mentor_slug: p.slug,
            symbol: plan.symbol,
            asset_type: plan.asset_type || candidates[0].asset_type,
            direction: plan.direction,
            trigger_kind: plan.trigger_kind || "price_above",
            trigger_value: plan.trigger_value ?? plan.entry_hint ?? candidates.find(c=>c.symbol===plan.symbol)?.price,
            trigger_condition_text: plan.trigger_condition_text || `Trigger at ${plan.entry_hint}`,
            entry_hint: plan.entry_hint,
            stop_loss: plan.stop_loss,
            take_profit: plan.take_profit,
            size_pct: Math.min(Number(plan.size_pct || p.risk_pct), p.risk_pct),
            invalidation_text: plan.invalidation_text || "",
            thesis: plan.thesis || "",
            conviction: plan.conviction ? Math.max(1, Math.min(5, Math.round(Number(plan.conviction)))) : null,
            fail_reasons: Array.isArray(plan.fail_reasons) ? plan.fail_reasons.slice(0,3) : [],
            valid_until: new Date(Date.now() + validHours * 3600_000).toISOString(),
            status: "pending",
          }).select().single();
          await sb.from("mentor_journal").insert({
            mentor_slug: p.slug, kind: "intent_published", intent_id: intentRow?.id, symbol: plan.symbol,
            body_text: `New plan on ${plan.symbol}: ${plan.trigger_condition_text}. ${plan.thesis}`,
            payload: { trigger: plan.trigger_condition_text, conviction: plan.conviction || null },
          });
          if (p.slug === "sophos") {
            const { data: followers } = await sb.from("mentor_followers").select("user_id");
            if (followers && followers.length) {
              await sb.from("notifications").insert(followers.map((f: any) => ({
                user_id: f.user_id,
                type: "info",
                title: `${p.display_name} is watching ${plan.symbol}`,
                body: `${plan.trigger_condition_text} · conviction ${plan.conviction ?? "?"}/5`,
                link: "/mentor",
              })));
            }
          }
          summary.planned++;
        }
      } else if (plan?.action === "SKIP") {
        await sb.from("mentor_journal").insert({
          mentor_slug: p.slug, kind: "skip", symbol: candidates[0].symbol,
          body_text: `Skipped this cycle — ${plan.skip_reason || "no setup earned its place"}.`,
          payload: { reason: plan.skip_reason },
        });
        summary.skipped++;
      }
    }
  }

  // Persist equity + cadence stamp
  await sb.from("mentor_profile").update({
    equity,
    stats_json: { ...(p.stats_json || {}), unrealized, last_tick: nowIso },
    last_tick_at: nowIso,
    updated_at: nowIso,
  }).eq("slug", p.slug);

  return summary;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Global lock to prevent overlapping ticks across all personas
  const lockId = crypto.randomUUID();
  const { data: lockRow } = await sb.from("mentor_locks").select("locked_at").eq("id", 1).maybeSingle();
  if (lockRow?.locked_at && Date.now() - new Date(lockRow.locked_at).getTime() < 4 * 60_000) {
    return new Response(JSON.stringify({ ok: true, skipped: "locked" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  await sb.from("mentor_locks").update({ locked_at: new Date().toISOString(), locked_by: lockId }).eq("id", 1);

  const summaries: any[] = [];

  try {
    const { data: personas } = await sb.from("mentor_profile").select("*").eq("enabled", true);
    const now = Date.now();
    for (const raw of personas || []) {
      const p: Persona = raw as Persona;
      // Per-persona cadence gate
      if (p.last_tick_at) {
        const elapsed = (now - new Date(p.last_tick_at).getTime()) / 60_000;
        if (elapsed < p.cadence_minutes) {
          summaries.push({ slug: p.slug, skipped: `cadence ${elapsed.toFixed(1)}/${p.cadence_minutes}m` });
          continue;
        }
      }
      try {
        const s = await runPersona(sb, p);
        summaries.push(s);
      } catch (e) {
        console.error(`[mentor-tick] persona ${p.slug} failed:`, e);
        summaries.push({ slug: p.slug, error: String(e) });
      }
    }
  } catch (e) {
    console.error("mentor-tick error", e);
  } finally {
    await sb.from("mentor_locks").update({ locked_at: null, locked_by: null }).eq("id", 1);
  }

  return new Response(JSON.stringify({ ok: true, summaries }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
