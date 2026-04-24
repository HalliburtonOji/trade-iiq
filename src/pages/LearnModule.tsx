import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import { useToast } from "@/hooks/use-toast";
import StoaMarkdown from "@/components/stoa/StoaMarkdown";

type QuizQ = { prompt: string; options: string[]; correct: number; explanation: string };
type QuizJson = { pass_score?: number; questions: QuizQ[] };

type LearnModuleRow = {
  id: string;
  track: string;
  level: number;
  slug: string;
  title_en: string;
  title_gr: string;
  summary: string | null;
  content_md: string | null;
  drill_json: any;
  scenario_json: any;
  quiz_json: QuizJson | null;
  learn_minutes: number | null;
  xp_reward: number | null;
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

export default function LearnModule() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mod, setMod] = useState<LearnModuleRow | null>(null);
  const [phase, setPhase] = useState<"lesson" | "quiz" | "result">("lesson");
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleBody, setRuleBody] = useState("");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("learn_modules")
        .select("*")
        .eq("slug", slug)
        .single();
      if (!cancelled) {
        setMod((data as unknown as LearnModuleRow) || null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (phase === "lesson" && user && mod) {
      supabase.from("learn_progress").upsert(
        { user_id: user.id, module_id: mod.id, mode: "lesson", status: "in_progress" },
        { onConflict: "user_id,module_id,mode" }
      );
    }
  }, [phase, user, mod]);

  const submitQuiz = async (final: number[]) => {
    if (!mod || !mod.quiz_json) return;
    const qs = mod.quiz_json.questions;
    const correct = final.filter((a, i) => a === qs[i].correct).length;
    const pct = Math.round((correct / qs.length) * 100);
    setScore(pct);
    setPhase("result");
    const passScore = mod.quiz_json.pass_score ?? 70;
    const passed = pct >= passScore;
    if (user) {
      await supabase.from("learn_progress").upsert(
        {
          user_id: user.id,
          module_id: mod.id,
          mode: "quiz",
          status: passed ? "completed" : "failed",
          score: pct,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_id,mode" }
      );
    }
    if (passed) {
      toast({ title: "Quiz passed", description: `+${mod.xp_reward ?? 50} XP` });
      setRuleTitle(`Rule from ${mod.title_en}`);
      setRuleBody(`Based on "${mod.title_en}" (${mod.title_gr}): ${mod.summary || ""}\n\nWhen this situation arises, I will: `);
      setShowRuleModal(true);
    }
  };

  const saveRule = async () => {
    if (!user || !mod) return;
    const { error } = await supabase.from("playbooks").insert({
      user_id: user.id,
      name: ruleTitle,
      notes: ruleBody,
      strategy_type: "codex",
      checklist: [],
      conditions: { source_module_id: mod.id },
    });
    if (!error) {
      await supabase.from("learn_progress").update({ playbook_rule_created: true })
        .eq("user_id", user.id).eq("module_id", mod.id).eq("mode", "quiz");
      toast({ title: "Rule added", description: "Saved to your Playbook." });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setShowRuleModal(false);
  };

  const stoaCrumb = (
    <span>
      <span className="stoa-greek">Κῶδιξ</span> · {mod?.title_en || "Lesson"}
    </span>
  );

  return (
    <StoaShell palette="delphi" crumb={stoaCrumb}>
      {loading && (
        <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", padding: "20px 0" }}>
          LOADING · ΧΡΟΝΟΣ…
        </div>
      )}

      {!loading && !mod && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginBottom: 20 }}>
            This passage is not yet inscribed.
          </p>
          <button style={goldCta} className="stoa-display font-semibold" onClick={() => navigate("/learn")}>
            Back to Codex
          </button>
        </div>
      )}

      {!loading && mod && phase === "lesson" && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            {mod.track.toUpperCase()} · LEVEL {mod.level} · {mod.learn_minutes ?? 8}M · +{mod.xp_reward ?? 50} XP
          </div>
          <h1 className="stoa-display text-3xl md:text-4xl font-semibold" style={{ color: "var(--stoa-ink)", marginTop: 4 }}>
            {mod.title_en}
          </h1>
          <div className="stoa-greek" style={{ color: "var(--stoa-accent)", fontSize: 18, marginTop: 4 }}>
            {mod.title_gr}
          </div>
          <div style={{ height: 1, background: "var(--stoa-rule)", margin: "20px 0" }} />
          <StoaMarkdown source={mod.content_md} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, gap: 12, flexWrap: "wrap" }}>
            <button
              className="stoa-kicker"
              style={{ background: "transparent", border: "none", color: "var(--stoa-muted)", cursor: "pointer", padding: "10px 0" }}
              onClick={() => navigate("/learn")}
            >
              ← Back to Codex
            </button>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                style={creamCta}
                className="stoa-kicker"
                onClick={() => navigate(`/learn/${slug}/drill`)}
              >
                Drill (Γύμνασμα)
              </button>
              {mod.scenario_json && (
                <button
                  style={creamCta}
                  className="stoa-kicker"
                  onClick={() => navigate(`/learn/${slug}/scenario`)}
                >
                  Scenario (Ἀγών)
                </button>
              )}
              <button
                style={goldCta}
                className="stoa-display font-semibold"
                onClick={() => { setPhase("quiz"); setQIdx(0); setAnswers([]); }}
              >
                Begin Quiz →
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && mod && mod.quiz_json && phase === "quiz" && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            QUIZ · ΚΡΙΣΙΣ — {qIdx + 1} of {mod.quiz_json.questions.length}
          </div>
          <h1 className="stoa-display text-2xl font-semibold" style={{ color: "var(--stoa-ink)", marginTop: 8 }}>
            {mod.quiz_json.questions[qIdx].prompt}
          </h1>
          <div className="flex flex-col gap-2" style={{ marginTop: 20 }}>
            {mod.quiz_json.questions[qIdx].options.map((opt, i) => (
              <button
                key={i}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--stoa-accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--stoa-rule)")}
                style={{
                  background: "var(--stoa-shine)",
                  color: "var(--stoa-ink)",
                  border: "1px solid var(--stoa-rule)",
                  borderRadius: 2,
                  padding: "12px 16px",
                  textAlign: "left",
                  fontFamily: "Georgia, serif",
                  fontSize: 15,
                  cursor: "pointer",
                  transition: "border-color 0.15s ease",
                }}
                onClick={() => {
                  const next = [...answers];
                  next[qIdx] = i;
                  setAnswers(next);
                  if (qIdx + 1 < mod.quiz_json!.questions.length) setQIdx(qIdx + 1);
                  else submitQuiz(next);
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && mod && phase === "result" && score !== null && (
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "20px 0" }}>
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            VERDICT · ΚΡΙΣΙΣ
          </div>
          <h1
            className="stoa-display text-4xl font-semibold"
            style={{
              color: score >= (mod.quiz_json?.pass_score ?? 70) ? "var(--stoa-accent)" : "var(--stoa-ink)",
              marginTop: 12,
            }}
          >
            {score}%
          </h1>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 8 }}>
            {score >= (mod.quiz_json?.pass_score ?? 70)
              ? "The lesson is in your hand."
              : "Return to the scroll and try again."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <button style={goldCta} className="stoa-display font-semibold" onClick={() => navigate("/learn")}>
              Back to Codex
            </button>
            {score < (mod.quiz_json?.pass_score ?? 70) && (
              <button
                style={creamCta}
                className="stoa-kicker"
                onClick={() => { setPhase("lesson"); setScore(null); }}
              >
                Re-read Lesson
              </button>
            )}
          </div>
        </div>
      )}

      {showRuleModal && (
        <div style={{
          position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(26,20,12,0.55)", zIndex: 50, padding: 16,
        }}>
          <div style={{
            background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2,
            padding: 24, maxWidth: 520, width: "100%",
          }}>
            <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
              CLOSE THE LOOP · ΚΥΚΛΟΣ
            </div>
            <h2 className="stoa-display text-2xl font-semibold" style={{ color: "var(--stoa-ink)", marginTop: 4 }}>
              Add a rule to your Playbook?
            </h2>
            <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 8 }}>
              Turn this lesson into a rule your future trades will be checked against.
            </p>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Title</span>
                <input value={ruleTitle} onChange={(e) => setRuleTitle(e.target.value)}
                  style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", padding: "6px 10px", fontFamily: "Georgia, serif", fontSize: 15, color: "var(--stoa-ink)", borderRadius: 2, width: "100%" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Rule</span>
                <textarea rows={4} value={ruleBody} onChange={(e) => setRuleBody(e.target.value)}
                  style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", padding: "6px 10px", fontFamily: "Georgia, serif", fontSize: 15, color: "var(--stoa-ink)", borderRadius: 2, width: "100%", resize: "vertical" }} />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
              <button style={creamCta} className="stoa-kicker" onClick={() => setShowRuleModal(false)}>
                Skip
              </button>
              <button style={goldCta} className="stoa-display font-semibold" onClick={saveRule}>
                Save rule
              </button>
            </div>
          </div>
        </div>
      )}
    </StoaShell>
  );
}
