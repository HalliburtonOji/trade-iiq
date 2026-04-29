import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import { useToast } from "@/hooks/use-toast";

type Aggregates = {
  trades: {
    count: number; wins: number; losses: number;
    win_rate: number; total_pnl: number;
    best: { symbol: string; pnl: number } | null;
    worst: { symbol: string; pnl: number } | null;
  };
  xp: { total: number; by_source: Record<string, number> };
  quizzes: { count: number; avg_score: number; weak_tags: string[] };
  rules: { violations: number };
  playbooks: { used: number };
};

type Review = {
  id: string;
  week_starting: string;
  ai_summary: string;
  decree: string;
  aggregates: Aggregates;
  viewed_at: string | null;
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

const panel = {
  background: "var(--stoa-shine)",
  border: "1px solid var(--stoa-rule)",
  borderRadius: 2,
  padding: 20,
} as const;

const Council = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDecree, setSavingDecree] = useState(false);

  const load = async (force = false) => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("council-summary", {
      body: { force },
    });
    if (error) {
      toast({ title: "The Council is silent", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setReview(data?.review as Review);
    // Mark viewed
    if (data?.review?.id) {
      await supabase
        .from("council_reviews")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", data.review.id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveDecree = async () => {
    if (!user || !review?.decree) return;
    setSavingDecree(true);
    const { error } = await supabase.from("trading_rules").insert({
      user_id: user.id,
      rule_text: review.decree,
      category: "council",
      is_active: true,
    });
    setSavingDecree(false);
    if (error) {
      toast({ title: "Could not save decree", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Decree adopted", description: "Added to thy Rulebook." });
    }
  };

  const stoaCrumb = (
    <span>
      <span className="stoa-greek">Σύνοδος</span> · The Council
    </span>
  );

  const a = review?.aggregates;

  return (
    <StoaShell palette="delphi" crumb={stoaCrumb}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "8px 0 60px" }}>
        <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", letterSpacing: "0.18em" }}>
          WEEKLY REVIEW · ΣΥΝΟΔΟΣ
        </div>
        <h1
          className="stoa-display"
          style={{ fontSize: 36, color: "var(--stoa-ink)", marginTop: 6, marginBottom: 4 }}
        >
          The Council
        </h1>
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "var(--stoa-muted)",
            marginBottom: 24,
          }}
        >
          Each week, the seven days are weighed.
        </p>

        {loading && (
          <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            CONVENING · ΧΡΟΝΟΣ…
          </p>
        )}

        {!loading && review && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 1. Verdict */}
            <div style={{ ...panel, borderTop: "3px solid var(--stoa-accent)" }}>
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                VERDICT · ΚΡΙΣΙΣ
              </div>
              <p
                className="stoa-display"
                style={{
                  fontSize: 22,
                  lineHeight: 1.4,
                  color: "var(--stoa-ink)",
                  marginTop: 10,
                }}
              >
                {review.ai_summary}
              </p>
            </div>

            {/* 2. Trades */}
            <div style={panel}>
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                TRADES · ΣΥΝΑΛΛΑΓΑΙ
              </div>
              {a && a.trades.count === 0 && (
                <p
                  style={{
                    fontFamily: "Georgia, serif",
                    fontStyle: "italic",
                    color: "var(--stoa-muted)",
                    marginTop: 10,
                  }}
                >
                  No closed trades this week.
                </p>
              )}
              {a && a.trades.count > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  <Stat label="Closed" value={a.trades.count} />
                  <Stat label="Win rate" value={`${a.trades.win_rate}%`} />
                  <Stat
                    label="Total PnL"
                    value={`${a.trades.total_pnl >= 0 ? "+" : ""}$${a.trades.total_pnl.toFixed(2)}`}
                    accent={a.trades.total_pnl >= 0}
                  />
                  {a.trades.best && (
                    <Stat
                      label={`Best · ${a.trades.best.symbol}`}
                      value={`+$${a.trades.best.pnl.toFixed(2)}`}
                      accent
                    />
                  )}
                  {a.trades.worst && a.trades.worst.pnl < 0 && (
                    <Stat
                      label={`Worst · ${a.trades.worst.symbol}`}
                      value={`$${a.trades.worst.pnl.toFixed(2)}`}
                    />
                  )}
                </div>
              )}
            </div>

            {/* 3. Codex */}
            <div style={panel}>
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                CODEX · ΚΩΔΙΞ
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <Stat label="XP earned" value={a?.xp.total ?? 0} accent />
                <Stat label="Quizzes" value={a?.quizzes.count ?? 0} />
                <Stat label="Avg score" value={`${a?.quizzes.avg_score ?? 0}%`} />
              </div>
              {a && a.quizzes.weak_tags.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <p
                    style={{
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      color: "var(--stoa-muted)",
                      marginBottom: 8,
                    }}
                  >
                    Weakest concepts: {a.quizzes.weak_tags.join(", ")}.
                  </p>
                  <button style={creamCta} className="stoa-kicker" onClick={() => navigate("/learn")}>
                    Study these
                  </button>
                </div>
              )}
            </div>

            {/* 4. Discipline */}
            <div style={panel}>
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                DISCIPLINE · ΠΕΙΘΩ
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <Stat label="Violations" value={a?.rules.violations ?? 0} />
                <Stat label="Playbooks" value={a?.playbooks.used ?? 0} />
              </div>
            </div>

            {/* 5. Decree */}
            <div style={{ ...panel, borderTop: "3px solid var(--stoa-accent)" }}>
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                DECREE · ΔΟΓΜΑ
              </div>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: "var(--stoa-ink)",
                  marginTop: 10,
                  fontStyle: "italic",
                }}
              >
                "{review.decree}"
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button
                  style={goldCta}
                  className="stoa-display font-semibold"
                  disabled={savingDecree}
                  onClick={saveDecree}
                >
                  {savingDecree ? "Inscribing…" : "Adopt as rule"}
                </button>
                <button style={creamCta} className="stoa-kicker" onClick={() => load(true)}>
                  Reconvene
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StoaShell>
  );
};

const Stat = ({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) => (
  <div>
    <div
      className="stoa-kicker"
      style={{ color: "var(--stoa-muted)", fontSize: 10, letterSpacing: "0.16em" }}
    >
      {label}
    </div>
    <div
      className="stoa-display"
      style={{
        fontSize: 22,
        color: accent ? "var(--stoa-accent)" : "var(--stoa-ink)",
        marginTop: 4,
      }}
    >
      {value}
    </div>
  </div>
);

export default Council;
