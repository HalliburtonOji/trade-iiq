// Manteion · The Oracle — streaming AI coach with full personal context
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonErr("Missing authorization", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonErr("Unauthorized", 401);

    const { sessionId, message } = await req.json();
    if (!sessionId || typeof message !== "string" || !message.trim()) {
      return jsonErr("sessionId and message required", 400);
    }

    // Persist user message
    await supabase.from("oracle_messages").insert({
      session_id: sessionId, user_id: user.id, role: "user", content: message,
    });

    // Gather context: recent trades, DNA, rules, codex progress, reflections, streak, mentor (Sophos)
    const [trades, dna, rules, codex, refl, streak, profile, council, mentorOpen, mentorIntents, mentorJournal, mentorProf] = await Promise.all([
      supabase.from("paper_trades")
        .select("symbol,direction,entry_price,exit_price,pnl,pnl_percent,thesis,post_notes,opened_at,closed_at,status,emotion,stop_loss,take_profit")
        .eq("user_id", user.id).order("opened_at", { ascending: false }).limit(20),
      supabase.from("trading_dna").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("trading_rules").select("rule_text,category").eq("user_id", user.id).eq("is_active", true).limit(20),
      supabase.from("learn_progress").select("module_id,completed_at,score,status")
        .eq("user_id", user.id).not("completed_at", "is", null).limit(10),
      supabase.from("evening_reflections").select("reflection_date,trade_summary,lesson,rules_honoured,intent_tomorrow")
        .eq("user_id", user.id).order("reflection_date", { ascending: false }).limit(7),
      supabase.from("practice_streak").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("display_name,xp_total,streak_count,trading_personality,experience_level,trading_goals,trading_level").eq("user_id", user.id).maybeSingle(),
      supabase.from("council_reviews").select("ai_summary,decree,week_starting").eq("user_id", user.id).order("week_starting", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("mentor_trades").select("symbol,direction,entry_price,stop_loss,take_profit,opened_at,thesis").eq("status","open").limit(10),
      supabase.from("mentor_intents").select("symbol,direction,trigger_condition_text,thesis,conviction,fail_reasons,valid_until").eq("status","pending").limit(10),
      supabase.from("mentor_journal").select("kind,symbol,body_text,created_at").order("created_at",{ascending:false}).limit(8),
      supabase.from("mentor_profile").select("display_name,equity,starting_balance,bio").eq("slug","sophos").maybeSingle(),
    ]);

    // Load conversation history
    const { data: history } = await supabase.from("oracle_messages")
      .select("role,content").eq("session_id", sessionId).order("created_at").limit(40);

    const ctx = {
      profile: profile.data,
      streak: streak.data,
      tradingDNA: dna.data,
      activeRules: (rules.data || []).map((r: any) => r.rule_text),
      recentTrades: trades.data || [],
      recentReflections: refl.data || [],
      completedCodex: (codex.data || []).length,
      latestCouncil: council.data,
      mentorSophos: {
        profile: mentorProf.data,
        openPositions: mentorOpen.data || [],
        pendingIntents: mentorIntents.data || [],
        recentJournal: mentorJournal.data || [],
      },
    };

    const systemPrompt = `You are Manteion (Μαντεῖον), the personal Oracle of TradeIIQ — a wise, calm, deeply personal trading coach in the Stoic-Hellenic tradition. You have read everything about this trader and you also see what Σοφός (Sophos), the in-app living mentor, is currently doing. Speak with quiet authority. Use their actual data. Cite real symbols, real numbers, real reflections. Never invent.

When the trader asks about Sophos (their public mentor), answer from \`mentorSophos\` — his open positions, pending intents (with conviction 1–5 and fail_reasons) and the last journal entries. You speak ABOUT Sophos, not AS Sophos. When useful, contrast the trader's behaviour with Sophos's same-day decisions.

Voice: thoughtful, sparing, occasionally invoking the Greek (ἀρετή, λόγος, ἕξις) when it adds weight — never decorative. Use markdown. Short paragraphs. Tables when helpful.

THE TRADER'S FULL DOSSIER (use this — do not ask for what is already here):
${JSON.stringify(ctx, null, 2)}

If asked something you cannot answer from the dossier, say so plainly and ask one focused question.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return jsonErr("Rate limit reached. Try again shortly.", 429);
      if (aiRes.status === 402) return jsonErr("AI credits exhausted.", 402);
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return jsonErr("Oracle is silent. Try again.", 500);
    }

    // Tee the stream: pass to client AND accumulate to persist final assistant message
    const [clientStream, captureStream] = aiRes.body!.tee();

    (async () => {
      try {
        const reader = captureStream.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1);
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const j = JSON.parse(data);
              const c = j.choices?.[0]?.delta?.content;
              if (c) full += c;
            } catch { /* partial */ }
          }
        }
        if (full.trim()) {
          await supabase.from("oracle_messages").insert({
            session_id: sessionId, user_id: user.id, role: "assistant", content: full,
            context_json: { trades_n: ctx.recentTrades.length, rules_n: ctx.activeRules.length },
          });
          await supabase.from("oracle_sessions")
            .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", sessionId);
        }
      } catch (e) { console.error("capture error", e); }
    })();

    return new Response(clientStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("oracle error", e);
    return jsonErr(e instanceof Error ? e.message : "Unknown", 500);
  }
});

function jsonErr(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
