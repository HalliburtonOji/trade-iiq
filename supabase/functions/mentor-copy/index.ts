import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // resolve user from token
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { source_kind, source_id, qty_override } = await req.json();
    if (!["trade","intent"].includes(source_kind) || !source_id) {
      return new Response(JSON.stringify({ error: "bad input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    let symbol, asset_type, direction, entry, sl, tp, thesis, qty;
    if (source_kind === "trade") {
      const { data } = await sb.from("mentor_trades").select("*").eq("id", source_id).maybeSingle();
      if (!data) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      ({ symbol, asset_type, direction, stop_loss: sl, take_profit: tp, thesis } = data);
      entry = Number(data.entry_price);
      qty = qty_override ?? Number(data.quantity);
    } else {
      const { data } = await sb.from("mentor_intents").select("*").eq("id", source_id).maybeSingle();
      if (!data) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      ({ symbol, asset_type, direction, stop_loss: sl, take_profit: tp, thesis } = data);
      entry = Number(data.entry_hint || data.trigger_value);
      qty = qty_override ?? 1;
    }

    const attribution = `From Σοφός · ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}`;
    const { data: trade, error } = await sb.from("paper_trades").insert({
      user_id: user.id,
      symbol, asset_type, direction,
      entry_price: entry, quantity: qty,
      stop_loss: sl, take_profit: tp,
      thesis: `${attribution}\n\n${thesis || ""}`,
      status: "open",
      order_type: "market",
    }).select().single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await sb.from("mentor_copies").insert({
      user_id: user.id, source_kind, source_id, paper_trade_id: trade.id,
    });

    return new Response(JSON.stringify({ ok: true, paper_trade_id: trade.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("mentor-copy error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
