import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import { useToast } from "@/hooks/use-toast";

type DrillQ = { prompt: string; options: string[]; correct: number; explanation: string };

type LearnModuleRow = {
  id: string;
  track: string;
  slug: string;
  title_en: string;
  title_gr: string;
  drill_json: { questions: DrillQ[] } | null;
};

const goldCta = {
  background: "var(--stoa-accent)",
  color: "var(--stoa-ink)",
  border: "none",
  borderRadius: 2,
  padding: "10px 20px",
  cursor: "pointer",
} as const;

const creamCta = {
  background: "var(--stoa-shine)",
  color: "var(--stoa-ink)",
  border: "1px solid var(--stoa-rule)",
  borderRadius: 2,
  padding: "10px 20px",
  cursor: "pointer",
} as const;

export default function LearnDrill() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mod, setMod] = useState<LearnModuleRow | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [phase, setPhase] = useState<"drill" | "done">("drill");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("learn_modules")
        .select("id,track,slug,title_en,title_gr,drill_json")
        .eq("slug", slug)
        .single();
      if (!cancelled) {
        setMod((data as unknown as LearnModuleRow) || null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const qs: DrillQ[] = mod?.drill_json?.questions || [];
  const q = qs[idx];

  const onPick = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    if (i === q.correct) setCorrectCount((c) => c + 1);
  };

  const finish = async (finalCorrect: number) => {
    setPhase("done");
    if (!user || !mod) return;
    const pct = Math.round((finalCorrect / qs.length) * 100);
    await supabase.from("learn_progress").upsert(
      {
        user_id: user.id,
        module_id: mod.id,
        mode: "drill",
        status: "completed",
        score: pct,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id,mode" }
    );
    const xpRes = await supabase.rpc("award_xp", {
      p_amount: 25,
      p_source: "drill",
      p_ref_id: mod.id,
      p_ref_table: "learn_modules",
    });
    if (xpRes.error) console.error("[award_xp drill]", xpRes.error);
    toast({ title: "Drill complete", description: `${pct}% accuracy · +25 XP` });
  };

  const onNext = () => {
    const wasCorrect = picked !== null && q && picked === q.correct;
    const nextCorrect = correctCount; // already incremented in onPick
    setPicked(null);
    if (idx + 1 < qs.length) {
      setIdx(idx + 1);
    } else {
      finish(nextCorrect);
    }
    // suppress unused-var lint for clarity
    void wasCorrect;
  };

  const stoaCrumb = (
    <span>
      <span className="stoa-greek">Γύμνασμα</span> · {mod?.title_en || "Drill"}
    </span>
  );

  const finalPct = qs.length > 0 ? Math.round((correctCount / qs.length) * 100) : 0;

  return (
    <StoaShell palette="delphi" crumb={stoaCrumb}>
      {loading && (
        <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", padding: "20px 0" }}>
          LOADING · ΧΡΟΝΟΣ…
        </div>
      )}

      {!loading && (!mod || qs.length === 0) && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginBottom: 20 }}>
            No drills yet for this module.
          </p>
          <button style={goldCta} className="stoa-display font-semibold" onClick={() => navigate("/learn")}>
            Back to Codex
          </button>
        </div>
      )}

      {!loading && mod && qs.length > 0 && phase === "drill" && q && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
              {mod.track.toUpperCase()} · DRILL · ΓΥΜΝΑΣΜΑ
            </span>
            <span className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>
              {idx + 1} / {qs.length} · ✓ {correctCount}
            </span>
          </div>
          <h1 className="stoa-display text-2xl font-semibold" style={{ color: "var(--stoa-ink)", marginTop: 16 }}>
            {q.prompt}
          </h1>
          <div className="flex flex-col gap-2" style={{ marginTop: 20 }}>
            {q.options.map((opt, i) => {
              let borderColor = "var(--stoa-rule)";
              let background = "var(--stoa-shine)";
              if (picked !== null) {
                if (i === q.correct) {
                  borderColor = "var(--stoa-accent)";
                  background = "rgba(180,140,60,0.12)";
                } else if (i === picked) {
                  borderColor = "hsl(var(--verdict-avoid))";
                  background = "hsl(var(--verdict-avoid) / 0.08)";
                }
              }
              return (
                <button
                  key={i}
                  onMouseEnter={(e) => {
                    if (picked === null) e.currentTarget.style.borderColor = "var(--stoa-accent)";
                  }}
                  onMouseLeave={(e) => {
                    if (picked === null) e.currentTarget.style.borderColor = "var(--stoa-rule)";
                  }}
                  style={{
                    background,
                    color: "var(--stoa-ink)",
                    border: `1px solid ${borderColor}`,
                    borderRadius: 2,
                    padding: "12px 16px",
                    textAlign: "left",
                    fontFamily: "Georgia, serif",
                    fontSize: 15,
                    cursor: picked === null ? "pointer" : "default",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                  onClick={() => onPick(i)}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div
              style={{
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                borderLeft: "3px solid var(--stoa-accent)",
                borderRadius: 2,
                padding: "12px 16px",
                marginTop: 12,
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--stoa-ink)",
              }}
            >
              {q.explanation}
            </div>
          )}

          {picked !== null && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button style={goldCta} className="stoa-display font-semibold" onClick={onNext}>
                {idx + 1 >= qs.length ? "Finish →" : "Next →"}
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && mod && phase === "done" && (
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "20px 0" }}>
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            DRILL COMPLETE · ΤΕΛΟΣ
          </div>
          <h1 className="stoa-display text-4xl font-semibold" style={{ color: "var(--stoa-ink)", marginTop: 12 }}>
            {finalPct}%
          </h1>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 8 }}>
            {finalPct >= 80
              ? "Sharp. Your eye is trained."
              : finalPct >= 50
              ? "Progress, not mastery."
              : "Return and drill again — reps are the road."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <button style={goldCta} className="stoa-display font-semibold" onClick={() => navigate("/learn")}>
              Back to Codex
            </button>
            <button
              style={creamCta}
              className="stoa-kicker"
              onClick={() => {
                setIdx(0);
                setPicked(null);
                setCorrectCount(0);
                setPhase("drill");
              }}
            >
              Run again
            </button>
          </div>
        </div>
      )}
    </StoaShell>
  );
}
