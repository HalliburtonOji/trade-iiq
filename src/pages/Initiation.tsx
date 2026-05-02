import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ChevronRight, Check } from "lucide-react";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import { greekNumeral } from "@/lib/greek-numerals";

/**
 * Μύησις (Initiation) — first-session ritual.
 * Four steps: Α' Oath → Β' First Reading → Γ' First Trade → Δ' Council Preview.
 * Each step writes a real artefact so the user finishes with: profile updated,
 * one xp_ledger row (initiation), one closed paper_trade, one playbook, one rule.
 */

type ExperienceLevel = "novice" | "apprentice" | "initiate";
type AssetClass = "stocks" | "crypto" | "forex";

const STEPS = ["The Oath", "The First Reading", "The First Trade", "The Council Preview"];
const GREEK_STEPS = ["Ὅρκος", "Ἀνάγνωσις", "Πρᾶξις", "Βουλή"];

const STARTER_THESIS = {
  stocks: { symbol: "AAPL", price_hint: 220, narrative: "Apple holds above its 50-day average; momentum is healthy and earnings beat last quarter." },
  crypto: { symbol: "BTC",  price_hint: 95000, narrative: "Bitcoin is consolidating above 90k after a clean breakout. Volume confirms the move." },
  forex:  { symbol: "EURUSD", price_hint: 1.085, narrative: "EURUSD is reclaiming 1.08, with US data softening and the ECB on hold." },
} as const;

const PANEL: React.CSSProperties = {
  background: "var(--stoa-shine)",
  border: "1px solid var(--stoa-rule)",
  borderRadius: 2,
  padding: 28,
  maxWidth: 720,
  margin: "0 auto",
};

