import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import SetupScoreMeter from "@/components/SetupScoreMeter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface PaperTrade {
  id: string;
  symbol: string;
  units: number;
  price: number;
  cost: number;
}

const Portfolio = () => {
  const { user } = useAuth();
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>(() => {
    const saved = localStorage.getItem("tradeiq_paper_trades");
    return saved ? JSON.parse(saved) : [];
  });
  const [ptForm, setPtForm] = useState({ symbol: "", units: "", price: "" });
  const [stats, setStats] = useState({ wins: 0, losses: 0, pending: 0, total: 0, winRate: 0 });

  const startingBalance = 10000;
  const usedBalance = paperTrades.reduce((s, t) => s + t.cost, 0);
  const remaining = startingBalance - usedBalance;

  useEffect(() => {
    localStorage.setItem("tradeiq_paper_trades", JSON.stringify(paperTrades));
  }, [paperTrades]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data } = await supabase.from("trade_decisions").select("outcome").eq("user_id", user.id);
      if (data) {
        const wins = data.filter((d: any) => d.outcome === "WIN").length;
        const losses = data.filter((d: any) => d.outcome === "LOSS").length;
        const pending = data.filter((d: any) => d.outcome === "PENDING").length;
        const total = wins + losses;
        setStats({ wins, losses, pending, total: data.length, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 });
      }
    };
    fetchStats();
  }, [user]);

  // Health score calculation
  const winRateScore = stats.winRate * 0.4;
  const decisionScore = Math.min(stats.total / 20, 1) * 30;
  const healthScore = Math.round(winRateScore + decisionScore + 15); // base 15 for diversification placeholder

  const addPaperTrade = () => {
    const units = parseFloat(ptForm.units) || 0;
    const price = parseFloat(ptForm.price) || 0;
    if (!ptForm.symbol || units <= 0 || price <= 0) return;
    const cost = units * price;
    if (cost > remaining) return;
    setPaperTrades((prev) => [
      ...prev,
      { id: Date.now().toString(), symbol: ptForm.symbol.toUpperCase(), units, price, cost },
    ]);
    setPtForm({ symbol: "", units: "", price: "" });
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-4 px-4 pt-6">
        <h1 className="text-xl font-bold">Portfolio</h1>

        <GlassCard className="flex items-center gap-4">
          <SetupScoreMeter score={healthScore} size="lg" />
          <div>
            <p className="text-sm font-semibold">Portfolio Health</p>
            <p className="text-xs text-muted-foreground">Based on win rate, activity & diversification</p>
          </div>
        </GlassCard>

        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Win Rate" value={`${stats.winRate}%`} trend={stats.winRate >= 50 ? "up" : stats.total > 0 ? "down" : "neutral"} />
          <StatCard label="Decisions" value={stats.total} />
          <StatCard label="Avg P&L" value="—" />
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full bg-secondary/50">
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="pnl" className="flex-1 text-xs">P&L</TabsTrigger>
            <TabsTrigger value="paper" className="flex-1 text-xs">Paper Trade</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <GlassCard className="text-center py-3">
                <p className="text-lg font-bold text-verdict-buy">{stats.wins}</p>
                <p className="text-[10px] text-muted-foreground">Wins</p>
              </GlassCard>
              <GlassCard className="text-center py-3">
                <p className="text-lg font-bold text-verdict-avoid">{stats.losses}</p>
                <p className="text-[10px] text-muted-foreground">Losses</p>
              </GlassCard>
              <GlassCard className="text-center py-3">
                <p className="text-lg font-bold text-muted-foreground">{stats.pending}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </GlassCard>
            </div>
            {stats.total === 0 && (
              <GlassCard className="text-center py-6">
                <p className="text-sm text-muted-foreground">Log decisions in the Tracker to see portfolio insights</p>
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="pnl" className="mt-3">
            <GlassCard className="text-center py-8">
              <p className="text-sm text-muted-foreground">P&L tracking requires live price data</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Log BUY decisions with entry prices to track performance</p>
            </GlassCard>
          </TabsContent>

          <TabsContent value="paper" className="mt-3 flex flex-col gap-3">
            <GlassCard>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Virtual Balance</span>
                <span className="text-sm font-bold font-mono">£{remaining.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${(remaining / startingBalance) * 100}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">£{usedBalance.toLocaleString()} invested of £{startingBalance.toLocaleString()}</p>
            </GlassCard>

            <GlassCard className="flex flex-col gap-2">
              <Input placeholder="Symbol" value={ptForm.symbol} onChange={(e) => setPtForm((p) => ({ ...p, symbol: e.target.value }))} className="bg-secondary/50" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Units" type="number" value={ptForm.units} onChange={(e) => setPtForm((p) => ({ ...p, units: e.target.value }))} className="bg-secondary/50" />
                <Input placeholder="Price (£)" type="number" value={ptForm.price} onChange={(e) => setPtForm((p) => ({ ...p, price: e.target.value }))} className="bg-secondary/50" />
              </div>
              {ptForm.units && ptForm.price && (
                <p className="text-xs text-muted-foreground font-mono">Cost: £{((parseFloat(ptForm.units) || 0) * (parseFloat(ptForm.price) || 0)).toFixed(2)}</p>
              )}
              <Button onClick={addPaperTrade} size="sm">Add Trade</Button>
            </GlassCard>

            {paperTrades.length === 0 ? (
              <GlassCard className="text-center py-6">
                <p className="text-sm text-muted-foreground">No paper trades yet</p>
              </GlassCard>
            ) : (
              paperTrades.map((t) => (
                <GlassCard key={t.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold font-mono">{t.symbol}</span>
                    <p className="text-xs text-muted-foreground font-mono">{t.units} × £{t.price} = £{t.cost.toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-verdict-avoid" onClick={() => setPaperTrades((p) => p.filter((x) => x.id !== t.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </GlassCard>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
};

export default Portfolio;
