import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface TickerItem {
  symbol: string;
  change: number;
}

const defaultTickers: TickerItem[] = [
  { symbol: "NVDA", change: 0 },
  { symbol: "BTC", change: 0 },
  { symbol: "TSLA", change: 0 },
  { symbol: "META", change: 0 },
  { symbol: "ETH", change: 0 },
  { symbol: "AAPL", change: 0 },
  { symbol: "SOL", change: 0 },
];

interface TickerMarqueeProps {
  tickers?: TickerItem[];
}

const TickerMarquee = ({ tickers: initialTickers }: TickerMarqueeProps) => {
  const [tickers, setTickers] = useState<TickerItem[]>(initialTickers || defaultTickers);

  useEffect(() => {
    if (initialTickers) return; // skip fetch if custom tickers provided
    const fetchQuotes = async () => {
      try {
        const stockSymbols = ["NVDA", "TSLA", "META", "AAPL"];
        const cryptoSymbols = ["BTC", "ETH", "SOL"];

        const { data } = await supabase.functions.invoke("live-quote", {
          body: { symbols: stockSymbols, asset_type: "stock" },
        });

        const { data: cryptoData } = await supabase.functions.invoke("live-quote", {
          body: { symbols: cryptoSymbols, asset_type: "crypto" },
        });

        const allQuotes = { ...(data?.quotes || {}), ...(cryptoData?.quotes || {}) };

        setTickers(prev => prev.map(t => {
          const quote = allQuotes[t.symbol];
          return quote?.change != null ? { ...t, change: quote.change } : t;
        }));
      } catch (e) {
        console.error("Ticker fetch error:", e);
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [initialTickers]);

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
