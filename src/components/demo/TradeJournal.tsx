import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Star, MessageSquare, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Trade {
  id: string; symbol: string; direction: string; entry_price: number; quantity: number;
  exit_price: number | null; pnl: number | null; pnl_percent: number | null;
  stop_loss: number | null; take_profit: number | null; opened_at: string;
  closed_at: string | null; status: string; asset_type: string;
  thesis_json?: any; emotion?: string | null; post_notes?: string | null;
}

const EMOTIONS = ["Calm", "FOMO", "Revenge", "Greedy", "Fearful", "Confident", "Anxious"];

interface Props {
  trades: Trade[];
  onUpdate: () => void;
}

const TradeJournal = ({ trades, onUpdate }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [editEmotion, setEditEmotion] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const filtered = trades.filter(t => {
    if (filter === "win") return t.status === "closed-win";
    if (filter === "loss") return t.status === "closed-loss";
    return true;
  });

  const expand = (trade: Trade) => {
    if (expandedId === trade.id) { setExpandedId(null); return; }
    setExpandedId(trade.id);
    setEditEmotion(trade.emotion || "");
    setEditNotes(trade.post_notes || "");
  };

  const saveJournal = async (tradeId: string) => {
    const { error } = await supabase.from("paper_trades").update({
      emotion: editEmotion || null,
      post_notes: editNotes || null,
    } as any).eq("id", tradeId);

    if (error) toast.error("Failed to save");
    else { toast.success("Journal saved"); onUpdate(); }
  };

  const durationStr = (opened: string, closed: string | null) => {
    if (!closed) return "—";
    const mins = Math.round((new Date(closed).getTime() - new Date(opened).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.round(mins / 60)}h`;
    return `${Math.round(mins / 1440)}d`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(["all", "win", "loss"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            {f} {f !== "all" && `(${trades.filter(t => f === "win" ? t.status === "closed-win" : t.status === "closed-loss").length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <GlassCard className="text-center py-6">
          <p className="text-sm text-muted-foreground">No trades to show</p>
        </GlassCard>
      )}

      {filtered.map((trade) => (
        <GlassCard key={trade.id} className="overflow-hidden">
          <button onClick={() => expand(trade)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono">{trade.symbol}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                trade.status === "closed-win" ? "bg-verdict-buy/10 text-verdict-buy" : "bg-verdict-avoid/10 text-verdict-avoid"
              }`}>
                {trade.status === "closed-win" ? "WIN" : "LOSS"}
              </span>
              <span className={`text-[10px] ${trade.direction === "long" ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                {trade.direction.toUpperCase()}
              </span>
              {trade.emotion && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{trade.emotion}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold font-mono ${(trade.pnl || 0) >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                {(trade.pnl || 0) >= 0 ? "+" : ""}£{(trade.pnl || 0).toFixed(2)}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedId === trade.id ? "rotate-180" : ""}`} />
            </div>
          </button>

          <AnimatePresence>
            {expandedId === trade.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border/20 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div><span className="text-muted-foreground">Entry:</span> <span className="font-mono">${trade.entry_price.toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Exit:</span> <span className="font-mono">${(trade.exit_price || 0).toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Duration:</span> <span className="font-mono">{durationStr(trade.opened_at, trade.closed_at)}</span></div>
                    {trade.stop_loss && <div><span className="text-muted-foreground">SL:</span> <span className="font-mono">${trade.stop_loss}</span></div>}
                    {trade.take_profit && <div><span className="text-muted-foreground">TP:</span> <span className="font-mono">${trade.take_profit}</span></div>}
                    <div><span className="text-muted-foreground">P&L:</span> <span className="font-mono">{trade.pnl_percent?.toFixed(1)}%</span></div>
                  </div>

                  {trade.thesis_json && typeof trade.thesis_json === "object" && trade.thesis_json.reason && (
                    <div className="p-2 rounded-lg bg-secondary/20">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Thesis</p>
                      <p className="text-[10px]">Reason: {trade.thesis_json.reason}</p>
                      {trade.thesis_json.confidence && (
                        <div className="flex gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={`h-3 w-3 ${n <= trade.thesis_json.confidence ? "text-verdict-wait fill-verdict-wait" : "text-muted-foreground/20"}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Journal Entry
                    </p>
                    <Select value={editEmotion} onValueChange={setEditEmotion}>
                      <SelectTrigger className="h-7 text-[11px] bg-background/50">
                        <SelectValue placeholder="How did you feel?" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMOTIONS.map((e) => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="What did you learn?"
                      className="h-7 text-[11px] bg-background/50"
                    />
                    <Button size="sm" className="h-6 text-[10px] w-full" onClick={() => saveJournal(trade.id)}>
                      Save Journal
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      ))}
    </div>
  );
};

export default TradeJournal;
