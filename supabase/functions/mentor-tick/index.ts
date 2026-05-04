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

async function aiPlan(opts: {
  candidates: { symbol: string; price: number; asset_type: string }[];
  equity: number;
  openCount: number;
  intentCount: number;
  recentJournal: string[];
}) {
  const sys = `You are Σοφός (Sophos), a disciplined stoic swing trader publishing trade plans for students.
You publish FORWARD-LOOKING INTENTS, not immediate trades. Each intent is a conditional plan with a clear trigger.
Risk strictly ≤ 1% per trade. Mandatory stop-loss. Voice: stoic, second person, ≤ 3 sentences thesis.
For every INTENT you must include a conviction score 1–5 and 1–3 specific fail_reasons — be honest about what could go wrong.
For every SKIP you must include a SHORT specific skip_reason (e.g. "ATR too tight", "awaiting volume", "mid-range, no edge"). Never say "no setup earned its place".
Return ONE intent OR a SKIP if nothing earns its place.`;

  const userMsg = `Current equity: £${opts.equity.toFixed(0)}.
Open positions: ${opts.openCount}/${MAX_OPEN}. Pending intents: ${opts.intentCount}/${MAX_INTENTS}.

Candidates (live prices):
${opts.candidates.map(c => `- ${c.symbol} (${c.asset_type}) @ ${c.price}`).join("\n")}

Recent decisions:
${opts.recentJournal.slice(0,5).map(t => `- ${t}`).join("\n") || "- (none yet)"}

Choose ONE candidate to publish a pending intent for, OR skip with a reason.`;

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
      const candidates: any[] = [];
      for (const c of slice) {
        const p = await fetchQuote(c.symbol, c.asset_type);
        if (p) candidates.push({ ...c, price: p });
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
