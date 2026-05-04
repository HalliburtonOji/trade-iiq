import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type Source = {
  kind: "intent" | "trade";
  id: string;
  symbol: string;
  direction: "long" | "short";
  entry: number;
  stop_loss: number;
  take_profit: number;
  size_pct?: number; // mentor's risk %
  thesis?: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  source: Source;
}

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

const MentorPlanDiff = ({ open, onClose, source }: Props) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [riskPct, setRiskPct] = useState<number>(source.size_pct ?? 1);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setRiskPct(source.size_pct ?? 1);
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("paper_balance").eq("user_id", user.id).maybeSingle();
      setBalance(Number(data?.paper_balance ?? 10000));
      // Daily Mission tick: opened a Plan Diff (idempotent per day)
      const today = new Date().toISOString().slice(0, 10);
      await supabase.rpc("award_xp", {
        p_amount: 5, p_source: "mentor_plan_diff",
        p_ref_id: today, p_ref_table: null as any,
      });
    });
  }, [open, source.id]);

  const calc = useMemo(() => {
    const stopDist = Math.abs(source.entry - source.stop_loss);
    const targetDist = Math.abs(source.take_profit - source.entry);
    const rr = stopDist > 0 ? targetDist / stopDist : 0;
    const stopPct = source.entry > 0 ? (stopDist / source.entry) * 100 : 0;

    const bal = balance ?? 10000;
    const riskDollars = (bal * riskPct) / 100;
    const qtyByRisk = stopDist > 0 ? riskDollars / stopDist : 0;
    const notional = qtyByRisk * source.entry;
    const notionalPct = bal > 0 ? (notional / bal) * 100 : 0;
    const expectedWin = qtyByRisk * targetDist;
    const expectedLoss = qtyByRisk * stopDist;

    return { stopDist, targetDist, rr, stopPct, riskDollars, qty: qtyByRisk, notional, notionalPct, expectedWin, expectedLoss, bal };
  }, [balance, riskPct, source]);

  const overLeveraged = calc.notional > calc.bal * 5;
  const tinyQty = calc.qty < 0.0001;

  const confirm = async () => {
    setCopying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mentor-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ source_kind: source.kind, source_id: source.id, qty_override: Number(calc.qty.toFixed(6)) }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Copy failed");
      setCopied(true);
      toast({ title: "Plan copied", description: `${source.symbol} added to your demo book at ${riskPct}% risk.` });
      setTimeout(() => { onClose(); navigate("/demo-trading"); }, 900);
    } catch (e: any) {
      toast({ title: "Could not copy", description: e.message, variant: "destructive" });
    } finally { setCopying(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
         style={{ background: "color-mix(in oklab, var(--stoa-bg) 70%, black)", backdropFilter: "blur(4px)" }}
         onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="w-full max-w-md rounded-2xl p-5 space-y-4"
           style={{ background: "var(--stoa-surface)", border: "1px solid var(--stoa-gold-rule)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>PLAN DIFF · ΔΙΑΦΟΡΑ</div>
            <div className="stoa-mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--stoa-ink)", marginTop: 4 }}>
              {source.symbol} · {source.direction.toUpperCase()}
            </div>
          </div>
          <button onClick={onClose} style={{ color: "var(--stoa-muted)" }}><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 stoa-mono" style={{ fontSize: 12 }}>
          <Stat label="ENTRY" value={fmt(source.entry)} />
          <Stat label="R:R" value={`${fmt(calc.rr, 2)}:1`} accent />
          <Stat label="STOP" value={`${fmt(source.stop_loss)} (-${fmt(calc.stopPct, 2)}%)`} danger />
          <Stat label="TARGET" value={fmt(source.take_profit)} good />
        </div>

        <div className="rounded-lg p-3 space-y-3" style={{ border: "1px solid var(--stoa-rule)", background: "var(--stoa-bg)" }}>
          <div className="flex items-center justify-between">
            <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>YOUR ACCOUNT RISK</span>
            <span className="stoa-mono" style={{ fontSize: 13, color: "var(--stoa-ink)" }}>
              ${fmt(calc.riskDollars, 2)} <span style={{ color: "var(--stoa-muted)" }}>of ${fmt(calc.bal, 0)}</span>
            </span>
          </div>
          <input type="range" min={0.25} max={5} step={0.25} value={riskPct}
                 onChange={(e) => setRiskPct(Number(e.target.value))}
                 className="w-full" style={{ accentColor: "var(--stoa-accent)" }} />
          <div className="flex items-center justify-between stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>
            <span>0.25%</span>
            <span style={{ color: "var(--stoa-accent)", fontSize: 13 }}>{riskPct.toFixed(2)}%</span>
            <span>5%</span>
          </div>
          {source.size_pct != null && (
            <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 10 }}>
              Σοφός sized this at {source.size_pct}% · {riskPct === source.size_pct ? "you match" : `you ${riskPct > source.size_pct ? "exceed" : "undercut"}`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 stoa-mono" style={{ fontSize: 12 }}>
          <Stat label="QTY" value={fmt(calc.qty, calc.qty < 1 ? 4 : 2)} />
          <Stat label="NOTIONAL" value={`$${fmt(calc.notional, 0)} (${fmt(calc.notionalPct, 0)}%)`} />
          <Stat label="MAX LOSS" value={`-$${fmt(calc.expectedLoss, 2)}`} danger />
          <Stat label="MAX GAIN" value={`+$${fmt(calc.expectedWin, 2)}`} good />
        </div>

        {(overLeveraged || tinyQty) && (
          <div className="flex items-start gap-2 rounded-lg p-2.5" style={{ background: "color-mix(in oklab, var(--stoa-signal) 12%, transparent)", border: "1px solid var(--stoa-signal)" }}>
            <AlertTriangle size={14} style={{ color: "var(--stoa-signal)", marginTop: 2 }} />
            <div style={{ fontSize: 12, color: "var(--stoa-ink)" }}>
              {overLeveraged && "Notional exceeds 5× your balance — this would require leverage."}
              {tinyQty && "Position size rounds to near-zero. Increase risk % or wait for a tighter setup."}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 rounded-lg py-2.5 px-3"
            style={{ border: "1px solid var(--stoa-rule)", color: "var(--stoa-ink)", fontFamily: "var(--stoa-font-kicker)", fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Cancel
          </button>
          <button onClick={confirm} disabled={copying || copied || tinyQty}
            className="flex-[1.4] rounded-lg py-2.5 px-3 flex items-center justify-center gap-2"
            style={{ background: "var(--stoa-accent)", color: "var(--stoa-bg)", fontFamily: "var(--stoa-font-kicker)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", opacity: copying||copied||tinyQty ? 0.6 : 1 }}>
            {copying ? <Loader2 size={12} className="animate-spin" /> : copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Confirm & Copy"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, accent, good, danger }: { label: string; value: string; accent?: boolean; good?: boolean; danger?: boolean }) => (
  <div className="rounded-md px-2.5 py-2" style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)" }}>
    <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 9 }}>{label}</div>
    <div style={{
      color: danger ? "var(--stoa-signal)" : good ? "var(--stoa-secondary)" : accent ? "var(--stoa-accent)" : "var(--stoa-ink)",
      fontWeight: 600, marginTop: 2,
    }}>{value}</div>
  </div>
);

export default MentorPlanDiff;
