// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Auto-copy a Sophos trade to every follower with mirror_enabled.
 * Called server-side from mentor-tick when a new mentor_trade opens.
 *
 * Body: { trade_id: string }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role-only entry point — never callable from the browser.
  const auth = req.headers.get("Authorization") || "";
  if (!auth.includes(SERVICE_ROLE)) {
    return new Response(JSON.stringify({ error: "service-role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { trade_id } = await req.json();
    if (!trade_id) {
      return new Response(JSON.stringify({ error: "trade_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: trade, error: tErr } = await sb
      .from("mentor_trades").select("*").eq("id", trade_id).maybeSingle();
    if (tErr || !trade) {
      return new Response(JSON.stringify({ error: "trade not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: followers } = await sb
      .from("mentor_followers")
      .select("user_id, mirror_risk_pct")
      .eq("mirror_enabled", true);

    if (!followers?.length) {
      return new Response(JSON.stringify({ ok: true, copied: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const entry = Number(trade.entry_price);
    const sl = Number(trade.stop_loss);
    const tp = Number(trade.take_profit);
    const dir = trade.direction === "long" ? 1 : -1;
    const riskPerUnit = Math.abs(entry - sl);

    if (!riskPerUnit || riskPerUnit < 1e-8) {
      return new Response(JSON.stringify({ ok: true, copied: 0, reason: "zero risk" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let copied = 0;
    const errors: string[] = [];

    for (const f of followers) {
      try {
        // Idempotency — skip if already mirrored
        const { count: dupe } = await sb
          .from("mentor_copies").select("*", { count: "exact", head: true })
          .eq("user_id", f.user_id).eq("source_kind", "trade").eq("source_id", trade.id);
        if (dupe) continue;

        const { data: prof } = await sb
          .from("profiles").select("paper_balance").eq("user_id", f.user_id).maybeSingle();
        const balance = Number(prof?.paper_balance ?? 10000);
        if (balance <= 0) continue;

        const riskPct = Math.min(Math.max(Number(f.mirror_risk_pct ?? 0.5), 0.1), 2);
        const riskBudget = balance * (riskPct / 100);
        const qty = Math.max(0.0001, Number((riskBudget / riskPerUnit).toFixed(6)));

        const attribution = `Mirrored from Σοφός · ${riskPct}% risk · ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}`;
        const { data: paperTrade, error: pErr } = await sb.from("paper_trades").insert({
          user_id: f.user_id,
          symbol: trade.symbol,
          asset_type: trade.asset_type,
          direction: trade.direction,
          entry_price: entry,
          quantity: qty,
          stop_loss: sl,
          take_profit: tp,
          thesis: `${attribution}\n\n${trade.thesis || ""}`,
          status: "open",
          order_type: "market",
        }).select().single();
        if (pErr) { errors.push(`${f.user_id}: ${pErr.message}`); continue; }

        await sb.from("mentor_copies").insert({
          user_id: f.user_id,
          source_kind: "trade",
          source_id: trade.id,
          paper_trade_id: paperTrade.id,
        });

        await sb.from("notifications").insert({
          user_id: f.user_id,
          type: "info",
          title: `Mirrored ${trade.symbol} ${trade.direction.toUpperCase()}`,
          body: `Sophos opened ${trade.symbol} at ${entry} — auto-copied at ${riskPct}% risk (${qty} units).`,
          link: `/demo-trading`,
        });

        copied++;
      } catch (e) {
        errors.push(`${f.user_id}: ${e instanceof Error ? e.message : "err"}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, copied, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mentor-mirror-fanout error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
