import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Plus, Star, Camera, ExternalLink, Loader2, Calendar, Newspaper } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import Meander from "@/components/stoa/Meander";
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
  const isMobile = useIsMobile();
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

  const [watchlistSaving, setWatchlistSaving] = useState(false);
  const [watchlistSaved, setWatchlistSaved] = useState(false);

  // Reset saved state when result changes
  useEffect(() => { setWatchlistSaved(false); }, [result?.symbol]);

  const addToWatchlist = async () => {
    if (!result || !user) return;
    setWatchlistSaving(true);
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from("watchlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("symbol", result.symbol)
        .maybeSingle();

      if (existing) {
        setWatchlistSaved(true);
        toast({ title: "Already saved", description: `${result.symbol} is already on your watchlist.` });
        setWatchlistSaving(false);
        return;
      }

      const { error } = await supabase.from("watchlist").insert({
        user_id: user.id,
        symbol: result.symbol,
        name: result.symbol,
        type: assetType,
      });

      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
      } else {
        // Verify it was saved
        const { data: verify } = await supabase
          .from("watchlist")
          .select("id")
          .eq("user_id", user.id)
          .eq("symbol", result.symbol)
          .maybeSingle();

        if (verify) {
          setWatchlistSaved(true);
          toast({ title: "Added to watchlist", description: `${result.symbol} is now on your watchlist.` });
        } else {
          toast({ title: "Save failed", description: "Could not verify the item was saved. Please try again.", variant: "destructive" });
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    }
    setWatchlistSaving(false);
  };

  const filteredSymbols = searchSymbols(searchTerm, assetType);

  return (
    <StoaShell
      palette="delphi"
      crumb={
        <span>
          <span className="stoa-greek">Σκέψις</span> · Analysis
        </span>
      }
    >
      <div className="flex flex-col gap-2 mb-2 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">ACROPOLIS · THE ORACLE'S READING</span>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="stoa-display font-semibold" style={{ fontSize: isMobile ? 28 : 34, lineHeight: 1.05, color: "var(--stoa-ink)" }}>Analysis</h1>
          <span className="stoa-greek" style={{ fontSize: 18, color: "var(--stoa-muted)" }}>Σκέψις</span>
        </div>
        <p style={{ fontFamily: "Georgia, 'EB Garamond', serif", fontStyle: "italic", fontSize: 14, color: "var(--stoa-muted)" }}>
          enter a symbol — receive a verdict
        </p>
        <div style={{ marginTop: 14, marginBottom: 4 }}>
          <Meander height={18} opacity={0.55} />
        </div>
      </div>

      <div className="flex flex-col gap-5 pb-24" style={{ minWidth: 0 }}>
        {/* ---------- Calendar bar ---------- */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 0",
            borderTop: "1px solid var(--stoa-rule)",
            borderBottom: "1px solid var(--stoa-rule)",
          }}
        >
          <span className="stoa-kicker" style={{ fontSize: 11 }}>Economic calendar · Ἡμερολόγιον</span>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="stoa-display"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: showCalendar ? "var(--stoa-ink)" : "var(--stoa-muted)",
              background: "transparent",
              border: "1px solid var(--stoa-rule)",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            <Calendar className="h-3.5 w-3.5" />
            {showCalendar ? "Close" : "Open"}
          </button>
        </div>

        {/* Economic Calendar */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
              <EconomicCalendar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Mode toggle ---------- */}
        <div style={{ borderTop: "1px solid var(--stoa-rule)", paddingTop: 10 }}>
          <div className="stoa-kicker" style={{ fontSize: 10, marginBottom: 8 }}>Mode</div>
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--stoa-rule)" }}>
            {[
              { key: "search" as const, label: "Search", greek: "Ζήτησις", Icon: Search },
              { key: "chart" as const, label: "Chart", greek: "Γραφή", Icon: Camera },
            ].map(({ key, label, greek, Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className="stoa-display"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                    background: "transparent",
                    border: "none",
                    borderBottom: active ? "2px solid var(--stoa-accent)" : "2px solid transparent",
                    marginBottom: -1,
                    cursor: "pointer",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                  <span className="stoa-greek" style={{ fontSize: 12, color: active ? "var(--stoa-accent)" : "var(--stoa-muted)", opacity: active ? 0.85 : 0.6 }}>· {greek}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "chart" ? (
          <ChartAnalyzer />
        ) : (
          <>
            {/* ---------- Pythia's Plinth ---------- */}
            <div
              style={{
                position: "relative",
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                padding: isMobile ? "22px 16px" : "26px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {/* top + bottom gold rules */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--stoa-accent)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "var(--stoa-accent)" }} />

              <div className="stoa-kicker" style={{ fontSize: 11 }}>THE INQUIRY · Ζήτησις</div>

              {/* Asset · Γένος */}
              <div>
                <div className="stoa-kicker" style={{ fontSize: 10, marginBottom: 8 }}>Asset · Γένος</div>
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--stoa-rule)" }}>
                  {(["stock", "crypto", "forex"] as AssetType[]).map((t) => {
                    const active = assetType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => { setAssetType(t); setResult(null); setQuery(""); }}
                        className="stoa-display"
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          fontSize: 13,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                          background: "transparent",
                          border: "none",
                          borderBottom: active ? "2px solid var(--stoa-accent)" : "2px solid transparent",
                          marginBottom: -1,
                          cursor: "pointer",
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Symbol · Σύμβολον */}
              <div>
                <div className="stoa-kicker" style={{ fontSize: 10, marginBottom: 8 }}>Symbol · Σύμβολον</div>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="stoa-mono"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "12px 14px",
                        fontSize: 15,
                        letterSpacing: "0.04em",
                        color: query ? "var(--stoa-ink)" : "var(--stoa-muted)",
                        background: "transparent",
                        border: "1px solid var(--stoa-rule)",
                        borderRadius: 2,
                        cursor: "pointer",
                        textTransform: "uppercase",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <Search className="h-4 w-4" style={{ color: "var(--stoa-muted)", flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {query || "Consult any symbol…"}
                        </span>
                      </span>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--stoa-accent)", flexShrink: 0 }} />
                      ) : (
                        <ArrowRight className="h-4 w-4" style={{ color: "var(--stoa-muted)", flexShrink: 0 }} />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder={`Search ${assetType} symbols…`}
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-3 text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                            <p className="stoa-kicker" style={{ fontSize: 10 }}>No match · Οὐδέν</p>
                            {searchTerm && (
                              <button
                                onClick={() => {
                                  setQuery(searchTerm.toUpperCase());
                                  setComboOpen(false);
                                  handleSearch(searchTerm);
                                }}
                                className="stoa-display"
                                style={{
                                  padding: "6px 12px",
                                  fontSize: 11,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: "var(--stoa-accent)",
                                  background: "transparent",
                                  border: "1px solid var(--stoa-accent)",
                                  borderRadius: 2,
                                  cursor: "pointer",
                                }}
                              >
                                Consult "{searchTerm.toUpperCase()}" anyway
                              </button>
                            )}
                          </div>
                        </CommandEmpty>
                        <CommandGroup
                          heading={
                            <div style={{ borderTop: "1px solid var(--stoa-rule)", paddingTop: 6 }}>
                              <span className="stoa-kicker" style={{ fontSize: 10 }}>
                                {assetType.charAt(0).toUpperCase() + assetType.slice(1)} · Σύμβολα
                              </span>
                            </div>
                          }
                        >
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
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="stoa-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--stoa-ink)" }}>{sym.symbol}</span>
                                <span style={{ fontSize: 11, color: "var(--stoa-muted)", fontFamily: "Georgia, serif", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sym.name}</span>
                              </div>
                              {sym.category && (
                                <span className="stoa-kicker" style={{ fontSize: 9, padding: "2px 6px", border: "1px solid var(--stoa-rule)", color: "var(--stoa-accent)", flexShrink: 0 }}>{sym.category}</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Previously consulted · Χρηστήριον */}
              <div>
                <div className="stoa-kicker" style={{ fontSize: 10, marginBottom: 8 }}>Previously consulted · Χρηστήριον</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {allSymbols[assetType]?.slice(0, 8).map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => { setQuery(s.symbol); handleSearch(s.symbol); }}
                      className="stoa-mono"
                      style={{
                        padding: "5px 10px",
                        fontSize: 11,
                        letterSpacing: "0.04em",
                        color: "var(--stoa-muted)",
                        background: "transparent",
                        border: "1px solid var(--stoa-rule)",
                        borderRadius: 2,
                        cursor: "pointer",
                      }}
                    >
                      {s.symbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ---------- Loading state ---------- */}
            {loading && !result && (
              <div
                style={{
                  background: "var(--stoa-shine)",
                  border: "1px solid var(--stoa-rule)",
                  borderRadius: 2,
                  padding: "44px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--stoa-accent)" }} />
                <p style={{ margin: 0, fontFamily: "Georgia, 'EB Garamond', serif", fontStyle: "italic", fontSize: 15, color: "var(--stoa-ink)" }}>
                  Consulting the oracle on {query}…
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--stoa-muted)", fontStyle: "italic" }}>
                  fetching live data &amp; running analysis
                </p>
              </div>
            )}

            {/* ---------- Results ---------- */}
            {result && !loading && (
              <motion.div
                key={result.symbol}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] as const }}
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                {/* THE STELE · Στήλη */}
                <div
                  style={{
                    position: "relative",
                    background: "var(--stoa-shine)",
                    border: "1px solid var(--stoa-rule)",
                    borderRadius: 2,
                    padding: isMobile ? "22px 18px" : "26px 24px",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    justifyContent: "space-between",
                    gap: isMobile ? 18 : 24,
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--stoa-accent)" }} />

                  {/* LEFT */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
                    <span className="stoa-kicker" style={{ fontSize: 10 }}>THE STELE · Στήλη</span>
                    <h2
                      className="stoa-display"
                      style={{
                        margin: 0,
                        fontSize: isMobile ? 34 : 42,
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                        lineHeight: 1,
                        color: "var(--stoa-ink)",
                      }}
                    >
                      {result.symbol}
                    </h2>
                    <p className="stoa-mono" style={{ margin: 0, fontSize: 30, fontWeight: 600, color: "var(--stoa-ink)", lineHeight: 1.1 }}>
                      {typeof result.price === 'number' && result.price > 0
                        ? `$${result.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : <span style={{ fontSize: 16, color: "var(--stoa-muted)", fontStyle: "italic", fontFamily: "Georgia, serif" }}>Price unavailable</span>}
                    </p>
                    {typeof result.price === 'number' && result.price > 0 && (
                      <p
                        className="stoa-mono"
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 500,
                          color: (result.change || 0) >= 0 ? "hsl(var(--verdict-buy))" : "hsl(var(--verdict-avoid))",
                        }}
                      >
                        {(result.change || 0) >= 0 ? "+" : ""}{(result.change || 0).toFixed(2)}%
                      </p>
                    )}
                    {(result as any).source && (
                      <span className="stoa-kicker" style={{ fontSize: 10, color: "var(--stoa-muted)", marginTop: 4 }}>
                        {(result as any).source === "ai"
                          ? "Live oracle"
                          : (result as any).source === "cache"
                          ? `Archived · ${(result as any).cache_age_minutes}m`
                          : "Static reading"}
                      </span>
                    )}
                  </div>

                  {/* RIGHT */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "center", gap: 10, flexShrink: 0 }}>
                    <VerdictBadge verdict={result.verdict} size="lg" />
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <SetupScoreMeter score={result.setupScore} size="sm" />
                      <span className="stoa-kicker" style={{ fontSize: 10 }}>Setup · Θεωρία</span>
                    </div>
                  </div>
                </div>

                {/* THE ORACLE'S WORD · Λόγος */}
                <div
                  style={{
                    background: "var(--stoa-shine)",
                    border: "1px solid var(--stoa-rule)",
                    borderLeft: "3px solid var(--stoa-accent)",
                    borderRadius: 2,
                    padding: isMobile ? "18px 18px" : "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <span className="stoa-kicker" style={{ fontSize: 10 }}>THE ORACLE'S WORD · Λόγος</span>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "Georgia, 'EB Garamond', serif",
                      fontStyle: "italic",
                      fontSize: 15,
                      lineHeight: 1.55,
                      color: "var(--stoa-ink)",
                    }}
                  >
                    {result.summary}
                  </p>
                </div>

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
                  <Button
                    variant={watchlistSaved ? "default" : "outline"}
                    className="flex-1 text-xs gap-1.5"
                    size="sm"
                    onClick={addToWatchlist}
                    disabled={watchlistSaving || watchlistSaved}
                  >
                    {watchlistSaving ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
                    ) : watchlistSaved ? (
                      <><Star className="h-3.5 w-3.5 fill-current" /> Saved</>
                    ) : (
                      <><Star className="h-3.5 w-3.5" /> Watchlist</>
                    )}
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
    </StoaShell>
  );
};

export default Analysis;
