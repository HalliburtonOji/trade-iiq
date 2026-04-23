// Check a trade against the user's active playbook rules using LLM
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trade, user_id } = await req.json();
    if (!trade || !user_id) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: rules } = await supabase.from("playbooks")
      .select("id, name, notes, invalidation_rules")
      .eq("user_id", user_id);

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ violations: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ violations: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isLovable = !Deno.env.get("OPENAI_API_KEY");
    const url = isLovable ? "https://ai.gateway.lovable.dev/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
    const model = isLovable ? "google/gemini-2.5-flash" : "gpt-4o-mini";

    const userMsg = JSON.stringify({
      trade,
      rules: rules.map((r: any) => ({ rule_id: r.id, title: r.name, body: r.notes, invalidation: r.invalidation_rules })),
    });

    const llmRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a trading discipline coach. Given the trade JSON and the user's active rules, return JSON {violations:[{rule_id, reason}]}. Only flag CLEAR violations, not borderline cases. If no clear violations, return {violations:[]}." },
          { role: "user", content: userMsg },
        ],
      }),
    });
    const llmData = await llmRes.json();
    const content = llmData?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { violations: [] }; }
    const violations = Array.isArray(parsed.violations) ? parsed.violations : [];

    return new Response(JSON.stringify({ violations }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
