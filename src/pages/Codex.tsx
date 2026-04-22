import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaLayout from "@/layouts/StoaLayout";
import CompressedMasthead from "@/components/stoa/CompressedMasthead";
import Meander from "@/components/stoa/Meander";

interface Lesson {
  id: string;
  chapter_kicker: string;
  greek_label: string | null;
  folio_number: number;
  title: string;
  teaser: string;
  body_markdown: string;
  read_minutes: number;
  marginalia_quote: string | null;
  marginalia_author: string | null;
}

interface Progress {
  lesson_id: string;
  started_at: string | null;
  completed_at: string | null;
  scroll_pct: number;
}

const toRoman = (n: number) => {
  const map: [number, string][] = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"],
    [100, "c"], [90, "xc"], [50, "l"], [40, "xl"],
    [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let r = "";
  for (const [v, s] of map) {
    while (n >= v) {
      r += s;
      n -= v;
    }
  }
  return r;
};

const Codex = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [lr, pr] = await Promise.all([
        supabase.from("codex_lessons").select("*").order("folio_number", { ascending: true }),
        supabase.from("codex_lesson_progress").select("*").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setLessons((lr.data ?? []) as Lesson[]);
      setProgress((pr.data ?? []) as Progress[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const open = useMemo(() => lessons.find((l) => l.id === openId) ?? null, [lessons, openId]);
  const openIdx = open ? lessons.findIndex((l) => l.id === open.id) : -1;
  const prevLesson = openIdx > 0 ? lessons[openIdx - 1] : null;
  const nextLesson = openIdx >= 0 && openIdx < lessons.length - 1 ? lessons[openIdx + 1] : null;

  const progressFor = (id: string) => progress.find((p) => p.lesson_id === id);

  const markStarted = async (lessonId: string) => {
    if (!user) return;
    const existing = progressFor(lessonId);
    if (existing) return;
    const { data } = await supabase
      .from("codex_lesson_progress")
      .insert({ user_id: user.id, lesson_id: lessonId })
      .select()
      .single();
    if (data) setProgress((p) => [...p, data as Progress]);
  };

  const markRead = async (lessonId: string) => {
    if (!user) return;
    const existing = progressFor(lessonId);
    if (existing?.completed_at) return;
    if (existing) {
      await supabase
        .from("codex_lesson_progress")
        .update({ completed_at: new Date().toISOString(), scroll_pct: 100 })
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);
    } else {
      await supabase
        .from("codex_lesson_progress")
        .insert({ user_id: user.id, lesson_id: lessonId, completed_at: new Date().toISOString(), scroll_pct: 100 });
    }
    setProgress((p) => {
      const without = p.filter((x) => x.lesson_id !== lessonId);
      return [...without, { lesson_id: lessonId, started_at: existing?.started_at ?? new Date().toISOString(), completed_at: new Date().toISOString(), scroll_pct: 100 }];
    });
  };

  // Split body roughly in half on a paragraph boundary for two-page spread
  const splitBody = (md: string): [string, string] => {
    const paras = md.split(/\n\n+/);
    const mid = Math.ceil(paras.length / 2);
    return [paras.slice(0, mid).join("\n\n"), paras.slice(mid).join("\n\n")];
  };

  return (
    <StoaLayout pompeii>
      <div className="p-pompeii" style={{ background: "var(--bg)", minHeight: "calc(100vh - 56px)", color: "var(--ink)" }}>
        <CompressedMasthead />

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px 96px" }}>
          {!open && (
            <>
              <div style={{ marginBottom: 40 }}>
                <div className="kicker">ΚΩΔΙΞ · THE CODEX · Reading-room</div>
              </div>

              {loading ? (
                <div style={{ color: "var(--muted)", fontStyle: "italic" }}>Opening the codex…</div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 24,
                  }}
                >
                  {lessons.map((l) => {
                    const p = progressFor(l.id);
                    const status = p?.completed_at ? "complete" : p?.started_at ? "started" : "empty";
                    return (
                      <article
                        key={l.id}
                        onClick={() => {
                          setOpenId(l.id);
                          markStarted(l.id);
                        }}
                        tabIndex={0}
                        style={{
                          position: "relative",
                          padding: "22px 22px 18px",
                          border: "1px solid var(--rule)",
                          background: "transparent",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, border-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--rule)";
                          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                        }}
                      >
                        <div
                          className="display"
                          style={{ position: "absolute", top: 14, right: 18, fontStyle: "italic", color: "var(--muted)", fontSize: 14 }}
                        >
                          {toRoman(l.folio_number)}
                        </div>
                        <div className="kicker">
                          {l.chapter_kicker} {l.greek_label && <span className="greek" style={{ marginLeft: 6, textTransform: "none" }}>· {l.greek_label}</span>}
                        </div>
                        <h2 className="display" style={{ fontSize: 28, lineHeight: 1.15, margin: "8px 0 10px", color: "var(--ink)" }}>
                          {l.title}
                        </h2>
                        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5, margin: 0, minHeight: 42 }}>{l.teaser}</p>
                        <div
                          style={{
                            marginTop: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          <span className="mono">{l.read_minutes} min</span>
                          <span
                            style={{
                              padding: "3px 10px",
                              border: `1px solid ${status === "complete" ? "var(--accent)" : "var(--rule)"}`,
                              color: status === "complete" ? "var(--accent)" : "var(--muted)",
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              fontSize: 10,
                            }}
                          >
                            {status === "complete" ? "Read" : status === "started" ? "In progress" : "Unread"}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {open && <SpreadView lesson={open} prev={prevLesson} next={nextLesson} onClose={() => setOpenId(null)} onPrev={(p) => setOpenId(p.id)} onNext={(n) => setOpenId(n.id)} onMarkRead={markRead} isRead={!!progressFor(open.id)?.completed_at} splitBody={splitBody} />}
        </div>
      </div>
    </StoaLayout>
  );
};

interface SpreadProps {
  lesson: Lesson;
  prev: Lesson | null;
  next: Lesson | null;
  onClose: () => void;
  onPrev: (l: Lesson) => void;
  onNext: (l: Lesson) => void;
  onMarkRead: (id: string) => void;
  isRead: boolean;
  splitBody: (md: string) => [string, string];
}

const SpreadView = ({ lesson, prev, next, onClose, onPrev, onNext, onMarkRead, isRead, splitBody }: SpreadProps) => {
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100;
      setScrollPct(Math.min(100, Math.max(0, pct)));
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [lesson.id]);

  const [left, right] = splitBody(lesson.body_markdown || "");

  return (
    <article>
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Codex · {lesson.chapter_kicker} · Folio {toRoman(lesson.folio_number)}
        </button>
        <button
          onClick={() => onMarkRead(lesson.id)}
          disabled={isRead}
          style={{
            background: "transparent",
            border: "1px solid var(--rule)",
            color: isRead ? "var(--muted)" : "var(--ink)",
            padding: "6px 14px",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: isRead ? "default" : "pointer",
          }}
        >
          {isRead ? "Read" : "Mark as read"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
          position: "relative",
        }}
      >
        <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: "calc(50% - 0.5px)", width: 1, background: "var(--rule)" }} />

        {/* Left page */}
        <Page side="left" lesson={lesson} body={left} />

        {/* Right page */}
        <Page side="right" lesson={lesson} body={right} marginalia />
      </div>

      {/* Progress rule */}
      <div style={{ marginTop: 56, height: 1, background: "var(--rule)", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: 1, background: "var(--accent)", width: `${scrollPct}%` }} />
      </div>

      {/* Prev/Next */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, fontStyle: "italic" }} className="display">
        <button
          onClick={() => prev && onPrev(prev)}
          disabled={!prev}
          style={{ background: "transparent", border: "none", color: prev ? "var(--ink)" : "var(--muted)", cursor: prev ? "pointer" : "default", fontStyle: "italic", fontSize: 16 }}
        >
          {prev ? `— Previous folio · ${prev.title}` : ""}
        </button>
        <button
          onClick={() => next && onNext(next)}
          disabled={!next}
          style={{ background: "transparent", border: "none", color: next ? "var(--ink)" : "var(--muted)", cursor: next ? "pointer" : "default", fontStyle: "italic", fontSize: 16 }}
        >
          {next ? `Next folio · ${next.title} —` : ""}
        </button>
      </div>
    </article>
  );
};

const Page = ({ side, lesson, body, marginalia = false }: { side: "left" | "right"; lesson: Lesson; body: string; marginalia?: boolean }) => {
  const paras = body.split(/\n\n+/).filter(Boolean);
  return (
    <div style={{ paddingTop: 40, position: "relative" }}>
      {side === "left" && (
        <>
          <div className="kicker">FOLIO {toRoman(lesson.folio_number)} · {lesson.title}</div>
          <div style={{ width: 120, marginTop: 8, marginBottom: 24 }}>
            <Meander opacity={0.5} />
          </div>
        </>
      )}

      {marginalia && lesson.marginalia_quote && (
        <aside
          style={{
            float: "right",
            width: 200,
            marginLeft: 16,
            marginBottom: 12,
            paddingLeft: 16,
            borderLeft: "1px solid var(--gold-rule)",
            color: "var(--ink)",
          }}
        >
          <p className="display" style={{ fontStyle: "italic", fontSize: 16, margin: 0, lineHeight: 1.45 }}>
            "{lesson.marginalia_quote}"
          </p>
          {lesson.marginalia_author && (
            <div className="kicker" style={{ marginTop: 8, fontSize: 10 }}>
              — {lesson.marginalia_author}
            </div>
          )}
        </aside>
      )}

      {paras.map((p, i) => (
        <p
          key={i}
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            textAlign: "justify",
            margin: i === 0 && side === "left" ? "0 0 16px" : "0 0 14px",
          }}
        >
          {i === 0 && side === "left" ? (
            <>
              <span
                className="display"
                style={{
                  float: "left",
                  fontSize: "3em",
                  lineHeight: 0.85,
                  color: "var(--signal)",
                  marginRight: 6,
                  marginTop: 4,
                }}
              >
                {p.charAt(0)}
              </span>
              {p.slice(1)}
            </>
          ) : (
            p
          )}
        </p>
      ))}

      <div className="display" style={{ textAlign: "center", marginTop: 32, fontStyle: "italic", color: "var(--muted)", fontSize: 14 }}>
        {toRoman(lesson.folio_number * 2 - (side === "left" ? 1 : 0))}
      </div>
    </div>
  );
};

export default Codex;
