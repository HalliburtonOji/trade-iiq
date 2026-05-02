import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ChevronRight, Check, X } from "lucide-react";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";

type Rule = { id: string; rule_text: string };

const PANEL: React.CSSProperties = {
  background: "var(--stoa-shine)",
  border: "1px solid var(--stoa-rule)",
  borderRadius: 2,
  padding: 24,
};

const PRIMARY: React.CSSProperties = {
  background: "var(--stoa-accent)", color: "var(--stoa-ink)", border: "none",
  borderRadius: 2, padding: "12px 22px", cursor: "pointer", fontFamily: "inherit",
};

const GHOST: React.CSSProperties = {
  background: "transparent", color: "var(--stoa-muted)",
  border: "1px solid var(--stoa-rule)", borderRadius: 2,
  padding: "10px 18px", cursor: "pointer", fontFamily: "inherit",
};

function todayKey() { return new Date().toISOString().slice(0, 10); }

export default function Evening() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rules, setRules] = useState<Rule[]>([]);
  const [honoured, setHonoured] = useState<Record<string, boolean>>({});
  const [lesson, setLesson] = useState("");
  const [intent, setIntent] = useState("");
  const [tradeSummary, setTradeSummary] = useState<{ closed: number; wins: number; losses: number; pnl: number; open: number }>({ closed: 0, wins: 0, losses: 0, pnl: 0, open: 0 });
  const [busy, setBusy] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
      const [rulesR, tradesR, existingR] = await Promise.all([
        supabase.from("trading_rules").select("id, rule_text").eq("user_id", user.id).eq("is_active", true).limit(8),
        supabase.from("paper_trades").select("status, pnl, closed_at").eq("user_id", user.id),
        supabase.from("evening_reflections").select("id").eq("user_id", user.id).eq("reflection_date", todayKey()).maybeSingle(),
      ]);
      if (!active) return;

      setRules(rulesR.data ?? []);
      const init: Record<string, boolean> = {};
      (rulesR.data ?? []).forEach(r => { init[r.id] = true; });
      setHonoured(init);

      const trades = tradesR.data ?? [];
      const closedToday = trades.filter(t => t.status === "closed" && t.closed_at && new Date(t.closed_at) >= startOfDay);
      const open = trades.filter(t => t.status === "open").length;
      const wins = closedToday.filter(t => Number(t.pnl) > 0).length;
      const losses = closedToday.filter(t => Number(t.pnl) <= 0).length;
      const pnl = closedToday.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
      setTradeSummary({ closed: closedToday.length, wins, losses, pnl, open });

      setAlreadyDone(!!existingR.data);
    })();
    return () => { active = false; };
  }, [user]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const honoured_arr = rules.map(r => ({ rule_id: r.id, rule_text: r.rule_text, honoured: honoured[r.id] !== false }));

    const { error: insErr } = await supabase.from("evening_reflections").upsert({
      user_id: user.id,
      reflection_date: todayKey(),
      lesson: lesson.trim(),
      rules_honoured: honoured_arr,
      intent_tomorrow: intent.trim(),
      trade_summary: tradeSummary,
    }, { onConflict: "user_id,reflection_date" });
    if (insErr) {
      toast.error("Could not save reflection", { description: insErr.message });
      setBusy(false);
      return;
    }

    const { error: xpErr } = await supabase.rpc("award_xp", {
      p_amount: 10,
      p_source: "evening_reflection",
      p_ref_id: todayKey(),
      p_ref_table: "evening_reflections",
    });
    if (xpErr) console.warn("XP not awarded:", xpErr.message);

    const { data: streakData } = await supabase.rpc("touch_practice_ritual", { p_kind: "evening" });
    const streak = (streakData as any)?.[0];

    setBusy(false);
    if (streak?.full_day) {
      toast.success(`Day complete · streak ${streak.current_streak}`, { description: "Both rituals honoured." });
    } else {
      toast.success("+10 XP — Ἑσπέρα", { description: "Reflection recorded." });
    }
    navigate("/", { replace: true });
  };

  return (
    <StoaShell crumb="ἙΣΠΈΡΑ · Evening Reflection">
      <div style={{ maxWidth: 720, margin: "0 auto", paddingBottom: 80 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            ἙΣΠΈΡΑ · THE EVENING STAR
          </span>
          <h1 className="stoa-display" style={{ marginTop: 6, fontSize: 30, color: "var(--stoa-ink)" }}>
            What did the day teach?
          </h1>
          <PedimentCap variant="rule" width={140} className="mx-auto" />
        </div>

        {alreadyDone && (
          <div style={{ ...PANEL, marginBottom: 18, textAlign: "center", color: "var(--stoa-muted)", fontStyle: "italic", fontFamily: "Georgia, serif" }}>
            Today's reflection is already recorded. Saving again will overwrite it.
          </div>
        )}

        <div style={PANEL}>
          {/* Day summary */}
          <div style={{ marginBottom: 18 }}>
            <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>TODAY · ἩΜΕΡΑ</span>
            <div style={{
              marginTop: 8,
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8,
            }}>
              {[
                { k: "Closed", v: String(tradeSummary.closed) },
                { k: "Wins", v: String(tradeSummary.wins) },
                { k: "Losses", v: String(tradeSummary.losses) },
                { k: "P&L", v: `${tradeSummary.pnl >= 0 ? "+" : ""}${tradeSummary.pnl.toFixed(2)}` },
                { k: "Open", v: String(tradeSummary.open) },
              ].map(m => (
                <div key={m.k} style={{ padding: 10, border: "1px solid var(--stoa-rule)", background: "var(--stoa-bg)", borderRadius: 2 }}>
                  <span className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 10 }}>{m.k}</span>
                  <div className="stoa-mono" style={{ marginTop: 4, color: "var(--stoa-ink)", fontWeight: 600 }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Lesson */}
          <div style={{ marginBottom: 18 }}>
            <label className="stoa-kicker" style={{ display: "block", marginBottom: 6 }}>
              WHAT DID THE MARKET TEACH ME?
            </label>
            <textarea
              value={lesson} onChange={e => setLesson(e.target.value)}
              rows={3} placeholder="One honest sentence."
              style={{
                width: "100%", background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)",
                borderRadius: 2, padding: 10, color: "var(--stoa-ink)", fontFamily: "inherit", resize: "vertical",
              }}
            />
          </div>

          {/* Rules honoured */}
          {rules.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <label className="stoa-kicker" style={{ display: "block", marginBottom: 8 }}>
                DID I HONOUR MY RULES?
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rules.map(r => {
                  const ok = honoured[r.id] !== false;
                  return (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      padding: "10px 12px", background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)", borderRadius: 2,
                    }}>
                      <span style={{ color: "var(--stoa-ink)", fontFamily: "Georgia, serif", fontSize: 14, flex: 1 }}>
                        {r.rule_text}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button type="button" onClick={() => setHonoured(h => ({ ...h, [r.id]: true }))}
                          style={{
                            ...GHOST, padding: "6px 10px",
                            background: ok ? "var(--stoa-accent)" : "transparent",
                            color: ok ? "var(--stoa-ink)" : "var(--stoa-muted)",
                          }} aria-label="Honoured">
                          <Check size={14} />
                        </button>
                        <button type="button" onClick={() => setHonoured(h => ({ ...h, [r.id]: false }))}
                          style={{
                            ...GHOST, padding: "6px 10px",
                            background: !ok ? "var(--stoa-signal, #b04848)" : "transparent",
                            color: !ok ? "#fff" : "var(--stoa-muted)",
                          }} aria-label="Broken">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Intent */}
          <div style={{ marginBottom: 18 }}>
            <label className="stoa-kicker" style={{ display: "block", marginBottom: 6 }}>
              ONE SENTENCE FOR TOMORROW
            </label>
            <textarea
              value={intent} onChange={e => setIntent(e.target.value)}
              rows={2} placeholder="What will guide thee at the open?"
              style={{
                width: "100%", background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)",
                borderRadius: 2, padding: 10, color: "var(--stoa-ink)", fontFamily: "inherit", resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
            <button type="button" onClick={() => navigate("/")} style={GHOST}>Defer</button>
            <button type="button" onClick={submit} disabled={busy} style={PRIMARY}>
              {busy ? "Recording…" : "Close the day · +10 XP"}
              <ChevronRight size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} />
            </button>
          </div>
        </div>
      </div>
    </StoaShell>
  );
}
