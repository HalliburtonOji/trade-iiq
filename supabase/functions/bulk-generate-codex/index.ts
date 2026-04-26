// Bulk generates Codex modules from LEVEL_1_SPEC by invoking generate-codex-module.
// Admin-gated by email check. Sequential with 2s delay (Gemini free tier).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { LEVEL_1_SPEC, type ModuleSpec } from "../_shared/codex_catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "halliburtonoji@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check: must be admin email
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user || userData.user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find slugs already populated (have content_md)
    const { data: existing } = await supa
      .from("learn_modules")
      .select("slug, content_md")
      .in("slug", LEVEL_1_SPEC.map((s) => s.slug));
    const populatedSlugs = new Set(
      (existing || []).filter((r: any) => r.content_md && r.content_md.length > 100).map((r: any) => r.slug)
    );

    // Optional batch params from client to avoid 150s edge timeout.
    // Client should loop until done=true.
    let batchSize = 3;
    let startIndex = 0;
    try {
      const body = await req.json();
      if (typeof body?.batch_size === "number") batchSize = Math.max(1, Math.min(5, body.batch_size));
      if (typeof body?.start_index === "number") startIndex = Math.max(0, body.start_index);
    } catch { /* no body */ }

    const generated: string[] = [];
    const skipped: string[] = [];
    const failed: Array<{ slug: string; error: string }> = [];

    let processed = 0;
    let nextIndex = startIndex;

    for (let i = startIndex; i < LEVEL_1_SPEC.length; i++) {
      const spec = LEVEL_1_SPEC[i] as ModuleSpec;
      nextIndex = i + 1;

      if (populatedSlugs.has(spec.slug)) {
        skipped.push(spec.slug);
        continue;
      }
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/generate-codex-module`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({ ...spec, auto_publish: true }),
        });
        const j = await r.json();
        const ok = j?.results?.[0]?.ok === true;
        if (ok) generated.push(spec.slug);
        else failed.push({ slug: spec.slug, error: j?.results?.[0]?.error || `HTTP ${r.status}` });
      } catch (e) {
        failed.push({ slug: spec.slug, error: String(e) });
      }
      processed++;
      if (processed >= batchSize) break;
    }

    const done = nextIndex >= LEVEL_1_SPEC.length;
    return new Response(JSON.stringify({
      generated,
      skipped,
      failed,
      next_index: done ? null : nextIndex,
      total: LEVEL_1_SPEC.length,
      done,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
