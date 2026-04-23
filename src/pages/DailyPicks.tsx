import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import VerdictBadge from "@/components/VerdictBadge";
import { Button } from "@/components/ui/button";

interface Pick {
  symbol: string;
  type: "stock" | "crypto" | "forex";
  price: string;
  verdict: "BUY" | "WAIT" | "AVOID";
  insights: string[];
}

const todaysPicks: Pick[] = [
  { symbol: "NVDA", type: "stock", price: "$875.28", verdict: "BUY", insights: ["AI infrastructure demand accelerating beyond expectations", "Blackwell GPU production ramping successfully", "Datacenter revenue growth outpacing all competitors"] },
  { symbol: "MSFT", type: "stock", price: "$415.56", verdict: "BUY", insights: ["Azure AI adoption driving cloud reacceleration", "Copilot enterprise seats growing 40% MoM", "Safest large-cap AI play with strongest cash flows"] },
  { symbol: "BTC", type: "crypto", price: "$67,842", verdict: "BUY", insights: ["ETF inflows remain strong at $200M+/day average", "Post-halving supply shock entering acceleration phase", "On-chain metrics showing accumulation by long-term holders"] },
  { symbol: "SOL", type: "crypto", price: "$178.45", verdict: "BUY", insights: ["DEX volume consistently exceeding Ethereum L1", "Firedancer validator improving network reliability", "DeFi TVL growing 300%+ from cycle lows"] },
  { symbol: "GBP/USD", type: "forex", price: "1.2685", verdict: "BUY", insights: ["BoE holding rates higher for longer than ECB/Fed", "UK services inflation remains sticky and supportive", "Technical breakout above 1.2650 resistance confirmed"] },
  { symbol: "EUR/USD", type: "forex", price: "1.0842", verdict: "WAIT", insights: ["ECB-Fed policy divergence narrowing but unclear direction", "Range-bound between 1.08–1.09 until next CPI release", "Wait for macro catalyst before entering new positions"] },
];

const cream = { background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 } as const;

const DailyPicks = () => {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <StoaShell
      palette="delphi"
      crumb={
        <span>
          <span className="stoa-greek">Οἰωνοί</span> · Daily Picks
        </span>
      }
    >
      <div className="flex flex-col gap-2 mb-2 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">ACROPOLIS · THE OMENS · Οἰωνοί</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Daily Picks</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Οἰωνοί</span>
        </div>
        <p className="text-sm" style={{ color: "var(--stoa-muted)" }}>six signs for today · {today}</p>
      </div>
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div
          style={{
            background: "var(--stoa-shine)",
            border: "1px solid var(--stoa-rule)",
            borderLeft: "3px solid var(--stoa-accent)",
            borderRadius: 2,
            padding: 14,
          }}
        >
          <p className="text-xs" style={{ fontFamily: "Georgia, serif", color: "var(--stoa-ink)" }}>
            6 AI-curated trading opportunities across stocks, crypto, and forex. Updated daily based on technical, macro, and sentiment analysis.
          </p>
        </div>

        {todaysPicks.map((pick, i) => (
          <motion.div
            key={pick.symbol}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div
              style={{ ...cream, padding: 14 }}
              className="cursor-pointer transition-colors hover:border-[color:var(--stoa-accent)]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="stoa-mono font-bold" style={{ fontSize: 14, color: "var(--stoa-ink)" }}>{pick.symbol}</span>
                  <span className="stoa-kicker capitalize">{pick.type}</span>
                </div>
                <VerdictBadge verdict={pick.verdict} size="sm" />
              </div>
              <p className="stoa-mono font-bold mb-2" style={{ fontSize: 18, color: "var(--stoa-ink)" }}>{pick.price}</p>
              <ul className="space-y-1">
                {pick.insights.map((insight, j) => (
                  <li key={j} className="flex items-start gap-2" style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "var(--stoa-ink)" }}>
                    <span style={{ color: "var(--stoa-accent)", marginTop: 2 }}>•</span> {insight}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1 stoa-kicker" style={{ borderRadius: 2, border: "1px solid var(--stoa-rule)" }}>
                  <Plus className="h-3 w-3" /> Add to Watchlist
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </StoaShell>
  );
};

export default DailyPicks;
