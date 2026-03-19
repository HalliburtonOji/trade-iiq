import { useState } from "react";
import { motion } from "framer-motion";
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
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [ptForm, setPtForm] = useState({ symbol: "", units: "", price: "" });
  const startingBalance = 10000;
  const usedBalance = paperTrades.reduce((s, t) => s + t.cost, 0);
  const remaining = startingBalance - usedBalance;

  const healthScore = 50; // placeholder
  const winRate = 0;
  const totalDecisions = 0;

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

        {/* Health Score */}
        <GlassCard className="flex items-center gap-4">
          <SetupScoreMeter score={healthScore} size="lg" />
          <div>
            <p className="text-sm font-semibold">Portfolio Health</p>
            <p className="text-xs text-muted-foreground">Based on win rate, activity, and diversification</p>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Win Rate" value={`${winRate}%`} />
          <StatCard label="Decisions" value={totalDecisions} />
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
                <p className="text-lg font-bold text-verdict-buy">0</p>
                <p className="text-[10px] text-muted-foreground">Wins</p>
              </GlassCard>
              <GlassCard className="text-center py-3">
                <p className="text-lg font-bold text-verdict-avoid">0</p>
                <p className="text-[10px] text-muted-foreground">Losses</p>
              </GlassCard>
              <GlassCard className="text-center py-3">
                <p className="text-lg font-bold text-muted-foreground">0</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </GlassCard>
            </div>
            <GlassCard className="text-center py-6">
              <p className="text-sm text-muted-foreground">Log decisions in the Tracker to see portfolio insights</p>
            </GlassCard>
          </TabsContent>

          <TabsContent value="pnl" className="mt-3">
            <GlassCard className="text-center py-8">
              <p className="text-sm text-muted-foreground">No BUY decisions with entry prices yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Log decisions with entry prices to track P&L</p>
            </GlassCard>
          </TabsContent>

          <TabsContent value="paper" className="mt-3 flex flex-col gap-3">
            {/* Balance */}
            <GlassCard>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Virtual Balance</span>
                <span className="text-sm font-bold font-mono">£{remaining.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(remaining / startingBalance) * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">£{usedBalance.toLocaleString()} invested of £{startingBalance.toLocaleString()}</p>
            </GlassCard>

            {/* Form */}
            <GlassCard className="flex flex-col gap-2">
              <Input placeholder="Symbol" value={ptForm.symbol} onChange={(e) => setPtForm((p) => ({ ...p, symbol: e.target.value }))} className="bg-secondary/50" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Units" type="number" value={ptForm.units} onChange={(e) => setPtForm((p) => ({ ...p, units: e.target.value }))} className="bg-secondary/50" />
                <Input placeholder="Price" type="number" value={ptForm.price} onChange={(e) => setPtForm((p) => ({ ...p, price: e.target.value }))} className="bg-secondary/50" />
              </div>
              {ptForm.units && ptForm.price && (
                <p className="text-xs text-muted-foreground">Cost: £{((parseFloat(ptForm.units) || 0) * (parseFloat(ptForm.price) || 0)).toFixed(2)}</p>
              )}
              <Button onClick={addPaperTrade} size="sm">Add Trade</Button>
            </GlassCard>

            {/* Trades */}
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setPaperTrades((p) => p.filter((x) => x.id !== t.id))}>
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