const PRIMARY_BTN: React.CSSProperties = {
  background: "var(--stoa-accent)",
  color: "var(--stoa-ink)",
  border: "none",
  borderRadius: 2,
  padding: "12px 22px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const GHOST_BTN: React.CSSProperties = {
  background: "transparent",
  color: "var(--stoa-muted)",
  border: "1px solid var(--stoa-rule)",
  borderRadius: 2,
  padding: "10px 18px",
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function Initiation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<ExperienceLevel>("novice");
  const [primaryAsset, setPrimaryAsset] = useState<AssetClass>("stocks");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState(false);

  // If already onboarded, bounce to home.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (active && data?.onboarded_at) navigate("/", { replace: true });
    })();
    return () => { active = false; };
  }, [user, navigate]);

  const thesis = useMemo(() => STARTER_THESIS[primaryAsset], [primaryAsset]);

  const completeOnboarding = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("user_id", user.id);
  };

  const handleSkip = async () => {
    setSkipping(true);
    await completeOnboarding();
    navigate("/", { replace: true });
  };

  // ---------- STEP Α' — Oath ----------
  const submitOath = async () => {
    if (!user) return;
    setBusy(true);
    const goalsArr = goal.trim() ? [goal.trim()] : [];
    const { error } = await supabase
      .from("profiles")
      .update({
        experience_level: experience,
        preferred_assets: [primaryAsset],
        trading_goals: goalsArr,
      })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Couldn't save thy oath", { description: error.message });
      return;
    }
    setStep(1);
  };

  // ---------- STEP Β' — First Reading ----------
  const completeReading = async () => {
    if (!user) return;
    setBusy(true);
    // Award 30 XP under source 'initiation'. Idempotent on (user, source, ref_id).
    const { data, error } = await supabase.rpc("award_xp", {
      p_amount: 30,
      p_source: "initiation",
      p_ref_id: "first-reading",
      p_ref_table: "initiation",
    });
    setBusy(false);
    if (error) {
      toast.error("XP could not be awarded", { description: error.message });
      return;
    }
    const awarded = (data as any)?.[0]?.awarded;
    if (awarded) toast.success("+30 XP — Κῶδιξ", { description: "Thy first reading is recorded." });
    setStep(2);
  };

  // ---------- STEP Γ' — First Trade ----------
  const placeFirstTrade = async () => {
    if (!user) return;
    setBusy(true);
    const entry = thesis.price_hint;
    const stop = +(entry * 0.98).toFixed(4);   // 2% stop
    const target = +(entry * 1.04).toFixed(4); // 4% target (R:R 2:1)
    const exit = +(entry * 1.012).toFixed(4);  // small drift up to demonstrate close
    const qty = 1;
    const pnl = +((exit - entry) * qty).toFixed(2);
    const pnlPct = +(((exit - entry) / entry) * 100).toFixed(2);
    const now = new Date().toISOString();

    // 1. Create starter playbook
    const { data: pbRow, error: pbErr } = await supabase
      .from("playbooks")
      .insert({
        user_id: user.id,
        name: "The Apprentice's Breakout",
        strategy_type: "breakout",
        conditions: { trend: "above_50ma", confirmation: "volume_uptick" },
        checklist: [
          "Price holds above 50-day moving average",
          "Volume is at least average on the breakout candle",
          "Risk is sized to 1% of account",
          "Stop is placed below the breakout level",
        ],
        notes: "A first canon, given on the day of initiation.",
      })
      .select()
      .single();
    if (pbErr) {
      toast.error("Playbook could not be created", { description: pbErr.message });
      setBusy(false);
      return;
    }

    // 2. Open + close paper trade in one go (status closed)
    const { error: tradeErr } = await supabase.from("paper_trades").insert({
      user_id: user.id,
      symbol: thesis.symbol,
      asset_type: primaryAsset === "stocks" ? "stock" : primaryAsset === "crypto" ? "crypto" : "forex",
      direction: "long",
      entry_price: entry,
      quantity: qty,
      stop_loss: stop,
      take_profit: target,
      exit_price: exit,
      pnl,
      pnl_percent: pnlPct,
      status: "closed",
      opened_at: now,
      closed_at: now,
      thesis: thesis.narrative,
      thesis_json: {
        playbook_id: pbRow?.id,
        playbook_name: pbRow?.name,
        initiation: true,
      },
      order_type: "market",
      leverage: 1,
    });
    setBusy(false);
    if (tradeErr) {
      toast.error("First trade could not be placed", { description: tradeErr.message });
      return;
    }
    toast.success("First trade closed", { description: `${thesis.symbol} +${pnlPct}% (paper)` });
    setStep(3);
  };

  // ---------- STEP Δ' — Council Preview ----------
  const adoptDecree = async () => {
    if (!user) return;
    setBusy(true);
    const decree =
      experience === "novice"
        ? "Risk no more than 1% of account on any single trade."
        : experience === "apprentice"
        ? "Every trade requires a written thesis before entry."
        : "Review every closed trade within 24 hours.";
    const { error } = await supabase.from("trading_rules").insert({
      user_id: user.id,
      rule_text: decree,
      category: "discipline",
      is_active: true,
    });
    if (error) {
      toast.error("Decree could not be adopted", { description: error.message });
      setBusy(false);
      return;
    }
    await completeOnboarding();
    setBusy(false);
    toast.success("Decree adopted", { description: decree });
    navigate("/", { replace: true });
  };

  const finishWithoutDecree = async () => {
    setBusy(true);
    await completeOnboarding();
    setBusy(false);
    navigate("/", { replace: true });
  };

  return (
    <StoaShell crumb="ΜΥΗΣΙΣ · Initiation">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, justifyContent: "center" }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                maxWidth: 80,
                height: 3,
                background: i <= step ? "var(--stoa-accent)" : "var(--stoa-rule)",
                transition: "background 0.2s ease",
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            STEP {greekNumeral(step + 1)} · {GREEK_STEPS[step]}
          </span>
          <h1 className="stoa-display" style={{ marginTop: 6, fontSize: 30, color: "var(--stoa-ink)" }}>
            {STEPS[step]}
          </h1>
          <PedimentCap variant="rule" width={140} className="mx-auto" />
        </div>

        {/* Step content */}
        {step === 0 && (
          <div style={PANEL}>
            <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginBottom: 20 }}>
              Before the gate is opened, declare what brings thee here.
            </p>

            <label className="stoa-kicker" style={{ display: "block", marginBottom: 6 }}>EXPERIENCE</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {(["novice", "apprentice", "initiate"] as ExperienceLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setExperience(lvl)}
                  style={{
                    ...GHOST_BTN,
                    background: experience === lvl ? "var(--stoa-accent)" : "transparent",
                    color: experience === lvl ? "var(--stoa-ink)" : "var(--stoa-muted)",
                  }}
                >
                  {lvl[0].toUpperCase() + lvl.slice(1)}
                </button>
              ))}
            </div>

            <label className="stoa-kicker" style={{ display: "block", marginBottom: 6 }}>PRIMARY ASSET</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {(["stocks", "crypto", "forex"] as AssetClass[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setPrimaryAsset(a)}
                  style={{
                    ...GHOST_BTN,
                    background: primaryAsset === a ? "var(--stoa-accent)" : "transparent",
                    color: primaryAsset === a ? "var(--stoa-ink)" : "var(--stoa-muted)",
                  }}
                >
                  {a[0].toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>

            <label className="stoa-kicker" style={{ display: "block", marginBottom: 6 }}>WHAT DO YOU SEEK?</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="A consistent edge. Discipline. To stop revenge trading."
              rows={2}
              style={{
                width: "100%",
                background: "var(--stoa-bg)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                padding: 10,
                color: "var(--stoa-ink)",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
              <button type="button" onClick={handleSkip} disabled={skipping} style={GHOST_BTN}>
                Enter unguided
              </button>
              <button type="button" onClick={submitOath} disabled={busy} style={PRIMARY_BTN}>
                Take the oath <ChevronRight size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} />
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={PANEL}>
            <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>FROM THE CODEX · ΚΩΔΙΞ</p>
            <h2 className="stoa-display" style={{ fontSize: 22, color: "var(--stoa-ink)", marginTop: 6 }}>
              The Four Biases
            </h2>
            <div style={{ marginTop: 16, color: "var(--stoa-ink)", lineHeight: 1.7, fontFamily: "Georgia, serif" }}>
              <p>
                Every trader carries four shadows. <strong>Loss aversion</strong> makes the cut painful. <strong>Recency</strong>
                {" "}whispers that what just happened will continue. <strong>Confirmation</strong> hears only what flatters the position.
                And <strong>overconfidence</strong> mistakes a winning streak for skill.
              </p>
              <p>
                The Stoa does not promise to free thee from these. It teaches thee to recognise them at the moment of decision.
                Then the choice is thine.
              </p>
            </div>
            <div style={{ marginTop: 14, padding: 12, borderLeft: "3px solid var(--stoa-accent)", background: "var(--stoa-bg)" }}>
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>RULE OF THUMB</span>
              <p style={{ margin: "4px 0 0", color: "var(--stoa-ink)" }}>
                When the urge to act is strongest, wait one breath. The market will still be there.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
              <button type="button" onClick={handleSkip} disabled={skipping} style={GHOST_BTN}>
                Enter unguided
              </button>
              <button type="button" onClick={completeReading} disabled={busy} style={PRIMARY_BTN}>
                Mark complete · +30 XP <ChevronRight size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={PANEL}>
            <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>A GUIDED PAPER TRADE</p>
            <h2 className="stoa-display" style={{ fontSize: 22, color: "var(--stoa-ink)", marginTop: 6 }}>
              {thesis.symbol} · The Apprentice's Breakout
            </h2>
            <p style={{ marginTop: 10, fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)" }}>
              {thesis.narrative}
            </p>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {[
                { k: "Entry", v: thesis.price_hint.toString() },
                { k: "Stop (−2%)", v: (thesis.price_hint * 0.98).toFixed(2) },
                { k: "Target (+4%)", v: (thesis.price_hint * 1.04).toFixed(2) },
                { k: "Risk", v: "1% of account" },
              ].map((m) => (
                <div key={m.k} style={{ padding: 10, border: "1px solid var(--stoa-rule)", borderRadius: 2, background: "var(--stoa-bg)" }}>
                  <span className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 10 }}>{m.k}</span>
                  <div style={{ marginTop: 4, color: "var(--stoa-ink)", fontWeight: 600 }}>{m.v}</div>
                </div>
              ))}
            </div>

            <p style={{ marginTop: 14, fontSize: 12, color: "var(--stoa-muted)" }}>
              We will open and close this paper trade for thee, so the full ritual — entry, stop, take-profit, exit — is felt once.
              No real money moves.
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
              <button type="button" onClick={handleSkip} disabled={skipping} style={GHOST_BTN}>
                Enter unguided
              </button>
              <button type="button" onClick={placeFirstTrade} disabled={busy} style={PRIMARY_BTN}>
                {busy ? "Placing…" : "Place the trade"} <ChevronRight size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={PANEL}>
            <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>A GLIMPSE OF THE COUNCIL · ΒΟΥΛΗ</p>
            <h2 className="stoa-display" style={{ fontSize: 22, color: "var(--stoa-ink)", marginTop: 6 }}>
              "A first step taken in earnest is half the journey."
            </h2>

            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {[
                { k: "Trades", v: "1", note: "1 closed, 1W 0L" },
                { k: "XP", v: "30", note: "From the first reading" },
                { k: "Playbook", v: "1", note: "The Apprentice's Breakout" },
                { k: "Discipline", v: "—", note: "Decree pending" },
              ].map((m) => (
                <div key={m.k} style={{ padding: 12, border: "1px solid var(--stoa-rule)", borderRadius: 2, background: "var(--stoa-bg)" }}>
                  <span className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 10 }}>{m.k}</span>
                  <div style={{ marginTop: 4, color: "var(--stoa-ink)", fontSize: 22, fontWeight: 600 }}>{m.v}</div>
                  <div style={{ color: "var(--stoa-muted)", fontSize: 11, marginTop: 2 }}>{m.note}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, padding: 14, border: "1px solid var(--stoa-accent)", borderRadius: 2, background: "var(--stoa-bg)" }}>
              <span className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>SUGGESTED FIRST DECREE</span>
              <p style={{ margin: "6px 0 0", color: "var(--stoa-ink)", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                {experience === "novice"
                  ? "Risk no more than 1% of account on any single trade."
                  : experience === "apprentice"
                  ? "Every trade requires a written thesis before entry."
                  : "Review every closed trade within 24 hours."}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
              <button type="button" onClick={finishWithoutDecree} disabled={busy} style={GHOST_BTN}>
                Skip the decree
              </button>
              <button type="button" onClick={adoptDecree} disabled={busy} style={PRIMARY_BTN}>
                <Check size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Adopt the decree
              </button>
            </div>
          </div>
        )}
      </div>
    </StoaShell>
  );
}
