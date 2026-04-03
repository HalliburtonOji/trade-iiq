import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, ShieldAlert, Target, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuotes } from "@/hooks/use-quotes";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { allSymbols } from "@/data/symbolLists";
import { computeLevel, tradingMissions, type MissionStats } from "@/data/tradingMissions";
import GuidedWalkthrough from "@/components/demo/GuidedWalkthrough";
import TradeReview from "@/components/demo/TradeReview";
import TradingLevel from "@/components/demo/TradingLevel";
import ThesisBuilder, { type ThesisData } from "@/components/demo/ThesisBuilder";
import TradingMissions from "@/components/demo/TradingMissions";
import PerformanceStats from "@/components/demo/PerformanceStats";
import TradeJournal from "@/components/demo/TradeJournal";
import PositionAlerts from "@/components/demo/PositionAlerts";

type AssetTab = "stock" | "crypto" | "forex";
const exchangePrefix: Record<AssetTab, string> = { stock: "", crypto: "BINANCE:", forex: "FX:" };
const defaultSymbols: Record<AssetTab, string> = { stock: "AAPL", crypto: "BTCUSDT", forex: "EURUSD" };

interface PaperPosition {
  id: string; symbol: string; direction: string; entry_price: number; quantity: number;
  stop_loss: number | null; take_profit: number | null; status: string; opened_at: string;
  asset_type: string; thesis: string | null; exit_price: number | null; pnl: number | null;
  pnl_percent: number | null; closed_at: string | null; thesis_json?: any;
  order_type?: string; emotion?: string | null; post_notes?: string | null; leverage?: number;
}

