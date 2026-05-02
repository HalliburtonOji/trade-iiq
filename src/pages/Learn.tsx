import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { seedCodexInitiates } from "@/scripts/seed-codex-initiates";
import { toast } from "sonner";

type LearnModule = {
  id: string;
  track: string;
  level: number;
  slug: string;
  title_en: string;
  title_gr: string;
  summary: string | null;
  ordinal: number;
  learn_minutes: number | null;
  xp_reward: number | null;
};

type ProgressRow = {
  module_id: string;
  mode: string;
  status: string;
  score: number | null;
};

type Recommendation = {
  id: string;
  module_id: string;
  reason: string;
  learn_modules: LearnModule | null;
};

const TRACKS = [
  { key: "markets", en: "Markets", gr: "Ἀγών",    desc: "Mechanics of price and venue." },
  { key: "chart",   en: "Chart",   gr: "Γραμμή",  desc: "Reading the tape." },
  { key: "risk",    en: "Risk",    gr: "Πρόνοια", desc: "The math that lets you survive." },
  { key: "mind",    en: "Mind",    gr: "Νοῦς",    desc: "The operator above the trade." },
  { key: "craft",   en: "Craft",   gr: "Τέχνη",   desc: "Strategy, playbook, repetition." },
];

const Learn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<LearnModule[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressRow[]>>({});
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [masteredL1, setMasteredL1] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const seedRanRef = useRef(false);
  const isAdmin = user?.email === "halliburtonoji@gmail.com";

  const handleSeed = async () => {
    setSeeding(true);
    try {
      console.log("[seed] starting");
      toast("Seeding Codex…", {
        description: "Calling generate-codex-module for 5 Initiate modules. This takes ~30–60s.",
      });
      const result = await seedCodexInitiates();
      console.log("[seed] result:", result);
      if ((result as any)?.error) throw (result as any).error;
      toast("Seed complete", { description: "Reloading modules…" });
      const { data: mods, error } = await supabase
        .from("learn_modules")
        .select("id,track,level,slug,title_en,title_gr,summary,ordinal,learn_minutes,xp_reward")
        .eq("is_published", true)
        .lte("level", 2)
        .order("track", { ascending: true })
        .order("level", { ascending: true })
        .order("ordinal", { ascending: true });
      if (error) throw error;
      console.log("[seed] modules after:", mods);
      setModules((mods || []) as LearnModule[]);
      if (!mods || mods.length === 0) {
        toast.error("Seed finished but no modules found", {
          description: "Check the generate-codex-module function logs in Supabase.",
        });
      }
    } catch (e: any) {
      console.error("[seed] failed:", e);
      toast.error("Seed failed", {
        description:
          e?.message || (typeof e === "string" ? e : JSON.stringify(e)) ||
          "Unknown error — check browser console and Supabase function logs.",
      });
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (seedRanRef.current) return;
    const isAdmin = user.email === "halliburtonoji@gmail.com";
    if (!isAdmin) return;

    (async () => {
      const { count, error } = await supabase
        .from("learn_modules")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true);
      if (error) return;
      if ((count ?? 0) > 0) return;
      seedRanRef.current = true;
      toast("Seeding Codex…", { description: "Generating the five Initiate modules. One moment." });
      try {
        await seedCodexInitiates();
        toast("Codex seeded", { description: "Refresh if modules don't appear." });
        const { data: mods } = await supabase
          .from("learn_modules")
          .select("id,track,level,slug,title_en,title_gr,summary,ordinal,learn_minutes,xp_reward")
          .eq("is_published", true)
          .lte("level", 2)
          .order("track", { ascending: true })
          .order("level", { ascending: true })
          .order("ordinal", { ascending: true });
        if (mods) setModules(mods as LearnModule[]);
      } catch (e: any) {
        toast.error("Seed failed", { description: e?.message || "Check the generate-codex-module function logs." });
      }
    })();
  }, [user]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: mods } = await supabase
        .from("learn_modules")
        .select("id,track,level,slug,title_en,title_gr,summary,ordinal,learn_minutes,xp_reward")
        .eq("is_published", true)
        .lte("level", 2)
        .order("track", { ascending: true })
        .order("level", { ascending: true })
        .order("ordinal", { ascending: true });
      if (!cancelled && mods) setModules(mods as LearnModule[]);

      if (user) {
        const { data: prog } = await supabase
          .from("learn_progress")
          .select("module_id,mode,status,score")
          .eq("user_id", user.id);
        if (!cancelled && prog) {
          const grouped: Record<string, ProgressRow[]> = {};
          (prog as ProgressRow[]).forEach((p) => {
            if (!grouped[p.module_id]) grouped[p.module_id] = [];
            grouped[p.module_id].push(p);
          });
          setProgress(grouped);

          // Count L1 mastered (quiz completed on a level-1 module)
          const l1Ids = new Set((mods || []).filter((m: any) => m.level === 1).map((m: any) => m.id));
          const mastered = (prog as ProgressRow[]).filter(
            (p) => p.mode === "quiz" && p.status === "completed" && l1Ids.has(p.module_id)
          ).length;
          if (!cancelled) setMasteredL1(mastered);
        }

        const { count } = await supabase
          .from("paper_trades")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (!cancelled) setTradeCount(count || 0);

        const { data: recs } = await supabase
          .from("learn_recommendations")
          .select("id,module_id,reason,learn_modules:module_id(id,track,level,slug,title_en,title_gr,summary,ordinal,learn_minutes,xp_reward)")
          .eq("user_id", user.id)
          .is("dismissed_at", null)
          .order("generated_at", { ascending: false })
          .limit(1);
        if (!cancelled && recs && recs.length > 0) {
          const r: any = recs[0];
          if (!r.learn_modules && mods) {
            r.learn_modules = (mods as any[]).find((m) => m.id === r.module_id) || null;
          }
          setRec(r as Recommendation);
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const practitionerUnlocked = masteredL1 >= 5 && tradeCount >= 20;

  const modStatus = (id: string): "mastered" | "started" | "new" => {
    const rows = progress[id];
    if (!rows) return "new";
    if (rows.some((r) => r.mode === "quiz" && r.status === "completed")) return "mastered";
    if (rows.some((r) => r.status === "completed" || r.status === "in_progress")) return "started";
    return "new";
  };

  const stoaCrumb = (
    <span>
      <span className="stoa-greek">Κῶδιξ</span> · The Codex
    </span>
  );

  return (
    <StoaShell palette="delphi" crumb={stoaCrumb}>
      <div className="flex flex-col gap-2 mb-6 min-w-0 max-w-full">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">GROW · THE CODEX</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold" style={{ color: "var(--stoa-ink)" }}>
            THE CODEX · ΚΩΔΙΞ
          </h1>
        </div>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 14, fontStyle: "italic", color: "var(--stoa-muted)" }}>
          Your path of study — five tracks, three levels, one disciplined trader.
        </p>
      </div>

      {isAdmin && !loading && modules.length === 0 && (
        <div
          style={{
            background: "var(--stoa-shine)",
            border: "1px solid var(--stoa-rule)",
            borderRadius: 2,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            ADMIN · ΣΠΟΡΟΣ
          </div>
          <h3
            className="stoa-display font-semibold"
            style={{ color: "var(--stoa-ink)", marginTop: 4, fontSize: 18 }}
          >
            Seed the Codex
          </h3>
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 14,
              fontStyle: "italic",
              color: "var(--stoa-muted)",
              marginTop: 6,
            }}
          >
            Your Codex is empty. Click to generate the 5 Initiate modules via OpenAI. One-time action; safe to re-run (idempotent upsert by slug).
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{
              marginTop: 14,
              background: "var(--stoa-accent)",
              color: "var(--stoa-ink)",
              border: "none",
              borderRadius: 2,
              padding: "10px 18px",
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: seeding ? "not-allowed" : "pointer",
              opacity: seeding ? 0.6 : 1,
            }}
          >
            {seeding ? "Seeding…" : "Seed 5 Initiate Modules →"}
          </button>
        </div>
      )}

      {rec && rec.learn_modules && (
        <div
          onClick={() => navigate(`/learn/${rec.learn_modules!.slug}`)}
          style={{
            background: "var(--stoa-ink)",
            color: "var(--stoa-shine)",
            borderLeft: "3px solid var(--stoa-accent)",
            borderRadius: 2,
            padding: 20,
            marginBottom: 24,
            cursor: "pointer",
          }}
        >
          <div className="stoa-kicker" style={{ color: "var(--stoa-accent)", marginBottom: 6 }}>
            ORACLE · ΧΡΗΣΜΟΣ
          </div>
          <div className="stoa-display text-xl font-semibold" style={{ color: "var(--stoa-shine)" }}>
            {rec.learn_modules.title_en}
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 14, fontStyle: "italic", marginTop: 6, opacity: 0.85 }}>
            {rec.reason}
          </div>
        </div>
      )}

      {loading && (
        <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", padding: "20px 0" }}>
          LOADING · ΧΡΟΝΟΣ…
        </div>
      )}

      {!loading && TRACKS.map((t) => {
        const trackMods = modules.filter((m) => m.track === t.key);
        const l1Mods = trackMods.filter((m) => m.level === 1);
        const l2Mods = trackMods.filter((m) => m.level === 2);
        const visibleMods = practitionerUnlocked ? trackMods : l1Mods;
        const showLockedCard = !practitionerUnlocked && l2Mods.length > 0;
        return (
          <section key={t.key} style={{ marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                borderBottom: "1px solid var(--stoa-rule)",
                paddingBottom: 8,
                marginBottom: 12,
              }}
            >
              <span className="stoa-display text-xl font-semibold" style={{ color: "var(--stoa-ink)" }}>
                {t.en}
              </span>
              <span className="stoa-greek" style={{ color: "var(--stoa-accent)", fontSize: 16 }}>
                {t.gr}
              </span>
              <span style={{ flex: 1 }} />
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                {t.desc}
              </span>
            </div>

            {visibleMods.length === 0 && !showLockedCard ? (
              <div style={{ fontFamily: "Georgia, serif", fontSize: 14, fontStyle: "italic", color: "var(--stoa-muted)" }}>
                Coming soon.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleMods.map((m) => {
                  const st = modStatus(m.id);
                  const badge = st === "mastered" ? "✓ Mastered" : st === "started" ? "· In progress" : "New";
                  return (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/learn/${m.slug}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--stoa-accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--stoa-rule)")}
                      style={{
                        background: "var(--stoa-shine)",
                        border: "1px solid var(--stoa-rule)",
                        borderRadius: 2,
                        padding: 14,
                        cursor: "pointer",
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      <div
                        className="stoa-kicker"
                        style={{
                          color: st === "mastered" ? "var(--stoa-accent)" : "var(--stoa-muted)",
                          marginBottom: 6,
                        }}
                      >
                        {badge} {m.level === 2 ? "· L2" : ""}
                      </div>
                      <div className="stoa-display font-semibold" style={{ color: "var(--stoa-ink)", fontSize: 15 }}>
                        {m.title_en}
                      </div>
                      <div className="stoa-greek" style={{ color: "var(--stoa-accent)", fontSize: 13, marginTop: 2 }}>
                        {m.title_gr}
                      </div>
                      {m.summary && (
                        <div style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "var(--stoa-muted)", marginTop: 8 }}>
                          {m.summary}
                        </div>
                      )}
                      <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", marginTop: 10, fontSize: 11 }}>
                        {m.learn_minutes ?? 8}M · +{m.xp_reward ?? 50}XP
                      </div>
                    </div>
                  );
                })}
                {showLockedCard && (
                  <div
                    style={{
                      background: "var(--stoa-shine)",
                      border: "1px dashed var(--stoa-rule)",
                      borderRadius: 2,
                      padding: 14,
                      opacity: 0.85,
                    }}
                  >
                    <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", marginBottom: 6 }}>
                      🔒 PRACTITIONER · ΑΣΚΗΤΗΣ
                    </div>
                    <div className="stoa-display font-semibold" style={{ color: "var(--stoa-ink)", fontSize: 15 }}>
                      Level 2 — Locked
                    </div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 13, fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 8 }}>
                      Practitioner (Ἀσκητής) unlocks after 5 mastered Initiate quizzes and 20 logged trades.
                    </div>
                    <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", marginTop: 10, fontSize: 11 }}>
                      {masteredL1}/5 mastered · {tradeCount}/20 trades
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </StoaShell>
  );
};

export default Learn;
