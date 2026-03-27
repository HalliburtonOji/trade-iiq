import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from "recharts";

const strategies = [
  { name: "Long Call", desc: "Buy a call option — profit when price rises above strike + premium" },
  { name: "Long Put", desc: "Buy a put option — profit when price falls below strike - premium" },
  { name: "Covered Call", desc: "Own stock + sell call — limited upside, collect premium" },
  { name: "Bull Spread", desc: "Buy lower strike call, sell higher — capped risk and reward" },
];

const generatePayoff = (strategy: string, strike: number, premium: number) => {
  const points = [];
  const range = strike * 0.4;
  for (let p = strike - range; p <= strike + range; p += range / 25) {
    let payoff = 0;
    switch (strategy) {
      case "Long Call":
        payoff = Math.max(0, p - strike) - premium;
        break;
      case "Long Put":
        payoff = Math.max(0, strike - p) - premium;
        break;
      case "Covered Call":
        payoff = (p - strike) + Math.min(0, strike - p) + premium;
        break;
      case "Bull Spread":
        const upperStrike = strike * 1.1;
        payoff = Math.min(Math.max(0, p - strike), upperStrike - strike) - premium;
        break;
    }
    points.push({ price: Math.round(p * 100) / 100, payoff: Math.round(payoff * 100) / 100 });
  }
  return points;
};

const OptionsVisualizer = () => {
  const [selected, setSelected] = useState("Long Call");
  const [strike, setStrike] = useState(100);
  const [premium, setPremium] = useState(5);

  const data = generatePayoff(selected, strike, premium);
  const strategy = strategies.find(s => s.name === selected);

  return (
    <GlassCard>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Options Strategy Visualizer</h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {strategies.map((s) => (
          <button key={s.name} onClick={() => setSelected(s.name)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${selected === s.name ? "bg-primary/20 text-primary border border-primary/30" : "glass-card text-muted-foreground"}`}>
            {s.name}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground mb-3">{strategy?.desc}</p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Strike Price ($)</label>
          <Input type="number" value={strike} onChange={(e) => setStrike(Number(e.target.value) || 100)} className="bg-secondary/50" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Premium ($)</label>
          <Input type="number" value={premium} onChange={(e) => setPremium(Number(e.target.value) || 5)} className="bg-secondary/50" />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
          <XAxis dataKey="price" tick={{ fontSize: 9, fill: "hsl(220, 15%, 50%)" }} tickFormatter={(v) => `$${v}`} />
          <YAxis tick={{ fontSize: 9, fill: "hsl(220, 15%, 50%)" }} tickFormatter={(v) => `$${v}`} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const val = payload[0].value as number;
            return (
              <div className="glass-card px-2 py-1 text-[10px] font-mono">
                P&L: <span className={val >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}>${val}</span>
              </div>
            );
          }} />
          <ReferenceLine y={0} stroke="hsl(220, 15%, 30%)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="payoff" stroke="hsl(239, 84%, 67%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-[9px] text-muted-foreground text-center mt-2">Educational only. Not financial advice.</p>
    </GlassCard>
  );
};

export default OptionsVisualizer;