const DemoTrading = () => {
  const { user } = useAuth();
  const [assetTab, setAssetTab] = useState<AssetTab>("stock");
  const [symbol, setSymbol] = useState("AAPL");
  const [balance, setBalance] = useState(10000);
  const [xp, setXp] = useState(0);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [allTrades, setAllTrades] = useState<PaperPosition[]>([]);
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [units, setUnits] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [placing, setPlacing] = useState(false);
  const [reviewTrade, setReviewTrade] = useState<PaperPosition | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [thesis, setThesis] = useState<ThesisData>({ reason: "", confidence: 3, invalidation: "" });
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);

  const openSymbols = positions.map(p => p.symbol);
  const { quotes } = useQuotes(openSymbols.length > 0 ? [...new Set([...openSymbols, symbol])] : [symbol], assetTab);
  const currentPrice = quotes[symbol]?.current_price || 0;

  // Computed stats
  const history = useMemo(() => allTrades.filter(t => t.status !== "open"), [allTrades]);
  const totalTrades = history.length;
  const wins = useMemo(() => history.filter(t => (t.pnl || 0) > 0).length, [history]);
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const tradesWithSL = useMemo(() => allTrades.filter(t => t.stop_loss !== null).length, [allTrades]);
  const slPercent = totalTrades > 0 ? (tradesWithSL / totalTrades) * 100 : 0;
  const level = computeLevel(totalTrades, winRate, slPercent);

  const missionStats: MissionStats = useMemo(() => {
    const shortTrades = history.filter(t => t.direction === "short").length;
    const totalPnl = history.reduce((s, t) => s + (t.pnl || 0), 0);
    const holds = history.filter(t => t.closed_at).map(t => (new Date(t.closed_at!).getTime() - new Date(t.opened_at).getTime()) / 60000);
    const longestHoldMin = holds.length ? Math.max(...holds) : 0;

    let consecutiveSLTrades = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].stop_loss !== null) consecutiveSLTrades++;
      else break;
    }

    const riskPercs = history.filter(t => t.stop_loss && t.entry_price).map(t =>
      Math.abs((t.entry_price - (t.stop_loss || 0)) * t.quantity / 10000 * 100)
    );
    const avgRiskPercent = riskPercs.length ? riskPercs.reduce((a, b) => a + b, 0) / riskPercs.length : 0;

    return {
      totalTrades, wins, losses: totalTrades - wins, tradesWithSL,
      tradesWithTP: allTrades.filter(t => t.take_profit !== null).length,
      shortTrades, totalPnl, longestHoldMin, consecutiveSLTrades,
      avgRiskPercent, winRate, lessonsCompleted,
      walkthroughDone: !!localStorage.getItem("demo_walkthrough_complete"),
    };
  }, [history, allTrades, totalTrades, wins, tradesWithSL, winRate, lessonsCompleted]);

  const completedMissions = useMemo(() => {
    return tradingMissions.filter((m) => m.check(missionStats)).map((m) => m.id);
  }, [missionStats]);

  // Load data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, tradesRes, lessonsRes] = await Promise.all([
        supabase.from("profiles").select("paper_balance, xp_total").eq("user_id", user.id).single(),
        supabase.from("paper_trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }),
        supabase.from("learning_progress").select("id").eq("user_id", user.id).eq("completed", true),
      ]);
      if (profileRes.data) { setBalance(profileRes.data.paper_balance); setXp(profileRes.data.xp_total); }
      if (tradesRes.data) {
        const all = tradesRes.data as any as PaperPosition[];
        setAllTrades(all);
        setPositions(all.filter(t => t.status === "open"));
      }
      if (lessonsRes.data) setLessonsCompleted(lessonsRes.data.length);
    };
    load();
  }, [user]);

  // Chart
  const loadChart = useCallback((sym: string) => {
    if (!chartRef.current) return;
    chartRef.current.innerHTML = "";
    const full = assetTab === "stock" ? sym : `${exchangePrefix[assetTab]}${sym}`;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true, symbol: full, interval: "15", timezone: "Etc/UTC", theme: "dark",
      style: "1", locale: "en", backgroundColor: "rgba(8, 12, 24, 1)", gridColor: "rgba(255, 255, 255, 0.04)",
      allow_symbol_change: false, calendar: false, support_host: "https://www.tradingview.com",
      hide_volume: false, studies: ["RSI@tv-basicstudies"],
    });
    chartRef.current.appendChild(script);
  }, [assetTab]);

  useEffect(() => { loadChart(symbol); }, [symbol, loadChart]);
  useEffect(() => { setSymbol(defaultSymbols[assetTab]); }, [assetTab]);

  // Risk calc
  const riskPercent = units && currentPrice && stopLoss
    ? Math.abs((currentPrice - parseFloat(stopLoss)) * parseFloat(units) / balance * 100) : 0;

  const rrRatio = stopLoss && takeProfit && currentPrice
    ? Math.abs((parseFloat(takeProfit) - currentPrice) / (currentPrice - parseFloat(stopLoss))) : 0;

  const cost = parseFloat(units || "0") * currentPrice;

  // Quick size
  const quickSize = (pct: number) => {
    if (!currentPrice) return;
    const amt = (balance * pct / 100) / currentPrice;
    setUnits(Math.floor(amt * 100) / 100 + "");
  };

  // Order
  const attemptPlaceOrder = () => {
    if (!user || !currentPrice) return;
    const qty = parseFloat(units);
    if (!qty || qty <= 0) { toast.error("Enter valid units"); return; }
    if (!stopLoss) { toast.error("Stop Loss is required for risk management"); return; }
    if (cost > balance) { toast.error("Insufficient balance"); return; }
    // Level gates
    if (direction === "short" && level < 3) { toast.error("Short selling unlocks at Level 3 (Trader)"); return; }
    if (orderType === "limit" && level < 2) { toast.error("Limit orders unlock at Level 2 (Apprentice)"); return; }
    // Large position warning
    if (cost > balance * 0.1) { setConfirmDialog(true); return; }
    placeOrder();
  };

  const placeOrder = async () => {
    if (!user || !currentPrice) return;
    setConfirmDialog(false);
    setPlacing(true);
    const qty = parseFloat(units);
    const sl = parseFloat(stopLoss);
    const tp = takeProfit ? parseFloat(takeProfit) : null;

    const { data, error } = await supabase.from("paper_trades").insert({
      user_id: user.id, symbol, asset_type: assetTab, direction, entry_price: currentPrice,
      quantity: qty, stop_loss: sl, take_profit: tp, status: "open", order_type: orderType,
      thesis_json: thesis.reason ? thesis : {},
    } as any).select().single();

    if (error) { toast.error(error.message); }
    else {
      const newBal = balance - cost;
      await supabase.from("profiles").update({ paper_balance: newBal } as any).eq("user_id", user.id);
      setBalance(newBal);
      const trade = data as any as PaperPosition;
      setPositions(prev => [trade, ...prev]);
      setAllTrades(prev => [trade, ...prev]);
      setUnits(""); setStopLoss(""); setTakeProfit("");
      setThesis({ reason: "", confidence: 3, invalidation: "" });
      toast.success(`${direction.toUpperCase()} ${symbol} — ${qty} units @ $${currentPrice.toFixed(2)}`);
    }
    setPlacing(false);
  };

  const closePosition = async (pos: PaperPosition) => {
    if (!user) return;
    const exitPrice = quotes[pos.symbol]?.current_price || currentPrice;
    if (!exitPrice) return;
    const pnl = pos.direction === "long"
      ? (exitPrice - pos.entry_price) * pos.quantity
      : (pos.entry_price - exitPrice) * pos.quantity;
    const pnlPercent = (pnl / (pos.entry_price * pos.quantity)) * 100;

    const { error } = await supabase.from("paper_trades").update({
      status: pnl >= 0 ? "closed-win" : "closed-loss",
      exit_price: exitPrice, pnl, pnl_percent: Math.round(pnlPercent * 100) / 100, closed_at: new Date().toISOString(),
    } as any).eq("id", pos.id);

    if (!error) {
      const newBal = balance + pos.entry_price * pos.quantity + pnl;
      await supabase.from("profiles").update({ paper_balance: newBal } as any).eq("user_id", user.id);
      setBalance(newBal);
      const closed = { ...pos, exit_price: exitPrice, pnl, pnl_percent: Math.round(pnlPercent * 100) / 100, status: pnl >= 0 ? "closed-win" : "closed-loss", closed_at: new Date().toISOString() };
      setPositions(prev => prev.filter(p => p.id !== pos.id));
      setAllTrades(prev => prev.map(t => t.id === pos.id ? closed : t));
      setReviewTrade(closed);
      toast.success(`Closed ${pos.symbol} — P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`);
    }
  };

  const reloadTrades = async () => {
    if (!user) return;
    const { data } = await supabase.from("paper_trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false });
    if (data) {
      const all = data as any as PaperPosition[];
      setAllTrades(all);
      setPositions(all.filter(t => t.status === "open"));
    }
  };

  const quickSymbols = allSymbols[assetTab]?.slice(0, 8) || [];

  return (
    <PageShell>
      <div className="flex flex-col gap-3 pt-4 pb-24">
        <GuidedWalkthrough />
        <PositionAlerts positions={positions} quotes={quotes} balance={balance} />

        {/* Header with level */}
        <div className="flex items-center justify-between gap-3" id="demo-header">
          <div className="flex-1">
            <h1 className="text-lg font-bold">Demo Trading</h1>
            <p className="text-[10px] text-muted-foreground">Practice risk-free with virtual money</p>
          </div>
          <GlassCard className="px-3 py-1.5 shrink-0">
            <p className="text-[9px] text-muted-foreground">Balance</p>
            <p className="text-sm font-bold font-mono text-verdict-buy">£{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </GlassCard>
        </div>

        <TradingLevel level={level} totalTrades={totalTrades} xp={xp} />

        {/* Asset tabs */}
        <div className="flex gap-2" id="demo-asset-tabs">
          {(["stock", "crypto", "forex"] as AssetTab[]).map((t) => (
            <button key={t} onClick={() => setAssetTab(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${assetTab === t ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickSymbols.map((s) => (
            <button key={s.symbol} onClick={() => setSymbol(s.symbol)}
              className={`rounded-full px-3 py-1 text-[11px] font-mono font-medium transition-all ${symbol === s.symbol ? "bg-primary/20 text-primary border border-primary/30" : "glass-card text-muted-foreground"}`}>
              {s.symbol}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div id="demo-chart" className="rounded-2xl overflow-hidden border border-border/30 bg-card" style={{ height: "clamp(280px, 40vh, 450px)" }}>
          <div ref={chartRef} style={{ height: "100%", width: "100%" }} />
        </div>

        {/* Open position overlays */}
        {positions.filter(p => p.symbol === symbol).map(pos => {
          const live = quotes[pos.symbol]?.current_price || pos.entry_price;
          const unrealizedPnl = pos.direction === "long" ? (live - pos.entry_price) * pos.quantity : (pos.entry_price - live) * pos.quantity;
          const nearSL = pos.stop_loss && Math.abs(live - pos.stop_loss) / live < 0.01;
          const nearTP = pos.take_profit && Math.abs(live - pos.take_profit) / live < 0.01;

          return (
            <motion.div key={pos.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GlassCard className={`border ${unrealizedPnl >= 0 ? "border-verdict-buy/30 shadow-verdict-buy/5" : nearSL ? "border-verdict-wait/30 shadow-verdict-wait/5" : "border-verdict-avoid/30 shadow-verdict-avoid/5"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold font-mono">{pos.symbol}</span>
                    <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${pos.direction === "long" ? "bg-verdict-buy/10 text-verdict-buy" : "bg-verdict-avoid/10 text-verdict-avoid"}`}>
                      {pos.direction.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">@ ${pos.entry_price.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${unrealizedPnl >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                      {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
                    </p>
                    <Button size="sm" variant="outline" className="text-[10px] h-6 mt-1" onClick={() => closePosition(pos)}>
                      Close
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                  {pos.stop_loss && <span className={nearSL ? "text-verdict-wait font-bold" : ""}>SL: ${pos.stop_loss}</span>}
                  {pos.take_profit && <span className={nearTP ? "text-verdict-buy font-bold" : ""}>TP: ${pos.take_profit}</span>}
                  <span>Qty: {pos.quantity}</span>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}

        {/* Order Form */}
        <GlassCard id="demo-order-form">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Place Order</p>
            <div className="flex items-center gap-2">
              {level >= 2 && (
                <div className="flex gap-1">
                  {(["market", "limit"] as const).map((t) => (
                    <button key={t} onClick={() => setOrderType(t)}
                      className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${orderType === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {currentPrice > 0 && <span className="text-sm font-bold font-mono">${currentPrice.toFixed(2)}</span>}
            </div>
          </div>

          {/* BUY/SELL */}
          <div className="flex gap-2 mb-3" id="demo-buy-sell">
            <Button onClick={() => setDirection("long")} className={`flex-1 gap-1.5 ${direction === "long" ? "bg-verdict-buy hover:bg-verdict-buy/90 text-white" : "bg-secondary text-muted-foreground"}`}>
              <TrendingUp className="h-4 w-4" /> BUY
            </Button>
            <Button onClick={() => setDirection("short")} disabled={level < 3}
              className={`flex-1 gap-1.5 ${direction === "short" ? "bg-verdict-avoid hover:bg-verdict-avoid/90 text-white" : "bg-secondary text-muted-foreground"}`}>
              <TrendingDown className="h-4 w-4" /> SELL {level < 3 && "🔒"}
            </Button>
          </div>

          {/* Quick size buttons */}
          <div className="flex gap-1.5 mb-3">
            <span className="text-[10px] text-muted-foreground self-center">Quick:</span>
            {[1, 2, 5, 10].map((pct) => (
              <button key={pct} onClick={() => quickSize(pct)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors">
                {pct}%
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Units</label>
              <Input type="number" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" className="bg-secondary/50" id="demo-units" />
            </div>
            <div id="demo-stoploss">
              <label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Stop Loss *
              </label>
              <Input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="$" className="bg-secondary/50" />
            </div>
            <div id="demo-takeprofit">
              <label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <Target className="h-3 w-3" /> Take Profit
              </label>
              <Input type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="$" className="bg-secondary/50" />
            </div>
          </div>

          {/* Risk + R:R */}
          <div className="flex items-center justify-between mb-2 text-xs" id="demo-risk">
            <span className="text-muted-foreground">
              Risk: <span className={`font-mono font-bold ${riskPercent > 5 ? "text-verdict-avoid" : riskPercent > 2 ? "text-verdict-wait" : "text-verdict-buy"}`}>{riskPercent.toFixed(1)}%</span>
            </span>
            {rrRatio > 0 && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Percent className="h-3 w-3" /> R:R <span className={`font-mono font-bold ${rrRatio >= 2 ? "text-verdict-buy" : rrRatio >= 1 ? "text-verdict-wait" : "text-verdict-avoid"}`}>{rrRatio.toFixed(1)}</span>
              </span>
            )}
            {cost > 0 && <span className="text-muted-foreground font-mono text-[10px]">Cost: ${cost.toFixed(2)}</span>}
          </div>

          {riskPercent > 5 && (
            <div className="flex items-center gap-2 text-[10px] text-verdict-avoid mb-2">
              <AlertTriangle className="h-3.5 w-3.5" /> High risk — consider reducing position size
            </div>
          )}

          {/* Thesis builder */}
          <ThesisBuilder thesis={thesis} onChange={setThesis} direction={direction} />

          <Button onClick={attemptPlaceOrder} disabled={placing || !units || !stopLoss} className="w-full mt-3" id="demo-place-order">
            {placing ? "Placing..." : `Place ${direction === "long" ? "Buy" : "Sell"} Order`}
          </Button>
        </GlassCard>

        {/* Missions */}
        <TradingMissions stats={missionStats} completedIds={completedMissions} />

        {/* Tabs: Open / Journal / Stats */}
        <Tabs defaultValue="open">
          <TabsList className="w-full bg-secondary/50">
            <TabsTrigger value="open" className="flex-1 text-xs">Open ({positions.length})</TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 text-xs">Journal ({history.length})</TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 text-xs">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-3 flex flex-col gap-2">
            {positions.length === 0 && (
              <GlassCard className="text-center py-8">
                <p className="text-sm text-muted-foreground">No open positions</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Place your first trade above!</p>
              </GlassCard>
            )}
            {positions.map(pos => {
              const live = quotes[pos.symbol]?.current_price || pos.entry_price;
              const pnl = pos.direction === "long" ? (live - pos.entry_price) * pos.quantity : (pos.entry_price - live) * pos.quantity;
              return (
                <GlassCard key={pos.id} className={`flex items-center justify-between ${pnl >= 0 ? "border-verdict-buy/10" : "border-verdict-avoid/10"}`}>
                  <div>
                    <span className="text-sm font-bold font-mono">{pos.symbol}</span>
                    <span className={`ml-2 text-[10px] ${pos.direction === "long" ? "text-verdict-buy" : "text-verdict-avoid"}`}>{pos.direction.toUpperCase()}</span>
                    <p className="text-[10px] text-muted-foreground">@ ${pos.entry_price.toFixed(2)} · {pos.quantity} units</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${pnl >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    </p>
                    <Button size="sm" variant="ghost" className="text-[10px] h-5" onClick={() => closePosition(pos)}>Close</Button>
                  </div>
                </GlassCard>
              );
            })}
          </TabsContent>

          <TabsContent value="journal" className="mt-3">
            <TradeJournal trades={history} onUpdate={reloadTrades} />
          </TabsContent>

          <TabsContent value="stats" className="mt-3">
            <PerformanceStats trades={allTrades} balance={balance} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation dialog for large positions */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Large Position Warning</DialogTitle>
            <DialogDescription>
              This trade uses more than 10% of your balance (${cost.toFixed(2)}). Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Cancel</Button>
            <Button onClick={placeOrder}>Confirm Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Trade Review Modal */}
      {reviewTrade && <TradeReview trade={reviewTrade} onClose={() => setReviewTrade(null)} />}
    </PageShell>
  );
};

export default DemoTrading;
