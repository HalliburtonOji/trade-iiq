import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import GlassCard from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

const leverageLevels = [1, 2, 5, 10, 25, 50];

const LeverageCalculator = () => {
  const [investment, setInvestment] = useState(1000);
  const [priceChange, setPriceChange] = useState([5]);

  return (
    <GlassCard>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Leverage Calculator</h3>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Investment ($)</label>
          <Input type="number" value={investment} onChange={(e) => setInvestment(Number(e.target.value) || 0)} className="bg-secondary/50" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Price Move: {priceChange[0]}%</label>
          <Slider value={priceChange} onValueChange={setPriceChange} min={1} max={30} step={1} />
        </div>
        <div className="space-y-1.5">
          {leverageLevels.map((lev) => {
            const profit = investment * (priceChange[0] / 100) * lev;
            const loss = investment * (priceChange[0] / 100) * lev;
            const liquidation = lev > 1 ? (100 / lev).toFixed(1) : "N/A";
            const isWiped = loss >= investment;
            return (
              <div key={lev} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${isWiped ? "bg-verdict-avoid/5 border border-verdict-avoid/10" : "bg-secondary/20"}`}>
                <span className="font-bold font-mono w-10 text-right">{lev}x</span>
                <div className="flex-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-verdict-buy">
                    <TrendingUp className="h-3 w-3" /> +${profit.toFixed(0)}
                  </span>
                  <span className="flex items-center gap-1 text-verdict-avoid">
                    <TrendingDown className="h-3 w-3" /> -${loss.toFixed(0)}
                  </span>
                </div>
                {isWiped && (
                  <span className="flex items-center gap-1 text-[9px] text-verdict-avoid">
                    <AlertTriangle className="h-3 w-3" /> LIQUIDATED
                  </span>
                )}
                {!isWiped && lev > 1 && (
                  <span className="text-[9px] text-muted-foreground">Liq: {liquidation}%</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
};

export default LeverageCalculator;
