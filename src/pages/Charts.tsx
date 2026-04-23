import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
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

const cream = { background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 } as const;

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
    <StoaShell
      palette="delphi"
      crumb={
        <span>
          <span className="stoa-greek">Γραμμαί</span> · Charts
        </span>
      }
    >
      <div className="flex flex-col gap-2 mb-2 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">ACROPOLIS · THE LINES · Γραμμαί</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Charts</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Γραμμαί</span>
        </div>
        <p className="text-sm" style={{ color: "var(--stoa-muted)" }}>TradingView under the colonnade</p>
      </div>
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        {/* Asset tabs */}
        <div className="flex gap-2">
          {(["stock", "crypto", "forex"] as AssetTab[]).map((t) => {
            const active = assetTab === t;
            return (
              <button
                key={t}
                onClick={() => setAssetTab(t)}
                className="px-4 py-1.5 text-xs capitalize stoa-kicker transition-all"
                style={{
                  background: active ? "var(--stoa-accent)" : "var(--stoa-shine)",
                  color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                  border: "1px solid var(--stoa-rule)",
                  borderRadius: 2,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--stoa-muted)" }} />
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search symbol..."
              className="pl-9"
              style={cream}
            />
          </div>
          <Button
            onClick={handleSearch}
            size="sm"
            className="stoa-display"
            style={{ background: "var(--stoa-accent)", color: "var(--stoa-ink)", border: "none", borderRadius: 2 }}
          >
            Go
          </Button>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          {quickChips[assetTab].map((s) => {
            const active = symbol === s;
            return (
              <button
                key={s}
                onClick={() => { setSymbol(s); setInputVal(""); }}
                className="px-3 py-1 text-[11px] stoa-mono font-medium transition-all"
                style={{
                  background: active ? "var(--stoa-accent)" : "var(--stoa-shine)",
                  color: active ? "var(--stoa-ink)" : "var(--stoa-ink)",
                  border: "1px solid var(--stoa-rule)",
                  borderRadius: 2,
                }}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* TradingView chart */}
        <div style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, overflow: "hidden", height: "clamp(400px, 60vh, 700px)" }}>
          <div
            ref={containerRef}
            className="tradingview-widget-container"
            style={{ height: "100%", width: "100%" }}
          />
        </div>

        <p className="text-[10px] text-center stoa-kicker">
          Charts powered by TradingView. Not financial advice.
        </p>
      </div>
    </StoaShell>
  );
};

export default Charts;
