import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import { useToast } from "@/hooks/use-toast";

type Candle = { date: string; o: number; h: number; l: number; c: number; v: number };

const goldCta = {
  background: "var(--stoa-accent)", color: "var(--stoa-ink)", border: "none",
  borderRadius: 2, padding: "10px 20px", cursor: "pointer",
} as const;
const creamCta = {
  background: "var(--stoa-shine)", color: "var(--stoa-ink)", border: "1px solid var(--stoa-rule)",
  borderRadius: 2, padding: "10px 20px", cursor: "pointer",
} as const;

export default function LearnScenario() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mod, setMod] = useState<any>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [day, setDay] = useState(1);
  const [entryDay, setEntryDay] = useState<number | null>(null);
  const [stopPct, setStopPct] = useState(2);
  const [targetPct, setTargetPct] = useState(6);
  const [phase, setPhase] = useState<"setup" | "replay" | "result">("setup");
  const [outcome, setOutcome] = useState<{ exitPrice: number; pnlPct: number; verdict: string; idealPnl: number; delta: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("learn_modules").select("*").eq("slug", slug).single();
      if (cancelled) return;
      setMod(data);
      const sc = (data as any)?.scenario_json;
      if (sc?.symbol && sc?.start_date && sc?.end_date) {
        const { data: cd } = await supabase.functions.invoke("historical-candles", {
          body: { symbol: sc.symbol, start_date: sc.start_date, end_date: sc.end_date },
        });
        if (!cancelled) setCandles((cd as any)?.candles || []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const sc = mod?.scenario_json;

  const runEvaluation = async () => {
    if (!sc || entryDay === null || candles.length === 0) return;
    const entryPrice = candles[entryDay - 1].c;
    const stopPrice = entryPrice * (1 - stopPct / 100);
    const targetPrice = entryPrice * (1 + targetPct / 100);
    let exitPrice = candles[candles.length - 1].c;
    for (let i = entryDay; i < candles.length; i++) {
      if (candles[i].l <= stopPrice) { exitPrice = stopPrice; break; }
      if (candles[i].h >= targetPrice) { exitPrice = targetPrice; break; }
    }
    const pnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    const idealPnl = sc.ideal_target_pct ?? 6;
    const verdict = pnlPct >= idealPnl * 0.8 ? "Disciplined operator." :
      pnlPct >= 0 ? "Profitable but suboptimal." : "Unprofitable — review the ideal path.";
    const delta = pnlPct - idealPnl;
    setOutcome({ exitPrice, pnlPct, verdict, idealPnl, delta });
    setPhase("result");
    if (user && mod) {
      const score = Math.max(0, Math.min(100, Math.round(50 + (pnlPct - idealPnl) * 5)));
      await supabase.from("learn_progress").upsert({
        user_id: user.id, module_id: mod.id, mode: "scenario",
        status: "completed", score, completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,module_id,mode" });
      toast({ title: "Scenario complete", description: `${pnlPct.toFixed(2)}% PnL` });
    }
  };

  const stoaCrumb = (<span><span className="stoa-greek">Ἀγών</span> · {mod?.title_en || "Scenario"}</span>);

  // Bar ladder math
  const visibleCandles = candles.slice(0, day);
  const maxV = visibleCandles.reduce((m, c) => Math.max(m, c.h), -Infinity);
  const minV = visibleCandles.reduce((m, c) => Math.min(m, c.l), Infinity);
  const range = maxV - minV || 1;
  const scaleY = (v: number) => ((maxV - v) / range) * 160;

  return (
    <StoaShell palette="delphi" crumb={stoaCrumb}>
      {loading && (
        <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", padding: "20px 0" }}>
          LOADING · ΧΡΟΝΟΣ…
        </div>
      )}

      {!loading && (!mod || !mod.scenario_json) && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginBottom: 20 }}>
            No scenario wired yet.
          </p>
          <button style={goldCta} className="stoa-display font-semibold" onClick={() => navigate("/learn")}>
            Back to Codex
          </button>
        </div>
      )}

      {!loading && mod && sc && phase === "setup" && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            {sc.symbol} · {sc.timeframe} · {sc.start_date} → {sc.end_date}
          </div>
          <h1 className="stoa-display text-3xl font-semibold" style={{ color: "var(--stoa-ink)", marginTop: 8 }}>
            {sc.ask}
          </h1>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 8 }}>
            You control entry day, stop %, target %. Bars advance one at a time.
          </p>
          <div style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 16, marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Stop %</span>
              <input type="number" min={0.5} max={20} step={0.1} value={stopPct}
                onChange={(e) => setStopPct(parseFloat(e.target.value) || 0)}
                className="stoa-mono"
                style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", padding: "6px 10px", color: "var(--stoa-ink)", borderRadius: 2, width: 100 }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Target %</span>
              <input type="number" min={0.5} max={20} step={0.1} value={targetPct}
                onChange={(e) => setTargetPct(parseFloat(e.target.value) || 0)}
                className="stoa-mono"
                style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", padding: "6px 10px", color: "var(--stoa-ink)", borderRadius: 2, width: 100 }} />
            </label>
          </div>
          {candles.length === 0 && (
            <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 16 }}>
              Candle data unavailable — scenario will not run.
            </p>
          )}
          <div style={{ marginTop: 20 }}>
            <button style={goldCta} className="stoa-display font-semibold"
              disabled={candles.length === 0}
              onClick={() => { setPhase("replay"); setDay(1); }}>
              Begin Replay
            </button>
          </div>
        </div>
      )}

      {!loading && mod && sc && phase === "replay" && candles.length > 0 && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            DAY {day} / {candles.length} · ΑΓΩΝ
          </div>
          <h1 className="stoa-display text-2xl font-semibold" style={{ color: "var(--stoa-ink)", marginTop: 8 }}>
            {sc.symbol} @ {candles[day - 1]?.c?.toFixed(2)}
          </h1>

          <div style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, height: 180, padding: 16, marginTop: 16, overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", height: 160, position: "relative" }}>
              {visibleCandles.map((c, i) => {
                const up = c.c >= c.o;
                const wickTop = scaleY(c.h);
                const wickBot = scaleY(c.l);
                const bodyTop = scaleY(Math.max(c.o, c.c));
                const bodyBot = scaleY(Math.min(c.o, c.c));
                const color = up ? "var(--stoa-accent)" : "hsl(var(--verdict-avoid))";
                return (
                  <div key={i} style={{ width: 10, marginRight: 2, position: "relative", height: 160 }}>
                    <div style={{ position: "absolute", left: 4, top: wickTop, width: 2, height: Math.max(1, wickBot - wickTop), background: color }} />
                    <div style={{ position: "absolute", left: 2, top: bodyTop, width: 6, height: Math.max(2, bodyBot - bodyTop), background: color }} />
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {entryDay === null ? (
              <div style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "Georgia, serif", color: "var(--stoa-ink)" }}>Enter here?</span>
                <button style={goldCta} className="stoa-display font-semibold" onClick={() => setEntryDay(day)}>
                  Enter
                </button>
              </div>
            ) : (
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                In position — entry @ {candles[entryDay - 1].c.toFixed(2)}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            {day < candles.length && (
              <button style={creamCta} className="stoa-kicker" onClick={() => setDay((d) => d + 1)}>
                Advance Day →
              </button>
            )}
            {(entryDay !== null || day >= candles.length) && (
              <button style={goldCta} className="stoa-display font-semibold" onClick={runEvaluation} disabled={entryDay === null}>
                Evaluate →
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && mod && phase === "result" && outcome && (
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "20px 0" }}>
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>VERDICT · ΚΡΙΣΙΣ</div>
          <h1 className="stoa-display text-4xl font-semibold"
            style={{ color: outcome.pnlPct >= 0 ? "var(--stoa-accent)" : "hsl(var(--verdict-avoid))", marginTop: 12 }}>
            {outcome.pnlPct.toFixed(2)}%
          </h1>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 8 }}>
            {outcome.verdict}
          </p>
          <div style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 16, marginTop: 20, textAlign: "left" }}>
            <div className="stoa-mono" style={{ color: "var(--stoa-ink)", fontSize: 13, padding: "4px 0" }}>Your PnL: {outcome.pnlPct.toFixed(2)}%</div>
            <div className="stoa-mono" style={{ color: "var(--stoa-ink)", fontSize: 13, padding: "4px 0" }}>Ideal PnL: {outcome.idealPnl}%</div>
            <div className="stoa-mono" style={{ color: "var(--stoa-ink)", fontSize: 13, padding: "4px 0" }}>Delta: {outcome.delta.toFixed(2)}%</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <button style={goldCta} className="stoa-display font-semibold" onClick={() => navigate("/learn")}>
              Back to Codex
            </button>
            <button style={creamCta} className="stoa-kicker" onClick={() => {
              setDay(1); setEntryDay(null); setOutcome(null); setPhase("setup");
            }}>
              Replay
            </button>
          </div>
        </div>
      )}
    </StoaShell>
  );
}
