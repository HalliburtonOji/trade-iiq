import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import SetupScoreMeter from "@/components/SetupScoreMeter";
import PersonalitySelector from "@/components/PersonalitySelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, TrendingUp, TrendingDown, Target, FileText, Download, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PaperTrade {
  id: string;
  symbol: string;
  units: number;
  price: number;
  cost: number;
  stopLoss: number | null;
  takeProfit: number | null;
  thesis: string;
  status: "open" | "closed-win" | "closed-loss";
  closedAt?: number;
}

const Portfolio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>(() => {
    const saved = localStorage.getItem("tradeiq_paper_trades_v2");
    return saved ? JSON.parse(saved) : [];
  });
  const [ptForm, setPtForm] = useState({ symbol: "", units: "", price: "", stopLoss: "", takeProfit: "", thesis: "" });
  const [stats, setStats] = useState({ wins: 0, losses: 0, pending: 0, total: 0, winRate: 0, avgPnl: 0 });
  const [pnlSparkline, setPnlSparkline] = useState<{ pnl: number; date: string }[]>([]);
  const [sparkRange, setSparkRange] = useState<"7D" | "30D" | "90D">("30D");
  const [exporting, setExporting] = useState(false);

  const startingBalance = 10000;
  const openTrades = paperTrades.filter(t => t.status === "open");
  const closedTrades = paperTrades.filter(t => t.status !== "open");
  const usedBalance = openTrades.reduce((s, t) => s + t.cost, 0);
  const remaining = startingBalance - usedBalance;
  const paperWins = closedTrades.filter(t => t.status === "closed-win").length;
  const paperLosses = closedTrades.filter(t => t.status === "closed-loss").length;

  useEffect(() => {
    localStorage.setItem("tradeiq_paper_trades_v2", JSON.stringify(paperTrades));
  }, [paperTrades]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data } = await supabase.from("trade_decisions").select("outcome,pnl_percent,date").eq("user_id", user.id).order("date", { ascending: true });
      if (data) {
        const wins = data.filter((d: any) => d.outcome === "WIN").length;
        const losses = data.filter((d: any) => d.outcome === "LOSS").length;
        const pending = data.filter((d: any) => d.outcome === "PENDING").length;
        const completed = wins + losses;
        const pnls = data.filter((d: any) => d.pnl_percent != null).map((d: any) => d.pnl_percent);
        const avgPnl = pnls.length > 0 ? Math.round(pnls.reduce((s: number, v: number) => s + v, 0) / pnls.length * 10) / 10 : 0;
        setStats({ wins, losses, pending, total: data.length, winRate: completed > 0 ? Math.round((wins / completed) * 100) : 0, avgPnl });
        // Build sparkline
        const withPnl = data.filter((d: any) => d.pnl_percent != null && (d.outcome === "WIN" || d.outcome === "LOSS"));
        let cum = 0;
        setPnlSparkline(withPnl.map((d: any) => { cum += d.pnl_percent; return { pnl: Math.round(cum * 10) / 10, date: d.date }; }));
      }
    };
    fetchStats();
  }, [user]);

  const winRateScore = stats.winRate * 0.4;
  const decisionScore = Math.min(stats.total / 20, 1) * 30;
  const healthScore = Math.round(winRateScore + decisionScore + 15);

  const addPaperTrade = () => {
    const units = parseFloat(ptForm.units) || 0;
    const price = parseFloat(ptForm.price) || 0;
    if (!ptForm.symbol || units <= 0 || price <= 0) return;
    const cost = units * price;
    if (cost > remaining) {
      toast({ title: "Insufficient balance", description: `Need £${cost.toFixed(2)} but only £${remaining.toFixed(2)} available`, variant: "destructive" });
      return;
    }
    setPaperTrades((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        symbol: ptForm.symbol.toUpperCase(),
        units, price, cost,
        stopLoss: ptForm.stopLoss ? parseFloat(ptForm.stopLoss) : null,
        takeProfit: ptForm.takeProfit ? parseFloat(ptForm.takeProfit) : null,
        thesis: ptForm.thesis,
        status: "open",
      },
    ]);
    setPtForm({ symbol: "", units: "", price: "", stopLoss: "", takeProfit: "", thesis: "" });
    toast({ title: "Paper trade added", description: `${ptForm.symbol.toUpperCase()} position opened` });
  };

  const closeTrade = (id: string, result: "closed-win" | "closed-loss") => {
    setPaperTrades(prev => prev.map(t => t.id === id ? { ...t, status: result, closedAt: Date.now() } : t));
  };

  const exportJournal = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const { data } = await supabase.from("trade_decisions")
        .select("symbol,asset_type,decision,outcome,date,pnl_percent,confidence,notes,thesis_why,time_horizon,invalidation_point")
        .eq("user_id", user.id).order("date", { ascending: false });
      if (!data || data.length === 0) {
        toast({ title: "No trades to export" });
        return;
      }
      const headers = "Date,Symbol,Type,Decision,Outcome,Confidence,P&L%,Time Horizon,Invalidation,Thesis,Notes";
      const rows = data.map(t =>
        `${new Date(t.date).toLocaleDateString()},${t.symbol},${t.asset_type},${t.decision},${t.outcome},${t.confidence || ""},${t.pnl_percent || ""},${t.time_horizon || ""},${t.invalidation_point || ""},"${(t.thesis_why || "").replace(/"/g, '""')}","${(t.notes || "").replace(/"/g, '""')}"`
      );
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tradeiq-journal-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Journal exported!", description: `${data.length} trades exported as CSV` });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <StoaShell
      palette="delphi"
      crumb={
        <span>
          <span className="stoa-greek">Θησαυρός</span> · Portfolio
        </span>
      }
    >
      <div className="flex flex-col gap-2 mb-2 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">ATHENAION · THE GYMNASIUM</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Portfolio</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Θησαυρός</span>
        </div>
        <p style={{ fontFamily: "Georgia, 'EB Garamond', serif", fontStyle: "italic", fontSize: 13, color: "var(--stoa-muted)" }}>
          rehearse each decision before capital flows
        </p>
      </div>
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        {/* ---------- Export bar ---------- */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderTop: "1px solid var(--stoa-rule)",
            borderBottom: "1px solid var(--stoa-rule)",
          }}
        >
          <span className="stoa-kicker">EXPORT</span>
          <button
            onClick={exportJournal}
            disabled={exporting}
            className="stoa-display"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--stoa-ink)",
              background: "transparent",
              border: "1px solid var(--stoa-rule)",
              borderRadius: 2,
              cursor: exporting ? "not-allowed" : "pointer",
              opacity: exporting ? 0.5 : 1,
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export journal · Πίναξ
          </button>
        </div>

        {/* ---------- Portfolio Health ---------- */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            background: "var(--stoa-shine)",
            border: "1px solid var(--stoa-rule)",
            borderRadius: 2,
          }}
        >
          <SetupScoreMeter score={healthScore} size="lg" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="stoa-kicker">PORTFOLIO HEALTH · Ὑγίεια</span>
            <p style={{ margin: 0, fontFamily: "Georgia, 'EB Garamond', serif", fontStyle: "italic", fontSize: 12, color: "var(--stoa-muted)" }}>
              measured by win rate, activity, and diversification
            </p>
          </div>
        </div>

        {/* ---------- Vitals strip ---------- */}
        <div
          style={{
            padding: 12,
            background: "var(--stoa-shine)",
            border: "1px solid var(--stoa-rule)",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <span className="stoa-kicker">VITALS · Σῆμα</span>
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="Win Rate" value={`${stats.winRate}%`} trend={stats.winRate >= 50 ? "up" : stats.total > 0 ? "down" : "neutral"} />
            <StatCard label="Decisions" value={stats.total} />
            <StatCard label="Avg P&L" value={stats.avgPnl ? `${stats.avgPnl}%` : "—"} trend={stats.avgPnl > 0 ? "up" : stats.avgPnl < 0 ? "down" : "neutral"} />
            <StatCard label="Pending" value={stats.pending} />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList
            className="grid grid-cols-3 w-full bg-transparent rounded-none p-0 h-auto"
            style={{ borderBottom: "1px solid var(--stoa-rule)" }}
          >
            {[
              { v: "overview", en: "Overview", gr: "Σύνοψις" },
              { v: "paper", en: "Paper Trade", gr: "Γυμνάσιον" },
              { v: "personality", en: "Personality", gr: "Ἦθος" },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="flex flex-col gap-0.5 py-2 rounded-none border-b-[2px] border-transparent bg-transparent text-[color:var(--stoa-muted)] data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                style={{ marginBottom: -1 }}
              >
                <span className="stoa-display" style={{ fontSize: 13, letterSpacing: "0.06em" }}>{t.en}</span>
                <span className="stoa-greek" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>{t.gr}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-3 flex flex-col gap-3">
            {/* a) Wins / Losses / Pending */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { kicker: "WINS · Νίκαι", value: stats.wins, color: "hsl(var(--verdict-buy))" },
                { kicker: "LOSSES · Ἧτται", value: stats.losses, color: "hsl(var(--verdict-avoid))" },
                { kicker: "PENDING · Ἐκκρεμῆ", value: stats.pending, color: "var(--stoa-muted)" },
              ].map((c) => (
                <div
                  key={c.kicker}
                  style={{
                    padding: "14px 8px",
                    textAlign: "center",
                    background: "var(--stoa-shine)",
                    border: "1px solid var(--stoa-rule)",
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <span className="stoa-kicker" style={{ fontSize: 9 }}>{c.kicker}</span>
                  <span className="stoa-mono" style={{ fontSize: 24, fontWeight: 600, color: c.color, lineHeight: 1 }}>
                    {c.value}
                  </span>
                </div>
              ))}
            </div>

            {/* b) P&L Summary */}
            <div
              style={{
                padding: 16,
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span className="stoa-kicker">PROFIT &amp; LOSS · Κέρδος</span>
              <div className="grid grid-cols-2 gap-3">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="stoa-kicker" style={{ fontSize: 9 }}>Avg P&amp;L per trade</span>
                  <span
                    className="stoa-mono"
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color:
                        stats.avgPnl > 0 ? "hsl(var(--verdict-buy))"
                        : stats.avgPnl < 0 ? "hsl(var(--verdict-avoid))"
                        : "var(--stoa-ink)",
                    }}
                  >
                    {stats.avgPnl > 0 ? "+" : ""}{stats.avgPnl}%
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="stoa-kicker" style={{ fontSize: 9 }}>Profit factor</span>
                  <span className="stoa-mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--stoa-ink)" }}>
                    {stats.losses > 0 ? (stats.wins / stats.losses).toFixed(1) : stats.wins > 0 ? "∞" : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* c) P&L Curve */}
            {pnlSparkline.length >= 2 && (() => {
              const now = new Date();
              const cutoff = sparkRange === "7D" ? new Date(now.getTime() - 7 * 86400000)
                : sparkRange === "30D" ? new Date(now.getTime() - 30 * 86400000)
                : new Date(now.getTime() - 90 * 86400000);
              const rangedData = pnlSparkline.filter(d => new Date(d.date) >= cutoff);
              const displayData = rangedData.length >= 2 ? rangedData : pnlSparkline;
              const lastVal = displayData[displayData.length - 1]?.pnl ?? 0;
              const firstVal = displayData[0]?.pnl ?? 0;
              const periodChange = Math.round((lastVal - firstVal) * 10) / 10;
              const isUp = lastVal >= 0;
              const trendLabel = periodChange > 1 ? "Uptrend" : periodChange < -1 ? "Deteriorating" : "Flat";
              const best = displayData.reduce((b, d) => d.pnl > b.pnl ? d : b, displayData[0]);
              const worst = displayData.reduce((w, d) => d.pnl < w.pnl ? d : w, displayData[0]);
              return (
                <div
                  style={{
                    padding: 16,
                    background: "var(--stoa-shine)",
                    border: "1px solid var(--stoa-rule)",
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="stoa-kicker">P&amp;L CURVE · Καμπύλη</span>
                    <ToggleGroup type="single" value={sparkRange} onValueChange={(v) => v && setSparkRange(v as any)} className="gap-1">
                      {(["7D", "30D", "90D"] as const).map(r => (
                        <ToggleGroupItem
                          key={r}
                          value={r}
                          className="stoa-mono h-6 px-2 rounded-none bg-transparent text-[color:var(--stoa-muted)] data-[state=on]:text-[color:var(--stoa-accent)] data-[state=on]:border-[color:var(--stoa-accent)] data-[state=on]:bg-transparent"
                          style={{ fontSize: 10, border: "1px solid var(--stoa-rule)" }}
                        >
                          {r}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart data={displayData}>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const v = payload[0].value as number;
                          return (
                            <div
                              className="stoa-mono"
                              style={{
                                padding: "4px 8px",
                                fontSize: 10,
                                background: "var(--stoa-shine)",
                                border: "1px solid var(--stoa-rule)",
                                borderRadius: 2,
                                color: "var(--stoa-ink)",
                              }}
                            >
                              P&amp;L:{" "}
                              <span style={{ color: v >= 0 ? "hsl(var(--verdict-buy))" : "hsl(var(--verdict-avoid))" }}>
                                {v > 0 ? "+" : ""}{v.toFixed(1)}%
                              </span>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pnl"
                        stroke={isUp ? "var(--stoa-accent)" : "hsl(var(--verdict-avoid))"}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {periodChange >= 0
                        ? <ChevronUp className="h-3 w-3" style={{ color: "var(--stoa-accent)" }} />
                        : <ChevronDown className="h-3 w-3" style={{ color: "hsl(var(--verdict-avoid))" }} />}
                      <span
                        className="stoa-mono"
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: periodChange >= 0 ? "var(--stoa-accent)" : "hsl(var(--verdict-avoid))",
                        }}
                      >
                        {periodChange > 0 ? "+" : ""}{periodChange}%
                      </span>
                      <span className="stoa-kicker" style={{ fontSize: 9, marginLeft: 4 }}>{trendLabel}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span className="stoa-kicker" style={{ fontSize: 9 }}>
                        Best <span className="stoa-mono" style={{ color: "hsl(var(--verdict-buy))", marginLeft: 2 }}>+{best.pnl}%</span>
                      </span>
                      <span className="stoa-kicker" style={{ fontSize: 9 }}>
                        Worst <span className="stoa-mono" style={{ color: "hsl(var(--verdict-avoid))", marginLeft: 2 }}>{worst.pnl}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* d) Empty state */}
            {stats.total === 0 && (
              <div
                style={{
                  padding: "20px 16px",
                  background: "var(--stoa-shine)",
                  border: "1px solid var(--stoa-rule)",
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontFamily: "Georgia, 'EB Garamond', serif", fontStyle: "italic", fontSize: 13, color: "var(--stoa-muted)" }}>
                  Log decisions in the Tracker to populate the Gymnasium
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="paper" className="mt-3 flex flex-col gap-3">
            {/* Balance bar */}
            <GlassCard>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Virtual Balance</span>
                <span className="text-sm font-bold font-mono">£{remaining.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }} animate={{ width: `${(remaining / startingBalance) * 100}%` }}
                  transition={{ duration: 0.6 }} />
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-[10px] text-muted-foreground">£{usedBalance.toLocaleString()} invested</p>
                <p className="text-[10px] text-muted-foreground">
                  {paperWins}W / {paperLosses}L
                </p>
              </div>
            </GlassCard>

            {/* New trade form */}
            <GlassCard className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Paper Trade</p>
              <Input placeholder="Symbol" value={ptForm.symbol} onChange={(e) => setPtForm((p) => ({ ...p, symbol: e.target.value }))} className="bg-secondary/50" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Units" type="number" value={ptForm.units} onChange={(e) => setPtForm((p) => ({ ...p, units: e.target.value }))} className="bg-secondary/50" />
                <Input placeholder="Price (£)" type="number" value={ptForm.price} onChange={(e) => setPtForm((p) => ({ ...p, price: e.target.value }))} className="bg-secondary/50" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Stop Loss (£)" type="number" value={ptForm.stopLoss} onChange={(e) => setPtForm((p) => ({ ...p, stopLoss: e.target.value }))} className="bg-secondary/50" />
                <Input placeholder="Take Profit (£)" type="number" value={ptForm.takeProfit} onChange={(e) => setPtForm((p) => ({ ...p, takeProfit: e.target.value }))} className="bg-secondary/50" />
              </div>
              <Textarea placeholder="Trade thesis — why are you entering?" value={ptForm.thesis} onChange={(e) => setPtForm((p) => ({ ...p, thesis: e.target.value }))} className="bg-secondary/50 min-h-[60px]" />
              {ptForm.units && ptForm.price && (
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Cost: £{((parseFloat(ptForm.units) || 0) * (parseFloat(ptForm.price) || 0)).toFixed(2)}</span>
                  {ptForm.stopLoss && ptForm.price && (
                    <span className="text-verdict-avoid">
                      Risk: £{(((parseFloat(ptForm.price) - parseFloat(ptForm.stopLoss)) * (parseFloat(ptForm.units) || 0))).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
              <Button onClick={addPaperTrade} size="sm">Open Position</Button>
            </GlassCard>

            {/* Open positions */}
            {openTrades.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Positions</p>
                {openTrades.map((t) => (
                  <GlassCard key={t.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold font-mono">{t.symbol}</span>
                        <p className="text-xs text-muted-foreground font-mono">{t.units} × £{t.price} = £{t.cost.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="text-[10px] h-7 text-verdict-buy border-verdict-buy/30"
                          onClick={() => closeTrade(t.id, "closed-win")}>Win</Button>
                        <Button variant="outline" size="sm" className="text-[10px] h-7 text-verdict-avoid border-verdict-avoid/30"
                          onClick={() => closeTrade(t.id, "closed-loss")}>Loss</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setPaperTrades((p) => p.filter((x) => x.id !== t.id))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {(t.stopLoss || t.takeProfit) && (
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        {t.stopLoss && <span>SL: £{t.stopLoss}</span>}
                        {t.takeProfit && <span>TP: £{t.takeProfit}</span>}
                        {t.stopLoss && t.takeProfit && (
                          <span className="text-primary font-medium">
                            R:R {((t.takeProfit - t.price) / (t.price - t.stopLoss)).toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                    {t.thesis && <p className="text-[10px] text-muted-foreground/80 italic">{t.thesis}</p>}
                  </GlassCard>
                ))}
              </>
            )}

            {/* Closed trades */}
            {closedTrades.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Closed</p>
                {closedTrades.slice(0, 10).map((t) => (
                  <GlassCard key={t.id} className="flex items-center justify-between opacity-60">
                    <div>
                      <span className="text-sm font-bold font-mono">{t.symbol}</span>
                      <p className="text-xs text-muted-foreground font-mono">{t.units} × £{t.price}</p>
                    </div>
                    <span className={`text-xs font-bold ${t.status === "closed-win" ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                      {t.status === "closed-win" ? "WIN" : "LOSS"}
                    </span>
                  </GlassCard>
                ))}
              </>
            )}

            {paperTrades.length === 0 && (
              <GlassCard className="text-center py-6">
                <p className="text-sm text-muted-foreground">No paper trades yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Practice risk-free with a virtual £10,000</p>
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="personality" className="mt-3">
            <PersonalitySelector />
          </TabsContent>
        </Tabs>
      </div>
    </StoaShell>
  );
};

export default Portfolio;
