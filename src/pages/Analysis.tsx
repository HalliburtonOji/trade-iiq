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

                {/* ---------- THE FOUR CHAMBERS · Θάλαμοι ---------- */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span className="stoa-kicker" style={{ fontSize: 11 }}>THE FOUR CHAMBERS · Θάλαμοι</span>

                  <Tabs defaultValue="verdict" className="w-full">
                    <TabsList
                      className="w-full grid grid-cols-4 gap-0 p-0 bg-transparent rounded-none h-auto"
                      style={{ borderBottom: "1px solid var(--stoa-rule)" }}
                    >
                      {[
                        { value: "verdict", label: "Verdict", greek: "Κρίσις" },
                        { value: "technicals", label: "Technicals", greek: "Τέχνη" },
                        { value: "macro", label: "Macro", greek: "Κόσμος" },
                        { value: "targets", label: "Targets", greek: "Τέλος" },
                      ].map((t) => (
                        <TabsTrigger
                          key={t.value}
                          value={t.value}
                          className="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-none border-b-[2px] border-transparent text-[color:var(--stoa-muted)] bg-transparent data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                          style={{ marginBottom: -1 }}
                        >
                          <span className="stoa-display" style={{ fontSize: 13, letterSpacing: "0.06em" }}>{t.label}</span>
                          <span className="stoa-greek" style={{ fontSize: 10, color: "var(--stoa-muted)", opacity: 0.75 }}>{t.greek}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* ---------- Verdict ---------- */}
                    <TabsContent value="verdict" className="mt-4 flex flex-col gap-3">
                      {/* Risk gauge */}
                      <div
                        style={{
                          background: "var(--stoa-shine)",
                          border: "1px solid var(--stoa-rule)",
                          borderRadius: 2,
                          padding: "16px 18px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span className="stoa-kicker" style={{ fontSize: 10 }}>Risk · Κίνδυνος</span>
                          <span className="stoa-mono" style={{ fontSize: 14, fontWeight: 600, color: "var(--stoa-ink)" }}>
                            {result.riskScore}/10
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            border: "1px solid var(--stoa-rule)",
                            borderRadius: 999,
                            overflow: "hidden",
                            background: "transparent",
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${result.riskScore * 10}%` }}
                            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                            style={{
                              height: "100%",
                              borderRadius: 999,
                              backgroundColor:
                                result.riskScore <= 4
                                  ? "hsl(var(--verdict-buy))"
                                  : result.riskScore <= 7
                                  ? "hsl(var(--verdict-wait))"
                                  : "hsl(var(--verdict-avoid))",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontFamily: "Georgia, 'EB Garamond', serif",
                            fontSize: 11,
                            fontStyle: "italic",
                            color: "var(--stoa-muted)",
                          }}
                        >
                          <span>Low</span>
                          <span>Moderate</span>
                          <span>Extreme</span>
                        </div>
                      </div>

                      {/* Key points */}
                      <div
                        style={{
                          background: "var(--stoa-shine)",
                          border: "1px solid var(--stoa-rule)",
                          borderRadius: 2,
                          padding: "16px 18px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        <span className="stoa-kicker" style={{ fontSize: 10 }}>Key points · Κεφάλαια</span>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                          {(result.macroPoints || []).map((p, i) => (
                            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                              <span
                                className="stoa-display"
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  letterSpacing: "0.04em",
                                  color: "var(--stoa-accent)",
                                  flexShrink: 0,
                                  minWidth: 22,
                                  lineHeight: 1.5,
                                }}
                              >
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span
                                style={{
                                  fontFamily: "Georgia, 'EB Garamond', serif",
                                  fontStyle: "italic",
                                  fontSize: 14,
                                  lineHeight: 1.5,
                                  color: "var(--stoa-ink)",
                                }}
                              >
                                {p}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>

                    {/* ---------- Technicals ---------- */}
                    <TabsContent value="technicals" className="mt-4">
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                          gap: 8,
                        }}
                      >
                        {Object.entries(result.technicals || {}).map(([key, val]) => (
                          <div
                            key={key}
                            style={{
                              background: "var(--stoa-shine)",
                              border: "1px solid var(--stoa-rule)",
                              borderRadius: 2,
                              padding: "12px 14px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                            }}
                          >
                            <span className="stoa-kicker" style={{ fontSize: 10 }}>{key}</span>
                            <p className="stoa-mono" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--stoa-ink)" }}>
                              {String(val)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* ---------- Macro ---------- */}
                    <TabsContent value="macro" className="mt-4 flex flex-col gap-2">
                      {(result.macroFactors || []).map((f, i) => (
                        <div
                          key={i}
                          style={{
                            background: "var(--stoa-shine)",
                            border: "1px solid var(--stoa-rule)",
                            borderRadius: 2,
                            padding: "14px 16px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 14,
                          }}
                        >
                          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{f.icon}</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                            <p className="stoa-display" style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", color: "var(--stoa-ink)" }}>
                              {f.label}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontFamily: "Georgia, 'EB Garamond', serif",
                                fontStyle: "italic",
                                fontSize: 13,
                                lineHeight: 1.5,
                                color: "var(--stoa-muted)",
                              }}
                            >
                              {f.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    {/* ---------- Targets ---------- */}
                    <TabsContent value="targets" className="mt-4">
                      <div
                        style={{
                          background: "var(--stoa-shine)",
                          border: "1px solid var(--stoa-rule)",
                          borderRadius: 2,
                          padding: isMobile ? "16px 0" : "18px 0",
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                        }}
                      >
                        {[
                          { key: "bear", label: "Bear", greek: "Πτῶσις", color: "hsl(var(--verdict-avoid))", value: result.targets?.bear || 0 },
                          { key: "base", label: "Base", greek: "Μέσον", color: "hsl(var(--verdict-wait))", value: result.targets?.base || 0 },
                          { key: "bull", label: "Bull", greek: "Ὕψος", color: "hsl(var(--verdict-buy))", value: result.targets?.bull || 0 },
                        ].map((t, i) => (
                          <div
                            key={t.key}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 6,
                              padding: isMobile ? "12px 14px" : "8px 14px",
                              borderLeft: !isMobile && i > 0 ? "1px solid var(--stoa-rule)" : "none",
                              borderTop: isMobile && i > 0 ? "1px solid var(--stoa-rule)" : "none",
                            }}
                          >
                            <span
                              className="stoa-display"
                              style={{
                                fontSize: 11,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                fontWeight: 600,
                                color: t.color,
                              }}
                            >
                              {t.label}
                            </span>
                            <span className="stoa-greek" style={{ fontSize: 12, color: "var(--stoa-muted)", opacity: 0.75 }}>
                              {t.greek}
                            </span>
                            <span
                              className="stoa-mono"
                              style={{
                                fontSize: isMobile ? 17 : 22,
                                fontWeight: 700,
                                color: "var(--stoa-ink)",
                                lineHeight: 1.1,
                              }}
                            >
                              ${t.value.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* AI Market Signals */}
                <MarketSignals symbol={result.symbol} assetType={assetType} livePrice={result.price} />

                {/* Community Sentiment */}
                <SentimentPoll symbol={result.symbol} />

                {/* ---------- Action row ---------- */}
                <div
                  style={{
                    borderTop: "1px solid var(--stoa-rule)",
                    paddingTop: 16,
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {/* Watchlist */}
                  <button
                    onClick={addToWatchlist}
                    disabled={watchlistSaving || watchlistSaved}
                    className="stoa-display"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "11px 14px",
                      fontSize: 13,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: watchlistSaved ? "var(--stoa-accent)" : "var(--stoa-ink)",
                      background: "transparent",
                      border: `1px solid ${watchlistSaved ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
                      borderRadius: 2,
                      cursor: watchlistSaving || watchlistSaved ? "default" : "pointer",
                      opacity: watchlistSaving ? 0.7 : 1,
                    }}
                  >
                    {watchlistSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving</span>
                      </>
                    ) : watchlistSaved ? (
                      <>
                        <Star className="h-3.5 w-3.5" style={{ fill: "var(--stoa-accent)", color: "var(--stoa-accent)" }} />
                        <span>Saved</span>
                        <span className="stoa-greek" style={{ fontSize: 11, opacity: 0.75 }}>· Φυλακή</span>
                      </>
                    ) : (
                      <>
                        <Star className="h-3.5 w-3.5" />
                        <span>Watchlist</span>
                        <span className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-muted)", opacity: 0.7 }}>· Φυλακή</span>
                      </>
                    )}
                  </button>

                  {/* Execute */}
                  <button
                    onClick={() => setBrokerOpen(true)}
                    className="stoa-display"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "11px 14px",
                      fontSize: 13,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--stoa-ink)",
                      background: "transparent",
                      border: "1px solid var(--stoa-rule)",
                      borderRadius: 2,
                      cursor: "pointer",
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Execute</span>
                    <span className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-muted)", opacity: 0.7 }}>· Πρᾶξις</span>
                  </button>

                  {/* Log decision — gold-filled */}
                  <button
                    onClick={() => navigate("/tracker")}
                    className="stoa-display"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "11px 14px",
                      fontSize: 13,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      color: "var(--stoa-ink)",
                      background: "var(--stoa-accent)",
                      border: "none",
                      borderRadius: 2,
                      cursor: "pointer",
                    }}
                  >
                    <span>Log decision</span>
                    <span className="stoa-greek" style={{ fontSize: 11, opacity: 0.85 }}>· Βίβλος</span>
                  </button>
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
            <div style={{ marginTop: 28 }}>
              <SymbolCompare />
            </div>

          </>
        )}
      </div>
    </StoaShell>
  );
};

export default Analysis;
