import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import { useToast } from "@/hooks/use-toast";
import StoaMarkdown from "@/components/stoa/StoaMarkdown";
import LessonDiagram, { type Diagram } from "@/components/learn/LessonDiagram";
import { greekNumeral } from "@/lib/greek-numerals";

type QuizQ = { prompt: string; options: string[]; correct: number; explanation: string };
type QuizJson = { pass_score?: number; questions: QuizQ[] };

type LearnModuleRow = {
  id: string;
  track: string;
  level: number;
  ordinal: number | null;
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
  diagrams: any[] | null;
};

type SiblingRow = Pick<LearnModuleRow, "slug" | "title_en" | "ordinal">;

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

// Simple slugifier for section anchors
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50) || "section";
}

type Section = { id: string; title: string; body: string };

// Split markdown by '## ' H2 headings.
function splitSections(md: string): { intro: string; sections: Section[] } {
  if (!md) return { intro: "", sections: [] };
  const parts = md.split(/^##\s+/m);
  const intro = parts[0]?.trim() || "";
  const used = new Set<string>();
  const sections: Section[] = [];
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const lineEnd = block.indexOf("\n");
    const title = (lineEnd === -1 ? block : block.slice(0, lineEnd)).trim();
    const body = lineEnd === -1 ? "" : block.slice(lineEnd + 1);
    let id = slugify(title);
    let n = 1;
    while (used.has(id)) {
      n += 1;
      id = `${slugify(title)}-${n}`;
    }
    used.add(id);
    sections.push({ id, title, body });
  }
  return { intro, sections };
}

// Replace [[diagram:N]] markers with diagram placeholders.
// Returns array of segments: text or diagram-index.
function splitDiagramMarkers(md: string): Array<{ kind: "text"; value: string } | { kind: "diagram"; index: number }> {
  const out: Array<{ kind: "text"; value: string } | { kind: "diagram"; index: number }> = [];
  const re = /\[\[diagram:(\d+)\]\]/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    if (m.index > lastIdx) out.push({ kind: "text", value: md.slice(lastIdx, m.index) });
    out.push({ kind: "diagram", index: parseInt(m[1], 10) });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < md.length) out.push({ kind: "text", value: md.slice(lastIdx) });
  if (out.length === 0) out.push({ kind: "text", value: md });
  return out;
}

// MemoSection: react-markdown re-parses on every render; memoize by raw body.
function MemoSection({
  body,
  diagrams,
  usedDiagramIdx,
  legacyDiagrams,
}: {
  body: string;
  diagrams: Diagram[];
  usedDiagramIdx: Set<number>;
  legacyDiagrams: any[];
}) {
  const segments = useMemo(() => splitDiagramMarkers(body), [body]);
  // Segments alternate text/diagram. Each text segment is memoized via key=body.
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "diagram") {
          const d = diagrams[seg.index];
          if (!d) return null;
          usedDiagramIdx.add(seg.index);
          return <LessonDiagram key={`d-${i}`} diagram={d} />;
        }
        return (
          <StoaMarkdown
            key={`t-${i}`}
            source={seg.value}
            diagrams={legacyDiagrams as any}
          />
        );
      })}
    </>
  );
}

const OliveLeaf = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path
      d="M2 22 C 8 14, 14 10, 22 4 M 22 4 C 18 6, 14 9, 11 13 C 14 12, 17 11, 20 11"
      stroke="var(--stoa-accent)"
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

const OliveDivider = () => (
  <div
    aria-hidden="true"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      margin: "28px 0",
      color: "var(--stoa-rule)",
    }}
  >
    <div style={{ flex: 1, height: 1, background: "var(--stoa-rule)" }} />
    <OliveLeaf size={14} />
    <div style={{ flex: 1, height: 1, background: "var(--stoa-rule)" }} />
  </div>
);

