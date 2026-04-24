// Check a trade against the user's active playbook rules using LLM (Anthropic Haiku primary, Gemini-via-Lovable fallback)
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
    const { data: rulesRaw } = await supabase.from("playbooks")
      .select("id, name, notes, invalidation_rules")
      .eq("user_id", user_id);

    const rules = (rulesRaw || []).map((r: any) => ({
      rule_id: r.id, title: r.name, body: r.notes, invalidation: r.invalidation_rules,
    }));

    // Early exit: no rules, no LLM call
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ violations: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const systemPrompt = "You are a trading discipline coach. Return ONLY JSON in the form {\"violations\":[{\"rule_id\":string,\"reason\":string}]}. Only flag clear violations, not borderline cases. No markdown fences, no prose.";
    const userContent = JSON.stringify({ trade, rules });

    // Primary: Anthropic Haiku
    if (ANTHROPIC_API_KEY) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 500,
            system: systemPrompt,
            messages: [{ role: "user", content: userContent }],
          }),
        });
        if (r.ok) {
          const data = await r.json();
          let txt = (data.content?.[0]?.text || "").trim();
          if (txt.startsWith("```")) txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
          const parsed = JSON.parse(txt);
          const violations = Array.isArray(parsed.violations) ? parsed.violations : [];
          return new Response(JSON.stringify({ violations }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (_) {
        // fall through to Lovable
      }
    }

    // Fallback: Gemini via Lovable AI Gateway
    if (LOVABLE_API_KEY) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
          }),
        });
        if (r.ok) {
          const data = await r.json();
          const content = data?.choices?.[0]?.message?.content || "{}";
          let parsed: any = {};
          try { parsed = JSON.parse(content); } catch { parsed = { violations: [] }; }
          const violations = Array.isArray(parsed.violations) ? parsed.violations : [];
          return new Response(JSON.stringify({ violations }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (_) {
        // no-op
      }
    }

    // If no LLM available / all failed, return empty violations (graceful)
    return new Response(JSON.stringify({ violations: [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
