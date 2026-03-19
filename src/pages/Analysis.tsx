import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import VerdictBadge from "@/components/VerdictBadge";
import SetupScoreMeter from "@/components/SetupScoreMeter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analysisData, type AnalysisResult } from "@/data/analysisData";

type AssetType = "stock" | "crypto" | "forex";

const popularChips: Record<AssetType, string[]> = {
  stock: ["AAPL", "NVDA", "TSLA", "MSFT", "META"],
  crypto: ["BTC", "ETH", "SOL"],
  forex: ["EUR/USD"],
};

const Analysis = () => {
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleSearch = (symbol?: string) => {
    const s = (symbol || query).toUpperCase().trim();
    if (!s) return;
    const data = analysisData[s] || analysisData["DEFAULT"];
    setResult({ ...data, symbol: analysisData[s] ? s : s });
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-4 px-4 pt-6">
        <h1 className="text-xl font-bold">Analysis</h1>

        {/* Asset type toggle */}
        <div className="flex gap-2">
          {(["stock", "crypto", "forex"] as AssetType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setAssetType(t); setResult(null); }}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                assetType === t
                  ? "bg-primary text-primary-foreground"
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search symbol..."
              className="pl-9 bg-secondary/50 border-border/50"
            />
          </div>
          <Button onClick={() => handleSearch()} size="sm">
            Go <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        {/* Popular chips */}
        <div className="flex flex-wrap gap-1.5">
          {popularChips[assetType].map((s) => (
            <button
              key={s}
              onClick={() => { setQuery(s); handleSearch(s); }}
              className="rounded-full px-3 py-1 text-[11px] font-mono font-medium glass-card glass-card-hover text-muted-foreground hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Result */}
        {result && (
          <motion.div
            key={result.symbol}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col gap-3"
          >
            {/* Price card */}
            <GlassCard className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{result.symbol}</h2>
                <p className="text-2xl font-bold font-mono">${result.price.toFixed(2)}</p>
                <p className={`text-sm font-mono ${result.change >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                  {result.change >= 0 ? "+" : ""}{result.change.toFixed(2)}%
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <VerdictBadge verdict={result.verdict} size="lg" />
                <SetupScoreMeter score={result.setupScore} size="sm" />
              </div>
            </GlassCard>

            {/* Summary */}
            <GlassCard>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
            </GlassCard>

            {/* Tabs */}
            <Tabs defaultValue="verdict" className="w-full">
              <TabsList className="w-full bg-secondary/50">
                <TabsTrigger value="verdict" className="flex-1 text-xs">Verdict</TabsTrigger>
                <TabsTrigger value="technicals" className="flex-1 text-xs">Technicals</TabsTrigger>
                <TabsTrigger value="macro" className="flex-1 text-xs">Macro</TabsTrigger>
                <TabsTrigger value="targets" className="flex-1 text-xs">Targets</TabsTrigger>
              </TabsList>

              <TabsContent value="verdict" className="mt-3 flex flex-col gap-3">
                <GlassCard>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Risk Score</span>
                    <span className="text-sm font-bold font-mono">{result.riskScore}/10</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${result.riskScore * 10}%`,
                        backgroundColor: result.riskScore <= 4 ? "hsl(var(--verdict-buy))" : result.riskScore <= 7 ? "hsl(var(--verdict-wait))" : "hsl(var(--verdict-avoid))",
                      }}
                    />
                  </div>
                </GlassCard>
                <GlassCard>
                  <span className="text-xs text-muted-foreground mb-2 block">Key Points</span>
                  <ul className="space-y-1.5">
                    {result.macroPoints.map((p, i) => (
                      <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span> {p}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </TabsContent>

              <TabsContent value="technicals" className="mt-3">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.technicals).map(([key, val]) => (
                    <GlassCard key={key} className="p-3">
                      <span className="text-[10px] text-muted-foreground uppercase">{key}</span>
                      <p className="text-sm font-bold font-mono mt-0.5">{val}</p>
                    </GlassCard>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="macro" className="mt-3 flex flex-col gap-2">
                {result.macroFactors.map((f, i) => (
                  <GlassCard key={i} className="flex items-start gap-3 p-3">
                    <span className="text-lg">{f.icon}</span>
                    <div>
                      <p className="text-xs font-semibold">{f.label}</p>
                      <p className="text-[11px] text-muted-foreground">{f.detail}</p>
                    </div>
                  </GlassCard>
                ))}
              </TabsContent>

              <TabsContent value="targets" className="mt-3">
                <GlassCard>
                  <div className="flex justify-between text-center">
                    <div>
                      <span className="text-[10px] text-verdict-avoid font-medium">Bear</span>
                      <p className="text-sm font-bold font-mono">${result.targets.bear}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-verdict-wait font-medium">Base</span>
                      <p className="text-sm font-bold font-mono">${result.targets.base}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-verdict-buy font-medium">Bull</span>
                      <p className="text-sm font-bold font-mono">${result.targets.bull}</p>
                    </div>
                  </div>
                </GlassCard>
              </TabsContent>
            </Tabs>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 text-xs" size="sm">
                Add to Watchlist
              </Button>
              <Button className="flex-1 text-xs" size="sm" onClick={() => window.location.href = "/tracker"}>
                Log Decision
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
};

export default Analysis;
