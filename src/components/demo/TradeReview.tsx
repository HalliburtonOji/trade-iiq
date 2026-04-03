import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Star, BookOpen, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import { toast } from "sonner";

const EMOTIONS = ["Calm", "FOMO", "Revenge", "Greedy", "Fearful", "Confident", "Anxious"];

interface Trade {
  id: string; symbol: string; direction: string; entry_price: number; exit_price: number | null;
  pnl: number | null; pnl_percent: number | null; quantity: number;
  stop_loss: number | null; take_profit: number | null; opened_at: string; closed_at: string | null;
}

interface Props {
  trade: Trade;
  onClose: () => void;
}

const TradeReview = ({ trade, onClose }: Props) => {
  const [review, setReview] = useState<{ grade: string; summary: string; strengths: string[]; improvements: string[]; lesson: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [emotion, setEmotion] = useState("");
  const [postNotes, setPostNotes] = useState("");

  useEffect(() => { generateReview(); }, []);

  const generateReview = async () => {
    try {
      const duration = trade.closed_at && trade.opened_at
        ? Math.round((new Date(trade.closed_at).getTime() - new Date(trade.opened_at).getTime()) / 60000) : 0;

      const prompt = `Review this paper trade and give a grade (A-F), summary, strengths, improvements, and a suggested lesson topic.
Trade: ${trade.direction.toUpperCase()} ${trade.symbol} @ $${trade.entry_price.toFixed(2)}, closed @ $${(trade.exit_price || 0).toFixed(2)}
P&L: ${(trade.pnl || 0) >= 0 ? "+" : ""}$${(trade.pnl || 0).toFixed(2)} (${(trade.pnl_percent || 0).toFixed(1)}%)
Duration: ${duration} minutes, Stop Loss: ${trade.stop_loss ? "$" + trade.stop_loss : "None"}, Take Profit: ${trade.take_profit ? "$" + trade.take_profit : "None"}
Respond in JSON: {"grade":"B","summary":"...","strengths":["..."],"improvements":["..."],"lesson":"..."}`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) full += c; } catch {}
        }
      }
      const jsonMatch = full.match(/\{[\s\S]*\}/);
      if (jsonMatch) setReview(JSON.parse(jsonMatch[0]));
      else setReview({ grade: "B", summary: full.slice(0, 200), strengths: ["Trade executed"], improvements: ["Tighten stops"], lesson: "Risk Management" });
    } catch {
      setReview({ grade: "B", summary: "Good trade execution. Keep practising to improve consistency.", strengths: ["Position was closed"], improvements: ["Review entry timing"], lesson: "Technical Analysis Basics" });
    } finally {
      setLoading(false);
    }
  };

  const saveJournal = async () => {
    const { error } = await supabase.from("paper_trades").update({
      emotion: emotion || null, post_notes: postNotes || null,
    } as any).eq("id", trade.id);
    if (!error) toast.success("Journal saved!");
  };

  const handleDone = () => {
    if (emotion || postNotes) saveJournal();
    onClose();
  };

  const gradeColors: Record<string, string> = {
    A: "text-verdict-buy", B: "text-primary", C: "text-verdict-wait", D: "text-verdict-avoid", F: "text-verdict-avoid",
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md max-h-[85vh] overflow-y-auto">
        <GlassCard className="border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> AI Trade Review
            </h3>
            <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>

          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/20">
            <div>
              <span className="text-sm font-bold font-mono">{trade.symbol}</span>
              <span className={`ml-2 text-[10px] ${(trade.pnl || 0) >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                {(trade.pnl || 0) >= 0 ? "+" : ""}${(trade.pnl || 0).toFixed(2)}
              </span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${(trade.pnl || 0) >= 0 ? "bg-verdict-buy/10 text-verdict-buy" : "bg-verdict-avoid/10 text-verdict-avoid"}`}>
              {(trade.pnl || 0) >= 0 ? "WIN" : "LOSS"}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Analysing your trade...</p>
            </div>
          ) : review ? (
            <div className="flex flex-col gap-3">
              <div className="text-center">
                <p className={`text-4xl font-bold ${gradeColors[review.grade] || "text-foreground"}`}>{review.grade}</p>
                <p className="text-xs text-muted-foreground mt-1">{review.summary}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-verdict-buy uppercase mb-1">✅ Strengths</p>
                {review.strengths.map((s, i) => <p key={i} className="text-xs text-muted-foreground">• {s}</p>)}
              </div>

              <div>
                <p className="text-[10px] font-semibold text-verdict-wait uppercase mb-1">💡 Improvements</p>
                {review.improvements.map((s, i) => <p key={i} className="text-xs text-muted-foreground">• {s}</p>)}
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">Suggested: <span className="text-foreground font-medium">{review.lesson}</span></p>
              </div>

              {/* Journal section */}
              <div className="pt-3 border-t border-border/20 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> How did you feel during this trade?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EMOTIONS.map((e) => (
                    <button key={e} onClick={() => setEmotion(e)}
                      className={`text-[10px] px-2.5 py-1 rounded-full transition-all ${
                        emotion === e ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}>
                      {e}
                    </button>
                  ))}
                </div>
                <Input
                  value={postNotes}
                  onChange={(e) => setPostNotes(e.target.value)}
                  placeholder="What did you learn from this trade?"
                  className="text-xs bg-secondary/30"
                />
              </div>
            </div>
          ) : null}

          <Button onClick={handleDone} className="w-full mt-4" size="sm">
            {emotion || postNotes ? "Save & Done" : "Done"}
          </Button>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default TradeReview;
