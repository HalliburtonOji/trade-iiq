import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, ShieldAlert, TrendingUp, TrendingDown, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import { useToast } from "@/hooks/use-toast";

interface Signal {
  signal: string;
  confidence: number;
  entry_zone?: { low: number; high: number };
  stop_loss: number;
  take_profit: { level: number; label: string }[];
  time_horizon: string;
  reasoning: string;
  risk_reward_ratio?: string;
  key_levels?: { price: number; type: string; note: string }[];
  disclaimer: string;
}

interface Props {
  symbol: string;
  assetType: string;
  livePrice?: number;
}

const signalColors: Record<string, string> = {
  STRONG_BUY: "text-verdict-buy",
  BUY: "text-verdict-buy",
  HOLD: "text-verdict-wait",
  SELL: "text-verdict-avoid",
  STRONG_SELL: "text-verdict-avoid",
};

const MarketSignals = ({ symbol, assetType, livePrice }: Props) => {
  const { toast } = useToast();
  const [signals, setSignals] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("market-signals", {
        body: { symbol, asset_type: assetType },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setSignals(data.signals);
      if (data.live_price) setFetchedPrice(data.live_price);
    } catch (e: any) {
      toast({ title: "Signal Error", description: e.message || "Failed to fetch signals", variant: "destructive" });
    }
    setLoading(false);
  };

  const price = livePrice || fetchedPrice;

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs"
        onClick={fetchSignals}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
        {loading ? "Analyzing..." : "Get AI Signals"}
      </Button>

      <AnimatePresence>
        {signals && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-col gap-2"
          >
            {/* Signal Header */}
            <GlassCard className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AI Signal</p>
                <p className={`text-lg font-bold ${signalColors[signals.signal] || "text-foreground"}`}>
                  {signals.signal.replace("_", " ")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Confidence: {Math.round(signals.confidence * 100)}% · {signals.time_horizon}
                </p>
              </div>
              <div className="text-right">
                {signals.risk_reward_ratio && (
                  <p className="text-xs font-mono text-primary">R:R {signals.risk_reward_ratio}</p>
                )}
              </div>
            </GlassCard>

            {/* Entry / SL / TP */}
            <div className="grid grid-cols-3 gap-2">
              {signals.entry_zone && (
                <GlassCard className="text-center py-2">
                  <TrendingUp className="h-3.5 w-3.5 text-verdict-buy mx-auto mb-1" />
                  <p className="text-[9px] text-muted-foreground uppercase">Entry</p>
                  <p className="text-xs font-bold font-mono">${signals.entry_zone.low.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">— ${signals.entry_zone.high.toFixed(2)}</p>
                </GlassCard>
              )}
              <GlassCard className="text-center py-2">
                <ShieldAlert className="h-3.5 w-3.5 text-verdict-avoid mx-auto mb-1" />
                <p className="text-[9px] text-muted-foreground uppercase">Stop Loss</p>
                <p className="text-xs font-bold font-mono text-verdict-avoid">${signals.stop_loss.toFixed(2)}</p>
                {price && (
                  <p className="text-[9px] text-muted-foreground">
                    {((Math.abs(price - signals.stop_loss) / price) * 100).toFixed(1)}% risk
                  </p>
                )}
              </GlassCard>
              <GlassCard className="text-center py-2">
                <Clock className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                <p className="text-[9px] text-muted-foreground uppercase">Horizon</p>
                <p className="text-xs font-bold font-mono">{signals.time_horizon}</p>
              </GlassCard>
            </div>

            {/* Take Profit Levels */}
            {signals.take_profit.length > 0 && (
              <GlassCard className="flex flex-col gap-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Take Profit Targets</p>
                {signals.take_profit.map((tp, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-verdict-buy">{tp.label}</span>
                    <span className="text-xs font-mono font-bold">${tp.level.toFixed(2)}</span>
                  </div>
                ))}
              </GlassCard>
            )}

            {/* Key Levels */}
            {signals.key_levels && signals.key_levels.length > 0 && (
              <GlassCard className="flex flex-col gap-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Key Levels</p>
                {signals.key_levels.map((kl, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${kl.type === "support" ? "bg-verdict-buy/10 text-verdict-buy" : "bg-verdict-avoid/10 text-verdict-avoid"}`}>
                        {kl.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{kl.note}</span>
                    </div>
                    <span className="text-xs font-mono">${kl.price.toFixed(2)}</span>
                  </div>
                ))}
              </GlassCard>
            )}

            {/* Reasoning */}
            <GlassCard className="bg-primary/3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Analysis</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{signals.reasoning}</p>
            </GlassCard>

            {/* Disclaimer */}
            <div className="p-2 rounded-lg bg-verdict-avoid/5 border border-verdict-avoid/10">
              <p className="text-[9px] text-verdict-avoid/70 leading-relaxed">⚠️ {signals.disclaimer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketSignals;
