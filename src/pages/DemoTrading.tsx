import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, X, AlertTriangle, HelpCircle, DollarSign, Target, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuotes } from "@/hooks/use-quotes";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allSymbols } from "@/data/symbolLists";
import GuidedWalkthrough from "@/components/demo/GuidedWalkthrough";
import TradeReview from "@/components/demo/TradeReview";

type AssetTab = "stock" | "crypto" | "forex";
const exchangePrefix: Record<AssetTab, string> = { stock: "", crypto: "BINANCE:", forex: "FX:" };
const defaultSymbols: Record<AssetTab, string> = { stock: "AAPL", crypto: "BTCUSDT", forex: "EURUSD" };

interface PaperPosition {
  id: string; symbol: string; direction: string; entry_price: number; quantity: number;
  stop_loss: number | null; take_profit: number | null; status: string; opened_at: string;
  asset_type: string; thesis: string | null; exit_price: number | null; pnl: number | null;
  pnl_percent: number | null; closed_at: string | null;
}

const DemoTrading = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assetTab, setAssetTab] = useState<AssetTab>("stock");
  const [symbol, setSymbol] = useState("AAPL");
  const [balance, setBalance] = useState(10000);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [history, setHistory] = useState<PaperPosition[]>([]);
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [units, setUnits] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [placing, setPlacing] = useState(false);
  const [reviewTrade, setReviewTrade] = useState<PaperPosition | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const openSymbols = positions.map(p => p.symbol);
  const { quotes } = useQuotes(openSymbols.length > 0 ? openSymbols : [symbol], assetTab);

  const currentPrice = quotes[symbol]?.current_price || 0;

  // Load balance + positions
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, openRes, closedRes] = await Promise.all([
        supabase.from("profiles").select("paper_balance").eq("user_id", user.id).single(),
        supabase.from("paper_trades").select("*").eq("user_id", user.id).eq("status", "open").order("opened_at", { ascending: false }),
        supabase.from("paper_trades").select("*").eq("user_id", user.id).neq("status", "open").order("closed_at", { ascending: false }).limit(20),
      ]);
      if (profileRes.data) setBalance(profileRes.data.paper_balance);
      if (openRes.data) setPositions(openRes.data as any);
      if (closedRes.data) setHistory(closedRes.data as any);
    };
    load();
  }, [user]);

  // Load TradingView chart
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
  useEffect(() => { const s = defaultSymbols[assetTab]; setSymbol(s); }, [assetTab]);

  const riskPercent = units && currentPrice && stopLoss
    ? Math.abs((currentPrice - parseFloat(stopLoss)) * parseFloat(units) / balance * 100)
    : 0;

  const placeOrder = async () => {
    if (!user || !currentPrice) return;
    const qty = parseFloat(units);
    const sl = stopLoss ? parseFloat(stopLoss) : null;
    const tp = takeProfit ? parseFloat(takeProfit) : null;
    if (!qty || qty <= 0) { toast({ title: "Enter valid units", variant: "destructive" }); return; }
    if (!sl) { toast({ title: "Stop Loss required", description: "Always set a stop loss to manage risk.", variant: "destructive" }); return; }
    const cost = qty * currentPrice;
    if (cost > balance) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }

    setPlacing(true);
    const { data, error } = await supabase.from("paper_trades").insert({
      user_id: user.id, symbol, asset_type: assetTab, direction, entry_price: currentPrice,
      quantity: qty, stop_loss: sl, take_profit: tp, status: "open",
    } as any).select().single();

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      const newBal = balance - cost;
      await supabase.from("profiles").update({ paper_balance: newBal } as any).eq("user_id", user.id);
      setBalance(newBal);
      setPositions(prev => [data as any, ...prev]);
      setUnits(""); setStopLoss(""); setTakeProfit("");
      toast({ title: `${direction.toUpperCase()} ${symbol}`, description: `${qty} units @ $${currentPrice.toFixed(2)}` });
    }
    setPlacing(false);
  };

  const closePosition = async (pos: PaperPosition) => {
    if (!user || !currentPrice) return;
    const exitPrice = currentPrice;
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
      setHistory(prev => [closed, ...prev]);
      setReviewTrade(closed);
      toast({ title: `Closed ${pos.symbol}`, description: `P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent.toFixed(1)}%)` });
    }
  };

  const quickSymbols = allSymbols[assetTab]?.slice(0, 6) || [];

  return (
    <PageShell>
      <div className="flex flex-col gap-4 pt-6 pb-24">
        <GuidedWalkthrough />

        {/* Header */}
        <div className="flex items-center justify-between" id="demo-header">
          <div>
            <h1 className="text-xl font-bold">Demo Trading</h1>
            <p className="text-xs text-muted-foreground">Practice with virtual money</p>
          </div>
          <GlassCard className="px-4 py-2">
            <p className="text-[10px] text-muted-foreground">Balance</p>
            <p className="text-sm font-bold font-mono text-verdict-buy">£{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </GlassCard>
        </div>

        {/* Asset tabs + Symbol selector */}
        <div className="flex gap-2" id="demo-asset-tabs">
          {(["stock", "crypto", "forex"] as AssetTab[]).map((t) => (
            <button key={t} onClick={() => setAssetTab(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${assetTab === t ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" id="demo-symbols">
          {quickSymbols.map((s) => (
            <button key={s.symbol} onClick={() => setSymbol(s.symbol)}
              className={`rounded-full px-3 py-1 text-[11px] font-mono font-medium transition-all ${symbol === s.symbol ? "bg-primary/20 text-primary border border-primary/30" : "glass-card text-muted-foreground"}`}>
              {s.symbol}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div id="demo-chart" className="rounded-2xl overflow-hidden border border-border/30 bg-card" style={{ height: "clamp(300px, 45vh, 500px)" }}>
          <div ref={chartRef} style={{ height: "100%", width: "100%" }} />
        </div>

        {/* Open position overlay */}
        {positions.filter(p => p.symbol === symbol).map(pos => {
          const live = quotes[pos.symbol]?.current_price || pos.entry_price;
          const unrealizedPnl = pos.direction === "long" ? (live - pos.entry_price) * pos.quantity : (pos.entry_price - live) * pos.quantity;
          return (
            <GlassCard key={pos.id} className="border-primary/20 bg-primary/3" id="demo-position-overlay">
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
                    Close Position
                  </Button>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                {pos.stop_loss && <span>SL: ${pos.stop_loss}</span>}
                {pos.take_profit && <span>TP: ${pos.take_profit}</span>}
                <span>Qty: {pos.quantity}</span>
              </div>
            </GlassCard>
          );
        })}

        {/* Order Form */}
        <GlassCard id="demo-order-form">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Place Order</p>
            {currentPrice > 0 && (
              <span className="text-sm font-bold font-mono">${currentPrice.toFixed(2)}</span>
            )}
          </div>

          <div className="flex gap-2 mb-3" id="demo-buy-sell">
            <Button onClick={() => setDirection("long")} className={`flex-1 gap-1.5 ${direction === "long" ? "bg-verdict-buy hover:bg-verdict-buy/90 text-white" : "bg-secondary text-muted-foreground"}`}>
              <TrendingUp className="h-4 w-4" /> BUY
            </Button>
            <Button onClick={() => setDirection("short")} className={`flex-1 gap-1.5 ${direction === "short" ? "bg-verdict-avoid hover:bg-verdict-avoid/90 text-white" : "bg-secondary text-muted-foreground"}`}>
              <TrendingDown className="h-4 w-4" /> SELL
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Units</label>
              <Input type="number" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" className="bg-secondary/50" id="demo-units" />
            </div>
            <div id="demo-stoploss">
              <label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Stop Loss
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

          {/* Risk indicator */}
          <div className="flex items-center justify-between mb-3 text-xs" id="demo-risk">
            <span className="text-muted-foreground">Risk: <span className={`font-mono font-bold ${riskPercent > 5 ? "text-verdict-avoid" : riskPercent > 2 ? "text-verdict-wait" : "text-verdict-buy"}`}>{riskPercent.toFixed(1)}%</span> of balance</span>
            {units && currentPrice ? (
              <span className="text-muted-foreground font-mono">Cost: ${(parseFloat(units || "0") * currentPrice).toFixed(2)}</span>
            ) : null}
          </div>
          {riskPercent > 5 && (
            <div className="flex items-center gap-2 text-[10px] text-verdict-avoid mb-3">
              <AlertTriangle className="h-3.5 w-3.5" /> High risk — consider reducing position size
            </div>
          )}

          <Button onClick={placeOrder} disabled={placing || !units || !stopLoss} className="w-full" id="demo-place-order">
            {placing ? "Placing..." : "Place Order"}
          </Button>
        </GlassCard>

        {/* Positions & History */}
        <Tabs defaultValue="open">
          <TabsList className="w-full bg-secondary/50">
            <TabsTrigger value="open" className="flex-1 text-xs">Open ({positions.length})</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs">History ({history.length})</TabsTrigger>
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
                <GlassCard key={pos.id} className="flex items-center justify-between">
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
          <TabsContent value="history" className="mt-3 flex flex-col gap-2">
            {history.length === 0 && (
              <GlassCard className="text-center py-8">
                <p className="text-sm text-muted-foreground">No closed trades yet</p>
              </GlassCard>
            )}
            {history.map(pos => (
              <GlassCard key={pos.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold font-mono">{pos.symbol}</span>
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${pos.status === "closed-win" ? "bg-verdict-buy/10 text-verdict-buy" : "bg-verdict-avoid/10 text-verdict-avoid"}`}>
                    {pos.status === "closed-win" ? "WIN" : "LOSS"}
                  </span>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold font-mono ${(pos.pnl || 0) >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                    {(pos.pnl || 0) >= 0 ? "+" : ""}${(pos.pnl || 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{pos.pnl_percent?.toFixed(1)}%</p>
                </div>
              </GlassCard>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Trade Review Modal */}
      {reviewTrade && <TradeReview trade={reviewTrade} onClose={() => setReviewTrade(null)} />}
    </PageShell>
  );
};

export default DemoTrading;
