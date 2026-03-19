import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, Clock, Trash2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import VerdictBadge from "@/components/VerdictBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Decision = "BUY" | "WAIT" | "AVOID";
type Outcome = "PENDING" | "WIN" | "LOSS";
type AssetType = "stock" | "crypto" | "forex";

interface TradeRecord {
  id: string;
  symbol: string;
  assetType: AssetType;
  decision: Decision;
  entryPrice: number;
  notes: string;
  outcome: Outcome;
  date: string;
}

const Tracker = () => {
  const [showForm, setShowForm] = useState(false);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [formData, setFormData] = useState({
    symbol: "",
    assetType: "stock" as AssetType,
    decision: "BUY" as Decision,
    entryPrice: "",
    notes: "",
  });

  const stats = {
    wins: trades.filter((t) => t.outcome === "WIN").length,
    losses: trades.filter((t) => t.outcome === "LOSS").length,
    pending: trades.filter((t) => t.outcome === "PENDING").length,
  };
  const total = stats.wins + stats.losses;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

  const handleSave = () => {
    if (!formData.symbol) return;
    const record: TradeRecord = {
      id: Date.now().toString(),
      symbol: formData.symbol.toUpperCase(),
      assetType: formData.assetType,
      decision: formData.decision,
      entryPrice: parseFloat(formData.entryPrice) || 0,
      notes: formData.notes,
      outcome: "PENDING",
      date: new Date().toISOString(),
    };
    setTrades((prev) => [record, ...prev]);
    setFormData({ symbol: "", assetType: "stock", decision: "BUY", entryPrice: "", notes: "" });
    setShowForm(false);
  };

  const updateOutcome = (id: string, outcome: Outcome) =>
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, outcome } : t)));

  const deleteTrade = (id: string) =>
    setTrades((prev) => prev.filter((t) => t.id !== id));

  const filters = ["ALL", "PENDING", "WIN", "LOSS", "BUY", "WAIT", "AVOID"];
  const filtered = trades.filter((t) => {
    if (filter === "ALL") return true;
    if (["PENDING", "WIN", "LOSS"].includes(filter)) return t.outcome === filter;
    return t.decision === filter;
  });

  return (
    <PageShell>
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Decision Tracker</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Win Rate" value={`${winRate}%`} trend={winRate >= 50 ? "up" : total > 0 ? "down" : "neutral"} />
          <StatCard label="Wins" value={stats.wins} trend="up" />
          <StatCard label="Losses" value={stats.losses} trend="down" />
          <StatCard label="Pending" value={stats.pending} />
        </div>

        {/* Log button */}
        <Button onClick={() => setShowForm(!showForm)} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Log New Decision
        </Button>

        {/* Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <GlassCard className="flex flex-col gap-3">
              <Input
                placeholder="Symbol (e.g. AAPL)"
                value={formData.symbol}
                onChange={(e) => setFormData((p) => ({ ...p, symbol: e.target.value }))}
                className="bg-secondary/50"
              />
              <div className="flex gap-2">
                {(["stock", "crypto", "forex"] as AssetType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFormData((p) => ({ ...p, assetType: t }))}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize ${
                      formData.assetType === t ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(["BUY", "WAIT", "AVOID"] as Decision[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setFormData((p) => ({ ...p, decision: d }))}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${
                      formData.decision === d
                        ? d === "BUY" ? "bg-verdict-buy/20 text-verdict-buy"
                          : d === "WAIT" ? "bg-verdict-wait/20 text-verdict-wait"
                          : "bg-verdict-avoid/20 text-verdict-avoid"
                        : "glass-card text-muted-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Entry price"
                type="number"
                value={formData.entryPrice}
                onChange={(e) => setFormData((p) => ({ ...p, entryPrice: e.target.value }))}
                className="bg-secondary/50"
              />
              <Textarea
                placeholder="Notes..."
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                className="bg-secondary/50 min-h-[60px]"
              />
              <Button onClick={handleSave}>Save Decision</Button>
            </GlassCard>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                filter === f ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex flex-col gap-2">
          {filtered.length === 0 && (
            <GlassCard className="text-center py-8">
              <p className="text-sm text-muted-foreground">No decisions logged yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tap "Log New Decision" to start tracking</p>
            </GlassCard>
          )}
          {filtered.map((t) => (
            <GlassCard key={t.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono">{t.symbol}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{t.assetType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <VerdictBadge verdict={t.decision} size="sm" />
                  {t.outcome === "WIN" && <span className="text-verdict-buy text-xs">✅</span>}
                  {t.outcome === "LOSS" && <span className="text-verdict-avoid text-xs">❌</span>}
                  {t.outcome === "PENDING" && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </div>
              {t.entryPrice > 0 && (
                <p className="text-xs text-muted-foreground font-mono">Entry: ${t.entryPrice.toFixed(2)}</p>
              )}
              {t.notes && <p className="text-xs text-muted-foreground italic">{t.notes}</p>}
              <p className="text-[10px] text-muted-foreground/60">{new Date(t.date).toLocaleDateString()}</p>
              {t.outcome === "PENDING" && (
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 text-verdict-buy" onClick={() => updateOutcome(t.id, "WIN")}>
                    <TrendingUp className="h-3 w-3 mr-1" /> Win
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 text-verdict-avoid" onClick={() => updateOutcome(t.id, "LOSS")}>
                    <TrendingDown className="h-3 w-3 mr-1" /> Loss
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[10px] h-7 text-muted-foreground" onClick={() => deleteTrade(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default Tracker;
