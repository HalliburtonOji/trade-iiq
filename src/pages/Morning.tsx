import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import MentorTodayStrip from "@/components/mentor/MentorTodayStrip";

type Brief = {
  id: string;
  brief_date: string;
  symbols: string[];
  bias_focus: string;
  bias_explainer: string;
  discipline_focus: string;
  ai_summary: string;
  acknowledged_at: string | null;
};

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

export default function Morning() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("daily-brief", { body: {} });
      if (!active) return;
      if (error) {
        toast.error("Could not summon the morning brief", { description: error.message });
        setLoading(false);
        return;
      }
      setBrief(data?.brief ?? null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const acknowledge = async () => {
    if (!user || !brief) return;
    setAcking(true);
    const now = new Date().toISOString();

    const { error: ackErr } = await supabase
      .from("daily_briefs")
      .update({ acknowledged_at: now })
      .eq("id", brief.id);
    if (ackErr) {
      toast.error("Could not record acknowledgement", { description: ackErr.message });
      setAcking(false);
      return;
    }

    const { error: xpErr } = await supabase.rpc("award_xp", {
      p_amount: 5,
      p_source: "morning_brief",
      p_ref_id: brief.brief_date,
      p_ref_table: "daily_briefs",
    });
    if (xpErr) console.warn("XP not awarded:", xpErr.message);

    const { data: streakData } = await supabase.rpc("touch_practice_ritual", { p_kind: "morning" });
    const streak = (streakData as any)?.[0];

    setAcking(false);
    if (streak?.full_day) {
      toast.success(`Day complete · streak ${streak.current_streak}`, {
        description: "Morning and evening both honoured.",
      });
    } else {
      toast.success("+5 XP — Ὄρθρος", { description: "The brief is read. Trade well." });
    }
    navigate("/", { replace: true });
  };

  return (
    <StoaShell crumb="ὌΡΘΡΟΣ · Morning Brief">
      <div style={{ maxWidth: 720, margin: "0 auto", paddingBottom: 80 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            ὌΡΘΡΟΣ · THE FIRST LIGHT
          </span>
          <h1 className="stoa-display" style={{ marginTop: 6, fontSize: 30, color: "var(--stoa-ink)" }}>
            Today's Brief
          </h1>
          <PedimentCap variant="rule" width={140} className="mx-auto" />
        </div>

        <MentorTodayStrip />

        {loading && (
          <div style={{ ...PANEL, textAlign: "center", color: "var(--stoa-muted)", fontStyle: "italic", fontFamily: "Georgia, serif" }}>
            Drawing the brief from thy ledger…
          </div>
        )}

        {!loading && brief && (
          <div style={PANEL}>
            <div style={{ marginBottom: 18 }}>
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>TODAY'S WATCH · ΘΕΑΣΙΣ</span>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {brief.symbols.length === 0 && (
                  <span style={{ color: "var(--stoa-muted)", fontStyle: "italic", fontFamily: "Georgia, serif" }}>
                    No symbols on watch. Add to thy watchlist or playbook.
                  </span>
                )}
                {brief.symbols.map((s) => (
                  <span key={s} className="stoa-mono" style={{
                    padding: "6px 12px",
                    border: "1px solid var(--stoa-rule)",
                    background: "var(--stoa-bg)",
                    color: "var(--stoa-ink)",
                    fontSize: 13,
                  }}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18, padding: 14, borderLeft: "3px solid var(--stoa-accent)", background: "var(--stoa-bg)" }}>
              <span className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>BIAS RISK · ΣΚΙΑ</span>
              <div style={{ marginTop: 6, color: "var(--stoa-ink)", fontWeight: 600 }}>{brief.bias_focus}</div>
              <p style={{ margin: "4px 0 0", color: "var(--stoa-ink)", fontFamily: "Georgia, serif", lineHeight: 1.6 }}>
                {brief.bias_explainer}
              </p>
            </div>

            <div style={{ marginBottom: 18, padding: 14, borderLeft: "3px solid var(--stoa-rule)", background: "var(--stoa-bg)" }}>
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>DISCIPLINE TODAY · ΕΘΟΣ</span>
              <p style={{ margin: "6px 0 0", color: "var(--stoa-ink)", fontFamily: "Georgia, serif", lineHeight: 1.6 }}>
                {brief.discipline_focus}
              </p>
            </div>

            {brief.ai_summary && (
              <p style={{
                color: "var(--stoa-muted)", fontFamily: "Georgia, serif", fontStyle: "italic",
                textAlign: "center", margin: "18px 0 0",
              }}>
                "{brief.ai_summary}"
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
              <button type="button" onClick={() => navigate("/")} style={GHOST}>Defer</button>
              <button type="button" onClick={acknowledge} disabled={acking || !!brief.acknowledged_at} style={PRIMARY}>
                {brief.acknowledged_at ? "Already read" : acking ? "Recording…" : "I have read the brief · +5 XP"}
                <ChevronRight size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </StoaShell>
  );
}
