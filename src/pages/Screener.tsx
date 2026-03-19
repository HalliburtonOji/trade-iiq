import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import VerdictBadge from "@/components/VerdictBadge";
import { Input } from "@/components/ui/input";
import { screenerData, type ScreenerAsset } from "@/data/screenerData";

type AssetTab = "Stocks" | "Crypto" | "Forex";
type FilterValue = "Any" | string;

const Screener = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AssetTab>("Stocks");
  const [search, setSearch] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<FilterValue>("Any");
  const [riskFilter, setRiskFilter] = useState<FilterValue>("Any");
  const [momentumFilter, setMomentumFilter] = useState<FilterValue>("Any");
  const [sentimentFilter, setSentimentFilter] = useState<FilterValue>("Any");
  const [expanded, setExpanded] = useState<string | null>(null);

  const typeMap: Record<AssetTab, string> = { Stocks: "stock", Crypto: "crypto", Forex: "forex" };

  let filtered = screenerData.filter((a) => a.type === typeMap[tab]);
  if (search) filtered = filtered.filter((a) => a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase()));
  if (verdictFilter !== "Any") filtered = filtered.filter((a) => a.verdict === verdictFilter);
  if (riskFilter !== "Any") filtered = filtered.filter((a) => a.risk === riskFilter);
  if (momentumFilter !== "Any") filtered = filtered.filter((a) => a.momentum === momentumFilter);
  if (sentimentFilter !== "Any") filtered = filtered.filter((a) => a.sentiment === sentimentFilter);

  const buyCount = filtered.filter((a) => a.verdict === "BUY").length;

  const FilterSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-muted-foreground font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg bg-secondary/50 border border-border/50 px-2 py-1.5 text-xs text-foreground outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <PageShell>
      <div className="flex flex-col gap-4 px-4 pt-6">
        <h1 className="text-xl font-bold">Screener</h1>

        {/* Tabs */}
        <div className="flex gap-2">
          {(["Stocks", "Crypto", "Forex"] as AssetTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                tab === t ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol or name..."
            className="pl-9 bg-secondary/50 border-border/50"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <FilterSelect label="Verdict" value={verdictFilter} onChange={setVerdictFilter} options={["Any", "BUY", "WAIT", "AVOID"]} />
          <FilterSelect label="Risk" value={riskFilter} onChange={setRiskFilter} options={["Any", "Low", "Medium", "High"]} />
          <FilterSelect label="Momentum" value={momentumFilter} onChange={setMomentumFilter} options={["Any", "Strong", "Moderate", "Flat", "Weak"]} />
          <FilterSelect label="Sentiment" value={sentimentFilter} onChange={setSentimentFilter} options={["Any", "Bullish", "Neutral", "Bearish"]} />
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{filtered.length} results</span>
          <span className="text-verdict-buy font-medium">{buyCount} BUY signals</span>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-2">
          {filtered.map((asset) => (
            <div key={asset.symbol}>
              <GlassCard
                hoverable
                onClick={() => setExpanded(expanded === asset.symbol ? null : asset.symbol)}
                className="cursor-pointer"
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
                <div className="flex gap-1.5 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full glass-card font-medium">{asset.momentum}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full glass-card font-medium">{asset.sentiment}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full glass-card font-medium">{asset.risk} risk</span>
                </div>
              </GlassCard>
              <AnimatePresence>
                {expanded === asset.symbol && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <GlassCard className="mt-1 ml-2 mr-0">
                      <p className="text-xs text-muted-foreground mb-2">{asset.reason}</p>
                      <button
                        onClick={() => navigate(`/analysis?symbol=${asset.symbol}`)}
                        className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                      >
                        Full Analysis <ArrowRight className="h-3 w-3" />
                      </button>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default Screener;
