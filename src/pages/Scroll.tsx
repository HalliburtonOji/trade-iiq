import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import StoaLayout from "@/layouts/StoaLayout";
import CompressedMasthead from "@/components/stoa/CompressedMasthead";

interface Reflection {
  numeral: string;
  body: string;
}

interface JournalEntry {
  id: string;
  entry_date: string;
  morning_prep: string;
  setups: string;
  what_happened: string;
  lessons: string;
  closing_note: string;
  reflections: Reflection[];
}

interface Trade {
  symbol: string;
  side: "long" | "short";
  entry_price: number | null;
  exit_price: number | null;
  pnl_usd: number | null;
  note: string | null;
  opened_at: string;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const PLACEHOLDERS: Record<string, string> = {
  morning_prep: "What are you watching? Where is your edge today?",
  setups: "Trades will appear here as you log them in the Temple.",
  what_happened: "How did the session unfold?",
  lessons: "— first lesson\n— second lesson",
  closing_note: "One sentence to close the day.",
};

const TITLES: Record<string, string> = {
  morning_prep: "MORNING PREP",
  setups: "SETUPS ENTERED",
  what_happened: "WHAT HAPPENED",
  lessons: "LESSONS",
  closing_note: "CLOSING NOTE",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatHeaderDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

const Scroll = () => {
  const { user } = useAuth();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load + seed
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const date = todayIso();

      const [entryRes, tradesRes] = await Promise.all([
        supabase
          .from("journal_entries" as never)
          .select("*")
          .eq("user_id", user.id)
          .eq("entry_date", date)
          .maybeSingle(),
        supabase
          .from("trades")
          .select("symbol, side, entry_price, exit_price, pnl_usd, note, opened_at")
          .eq("user_id", user.id)
          .gte("opened_at", `${date}T00:00:00Z`)
          .order("opened_at", { ascending: true }),
      ]);

      if (cancelled) return;

      let ent = (entryRes.data as JournalEntry | null) ?? null;
      if (!ent) {
        const seed = {
          user_id: user.id,
          entry_date: date,
          morning_prep:
            "Watching MSFT for a continuation through 422. SPY broad-tape weak; will skip if breadth fails. No trade before 9:45.",
          setups: "",
          what_happened:
            "MSFT held VWAP through the open. Took the entry at 422.40, target hit at 425.10. Trim half, trail rest.",
          lessons: "— Patience past 9:45 paid.\n— Did not chase NVDA gap fill — correct.",
          closing_note: "Quiet discipline beats loud conviction.",
          reflections: [],
        };
        const ins = await supabase
          .from("journal_entries" as never)
          .insert(seed)
          .select()
          .single();
        if (!ins.error) ent = ins.data as JournalEntry;
      }
      setEntry(ent);
      setTrades((tradesRes.data ?? []) as Trade[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setupsAuto = useMemo(() => {
    if (!trades.length) return "";
    return trades
      .map((t) => {
        const head = `${t.symbol} · ${t.side.toUpperCase()} · ${t.entry_price ?? "—"}`;
        const tail =
          t.exit_price != null && t.pnl_usd != null
            ? ` → exit ${t.exit_price} · ${t.pnl_usd >= 0 ? "+" : "−"}$${Math.abs(t.pnl_usd).toFixed(2)}`
            : "";
        return `${head}${tail}${t.note ? ` — ${t.note}` : ""}`;
      })
      .join("\n");
  }, [trades]);

  const beginEdit = (key: keyof JournalEntry) => {
    if (readOnly || !entry) return;
    if (key === "setups" && setupsAuto) return; // setups auto-rendered
    setEditingKey(key as string);
    setDraft((entry[key] as string) ?? "");
    setTimeout(() => textareaRef.current?.focus(), 30);
  };

  const saveEdit = async () => {
    if (!entry || !editingKey || !user) return;
    const next = { ...entry, [editingKey]: draft } as JournalEntry;
    setEntry(next);
    setEditingKey(null);
    const { error } = await supabase
      .from("journal_entries" as never)
      .update({ [editingKey]: draft })
      .eq("id", entry.id);
    if (error) toast.error("Could not save", { description: error.message });
  };

  const addReflection = async () => {
    if (!entry || !user) return;
    const next = [
      ...(entry.reflections ?? []),
      { numeral: ROMAN[5 + (entry.reflections?.length ?? 0)] ?? "?", body: "" },
    ];
    setEntry({ ...entry, reflections: next });
    await supabase
      .from("journal_entries" as never)
      .update({ reflections: next })
      .eq("id", entry.id);
  };

  const updateReflection = async (idx: number, body: string) => {
    if (!entry) return;
    const next = entry.reflections.map((r, i) => (i === idx ? { ...r, body } : r));
    setEntry({ ...entry, reflections: next });
    await supabase
      .from("journal_entries" as never)
      .update({ reflections: next })
      .eq("id", entry.id);
  };

  const STANZAS: { key: keyof JournalEntry; numeralIdx: number }[] = [
    { key: "morning_prep", numeralIdx: 0 },
    { key: "setups", numeralIdx: 1 },
    { key: "what_happened", numeralIdx: 2 },
    { key: "lessons", numeralIdx: 3 },
    { key: "closing_note", numeralIdx: 4 },
  ];

  return (
    <StoaLayout pompeii>
      <div className="p-pompeii" style={{ background: "var(--bg)", minHeight: "calc(100vh - 56px)" }}>
        <CompressedMasthead />

        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "48px 24px 96px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 56 }}>
            <div>
              <div className="kicker" style={{ marginBottom: 8 }}>
                ΒΙΒΛΟΣ · THE SCROLL
              </div>
              <div className="display" style={{ fontStyle: "italic", fontSize: 22, color: "var(--ink)" }}>
                {entry ? `${formatHeaderDate(entry.entry_date)} — Day ${Math.max(1, Math.floor((Date.now() - new Date("2024-01-01").getTime()) / 86_400_000))}` : "—"}
              </div>
            </div>
            <button
              onClick={() => setReadOnly((v) => !v)}
              style={{
                background: "transparent",
                border: "1px solid var(--rule)",
                color: "var(--muted)",
                padding: "6px 12px",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {readOnly ? <EyeOff size={12} /> : <Eye size={12} />}
              {readOnly ? "Read-only" : "Edit"}
            </button>
          </div>

          {loading && (
            <div style={{ color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: 80 }}>
              Unrolling the scroll…
            </div>
          )}

          {!loading && entry && (
            <>
              {/* Sigma seal */}
              <div
                className="display"
                style={{
                  position: "absolute",
                  marginLeft: -12,
                  fontSize: 56,
                  color: "var(--signal)",
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
                aria-hidden
              >
                Σ
              </div>

              {STANZAS.map((s, i) => {
                const value = s.key === "setups" ? (setupsAuto || (entry.setups as string)) : (entry[s.key] as string);
                const isEmpty = !value || value.trim().length === 0;
                const placeholder = PLACEHOLDERS[s.key];
                const isEditing = editingKey === s.key;
                const isFirst = i === 0;
                const isClosing = s.key === "closing_note";
                const isLessons = s.key === "lessons";

                return (
                  <Stanza
                    key={s.key}
                    numeral={ROMAN[s.numeralIdx]}
                    title={TITLES[s.key]}
                    isFirst={isFirst}
                  >
                    {isEditing ? (
                      <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={saveEdit}
                        rows={Math.max(3, draft.split("\n").length)}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "1px dashed var(--gold-rule)",
                          padding: 12,
                          fontFamily: "'IBM Plex Serif', Georgia, serif",
                          fontSize: 17,
                          lineHeight: 1.7,
                          color: "var(--ink)",
                          resize: "vertical",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => beginEdit(s.key)}
                        style={{
                          fontSize: 17,
                          lineHeight: 1.7,
                          color: isEmpty ? "var(--muted)" : "var(--ink)",
                          fontStyle: isEmpty || isClosing ? "italic" : "normal",
                          whiteSpace: "pre-wrap",
                          cursor: readOnly || (s.key === "setups" && setupsAuto) ? "default" : "text",
                          minHeight: 28,
                        }}
                      >
                        {isFirst && !isEmpty ? (
                          <>
                            <span
                              className="display"
                              style={{
                                float: "left",
                                fontSize: "3.2em",
                                color: "var(--signal)",
                                lineHeight: 0.9,
                                marginRight: 8,
                                marginTop: 6,
                              }}
                            >
                              {value.charAt(0)}
                            </span>
                            {value.slice(1)}
                          </>
                        ) : isLessons && !isEmpty ? (
                          value
                            .split("\n")
                            .filter(Boolean)
                            .map((line, idx) => (
                              <div key={idx}>{line.startsWith("—") ? line : `— ${line.replace(/^[-•·]\s*/, "")}`}</div>
                            ))
                        ) : isEmpty ? (
                          placeholder
                        ) : (
                          value
                        )}
                      </div>
                    )}
                  </Stanza>
                );
              })}

              {/* Reflections */}
              {(entry.reflections ?? []).map((r, idx) => (
                <Stanza key={idx} numeral={r.numeral} title={`REFLECTION ${r.numeral}`}>
                  <textarea
                    defaultValue={r.body}
                    placeholder="A free reflection…"
                    onBlur={(e) => updateReflection(idx, e.target.value)}
                    disabled={readOnly}
                    rows={4}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "1px dashed var(--rule)",
                      padding: 12,
                      fontFamily: "'IBM Plex Serif', Georgia, serif",
                      fontSize: 17,
                      lineHeight: 1.7,
                      color: "var(--ink)",
                      resize: "vertical",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold-rule)")}
                  />
                </Stanza>
              ))}

              {/* End mark */}
              <div style={{ marginTop: 96, textAlign: "center", padding: "40px 0" }}>
                <div
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    background: "var(--signal)",
                    transform: "rotate(45deg)",
                    margin: "0 auto 16px",
                  }}
                />
                <div className="kicker">ΤΕΛΟΣ · END</div>
              </div>
            </>
          )}
        </div>

        {/* Add reflection FAB */}
        {!readOnly && entry && (
          <button
            onClick={addReflection}
            aria-label="Add reflection"
            style={{
              position: "fixed",
              bottom: 32,
              right: 32,
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--bg)",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <Plus size={20} />
          </button>
        )}
      </div>
    </StoaLayout>
  );
};

interface StanzaProps {
  numeral: string;
  title: string;
  children: React.ReactNode;
  isFirst?: boolean;
}

const Stanza = ({ numeral, title, children }: StanzaProps) => (
  <section style={{ position: "relative", paddingLeft: 60, marginBottom: 56 }}>
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 30,
        top: 4,
        bottom: 4,
        width: 1,
        background: "var(--rule)",
      }}
    >
      <div style={{ position: "absolute", top: -3, left: -3, width: 7, height: 1, background: "var(--accent)" }} />
      <div style={{ position: "absolute", bottom: -3, left: -3, width: 7, height: 1, background: "var(--accent)" }} />
    </div>
    <div
      className="display"
      style={{
        position: "absolute",
        left: 0,
        top: 2,
        fontSize: 14,
        fontVariant: "small-caps",
        color: "var(--muted)",
        letterSpacing: "0.05em",
      }}
    >
      {numeral}
    </div>
    <div className="display" style={{ fontStyle: "italic", fontSize: 20, color: "var(--ink)", marginBottom: 14 }}>
      {title}
    </div>
    {children}
  </section>
);

export default Scroll;