export default function LearnModule() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mod, setMod] = useState<LearnModuleRow | null>(null);
  const [siblings, setSiblings] = useState<SiblingRow[]>([]);
  const [phase, setPhase] = useState<"lesson" | "quiz" | "result">("lesson");
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleBody, setRuleBody] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

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
        const m = (data as unknown as LearnModuleRow) || null;
        setMod(m);
        setLoading(false);
        if (m) {
          // Fetch sibling modules in same track + level for prev/next nav
          const { data: sib } = await supabase
            .from("learn_modules")
            .select("slug, title_en, ordinal")
            .eq("track", m.track)
            .eq("level", m.level)
            .eq("is_published", true)
            .order("ordinal", { ascending: true });
          if (!cancelled) setSiblings((sib as SiblingRow[]) || []);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (phase === "lesson" && user && mod) {
      supabase.from("learn_progress").upsert(
        { user_id: user.id, module_id: mod.id, mode: "lesson", status: "in_progress" },
        { onConflict: "user_id,module_id,mode" }
      );
    }
  }, [phase, user, mod]);

  // Memoized parse of content
  const parsed = useMemo(() => splitSections(mod?.content_md || ""), [mod?.content_md]);

  // Diagrams as typed array (best effort; renderer ignores unknown shapes)
  const typedDiagrams: Diagram[] = useMemo(() => {
    if (!Array.isArray(mod?.diagrams)) return [];
    return mod!.diagrams!
      .filter((d: any) => d && typeof d === "object" && typeof d.kind === "string")
      .map((d: any) => d as Diagram);
  }, [mod?.diagrams]);

  // Track which diagrams were inlined so we can append the rest at the end.
  const usedDiagramIdx = useMemo(() => new Set<number>(), [typedDiagrams, parsed]);

  // Section-spy on scroll
  useEffect(() => {
    if (!parsed.sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top));
        if (visible[0]) {
          setActiveSection((visible[0].target as HTMLElement).id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    parsed.sections.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [parsed.sections, phase]);

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
      if (passed) {
        const quizXp = await supabase.rpc("award_xp", {
          p_amount: 30,
          p_source: "quiz",
          p_ref_id: mod.id,
          p_ref_table: "learn_modules",
        });
        if (quizXp.error) console.error("[award_xp quiz]", quizXp.error);
        // Lesson XP fires here when quiz passes — single source of truth.
        const lessonXp = await supabase.rpc("award_xp", {
          p_amount: mod.xp_reward ?? 50,
          p_source: "lesson",
          p_ref_id: mod.id,
          p_ref_table: "learn_modules",
        });
        if (lessonXp.error) console.error("[award_xp lesson]", lessonXp.error);
        await supabase.from("learn_progress").upsert(
          {
            user_id: user.id,
            module_id: mod.id,
            mode: "lesson",
            status: "completed",
            score: pct,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module_id,mode" }
        );
      }
    }
    if (passed) {
      toast({ title: "Quiz passed", description: `+${mod.xp_reward ?? 50} XP` });
      setRuleTitle(`Rule from ${mod.title_en}`);
      setRuleBody(
        `Based on "${mod.title_en}" (${mod.title_gr}): ${mod.summary || ""}\n\nWhen this situation arises, I will: `
      );
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
      await supabase
        .from("learn_progress")
        .update({ playbook_rule_created: true })
        .eq("user_id", user.id)
        .eq("module_id", mod.id)
        .eq("mode", "quiz");
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

  // Find prev/next siblings
  const { prev, next } = useMemo(() => {
    if (!mod) return { prev: null as SiblingRow | null, next: null as SiblingRow | null };
    const idx = siblings.findIndex((s) => s.slug === mod.slug);
    return {
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
    };
  }, [siblings, mod]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <StoaShell palette="delphi" crumb={stoaCrumb}>
      {loading && (
        <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", padding: "20px 0" }}>
          LOADING · ΧΡΟΝΟΣ…
        </div>
      )}

      {!loading && !mod && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              color: "var(--stoa-muted)",
              marginBottom: 20,
            }}
          >
            This passage is not yet inscribed.
          </p>
          <button style={goldCta} className="stoa-display font-semibold" onClick={() => navigate("/learn")}>
            Back to Codex
          </button>
        </div>
      )}

      {!loading && mod && phase === "lesson" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 28,
          }}
          className="lesson-grid"
        >
          {/* Inject responsive grid via inline <style> so we don't need tailwind config */}
          <style>{`
            @media (min-width: 1024px) {
              .lesson-grid { grid-template-columns: 220px minmax(0, 1fr) !important; }
              .lesson-sidebar { position: sticky; top: 80px; align-self: start; max-height: calc(100vh - 100px); overflow-y: auto; }
            }
          `}</style>

          {/* LEFT: scroll sidebar */}
          {parsed.sections.length > 0 && (
            <aside
              className="lesson-sidebar"
              style={{
                paddingRight: 6,
                borderRight: "none",
              }}
            >
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", marginBottom: 10, letterSpacing: "0.16em" }}>
                SCROLL · ΚΕΦΑΛΑΙΑ
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {parsed.sections.map((s, i) => {
                  const active = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => scrollToSection(s.id)}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        padding: "6px 8px",
                        background: "transparent",
                        border: "none",
                        borderLeft: active ? "2px solid var(--stoa-accent)" : "2px solid transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                        fontFamily: "Georgia, serif",
                        fontSize: 13,
                        lineHeight: 1.4,
                        transition: "color 0.15s ease, border-color 0.15s ease",
                      }}
                    >
                      <span
                        className="stoa-greek"
                        style={{
                          color: "var(--stoa-accent)",
                          opacity: active ? 1 : 0.55,
                          fontSize: 12,
                          minWidth: 26,
                        }}
                      >
                        {greekNumeral(i + 1)}
                      </span>
                      <span
                        style={{
                          textDecoration: active ? "underline" : "none",
                          textDecorationColor: "var(--stoa-accent)",
                          textUnderlineOffset: 4,
                          textDecorationThickness: 1,
                          flex: 1,
                        }}
                      >
                        {s.title}
                      </span>
                      {active && <OliveLeaf size={11} />}
                    </button>
                  );
                })}
              </nav>
            </aside>
          )}

          {/* RIGHT: main content */}
          <article style={{ minWidth: 0, maxWidth: "68ch" }}>
            {/* Marble-banded metadata header */}
            <div
              style={{
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                borderTop: "3px solid var(--stoa-accent)",
                borderBottom: "3px solid var(--stoa-accent)",
                padding: "14px 18px",
                marginBottom: 22,
                borderRadius: 2,
              }}
            >
              <div
                className="stoa-kicker"
                style={{ color: "var(--stoa-muted)", letterSpacing: "0.18em", fontSize: 10 }}
              >
                {mod.track.toUpperCase()} · LEVEL {mod.level} · {mod.learn_minutes ?? 8}M · +{mod.xp_reward ?? 50} XP
              </div>
              <h1
                className="stoa-display"
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  color: "var(--stoa-ink)",
                  margin: "6px 0 4px",
                  lineHeight: 1.15,
                }}
              >
                {mod.title_en}
              </h1>
              <div
                className="stoa-greek"
                style={{ color: "var(--stoa-accent)", fontSize: 17, fontStyle: "italic" }}
              >
                {mod.title_gr}
              </div>
            </div>

            {/* Lesson body — line-height 1.75 inherited via section style */}
            <div style={{ lineHeight: 1.75 }}>
              {parsed.intro && (
                <MemoSection
                  body={parsed.intro}
                  diagrams={typedDiagrams}
                  usedDiagramIdx={usedDiagramIdx}
                  legacyDiagrams={(mod.diagrams as any[]) || []}
                />
              )}

              {parsed.sections.map((s, i) => (
                <section
                  key={s.id}
                  id={s.id}
                  ref={(el) => {
                    sectionRefs.current[s.id] = el;
                  }}
                  style={{ scrollMarginTop: 80 }}
                >
                  {i > 0 && <OliveDivider />}
                  <h2
                    className="stoa-display"
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--stoa-ink)",
                      marginTop: i === 0 ? 12 : 8,
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                    }}
                  >
                    <span
                      className="stoa-greek"
                      style={{ color: "var(--stoa-accent)", fontSize: 18, opacity: 0.8 }}
                    >
                      {greekNumeral(i + 1)}
                    </span>
                    <span>{s.title}</span>
                  </h2>
                  <MemoSection
                    body={s.body}
                    diagrams={typedDiagrams}
                    usedDiagramIdx={usedDiagramIdx}
                    legacyDiagrams={(mod.diagrams as any[]) || []}
                  />
                </section>
              ))}

              {parsed.sections.length === 0 && parsed.intro === "" && mod.content_md && (
                /* Fallback: no H2s detected, render whole content_md */
                <MemoSection
                  body={mod.content_md}
                  diagrams={typedDiagrams}
                  usedDiagramIdx={usedDiagramIdx}
                  legacyDiagrams={(mod.diagrams as any[]) || []}
                />
              )}

              {/* Append diagrams that weren't inlined */}
              {typedDiagrams.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  {typedDiagrams.map((d, i) =>
                    usedDiagramIdx.has(i) ? null : <LessonDiagram key={`tail-${i}`} diagram={d} />
                  )}
                </div>
              )}
            </div>

            {/* Prev / Next sibling nav */}
            {(prev || next) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginTop: 36,
                  paddingTop: 18,
                  borderTop: "1px solid var(--stoa-rule)",
                }}
              >
                {prev ? (
                  <button
                    onClick={() => navigate(`/learn/${prev.slug}`)}
                    style={{
                      ...creamCta,
                      textAlign: "left",
                      flex: "1 1 0",
                      maxWidth: 240,
                    }}
                  >
                    <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 9 }}>
                      ← PREVIOUS
                    </div>
                    <div
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: 13,
                        color: "var(--stoa-ink)",
                        marginTop: 2,
                      }}
                    >
                      {prev.title_en}
                    </div>
                  </button>
                ) : (
                  <span />
                )}
                {next ? (
                  <button
                    onClick={() => navigate(`/learn/${next.slug}`)}
                    style={{
                      ...creamCta,
                      textAlign: "right",
                      flex: "1 1 0",
                      maxWidth: 240,
                    }}
                  >
                    <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 9 }}>
                      NEXT →
                    </div>
                    <div
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: 13,
                        color: "var(--stoa-ink)",
                        marginTop: 2,
                      }}
                    >
                      {next.title_en}
                    </div>
                  </button>
                ) : (
                  <span />
                )}
              </div>
            )}

            {/* Action row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 24,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                className="stoa-kicker"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--stoa-muted)",
                  cursor: "pointer",
                  padding: "10px 0",
                }}
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
                  onClick={() => {
                    setPhase("quiz");
                    setQIdx(0);
                    setAnswers([]);
                  }}
                >
                  Begin Quiz →
                </button>
              </div>
            </div>
          </article>
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
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              color: "var(--stoa-muted)",
              marginTop: 8,
            }}
          >
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
                onClick={() => {
                  setPhase("lesson");
                  setScore(null);
                }}
              >
                Re-read Lesson
              </button>
            )}
          </div>
        </div>
      )}

      {showRuleModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(26,20,12,0.55)",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--stoa-shine)",
              border: "1px solid var(--stoa-rule)",
              borderRadius: 2,
              padding: 24,
              maxWidth: 520,
              width: "100%",
            }}
          >
            <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
              CLOSE THE LOOP · ΚΥΚΛΟΣ
            </div>
            <h2 className="stoa-display text-2xl font-semibold" style={{ color: "var(--stoa-ink)", marginTop: 4 }}>
              Add a rule to your Playbook?
            </h2>
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                color: "var(--stoa-muted)",
                marginTop: 8,
              }}
            >
              Turn this lesson into a rule your future trades will be checked against.
            </p>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Title</span>
                <input
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  style={{
                    background: "var(--stoa-shine)",
                    border: "1px solid var(--stoa-rule)",
                    padding: "6px 10px",
                    fontFamily: "Georgia, serif",
                    fontSize: 15,
                    color: "var(--stoa-ink)",
                    borderRadius: 2,
                    width: "100%",
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Rule</span>
                <textarea
                  rows={4}
                  value={ruleBody}
                  onChange={(e) => setRuleBody(e.target.value)}
                  style={{
                    background: "var(--stoa-shine)",
                    border: "1px solid var(--stoa-rule)",
                    padding: "6px 10px",
                    fontFamily: "Georgia, serif",
                    fontSize: 15,
                    color: "var(--stoa-ink)",
                    borderRadius: 2,
                    width: "100%",
                    resize: "vertical",
                  }}
                />
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
