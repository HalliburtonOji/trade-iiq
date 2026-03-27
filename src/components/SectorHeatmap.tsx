import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/utils";

const sectors = [
  { name: "Tech", change: 2.1, symbols: ["AAPL", "NVDA", "MSFT", "GOOGL", "META"] },
  { name: "Finance", change: 0.8, symbols: ["JPM", "BAC", "GS"] },
  { name: "Healthcare", change: -0.4, symbols: ["JNJ", "UNH", "PFE"] },
  { name: "Energy", change: 1.5, symbols: ["XOM", "CVX"] },
  { name: "Consumer", change: -0.2, symbols: ["AMZN", "WMT", "KO", "PEP"] },
  { name: "Industrial", change: 0.3, symbols: ["BA", "CAT", "GE"] },
  { name: "Crypto", change: 3.4, symbols: ["BTC", "ETH", "SOL"] },
  { name: "Commodities", change: -1.1, symbols: ["GOLD", "SILVER"] },
];

interface Props {
  onSelectSymbol?: (symbol: string) => void;
}

const SectorHeatmap = ({ onSelectSymbol }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <GlassCard>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sector Heatmap</h3>
      <div className="grid grid-cols-4 gap-1.5">
        {sectors.map((s) => {
          const intensity = Math.min(Math.abs(s.change) * 15, 80);
          const bg = s.change >= 0
            ? `rgba(34, 197, 94, ${intensity / 100})`
            : `rgba(239, 68, 68, ${intensity / 100})`;
          return (
            <button key={s.name} onClick={() => setExpanded(expanded === s.name ? null : s.name)}
              className="rounded-lg p-3 text-center transition-all hover:scale-105" style={{ background: bg }}>
              <p className="text-[10px] font-semibold text-foreground">{s.name}</p>
              <p className={cn("text-xs font-bold font-mono", s.change >= 0 ? "text-verdict-buy" : "text-verdict-avoid")}>
                {s.change >= 0 ? "+" : ""}{s.change}%
              </p>
            </button>
          );
        })}
      </div>
      {expanded && (() => {
        const sector = sectors.find(s => s.name === expanded);
        if (!sector) return null;
        return (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sector.symbols.map((sym) => (
              <button key={sym} onClick={() => onSelectSymbol?.(sym)}
                className="rounded-full px-3 py-1 text-[11px] font-mono font-medium glass-card glass-card-hover text-muted-foreground hover:text-foreground">
                {sym}
              </button>
            ))}
          </div>
        );
      })()}
    </GlassCard>
  );
};

export default SectorHeatmap;
