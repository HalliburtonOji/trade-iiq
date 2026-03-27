import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import GlassCard from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

const RiskSimulator = () => {
  const [portfolio, setPortfolio] = useState(10000);
  const [dropPercent, setDropPercent] = useState([20]);

  const loss = portfolio * (dropPercent[0] / 100);
  const remaining = portfolio - loss;
  const recoveryNeeded = remaining > 0 ? ((portfolio / remaining - 1) * 100) : Infinity;

  return (
    <GlassCard>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" /> Risk Simulator
      </h3>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Portfolio Value ($)</label>
          <Input type="number" value={portfolio} onChange={(e) => setPortfolio(Number(e.target.value) || 0)} className="bg-secondary/50" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Drawdown: {dropPercent[0]}%</label>
          <Slider value={dropPercent} onValueChange={setDropPercent} min={5} max={90} step={5} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-verdict-avoid/5 border border-verdict-avoid/10">
            <p className="text-lg font-bold font-mono text-verdict-avoid">-${loss.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Loss</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/30">
            <p className="text-lg font-bold font-mono">${remaining.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Remaining</p>
          </div>
          <div className="p-2 rounded-lg bg-verdict-wait/5 border border-verdict-wait/10">
            <p className="text-lg font-bold font-mono text-verdict-wait">{recoveryNeeded === Infinity ? "∞" : `${recoveryNeeded.toFixed(0)}%`}</p>
            <p className="text-[9px] text-muted-foreground">To Recover</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          A {dropPercent[0]}% loss requires a {recoveryNeeded === Infinity ? "impossible" : `${recoveryNeeded.toFixed(0)}%`} gain to recover. This is why risk management matters.
        </p>
      </div>
    </GlassCard>
  );
};

export default RiskSimulator;
