import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Plus, Star, Camera, ExternalLink, Loader2, Calendar, Newspaper } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import VerdictBadge from "@/components/VerdictBadge";
import SetupScoreMeter from "@/components/SetupScoreMeter";
import ChartAnalyzer from "@/components/ChartAnalyzer";
import EconomicCalendar from "@/components/EconomicCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { analysisData, type AnalysisResult } from "@/data/analysisData";
import { allSymbols, searchSymbols, type SymbolInfo } from "@/data/symbolLists";
import MarketSignals from "@/components/MarketSignals";
import BrokerLauncher from "@/components/BrokerLauncher";
import SentimentPoll from "@/components/SentimentPoll";
import SymbolCompare from "@/components/SymbolCompare";

type AssetType = "stock" | "crypto" | "forex";

const Analysis = () => {
  const [activeTab, setActiveTab] = useState<"search" | "chart">("search");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [query, setQuery] = useState(searchParams.get("symbol") || "");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [brokerOpen, setBrokerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  // Load from URL params on mount
  useEffect(() => {
    const sym = searchParams.get("symbol");
    if (sym) {
      setQuery(sym);
      handleSearch(sym);
    }
  }, []);

  const handleSearch = async (symbol?: string) => {
    const s = (symbol || query).toUpperCase().trim();
    if (!s) return;
    setQuery(s);
    setComboOpen(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-symbol", {
        body: { symbol: s, asset_type: assetType },
      });

      if (error) throw error;

      if (data && data.verdict) {
        setResult(data as AnalysisResult);
      } else if (data?.error) {
        // Fallback to static data
        const fallback = analysisData[s] || analysisData["DEFAULT"];
        setResult({ ...fallback, symbol: s });
        toast({ title: "Using cached data", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      console.error("Analysis error:", e);
      // Fallback to static
      const fallback = analysisData[s] || analysisData["DEFAULT"];
      setResult({ ...fallback, symbol: s });
      if (e?.message?.includes("429")) {
        toast({ title: "Rate limited", description: "Please try again in a moment.", variant: "destructive" });
      } else {
        toast({ title: "Using cached analysis", description: "Live analysis unavailable right now." });
      }
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async () => {
    if (!result || !user) return;
    const { error } = await supabase.from("watchlist").upsert({
      user_id: user.id,
      symbol: result.symbol,
      name: result.symbol,
      type: assetType,
    }, { onConflict: "user_id,symbol" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Added to watchlist", description: `${result.symbol} is now on your watchlist.` });
  };

  const filteredSymbols = searchSymbols(searchTerm, assetType);

  return (
    <PageShell>
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Analysis</h1>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setShowCalendar(!showCalendar)}>
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </Button>
        </div>

        {/* Economic Calendar */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <EconomicCalendar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("search")} className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === "search" ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]" : "glass-card text-muted-foreground hover:text-foreground"}`}>
            <Search className="h-3.5 w-3.5" /> Search
          </button>
          <button onClick={() => setActiveTab("chart")} className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === "chart" ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]" : "glass-card text-muted-foreground hover:text-foreground"}`}>
            <Camera className="h-3.5 w-3.5" /> 📸 Chart
          </button>
        </div>

        {activeTab === "chart" ? (
          <ChartAnalyzer />
        ) : (
          <>
            {/* Asset type tabs */}
            <div className="flex gap-2">
              {(["stock", "crypto", "forex"] as AssetType[]).map((t) => (
                <button key={t} onClick={() => { setAssetType(t); setResult(null); setQuery(""); }} className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${assetType === t ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]" : "glass-card text-muted-foreground hover:text-foreground"}`}>{t}</button>
              ))}
            </div>

            {/* Searchable symbol dropdown */}
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-left font-normal bg-secondary/50 border-border/50">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className={query ? "text-foreground" : "text-muted-foreground"}>
                      {query || "Search any symbol..."}
                    </span>
                  </div>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={`Search ${assetType} symbols...`}
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-3 text-center">
                        <p className="text-sm text-muted-foreground">No match found</p>
                        {searchTerm && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 text-xs"
                            onClick={() => {
                              setQuery(searchTerm.toUpperCase());
                              setComboOpen(false);
                              handleSearch(searchTerm);
                            }}
                          >
                            Analyze "{searchTerm.toUpperCase()}" anyway →
                          </Button>
                        )}
                      </div>
                    </CommandEmpty>
                    <CommandGroup heading={`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} Symbols`}>
                      {filteredSymbols.slice(0, 20).map((sym) => (
                        <CommandItem
                          key={sym.symbol}
                          value={`${sym.symbol} ${sym.name}`}
                          onSelect={() => {
                            setQuery(sym.symbol);
                            setSearchTerm("");
                            setComboOpen(false);
                            handleSearch(sym.symbol);
                          }}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">{sym.symbol}</span>
                            <span className="text-xs text-muted-foreground truncate">{sym.name}</span>
                          </div>
                          {sym.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{sym.category}</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5">
              {allSymbols[assetType]?.slice(0, 8).map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => { setQuery(s.symbol); handleSearch(s.symbol); }}
                  className="rounded-full px-3 py-1 text-[11px] font-mono font-medium glass-card glass-card-hover text-muted-foreground hover:text-foreground transition-all"
                >
                  {s.symbol}
                </button>
              ))}
            </div>

            {/* Loading state */}
            {loading && !result && (
              <GlassCard className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating AI analysis for {query}...</p>
                <p className="text-[10px] text-muted-foreground/60">Fetching live data & running analysis</p>
              </GlassCard>
            )}

            {/* Results */}
            {result && !loading && (
              <motion.div key={result.symbol} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] as const }} className="flex flex-col gap-3">
                <GlassCard className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{result.symbol}</h2>
                    <p className="text-2xl font-bold font-mono">
                      {typeof result.price === 'number' && result.price > 0
                        ? `$${result.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : <span className="text-muted-foreground text-base">Price unavailable</span>}
                    </p>
                    {typeof result.price === 'number' && result.price > 0 && (
                      <p className={`text-sm font-mono font-medium ${(result.change || 0) >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                        {(result.change || 0) >= 0 ? "+" : ""}{(result.change || 0).toFixed(2)}%
                      </p>
                    )}
                    {(result as any).source && (
                      <span className="text-[9px] text-muted-foreground/50 font-mono">
                        {(result as any).source === "ai" ? "🤖 Live AI" : (result as any).source === "cache" ? `📦 Cached (${(result as any).cache_age_minutes}m)` : "📊 Static"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <VerdictBadge verdict={result.verdict} size="lg" />
                    <SetupScoreMeter score={result.setupScore} size="sm" />
                    <span className="text-[10px] text-muted-foreground">Setup Score</span>
                  </div>
                </GlassCard>

                <GlassCard className="bg-primary/3">
                  <p className="text-sm text-foreground/80 leading-relaxed">{result.summary}</p>
                </GlassCard>

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
                      <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.riskScore * 10}%` }}
                          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                          className="h-full rounded-full transition-all"
                          style={{ backgroundColor: result.riskScore <= 4 ? "hsl(var(--verdict-buy))" : result.riskScore <= 7 ? "hsl(var(--verdict-wait))" : "hsl(var(--verdict-avoid))" }}
                        />
                      </div>
                    </GlassCard>
                    <GlassCard>
                      <span className="text-xs text-muted-foreground mb-2 block">Key Points</span>
                      <ul className="space-y-1.5">
                        {(result.macroPoints || []).map((p, i) => (
                          <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {p}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  </TabsContent>

                  <TabsContent value="technicals" className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(result.technicals || {}).map(([key, val]) => (
                        <GlassCard key={key} className="p-3">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{key}</span>
                          <p className="text-sm font-bold font-mono mt-0.5">{String(val)}</p>
                        </GlassCard>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="macro" className="mt-3 flex flex-col gap-2">
                    {(result.macroFactors || []).map((f, i) => (
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
                        <div className="flex-1">
                          <span className="text-[10px] text-verdict-avoid font-medium block">🐻 Bear</span>
                          <p className="text-sm font-bold font-mono mt-1">${(result.targets?.bear || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex-1 border-x border-border/30">
                          <span className="text-[10px] text-verdict-wait font-medium block">📊 Base</span>
                          <p className="text-sm font-bold font-mono mt-1">${(result.targets?.base || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] text-verdict-buy font-medium block">🐂 Bull</span>
                          <p className="text-sm font-bold font-mono mt-1">${(result.targets?.bull || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </TabsContent>
                </Tabs>

                {/* AI Market Signals */}
                <MarketSignals symbol={result.symbol} assetType={assetType} livePrice={result.price} />

                {/* Community Sentiment */}
                <SentimentPoll symbol={result.symbol} />

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-xs gap-1.5" size="sm" onClick={addToWatchlist}>
                    <Star className="h-3.5 w-3.5" /> Watchlist
                  </Button>
                  <Button variant="outline" className="flex-1 text-xs gap-1.5" size="sm" onClick={() => setBrokerOpen(true)}>
                    <ExternalLink className="h-3.5 w-3.5" /> Execute
                  </Button>
                  <Button className="flex-1 text-xs" size="sm" onClick={() => navigate("/tracker")}>
                    Log Decision
                  </Button>
                </div>

                <BrokerLauncher
                  open={brokerOpen}
                  onOpenChange={setBrokerOpen}
                  symbol={result.symbol}
                  decision={result.verdict}
                  price={result.price}
                  assetType={assetType}
                />
              </motion.div>
            )}

            {/* Symbol Compare */}
            <SymbolCompare />
          </>
        )}
      </div>
    </PageShell>
  );
};

export default Analysis;
