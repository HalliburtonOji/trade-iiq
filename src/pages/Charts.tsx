import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AssetTab = "stock" | "crypto" | "forex";

const exchangePrefix: Record<AssetTab, string> = {
  stock: "",
  crypto: "BINANCE:",
  forex: "FX:",
};

const defaultSymbols: Record<AssetTab, string> = {
  stock: "AAPL",
  crypto: "BTCUSDT",
  forex: "EURUSD",
};

const quickChips: Record<AssetTab, string[]> = {
  stock: ["AAPL", "NVDA", "TSLA", "MSFT", "META", "GOOGL", "AMZN"],
  crypto: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
  forex: ["EURUSD", "GBPUSD", "USDJPY"],
};

const Charts = () => {
  const [assetTab, setAssetTab] = useState<AssetTab>("stock");
  const [symbol, setSymbol] = useState(defaultSymbols.stock);
  const [inputVal, setInputVal] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const loadWidget = (sym: string) => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const fullSymbol = assetTab === "stock" ? sym : `${exchangePrefix[assetTab]}${sym}`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: fullSymbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(8, 12, 24, 1)",
      gridColor: "rgba(255, 255, 255, 0.04)",
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_volume: false,
      studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
    });

    containerRef.current.appendChild(script);
  };

  useEffect(() => {
    const s = defaultSymbols[assetTab];
    setSymbol(s);
    setInputVal("");
    loadWidget(s);
  }, [assetTab]);

  useEffect(() => {
    loadWidget(symbol);
  }, [symbol]);

  const handleSearch = () => {
    const s = inputVal.trim().toUpperCase();
    if (s) {
      setSymbol(s);
      setInputVal("");
    }
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        <h1 className="text-xl font-bold">Live Charts</h1>

        {/* Asset tabs */}
        <div className="flex gap-2">
          {(["stock", "crypto", "forex"] as AssetTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setAssetTab(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                assetTab === t
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                  : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search symbol..."
              className="pl-9 bg-secondary/50 border-border/50"
            />
          </div>
          <Button onClick={handleSearch} size="sm">Go</Button>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          {quickChips[assetTab].map((s) => (
            <button
              key={s}
              onClick={() => { setSymbol(s); setInputVal(""); }}
              className={`rounded-full px-3 py-1 text-[11px] font-mono font-medium transition-all ${
                symbol === s
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "glass-card glass-card-hover text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* TradingView chart */}
        <div className="rounded-2xl overflow-hidden border border-border/30 bg-card" style={{ height: "clamp(400px, 60vh, 700px)" }}>
          <div
            ref={containerRef}
            className="tradingview-widget-container"
            style={{ height: "100%", width: "100%" }}
          />
        </div>

        <p className="text-[10px] text-muted-foreground/50 text-center">
          Charts powered by TradingView. Not financial advice.
        </p>
      </div>
    </PageShell>
  );
};

export default Charts;
