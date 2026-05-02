import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Plus, Send, Sparkles, Pin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";

type Session = { id: string; title: string; pinned: boolean; last_message_at: string };
type Msg = { id?: string; role: "user" | "assistant"; content: string };

const SUGGESTED = [
  "Why do I lose more on certain days?",
  "Which of my rules do I break most?",
  "What pattern shows up in my best trades?",
  "Am I overtrading this week?",
  "What should I focus on tomorrow?",
];

export default function Oracle() {
  const { user, session: authSession } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load session list
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("oracle_sessions")
        .select("id,title,pinned,last_message_at")
        .eq("user_id", user.id)
        .order("pinned", { ascending: false })
        .order("last_message_at", { ascending: false });
      setSessions(data || []);
      if (data && data.length && !activeId) setActiveId(data[0].id);
    })();
  }, [user]);

  // Load messages for active session
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("oracle_messages")
        .select("id,role,content")
        .eq("session_id", activeId)
        .order("created_at");
      setMessages((data || []).map(m => ({ id: m.id, role: m.role as any, content: m.content })));
    })();
  }, [activeId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function newSession() {
    if (!user) return;
    const { data, error } = await supabase
      .from("oracle_sessions")
      .insert({ user_id: user.id, title: "New consultation" })
      .select("id,title,pinned,last_message_at")
      .single();
    if (error || !data) return;
    setSessions(s => [data, ...s]);
    setActiveId(data.id);
    setMessages([]);
  }

  async function deleteSession(id: string) {
    await supabase.from("oracle_sessions").delete().eq("id", id);
    setSessions(s => s.filter(x => x.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function togglePin(s: Session) {
    await supabase.from("oracle_sessions").update({ pinned: !s.pinned }).eq("id", s.id);
    setSessions(prev => prev.map(x => x.id === s.id ? { ...x, pinned: !x.pinned } : x));
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming || !user) return;

    let sessionId = activeId;
    if (!sessionId) {
      const { data } = await supabase
        .from("oracle_sessions")
        .insert({ user_id: user.id, title: content.slice(0, 60) })
        .select("id,title,pinned,last_message_at")
        .single();
      if (!data) return;
      sessionId = data.id;
      setSessions(s => [data, ...s]);
      setActiveId(data.id);
    } else {
      // Update title if first message
      if (messages.length === 0) {
        await supabase.from("oracle_sessions").update({ title: content.slice(0, 60) }).eq("id", sessionId);
        setSessions(prev => prev.map(x => x.id === sessionId ? { ...x, title: content.slice(0, 60) } : x));
      }
    }

    setInput("");
    setError(null);
    setMessages(m => [...m, { role: "user", content }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oracle`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ sessionId, message: content }),
      });

      if (!resp.ok || !resp.body) {
        let msg = "The Oracle is silent.";
        try { const j = await resp.json(); if (j.error) msg = j.error; } catch {}
        if (resp.status === 429) msg = "Too many questions too quickly. Wait a moment.";
        if (resp.status === 402) msg = "AI credits exhausted. Top up to continue.";
        setError(msg);
        setMessages(m => m.slice(0, -1));
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const j = JSON.parse(data);
            const c = j.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages(m => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e: any) {
      setError(e.message || "Network error");
      setMessages(m => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <StoaShell palette="delphi">
      <PedimentCap kicker="ΜΑΝΤΕῖΟΝ · MANTEION" title="The Oracle" subtitle="A council of one. It has read thy trades, thy reflections, thy rules." />

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, marginTop: 22, minHeight: 560 }} className="oracle-grid">
        {/* Sessions sidebar */}
        <aside style={{ borderRight: "1px solid var(--stoa-rule)", paddingRight: 16 }} className="oracle-sidebar">
          <button
            onClick={newSession}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px 12px", border: "1px solid var(--stoa-accent)", background: "transparent",
              color: "var(--stoa-accent)", cursor: "pointer", marginBottom: 16, borderRadius: 2,
              fontFamily: "inherit", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
            }}
          >
            <Plus size={14} /> New consultation
          </button>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 480, overflowY: "auto" }}>
            {sessions.length === 0 && (
              <p style={{ color: "var(--stoa-muted)", fontSize: 13, fontStyle: "italic", padding: "8px 4px" }}>
                No consultations yet. Speak, and the Oracle answers.
              </p>
            )}
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveId(s.id)}
                style={{
                  padding: "10px 12px", cursor: "pointer", borderRadius: 2,
                  background: s.id === activeId ? "var(--stoa-shine)" : "transparent",
                  borderLeft: s.id === activeId ? "2px solid var(--stoa-accent)" : "2px solid transparent",
                  display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--stoa-ink)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title}
                  </div>
                  <div style={{ color: "var(--stoa-muted)", fontSize: 10, marginTop: 2, fontFamily: "var(--stoa-font-mono)" }}>
                    {new Date(s.last_message_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, opacity: 0.6 }}>
                  <button onClick={(e) => { e.stopPropagation(); togglePin(s); }} title="Pin"
                    style={{ background: "none", border: "none", cursor: "pointer", color: s.pinned ? "var(--stoa-accent)" : "var(--stoa-muted)", padding: 2 }}>
                    <Pin size={12} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this consultation?")) deleteSession(s.id); }} title="Delete"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--stoa-muted)", padding: 2 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Conversation pane */}
        <section style={{ display: "flex", flexDirection: "column", minHeight: 560 }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingRight: 8, maxHeight: 520 }}>
            {messages.length === 0 && (
              <div style={{ padding: "32px 0" }}>
                <p style={{ color: "var(--stoa-muted)", fontStyle: "italic", marginBottom: 20, fontFamily: "Georgia, serif" }}>
                  Ask anything. The Oracle has read thy entire dossier — trades, reflections, rules, lessons.
                </p>
                <div style={{ display: "grid", gap: 8 }}>
                  {SUGGESTED.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      style={{
                        textAlign: "left", padding: "12px 14px", border: "1px solid var(--stoa-rule)",
                        background: "transparent", color: "var(--stoa-ink)", cursor: "pointer",
                        fontFamily: "Georgia, serif", fontSize: 14, borderRadius: 2,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--stoa-accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--stoa-rule)")}
                    >
                      <Sparkles size={12} style={{ display: "inline", marginRight: 8, color: "var(--stoa-accent)" }} />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div className="stoa-kicker" style={{ marginBottom: 6, color: m.role === "user" ? "var(--stoa-muted)" : "var(--stoa-accent)" }}>
                  {m.role === "user" ? "THOU" : "ΜΑΝΤΕῖΟΝ"}
                </div>
                {m.role === "user" ? (
                  <p style={{ color: "var(--stoa-ink)", margin: 0, fontFamily: "Georgia, serif", fontSize: 15 }}>{m.content}</p>
                ) : (
                  <div className="oracle-prose" style={{ color: "var(--stoa-ink)", fontSize: 14, lineHeight: 1.7 }}>
                    {m.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    ) : (
                      <span style={{ color: "var(--stoa-muted)", fontStyle: "italic" }}>The Oracle considers…</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div style={{ color: "#c44", fontSize: 13, padding: 10, border: "1px solid rgba(200,60,60,0.3)", borderRadius: 2 }}>
                {error}
              </div>
            )}
          </div>

          {/* Composer */}
          <div style={{ borderTop: "1px solid var(--stoa-rule)", paddingTop: 14, marginTop: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Speak thy question…"
                rows={2}
                disabled={streaming}
                style={{
                  flex: 1, resize: "none", background: "var(--stoa-shine)", color: "var(--stoa-ink)",
                  border: "1px solid var(--stoa-rule)", padding: "10px 12px", fontFamily: "Georgia, serif",
                  fontSize: 14, borderRadius: 2, outline: "none",
                }}
              />
              <button
                onClick={() => send()}
                disabled={streaming || !input.trim()}
                style={{
                  padding: "0 18px", background: "var(--stoa-accent)", color: "#1a1208", border: "none",
                  cursor: streaming || !input.trim() ? "not-allowed" : "pointer", borderRadius: 2,
                  opacity: streaming || !input.trim() ? 0.5 : 1, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <Send size={14} />
              </button>
            </div>
            <p style={{ color: "var(--stoa-muted)", fontSize: 11, marginTop: 6, fontStyle: "italic" }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </section>
      </div>

      <style>{`
        .oracle-prose p { margin: 0 0 10px 0; }
        .oracle-prose h1, .oracle-prose h2, .oracle-prose h3 {
          font-family: var(--stoa-font-display); color: var(--stoa-ink); margin: 14px 0 8px;
        }
        .oracle-prose h2 { font-size: 18px; }
        .oracle-prose h3 { font-size: 15px; color: var(--stoa-accent); letter-spacing: 0.02em; }
        .oracle-prose ul, .oracle-prose ol { padding-left: 20px; margin: 6px 0 12px; }
        .oracle-prose li { margin-bottom: 4px; }
        .oracle-prose code {
          background: var(--stoa-shine); padding: 2px 6px; border-radius: 2px;
          font-family: var(--stoa-font-mono); font-size: 12px; color: var(--stoa-accent);
        }
        .oracle-prose strong { color: var(--stoa-accent); font-weight: 600; }
        .oracle-prose blockquote {
          border-left: 2px solid var(--stoa-accent); padding-left: 12px; margin: 10px 0;
          color: var(--stoa-muted); font-style: italic;
        }
        .oracle-prose table { border-collapse: collapse; margin: 10px 0; width: 100%; font-size: 13px; }
        .oracle-prose th, .oracle-prose td { border: 1px solid var(--stoa-rule); padding: 6px 10px; text-align: left; }
        .oracle-prose th { background: var(--stoa-shine); color: var(--stoa-accent); font-weight: 600; }
        @media (max-width: 768px) {
          .oracle-grid { grid-template-columns: 1fr !important; }
          .oracle-sidebar { border-right: none !important; border-bottom: 1px solid var(--stoa-rule); padding-right: 0 !important; padding-bottom: 16px; }
        }
      `}</style>
    </StoaShell>
  );
}
