import { useState, useMemo } from "react";
import { Calculator, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const InteractiveCalculator = () => {
  const navigate = useNavigate();
  const [accountSize, setAccountSize] = useState(50000);
  const [stopDistance, setStopDistance] = useState(2);
  const [riskPercent, setRiskPercent] = useState(1);

  const result = useMemo(() => {
    const riskDollars = (accountSize * riskPercent) / 100;
    const shares = stopDistance > 0 ? Math.floor(riskDollars / stopDistance) : 0;
    const maxLoss = shares * stopDistance;
    const accountImpact = accountSize > 0 ? (maxLoss / accountSize) * 100 : 0;
    return { riskDollars, shares, maxLoss, accountImpact };
  }, [accountSize, stopDistance, riskPercent]);

  const riskTone =
    riskPercent < 1
      ? "text-verdict-buy bg-verdict-buy/10 border-verdict-buy/20"
      : riskPercent <= 2
      ? "text-verdict-wait bg-verdict-wait/10 border-verdict-wait/20"
      : "text-verdict-avoid bg-verdict-avoid/10 border-verdict-avoid/20";

  const riskLabel =
    riskPercent < 1 ? "Conservative" : riskPercent <= 2 ? "Moderate" : "Aggressive";

  return (
    <GlassCard className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Calculator className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold">Position Sizing Calculator</p>
          <p className="text-[10px] text-muted-foreground">Live recalculates as you type</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Account Size ($)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={accountSize}
            onChange={(e) => setAccountSize(Math.max(0, parseFloat(e.target.value) || 0))}
            className="bg-secondary/50 h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Stop Distance ($)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={stopDistance}
            onChange={(e) => setStopDistance(Math.max(0, parseFloat(e.target.value) || 0))}
            className="bg-secondary/50 h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Risk %</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={riskPercent}
            onChange={(e) => setRiskPercent(Math.max(0, parseFloat(e.target.value) || 0))}
            className="bg-secondary/50 h-9 text-sm"
          />
        </div>
      </div>

      <motion.div
        key={`${result.shares}-${result.maxLoss}`}
        initial={{ opacity: 0.6, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-3 gap-2 mb-3"
      >
        <div className="rounded-lg bg-secondary/40 border border-border/40 p-2.5">
          <p className="text-[10px] text-muted-foreground">Position Size</p>
          <p className="text-base font-bold font-mono text-primary">{result.shares.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">shares</p>
        </div>
        <div className="rounded-lg bg-secondary/40 border border-border/40 p-2.5">
          <p className="text-[10px] text-muted-foreground">Max Loss</p>
          <p className="text-base font-bold font-mono">${result.maxLoss.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground">at stop</p>
        </div>
        <div className={`rounded-lg border p-2.5 ${riskTone}`}>
          <p className="text-[10px] opacity-80">Account Impact</p>
          <p className="text-base font-bold font-mono">{result.accountImpact.toFixed(2)}%</p>
          <p className="text-[9px] opacity-80">{riskLabel}</p>
        </div>
      </motion.div>

      <Button
        size="sm"
        className="w-full gap-2 h-9"
        onClick={() => navigate("/tracker")}
      >
        Use this in my next trade <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </GlassCard>
  );
};

export default InteractiveCalculator;
