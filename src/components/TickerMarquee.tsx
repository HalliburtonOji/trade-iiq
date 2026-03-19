import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useQuotes } from "@/hooks/use-quotes";
import { getFreshnessDot, getSessionLabel } from "@/types/quote";
import type { NormalizedQuote, MarqueeMode } from "@/types/quote";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const defaultSymbols = {
  stock: ["NVDA", "TSLA", "META", "AAPL", "MSFT"],
  crypto: ["BTC", "ETH", "SOL"],
};

interface TickerMarqueeProps {
  mode?: MarqueeMode;
}

const TickerMarquee = ({ mode = "default" }: TickerMarqueeProps) => {
  const { user } = useAuth();
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<MarqueeMode>(mode);

  // Fetch watchlist symbols for watchlist mode
  useEffect(() => {
    if (activeMode !== "watchlist" || !user) return;
    supabase
      .from("watchlist")
      .select("symbol")
      .eq("user_id", user.id)
      .limit(10)
      .then(({ data }) => {
        if (data?.length) setWatchlistSymbols(data.map((w: any) => w.symbol));
      });
  }, [activeMode, user]);

  const stockSymbols = useMemo(() => {
    if (activeMode === "watchlist" && watchlistSymbols.length > 0) return watchlistSymbols;
    return defaultSymbols.stock;
  }, [activeMode, watchlistSymbols]);

  const cryptoSymbols = useMemo(() => {
    if (activeMode === "watchlist") return [];
    return defaultSymbols.crypto;
  }, [activeMode]);

  const { quotes: stockQuotes } = useQuotes(stockSymbols, "stock", 5 * 60 * 1000);
  const { quotes: cryptoQuotes } = useQuotes(cryptoSymbols, "crypto", 2 * 60 * 1000);

  const allQuotes = useMemo(() => {
    const merged = { ...stockQuotes, ...cryptoQuotes };
    const allSymbols = [...stockSymbols, ...cryptoSymbols];
    return allSymbols.map(s => merged[s.toUpperCase()]).filter(Boolean) as NormalizedQuote[];
  }, [stockQuotes, cryptoQuotes, stockSymbols, cryptoSymbols]);

  // If no data yet, show placeholder
  const displayItems = allQuotes.length > 0 ? allQuotes : [...stockSymbols, ...cryptoSymbols].map(s => ({
    symbol: s,
    percent_change: null,
    freshness: "unavailable" as const,
    session_status: "closed" as const,
    asset_type: "stock" as const,
  }));

  const items = [...displayItems, ...displayItems]; // seamless loop

  const modes: { label: string; value: MarqueeMode }[] = [
    { label: "Top", value: "default" },
    { label: "Watchlist", value: "watchlist" },
  ];

  return (
    <div className="flex flex-col gap-1">
      {/* Mode selector */}
      <div className="flex items-center gap-1.5 px-1">
        {modes.map(m => (
          <button
            key={m.value}
            onClick={() => setActiveMode(m.value)}
            className={cn(
              "text-[9px] font-semibold px-2 py-0.5 rounded-full transition-all",
              activeMode === m.value
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
        {allQuotes[0] && (
          <span className="ml-auto text-[9px] text-muted-foreground/50 font-mono">
            {getSessionLabel(allQuotes[0].session_status, allQuotes[0].asset_type)}
          </span>
        )}
      </div>

      {/* Ticker strip */}
      <div className="relative overflow-hidden border-y border-border/30 py-2 no-scrollbar">
        <div className="animate-ticker flex w-max gap-6">
          {items.map((t, i) => {
            const change = "percent_change" in t ? t.percent_change : null;
            const freshness = "freshness" in t ? t.freshness : "unavailable";
            const dotColor = getFreshnessDot(freshness as any);

            return (
              <span key={i} className="flex items-center gap-1.5 text-xs font-mono font-medium whitespace-nowrap">
                {/* Freshness dot */}
                <span className={cn("h-1.5 w-1.5 rounded-full", `bg-${dotColor}`)} />
                <span className="text-foreground/80">{t.symbol}</span>
                <span
                  className={cn(
                    change == null
                      ? "text-muted-foreground"
                      : change >= 0
                      ? "text-verdict-buy"
                      : "text-verdict-avoid"
                  )}
                >
                  {change != null ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` : "—"}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TickerMarquee;
