import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronUp, ArrowRight, LayoutGrid, LayoutList, User, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";

import VerdictBadge from "@/components/VerdictBadge";
import { Input } from "@/components/ui/input";
import { screenerData, type ScreenerAsset } from "@/data/screenerData";
import SectorHeatmap from "@/components/SectorHeatmap";
import { cn } from "@/lib/utils";

type AssetTab = "Stocks" | "Crypto" | "Forex";
type FilterValue = "Any" | string;
type ViewMode = "cards" | "table";

interface FitData {
  bestDecision: string | null;
  bestAsset: string | null;
  worstAsset: string | null;
  bestMomentum: string | null;
}

const Screener = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<AssetTab>("Stocks");
  const [search, setSearch] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<FilterValue>("Any");
  const [riskFilter, setRiskFilter] = useState<FilterValue>("Any");
  const [momentumFilter, setMomentumFilter] = useState<FilterValue>("Any");
  const [sentimentFilter, setSentimentFilter] = useState<FilterValue>("Any");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "cards" : "table");
  const [fitData, setFitData] = useState<FitData>({ bestDecision: null, bestAsset: null, worstAsset: null, bestMomentum: null });

  // Load user trading history for personal fit scoring
  useEffect(() => {
    if (!user) return;
    const loadFit = async () => {
      const { data } = await supabase.from("trade_decisions").select("decision,asset_type,outcome").eq("user_id", user.id);
      if (!data || data.length < 3) return;

      const completed = data.filter(t => t.outcome === "WIN" || t.outcome === "LOSS");
      if (completed.length < 3) return;

      // Best decision type
      const byDecision: Record<string, { w: number; t: number }> = {};
      completed.forEach(t => {
        if (!byDecision[t.decision]) byDecision[t.decision] = { w: 0, t: 0 };
        byDecision[t.decision].t++;
        if (t.outcome === "WIN") byDecision[t.decision].w++;
      });
      const bestD = Object.entries(byDecision).sort((a, b) => (b[1].w / b[1].t) - (a[1].w / a[1].t))[0];

      // Best/worst asset type
      const byAsset: Record<string, { w: number; t: number }> = {};
      completed.forEach(t => {
        if (!byAsset[t.asset_type]) byAsset[t.asset_type] = { w: 0, t: 0 };
        byAsset[t.asset_type].t++;
        if (t.outcome === "WIN") byAsset[t.asset_type].w++;
      });
      const sorted = Object.entries(byAsset).filter(([, v]) => v.t >= 2).sort((a, b) => (b[1].w / b[1].t) - (a[1].w / a[1].t));

      setFitData({
        bestDecision: bestD ? bestD[0] : null,
        bestAsset: sorted[0] ? sorted[0][0] : null,
        worstAsset: sorted.length > 1 ? sorted[sorted.length - 1][0] : null,
        bestMomentum: null,
      });
    };
    loadFit();
  }, [user]);

  // Calculate personal fit score for an asset
  const getFitScore = (asset: ScreenerAsset): { score: number; label: string; reason: string } => {
    let score = 50; // neutral baseline
    const reasons: string[] = [];

    // Asset type match
    if (fitData.bestAsset === asset.type) {
      score += 25;
      reasons.push("matches your strongest asset class");
    } else if (fitData.worstAsset === asset.type) {
      score -= 20;
      reasons.push("weak asset class for you historically");
    }

    // Verdict match with user's best decision type
    if (fitData.bestDecision === asset.verdict) {
      score += 15;
      reasons.push(`${asset.verdict} is your best-performing call`);
    }

    // Risk penalty for aggressive setups if user's style is conservative
    if (asset.risk === "Low") score += 5;
    if (asset.risk === "High") score -= 5;

    // Momentum bonus
    if (asset.momentum === "Strong" && asset.verdict === "BUY") score += 5;

    score = Math.max(0, Math.min(100, score));

    const label = score >= 75 ? "Strong Fit" : score >= 55 ? "Good Fit" : score >= 40 ? "Neutral" : "Weak Fit";
    const reason = reasons.length > 0 ? reasons[0] : "not enough history to assess";

    return { score, label, reason };
  };

  const typeMap: Record<AssetTab, string> = { Stocks: "stock", Crypto: "crypto", Forex: "forex" };

  let filtered = screenerData.filter((a) => a.type === typeMap[tab]);
  if (search) filtered = filtered.filter((a) => a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase()));
  if (verdictFilter !== "Any") filtered = filtered.filter((a) => a.verdict === verdictFilter);
  if (riskFilter !== "Any") filtered = filtered.filter((a) => a.risk === riskFilter);
  if (momentumFilter !== "Any") filtered = filtered.filter((a) => a.momentum === momentumFilter);
  if (sentimentFilter !== "Any") filtered = filtered.filter((a) => a.sentiment === sentimentFilter);

  const buyCount = filtered.filter((a) => a.verdict === "BUY").length;
  const waitCount = filtered.filter((a) => a.verdict === "WAIT").length;
  const avoidCount = filtered.filter((a) => a.verdict === "AVOID").length;

  const FilterSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-muted-foreground font-medium">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-sm bg-transparent border border-[color:var(--stoa-rule)] focus:border-[color:var(--stoa-accent)] px-2 py-1.5 stoa-mono text-[color:var(--stoa-ink)] outline-none"
        style={{ fontSize: 12 }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const MomentumPill = ({ value }: { value: string }) => {
    const colors: Record<string, string> = { Strong: "text-verdict-buy bg-verdict-buy/10", Moderate: "text-primary bg-primary/10", Flat: "text-muted-foreground bg-muted/50", Weak: "text-verdict-avoid bg-verdict-avoid/10" };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[value] || ""}`}>{value}</span>;
  };

  const SentimentPill = ({ value }: { value: string }) => {
    const colors: Record<string, string> = { Bullish: "text-verdict-buy bg-verdict-buy/10", Neutral: "text-muted-foreground bg-muted/50", Bearish: "text-verdict-avoid bg-verdict-avoid/10" };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[value] || ""}`}>{value}</span>;
  };

  const RiskPill = ({ value }: { value: string }) => {
    const colors: Record<string, string> = { Low: "text-verdict-buy bg-verdict-buy/10", Medium: "text-verdict-wait bg-verdict-wait/10", High: "text-verdict-avoid bg-verdict-avoid/10" };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[value] || ""}`}>{value}</span>;
  };

  const FitPill = ({ asset }: { asset: ScreenerAsset }) => {
    if (!fitData.bestAsset && !fitData.bestDecision) return null;
    const fit = getFitScore(asset);
    const color = fit.score >= 75 ? "text-verdict-buy bg-verdict-buy/10" : fit.score >= 55 ? "text-primary bg-primary/10" : fit.score >= 40 ? "text-muted-foreground bg-muted/50" : "text-verdict-avoid bg-verdict-avoid/10";
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${color}`}>
        <User className="h-2.5 w-2.5" />{fit.label}
      </span>
    );
  };

  return (
    <StoaShell
      palette="delphi"
      crumb={
        <span>
          <span className="stoa-greek">Ἀγορά</span> · Screener
        </span>
      }
    >
      <div className="flex flex-col gap-2 mb-2 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">ACROPOLIS · THE AGORA</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Screener</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Ἀγορά</span>
        </div>
        <p className="text-sm italic" style={{ color: "var(--stoa-muted)", fontFamily: "Georgia, serif" }}>
          scan the market for setups worth a reading
        </p>
      </div>
      <div className="flex flex-col gap-4 pt-6 pb-24">
        {/* Sector Heatmap */}
        <SectorHeatmap onSelectSymbol={(sym) => { setSearch(sym); }} />

        {/* View-mode toggle (desktop only) */}
        {!isMobile && (
          <div className="flex justify-end">
            <div
              className="inline-flex"
              style={{
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                background: "transparent",
              }}
            >
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-3 py-1 stoa-display uppercase inline-flex items-center gap-1.5",
                  viewMode === "table"
                    ? "text-[color:var(--stoa-ink)] border-b-[2px] border-[color:var(--stoa-accent)]"
                    : "text-[color:var(--stoa-muted)]"
                )}
                style={{ fontSize: 11 }}
              >
                <LayoutList className="h-3.5 w-3.5" />
                Table · Πίναξ
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={cn(
                  "px-3 py-1 stoa-display uppercase inline-flex items-center gap-1.5",
                  viewMode === "cards"
                    ? "text-[color:var(--stoa-ink)] border-b-[2px] border-[color:var(--stoa-accent)]"
                    : "text-[color:var(--stoa-muted)]"
                )}
                style={{ fontSize: 11 }}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards · Ἰδέαι
              </button>
            </div>
          </div>
        )}

        {/* THE FIELD · Πλῆθος — stats strip */}
        <div
          style={{
            background: "var(--stoa-shine)",
            border: "1px solid var(--stoa-rule)",
            borderRadius: 2,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <span className="stoa-kicker">THE FIELD · Πλῆθος</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {[
              { kicker: "TOTAL · Πλῆθος", value: filtered.length, color: "var(--stoa-ink)" },
              { kicker: "BUY · Ἄξιον", value: buyCount, color: "hsl(var(--verdict-buy))" },
              { kicker: "WAIT · Ἐπέχω", value: waitCount, color: "hsl(var(--verdict-wait))" },
              { kicker: "AVOID · Φυγή", value: avoidCount, color: "hsl(var(--verdict-avoid))" },
            ].map((cell, idx) => (
              <div
                key={cell.kicker}
                className="flex flex-col items-center justify-center gap-1"
                style={{
                  padding: 12,
                  borderLeft: idx > 0 ? "1px solid var(--stoa-rule)" : "none",
                }}
              >
                <span className="stoa-kicker text-center">{cell.kicker}</span>
                <span className="stoa-mono font-bold" style={{ fontSize: 22, color: cell.color }}>
                  {cell.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Asset-class tabs */}
        <div
          className="grid grid-cols-3"
          style={{ borderBottom: "1px solid var(--stoa-rule)" }}
        >
          {([
            { v: "Stocks" as AssetTab, en: "Stocks", gr: "Μετοχαί" },
            { v: "Crypto" as AssetTab, en: "Crypto", gr: "Κρυπτόν" },
            { v: "Forex" as AssetTab, en: "Forex", gr: "Νόμισμα" },
          ]).map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 bg-transparent transition-colors",
                tab === t.v
                  ? "text-[color:var(--stoa-ink)] border-b-[2px] border-[color:var(--stoa-accent)] -mb-[1px]"
                  : "text-[color:var(--stoa-muted)]"
              )}
            >
              <span className="stoa-display" style={{ fontSize: 13 }}>{t.en}</span>
              <span className="stoa-greek" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>{t.gr}</span>
            </button>
          ))}
        </div>

        {/* Filters rail */}
        <div
          style={{
            background: "var(--stoa-shine)",
            border: "1px solid var(--stoa-rule)",
            borderRadius: 2,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <span className="stoa-kicker">FILTERS · Διάκρισις</span>
          <div className={`${isMobile ? "space-y-3" : "flex items-end gap-3"}`}>
            <div className={`relative ${isMobile ? "" : "flex-1 max-w-sm"}`}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--stoa-muted)" }} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol or name · Ζήτησις"
                className="pl-9 bg-transparent border-[color:var(--stoa-rule)] focus-visible:border-[color:var(--stoa-accent)] text-[color:var(--stoa-ink)] placeholder:text-[color:var(--stoa-muted)]"
              />
            </div>

            <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4 flex-1"} gap-2`}>
              <FilterSelect label="Verdict" value={verdictFilter} onChange={setVerdictFilter} options={["Any", "BUY", "WAIT", "AVOID"]} />
              <FilterSelect label="Risk" value={riskFilter} onChange={setRiskFilter} options={["Any", "Low", "Medium", "High"]} />
              <FilterSelect label="Momentum" value={momentumFilter} onChange={setMomentumFilter} options={["Any", "Strong", "Moderate", "Flat", "Weak"]} />
              <FilterSelect label="Sentiment" value={sentimentFilter} onChange={setSentimentFilter} options={["Any", "Bullish", "Neutral", "Bearish"]} />
            </div>
          </div>
        </div>

        {/* TABLE VIEW (desktop) */}
        {viewMode === "table" && !isMobile ? (
          <div>
            <div className="mb-2">
              <span className="stoa-kicker">THE CATALOGUE · Κατάλογος</span>
            </div>
            <div
              className="overflow-x-auto"
              style={{
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
              }}
            >
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: "var(--stoa-shine)", borderBottom: "1px solid var(--stoa-rule)" }}>
                    <th className="stoa-kicker py-2 px-3 text-left">Symbol</th>
                    <th className="stoa-kicker py-2 px-3 text-left">Name</th>
                    <th className="stoa-kicker py-2 px-3 text-left">Verdict</th>
                    <th className="stoa-kicker py-2 px-3 text-right">Change</th>
                    <th className="stoa-kicker py-2 px-3 text-right">RSI</th>
                    <th className="stoa-kicker py-2 px-3 text-left">Momentum</th>
                    <th className="stoa-kicker py-2 px-3 text-left">Risk</th>
                    {fitData.bestAsset && (
                      <th className="stoa-kicker py-2 px-3 text-left">Fit</th>
                    )}
                    <th className="stoa-kicker py-2 px-3 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asset) => {
                    const fit = fitData.bestAsset ? getFitScore(asset) : null;
                    return (
                      <motion.tr key={asset.symbol} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="transition-colors cursor-pointer group even:bg-transparent odd:bg-[color:var(--stoa-shine)] hover:bg-black/[0.03]"
                        style={{ borderBottom: "1px solid var(--stoa-rule)" }}
                        onClick={() => setExpanded(expanded === asset.symbol ? null : asset.symbol)}>
                        <td className="py-2 px-3">
                          <span className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 13 }}>{asset.symbol}</span>
                        </td>
                        <td
                          className="py-2 px-3 truncate max-w-[180px]"
                          style={{ fontFamily: "Georgia, serif", fontSize: 13, fontStyle: "italic", color: "var(--stoa-muted)" }}
                        >
                          {asset.name}
                        </td>
                        <td className="py-2 px-3"><VerdictBadge verdict={asset.verdict} size="sm" /></td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`stoa-mono font-bold ${asset.change >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}
                            style={{ fontSize: 13 }}
                          >
                            {asset.change >= 0 ? "+" : ""}{asset.change.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="stoa-mono text-[color:var(--stoa-muted)]" style={{ fontSize: 12 }}>{asset.rsi}</span>
                        </td>
                        <td className="py-2 px-3"><MomentumPill value={asset.momentum} /></td>
                        <td className="py-2 px-3"><RiskPill value={asset.risk} /></td>
                        {fitData.bestAsset && (
                          <td className="py-2 px-3"><FitPill asset={asset} /></td>
                        )}
                        <td className="py-2 px-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/analysis?symbol=${asset.symbol}`); }}
                            className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 stoa-display uppercase text-[color:var(--stoa-accent)] hover:underline transition-opacity"
                            style={{ fontSize: 11 }}
                          >
                            Oracle · Χρησμός <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              <AnimatePresence>
                {expanded && (() => {
                  const asset = filtered.find((a) => a.symbol === expanded);
                  if (!asset) return null;
                  const fit = fitData.bestAsset ? getFitScore(asset) : null;
                  return (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div
                        style={{
                          background: "var(--stoa-shine)",
                          border: "1px solid var(--stoa-rule)",
                          borderLeft: "3px solid var(--stoa-accent)",
                          borderRadius: 2,
                          padding: 16,
                          margin: "6px 12px",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="stoa-kicker">READING · Σκέψις</span>
                          <button
                            onClick={() => navigate(`/analysis?symbol=${asset.symbol}`)}
                            className="shrink-0 inline-flex items-center gap-1 stoa-display uppercase text-[color:var(--stoa-accent)] hover:underline"
                            style={{ fontSize: 12 }}
                          >
                            Open in Oracle · Χρησμός <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 13 }}>{asset.symbol}</span>
                        </div>
                        <p style={{ fontFamily: "Georgia, serif", fontSize: 14, fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 6 }}>
                          {asset.reason}
                        </p>
                        {fit && (
                          <p className="stoa-kicker" style={{ color: "var(--stoa-muted)", marginTop: 10 }}>
                            <Sparkles className="h-3 w-3 inline mr-1" />Personal fit: <span className="font-semibold text-foreground">{fit.score}/100</span> — {fit.reason}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* CARDS VIEW */
          <div>
            <div className="mb-2">
              <span className="stoa-kicker">THE STALLS · Σκηναί</span>
            </div>
            <div className={`flex flex-col gap-2 ${isMobile ? "px-4" : "grid grid-cols-2 xl:grid-cols-3 gap-3"}`}>
              {filtered.map((asset) => {
                const fit = fitData.bestAsset ? getFitScore(asset) : null;
                return (
                  <div key={asset.symbol}>
                    <div
                      onClick={() => setExpanded(expanded === asset.symbol ? null : asset.symbol)}
                      className="cursor-pointer transition-colors"
                      style={{
                        background: "var(--stoa-shine)",
                        border: "1px solid var(--stoa-rule)",
                        borderRadius: 2,
                        padding: 14,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--stoa-accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--stoa-rule)")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-mono">{asset.symbol}</span>
                            <VerdictBadge verdict={asset.verdict} size="sm" />
                          </div>
                          <p className="text-[11px] text-muted-foreground">{asset.name} · {asset.sector}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-mono font-bold ${asset.change >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                            {asset.change >= 0 ? "+" : ""}{asset.change.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">RSI {asset.rsi}</p>
                        </div>
                        {expanded === asset.symbol ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-2" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <MomentumPill value={asset.momentum} />
                        <SentimentPill value={asset.sentiment} />
                        <RiskPill value={asset.risk} />
                        <FitPill asset={asset} />
                      </div>
                    </div>
                    <AnimatePresence>
                      {expanded === asset.symbol && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div
                            style={{
                              background: "var(--stoa-shine)",
                              border: "1px solid var(--stoa-rule)",
                              borderLeft: "3px solid var(--stoa-accent)",
                              borderRadius: 2,
                              padding: 14,
                              marginTop: 4,
                              marginLeft: 8,
                            }}
                          >
                            <p style={{ fontFamily: "Georgia, serif", fontSize: 14, fontStyle: "italic", color: "var(--stoa-muted)", marginBottom: 10 }}>
                              {asset.reason}
                            </p>
                            {fit && (
                              <p className="stoa-kicker" style={{ color: "var(--stoa-muted)", marginBottom: 10 }}>
                                <Sparkles className="h-3 w-3 inline mr-1" />Personal fit: <span className="font-semibold text-foreground">{fit.score}/100</span> — {fit.reason}
                              </p>
                            )}
                            <button
                              onClick={() => navigate(`/analysis?symbol=${asset.symbol}`)}
                              className="inline-flex items-center gap-1 stoa-display uppercase text-[color:var(--stoa-accent)] hover:underline"
                              style={{ fontSize: 12 }}
                            >
                              Open in Oracle · Χρησμός <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div
            style={{
              background: "var(--stoa-shine)",
              border: "1px solid var(--stoa-rule)",
              borderRadius: 2,
              padding: 24,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            <span style={{ fontFamily: "Georgia, serif", fontSize: 14, fontStyle: "italic", color: "var(--stoa-muted)" }}>
              The stalls are bare · κενόν
            </span>
            <span className="stoa-kicker" style={{ marginTop: 6, display: "block" }}>
              loosen filters to widen the field
            </span>
          </div>
        )}
      </div>
    </StoaShell>
  );
};

export default Screener;
