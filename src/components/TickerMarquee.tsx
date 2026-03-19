import { cn } from "@/lib/utils";

interface TickerItem {
  symbol: string;
  change: number;
}

const defaultTickers: TickerItem[] = [
  { symbol: "NVDA", change: 4.2 },
  { symbol: "BTC", change: 2.8 },
  { symbol: "TSLA", change: -1.6 },
  { symbol: "META", change: 3.1 },
  { symbol: "ETH", change: -0.9 },
  { symbol: "AAPL", change: 0.8 },
  { symbol: "SOL", change: 4.1 },
];

interface TickerMarqueeProps {
  tickers?: TickerItem[];
}

const TickerMarquee = ({ tickers = defaultTickers }: TickerMarqueeProps) => {
  const items = [...tickers, ...tickers]; // duplicate for seamless loop

  return (
    <div className="relative overflow-hidden border-y border-border/30 py-2.5 no-scrollbar">
      <div className="animate-ticker flex w-max gap-6">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs font-mono font-medium whitespace-nowrap">
            <span className="text-foreground/80">{t.symbol}</span>
            <span
              className={cn(
                t.change >= 0 ? "text-verdict-buy" : "text-verdict-avoid"
              )}
            >
              {t.change >= 0 ? "+" : ""}
              {t.change.toFixed(1)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default TickerMarquee;
