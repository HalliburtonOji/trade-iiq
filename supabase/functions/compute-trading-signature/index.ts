// Compute a per-user trading "signature": stats + bias/risk/craft vectors + 11-dim normalized embedding.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "missing_user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull last 100 trades + learn progress
    const [{ data: trades }, { data: prog }] = await Promise.all([
      supabase.from("paper_trades")
        .select("symbol, direction, entry_price, exit_price, stop_loss, take_profit, pnl_percent, status, opened_at, closed_at, emotion, thesis_json")
        .eq("user_id", user_id)
        .order("opened_at", { ascending: false })
        .limit(100),
      supabase.from("learn_progress")
        .select("module_id, mode, status, score")
        .eq("user_id", user_id),
    ]);

    const closed = (trades || []).filter((t: any) => t.status === "closed" && typeof t.pnl_percent === "number");
    const total = closed.length;
    const wins = closed.filter((t: any) => (t.pnl_percent ?? 0) > 0).length;
    const win_rate = total ? wins / total : 0;
    const rs = closed.map((t: any) => (t.pnl_percent ?? 0) / 100);
    const avg_r = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
    const var_r = rs.length ? rs.reduce((a, b) => a + (b - avg_r) ** 2, 0) / rs.length : 0;

    // Tilt: longest losing streak / total
    let longest = 0, cur = 0;
    for (const t of closed) {
      if ((t.pnl_percent ?? 0) < 0) { cur += 1; longest = Math.max(longest, cur); }
      else cur = 0;
    }
    const tilt_score = total ? longest / total : 0;

    // Bias vector heuristics
    const bySymbol: Record<string, any[]> = {};
    for (const t of closed) {
      bySymbol[t.symbol] = bySymbol[t.symbol] || [];
      bySymbol[t.symbol].push(t);
    }
    const repeatDirection = Object.values(bySymbol).reduce((acc: number, arr: any[]) => {
      if (arr.length < 2) return acc;
      const sameDir = arr.filter((x, i, a) => i > 0 && x.direction === a[i - 1].direction).length;
      return acc + sameDir / arr.length;
    }, 0) / Math.max(1, Object.keys(bySymbol).length);
    const fastReentryAfterLoss = (() => {
      let c = 0;
      for (let i = 1; i < closed.length; i++) {
        const prev = closed[i - 1], now = closed[i];
        if ((prev.pnl_percent ?? 0) < 0 && prev.closed_at && now.opened_at) {
          const dt = (new Date(now.opened_at).getTime() - new Date(prev.closed_at).getTime()) / 60000;
          if (dt < 30) c += 1;
        }
      }
      return total ? c / total : 0;
    })();
    const oversizing = closed.filter((t: any) => Math.abs(t.pnl_percent ?? 0) > 10).length / Math.max(1, total);
    const bias_vec = [
      Math.min(1, repeatDirection),     // confirmation
      Math.min(1, fastReentryAfterLoss), // recency
      Math.min(1, 1 - win_rate),         // loss-aversion proxy
      Math.min(1, oversizing),           // overconfidence
    ];

    // Risk vector
    const stopPcts = closed.map((t: any) => t.stop_loss && t.entry_price ? Math.abs((t.entry_price - t.stop_loss) / t.entry_price) : 0).filter(x => x > 0);
    const tgtPcts = closed.map((t: any) => t.take_profit && t.entry_price ? Math.abs((t.take_profit - t.entry_price) / t.entry_price) : 0).filter(x => x > 0);
    const avgStop = stopPcts.length ? stopPcts.reduce((a, b) => a + b, 0) / stopPcts.length : 0;
    const avgTarget = tgtPcts.length ? tgtPcts.reduce((a, b) => a + b, 0) / tgtPcts.length : 0;
    const avgPos = oversizing; // crude proxy
    let runningPnl = 0, peak = 0, maxDd = 0;
    for (const t of closed.slice().reverse()) {
      runningPnl += (t.pnl_percent ?? 0) / 100;
      peak = Math.max(peak, runningPnl);
      maxDd = Math.max(maxDd, peak - runningPnl);
    }
    const risk_vec = [avgStop, avgTarget, avgPos, maxDd];

    // Craft vector
    const symbols = new Set(closed.map((t: any) => t.symbol));
    const strategy_diversity = Math.min(1, symbols.size / 10);
    const playbook_adherence = (prog || []).filter((p: any) => p.mode === "quiz" && p.status === "completed").length / 10;
    const sessions = new Set(closed.map((t: any) => t.opened_at?.slice(0, 10)));
    const session_consistency = total ? Math.min(1, sessions.size / 30) : 0;
    const craft_vec = [strategy_diversity, Math.min(1, playbook_adherence), session_consistency];

    const signature = {
      win_rate, avg_r, var_r, tilt_score,
      bias_vec, risk_vec, craft_vec,
      total_trades: total,
    };

    // Build 11-dim normalized feature vector (replaces OpenAI embedding)
    const raw = [
      Number(signature.win_rate) || 0,
      Number(signature.avg_r) || 0,
      Number(signature.tilt_score) || 0,
      ...(signature.bias_vec || [0, 0, 0, 0]).map((x: any) => Number(x) || 0),
      ...((signature.risk_vec || [0, 0]).slice(0, 2)).map((x: any) => Number(x) || 0),
      ...((signature.craft_vec || [0, 0]).slice(0, 2)).map((x: any) => Number(x) || 0),
    ]; // exactly 11
    const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0)) || 1;
    const embedding = raw.map((v) => v / norm);

    await supabase.from("trading_signatures").upsert({
      user_id,
      signature,
      embedding: embedding as any,
      computed_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ signature, embedding }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
