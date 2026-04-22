import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaLayout from "@/layouts/StoaLayout";
import Meander from "@/components/stoa/Meander";

interface OracleMessage {
  id: string;
  role: "user" | "oracle";
  content: string;
  created_at: string;
}

const PILLS = [
  { id: "trades", label: "Include today's trades" },
  { id: "journal", label: "Include last 7d journal" },
  { id: "rules", label: "Include rules" },
];

const Sanctuary = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OracleMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pills, setPills] = useState<Record<string, boolean>>({ trades: true, journal: true, rules: true });
  const [showContext, setShowContext] = useState(false);
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("oracle_sessions" as never)
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setSessionId((data as { id: string }).id);
        const msg = await supabase
          .from("oracle_messages" as never)
          .select("*")
          .eq("session_id", (data as { id: string }).id)
          .order("created_at", { ascending: true });
        setMessages((msg.data ?? []) as OracleMessage[]);
      }
    })();
  }, [user]);

  const send = async () => {
    if (!user || !draft.trim() || thinking) return;
    const text = draft.trim();
    setDraft("");
    setThinking(true);

    let sid = sessionId;
    if (!sid) {
      const { data } = await supabase
        .from("oracle_sessions" as never)
        .insert({ user_id: user.id, title: text.slice(0, 40) })
        .select("id")
        .single();
      sid = (data as { id: string } | null)?.id ?? null;
      setSessionId(sid);
    }
    if (!sid) {
      setThinking(false);
      return;
    }

    // Store user message
    const { data: ins } = await supabase
      .from("oracle_messages" as never)
      .insert({ session_id: sid, user_id: user.id, role: "user", content: text, context_json: pills })
      .select()
      .single();
    if (ins) setMessages((m) => [...m, ins as OracleMessage]);

    // Stub oracle response — drawing on context pills
    setTimeout(async () => {
      const ctxBits = [
        pills.trades ? "your day's tape" : null,
        pills.journal ? "your last 7 entries" : null,
        pills.rules ? "your rulebook" : null,
      ].filter(Boolean);
      const reply = `Read with ${ctxBits.join(", ") || "no context"} in mind: ${text} — pause first. The market does not reward hurry. Marcus says: "If it is not right, do not do it; if it is not true, do not say it." Apply both before sizing.`;
      const { data: oins } = await supabase
        .from("oracle_messages" as never)
        .insert({ session_id: sid, user_id: user.id, role: "oracle", content: reply })
        .select()
        .single();
      if (oins) setMessages((m) => [...m, oins as OracleMessage]);
      setThinking(false);
    }, 800);
  };

  const isEmpty = messages.length === 0;

  return (
    <StoaLayout>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes oraclePulse { 0%,100% { opacity: 0.4 } 50% { opacity: 1 } }
          .oracle-dot { animation: oraclePulse 1.8s ease-in-out infinite; }
        }
      `}</style>
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          background: "radial-gradient(ellipse 800px 600px at 50% -100px, rgba(212,169,74,0.05) 0%, transparent 70%), var(--bg)",
          position: "relative",
        }}
      >
        {isEmpty ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", minHeight: "calc(100vh - 56px)" }}>
            <div className="oracle-dot" aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
            <div className="display" style={{ fontStyle: "italic", fontSize: 26, color: "var(--ink)", marginTop: 56, textAlign: "center" }}>
              Ask what is worth asking.
            </div>
            <div className="kicker" style={{ marginTop: 16 }}>ΠΥΘΙΑ · THE ORACLE</div>

            <div style={{ marginTop: 96, width: "100%", maxWidth: 680 }}>
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={3}
                placeholder="What should I do about this trade?"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid var(--rule)",
                  color: "var(--ink)",
                  padding: 20,
                  fontFamily: "'IBM Plex Serif', Georgia, serif",
                  fontSize: 17,
                  lineHeight: 1.5,
                  outline: "none",
                  resize: "vertical",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold-rule)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {PILLS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPills((s) => ({ ...s, [p.id]: !s[p.id] }))}
                    style={{
                      background: pills[p.id] ? "rgba(212,169,74,0.06)" : "transparent",
                      border: `1px solid ${pills[p.id] ? "var(--gold-rule)" : "var(--rule)"}`,
                      color: pills[p.id] ? "var(--accent)" : "var(--muted)",
                      padding: "5px 12px",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={send}
                  disabled={!draft.trim() || thinking}
                  className="display"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--gold-rule)",
                    color: "var(--accent)",
                    padding: "10px 24px",
                    fontStyle: "italic",
                    fontSize: 16,
                    cursor: draft.trim() && !thinking ? "pointer" : "default",
                    opacity: draft.trim() && !thinking ? 1 : 0.5,
                  }}
                >
                  Ask · Ἐρώτα
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 200px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div className="kicker">ΠΥΘΙΑ · THE ORACLE</div>
                <button onClick={() => setShowContext((v) => !v)} style={{ background: "transparent", border: "1px solid var(--rule)", color: "var(--muted)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 12px", cursor: "pointer" }}>
                  {showContext ? "Hide context ▴" : "Show context ▾"}
                </button>
              </div>
              {messages.map((m, i) => (
                <div key={m.id}>
                  {i > 0 && (
                    <div style={{ height: 16, opacity: 0.2, margin: "16px 0" }}>
                      <Meander opacity={0.2} />
                    </div>
                  )}
                  {m.role === "user" ? (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ borderRight: "2px solid var(--accent)", paddingRight: 16, color: "var(--ink)", maxWidth: 520, fontSize: 16 }}>
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="display" style={{ fontStyle: "italic", fontSize: 18, color: "var(--ink)", lineHeight: 1.6 }}>
                      <span style={{ color: "var(--accent)", marginRight: 8, fontStyle: "normal" }}>Σ</span>
                      {m.content}
                    </div>
                  )}
                </div>
              ))}
              {thinking && (
                <div style={{ marginTop: 24, color: "var(--muted)", fontStyle: "italic" }}>
                  <span className="oracle-dot" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginRight: 8 }} />
                  The oracle considers…
                </div>
              )}
            </div>

            {/* Sticky composer */}
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, var(--bg) 60%, transparent)", padding: "32px 24px", display: "flex", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ maxWidth: 680, width: "100%", pointerEvents: "auto" }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={2}
                  placeholder="Ask again…"
                  style={{
                    width: "100%",
                    background: "var(--bg)",
                    border: "1px solid var(--rule)",
                    color: "var(--ink)",
                    padding: 16,
                    fontFamily: "'IBM Plex Serif', Georgia, serif",
                    fontSize: 15,
                    outline: "none",
                    resize: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold-rule)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
                />
              </div>
            </div>
          </>
        )}

        {showContext && (
          <aside style={{ position: "fixed", top: 56, right: 0, bottom: 0, width: 320, background: "var(--bg)", borderLeft: "1px solid var(--rule)", padding: 24, overflowY: "auto" }}>
            <div className="kicker" style={{ marginBottom: 16 }}>CONTEXT FED</div>
            <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
              <p>Today's P&L · pulled from Hermes ledger.</p>
              <p>Last 7 days journal · pulled from Scroll.</p>
              <p>Active rules · pulled from Ergon.</p>
            </div>
          </aside>
        )}
      </div>
    </StoaLayout>
  );
};

export default Sanctuary;
