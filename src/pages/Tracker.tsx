import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, Clock, Trash2, MessageSquare, Target, Zap, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import VerdictBadge from "@/components/VerdictBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import CsvImport from "@/components/CsvImport";

type Decision = "BUY" | "WAIT" | "AVOID";
type Outcome = "PENDING" | "WIN" | "LOSS";
type AssetType = "stock" | "crypto" | "forex";

interface TradeRecord {
  id: string;
  symbol: string;
  asset_type: AssetType;
  decision: Decision;
  entry_price: number | null;
  notes: string;
  outcome: Outcome;
  date: string;
  thesis_why: string;
  time_horizon: string | null;
  invalidation_point: number | null;
  confidence: number | null;
  catalyst_date: string | null;
  catalyst_note: string;
  has_review?: boolean;
}

interface ReviewData {
  verdict_correct: boolean | null;
  timing_correct: boolean | null;
  followed_plan: boolean | null;
  execution_quality: string;
  emotion: string;
  mistake_type: string;
  lesson_learned: string;
}

const timeHorizons = ["scalp", "swing", "position", "long-term"];
const emotions = ["calm", "confident", "fomo", "stressed", "revenge"];
const mistakes = ["entered_early", "ignored_macro", "fomo", "oversizing", "no_stop", "revenge_trade", "none"];

const Tracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showThesis, setShowThesis] = useState(false);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData>({
    verdict_correct: null, timing_correct: null, followed_plan: null,
    execution_quality: "followed", emotion: "calm", mistake_type: "none", lesson_learned: "",
  });
  const [formData, setFormData] = useState({
    symbol: "", assetType: "stock" as AssetType, decision: "BUY" as Decision,
    entryPrice: "", notes: "", thesisWhy: "", timeHorizon: "",
    invalidationPoint: "", confidence: 3, catalystDate: "", catalystNote: "",
  });

  const fetchTrades = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("trade_decisions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (data) setTrades(data.map((t: any) => ({ ...t, has_review: false })));
  };

  useEffect(() => { fetchTrades(); }, [user]);

  const stats = {
    wins: trades.filter((t) => t.outcome === "WIN").length,
    losses: trades.filter((t) => t.outcome === "LOSS").length,
    pending: trades.filter((t) => t.outcome === "PENDING").length,
  };
  const total = stats.wins + stats.losses;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

  const handleSave = async () => {
    if (!formData.symbol || !user) return;
    const { error } = await supabase.from("trade_decisions").insert({
      user_id: user.id,
      symbol: formData.symbol.toUpperCase(),
      asset_type: formData.assetType,
      decision: formData.decision,
      entry_price: parseFloat(formData.entryPrice) || null,
      notes: formData.notes,
      outcome: "PENDING",
      thesis_why: formData.thesisWhy,
      time_horizon: formData.timeHorizon || null,
      invalidation_point: parseFloat(formData.invalidationPoint) || null,
      confidence: formData.confidence,
      catalyst_date: formData.catalystDate || null,
      catalyst_note: formData.catalystNote,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFormData({ symbol: "", assetType: "stock", decision: "BUY", entryPrice: "", notes: "", thesisWhy: "", timeHorizon: "", invalidationPoint: "", confidence: 3, catalystDate: "", catalystNote: "" });
    setShowForm(false);
    setShowThesis(false);
    fetchTrades();
    toast({ title: "Decision logged", description: "Your trade thesis has been saved." });
  };

  const updateOutcome = async (id: string, outcome: Outcome) => {
    await supabase.from("trade_decisions").update({ outcome }).eq("id", id);
    fetchTrades();
  };

  const deleteTrade = async (id: string) => {
    await supabase.from("trade_decisions").delete().eq("id", id);
    fetchTrades();
  };

  const submitReview = async (tradeId: string) => {
    if (!user) return;
    const { error } = await supabase.from("decision_reviews").insert({
      user_id: user.id,
      trade_decision_id: tradeId,
      ...reviewData,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setReviewingId(null);
    setReviewData({ verdict_correct: null, timing_correct: null, followed_plan: null, execution_quality: "followed", emotion: "calm", mistake_type: "none", lesson_learned: "" });
    toast({ title: "Review saved", description: "Post-mortem recorded. Learn from this." });
  };

  const filters = ["ALL", "PENDING", "WIN", "LOSS", "BUY", "WAIT", "AVOID"];
  const filtered = trades.filter((t) => {
    if (filter === "ALL") return true;
    if (["PENDING", "WIN", "LOSS"].includes(filter)) return t.outcome === filter;
    return t.decision === filter;
  });

  return (
    <StoaShell
      palette="pompeii"
      crumb={
        <span>
          <span className="stoa-greek">Βίβλος</span> · Trade Tracker
        </span>
      }
    >
      <div className="flex flex-col gap-2 mb-2">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">TRAINING · THE SCROLL</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Trade Tracker</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Βίβλος</span>
        </div>
        <p className="text-sm" style={{ color: "var(--stoa-muted)" }}>every decision, inscribed</p>
      </div>
      <div className="flex flex-col gap-4 px-4 pt-6">
        <h1 className="text-xl font-bold">Decision Tracker</h1>

        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Win Rate" value={`${winRate}%`} trend={winRate >= 50 ? "up" : total > 0 ? "down" : "neutral"} />
          <StatCard label="Wins" value={stats.wins} trend="up" />
          <StatCard label="Losses" value={stats.losses} trend="down" />
          <StatCard label="Pending" value={stats.pending} />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowForm(!showForm)} className="flex-1 gap-2">
            <Plus className="h-4 w-4" /> Log Decision
          </Button>
          <Button variant="outline" onClick={() => setShowImport(!showImport)} className="gap-2 text-xs">
            <Upload className="h-4 w-4" /> CSV
          </Button>
        </div>

        <AnimatePresence>
          {showImport && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <CsvImport onComplete={() => { setShowImport(false); fetchTrades(); }} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <GlassCard className="flex flex-col gap-3">
                <Input placeholder="Symbol (e.g. AAPL)" value={formData.symbol} onChange={(e) => setFormData((p) => ({ ...p, symbol: e.target.value }))} className="bg-secondary/50" />
                
                {/* Asset type */}
                <div className="flex gap-2">
                  {(["stock", "crypto", "forex"] as AssetType[]).map((t) => (
                    <button key={t} onClick={() => setFormData((p) => ({ ...p, assetType: t }))} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize ${formData.assetType === t ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"}`}>{t}</button>
                  ))}
                </div>
                
                {/* Decision */}
                <div className="flex gap-2">
                  {(["BUY", "WAIT", "AVOID"] as Decision[]).map((d) => (
                    <button key={d} onClick={() => setFormData((p) => ({ ...p, decision: d }))} className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${formData.decision === d ? d === "BUY" ? "bg-verdict-buy/20 text-verdict-buy" : d === "WAIT" ? "bg-verdict-wait/20 text-verdict-wait" : "bg-verdict-avoid/20 text-verdict-avoid" : "glass-card text-muted-foreground"}`}>{d}</button>
                  ))}
                </div>

                <Input placeholder="Entry price" type="number" value={formData.entryPrice} onChange={(e) => setFormData((p) => ({ ...p, entryPrice: e.target.value }))} className="bg-secondary/50" />
                <Textarea placeholder="Notes..." value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className="bg-secondary/50 min-h-[60px]" />

                {/* Thesis Builder Toggle */}
                <button onClick={() => setShowThesis(!showThesis)} className="flex items-center gap-2 text-xs text-primary font-medium">
                  <Target className="h-3.5 w-3.5" />
                  {showThesis ? "Hide" : "Add"} Trade Thesis
                  {showThesis ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                <AnimatePresence>
                  {showThesis && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 overflow-hidden">
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Why this trade?</span>
                        <Textarea placeholder="Breakout above resistance, strong earnings, macro tailwind..." value={formData.thesisWhy} onChange={(e) => setFormData((p) => ({ ...p, thesisWhy: e.target.value }))} className="bg-transparent border-0 p-0 mt-1 min-h-[40px] text-xs focus-visible:ring-0" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">Time Horizon</span>
                          <select value={formData.timeHorizon} onChange={(e) => setFormData((p) => ({ ...p, timeHorizon: e.target.value }))} className="w-full rounded-lg bg-secondary/50 border border-border/50 px-2 py-1.5 text-xs text-foreground mt-1">
                            <option value="">Select...</option>
                            {timeHorizons.map((h) => <option key={h} value={h} className="capitalize">{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Confidence (1-5)</span>
                          <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} onClick={() => setFormData((p) => ({ ...p, confidence: n }))} className={`flex-1 rounded py-1.5 text-xs font-bold ${formData.confidence >= n ? "bg-primary/20 text-primary" : "glass-card text-muted-foreground"}`}>{n}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Input placeholder="Invalidation price (I'm wrong if...)" type="number" value={formData.invalidationPoint} onChange={(e) => setFormData((p) => ({ ...p, invalidationPoint: e.target.value }))} className="bg-secondary/50 text-xs" />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">Catalyst Date</span>
                          <Input type="date" value={formData.catalystDate} onChange={(e) => setFormData((p) => ({ ...p, catalystDate: e.target.value }))} className="bg-secondary/50 text-xs mt-1" />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Catalyst</span>
                          <Input placeholder="Earnings, CPI..." value={formData.catalystNote} onChange={(e) => setFormData((p) => ({ ...p, catalystNote: e.target.value }))} className="bg-secondary/50 text-xs mt-1" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button onClick={handleSave}>Save Decision</Button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${filter === f ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"}`}>{f}</button>
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
                  <span className="text-[10px] text-muted-foreground capitalize">{t.asset_type}</span>
                  {t.confidence && (
                    <span className="text-[10px] text-primary font-mono">⚡{t.confidence}/5</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <VerdictBadge verdict={t.decision as Decision} size="sm" />
                  {t.outcome === "WIN" && <span className="text-xs">✅</span>}
                  {t.outcome === "LOSS" && <span className="text-xs">❌</span>}
                  {t.outcome === "PENDING" && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </div>

              {t.thesis_why && (
                <div className="text-[11px] text-foreground/70 bg-primary/5 rounded-md px-2 py-1.5 border border-primary/10">
                  <span className="text-primary font-medium">Thesis:</span> {t.thesis_why}
                </div>
              )}

              {t.entry_price && <p className="text-xs text-muted-foreground font-mono">Entry: ${Number(t.entry_price).toFixed(2)}</p>}
              {t.time_horizon && <p className="text-[10px] text-muted-foreground capitalize">⏱ {t.time_horizon}{t.invalidation_point ? ` · Stop: $${Number(t.invalidation_point).toFixed(2)}` : ""}</p>}
              {t.notes && <p className="text-xs text-muted-foreground italic">{t.notes}</p>}
              <p className="text-[10px] text-muted-foreground/60">{new Date(t.date).toLocaleDateString()}</p>

              {t.outcome === "PENDING" && (
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 text-verdict-buy border-verdict-buy/20" onClick={() => updateOutcome(t.id, "WIN")}>
                    <TrendingUp className="h-3 w-3 mr-1" /> Win
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 text-verdict-avoid border-verdict-avoid/20" onClick={() => updateOutcome(t.id, "LOSS")}>
                    <TrendingDown className="h-3 w-3 mr-1" /> Loss
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[10px] h-7 text-muted-foreground" onClick={() => deleteTrade(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Post-mortem button for completed trades */}
              {(t.outcome === "WIN" || t.outcome === "LOSS") && reviewingId !== t.id && (
                <button onClick={() => setReviewingId(t.id)} className="flex items-center gap-1.5 text-[11px] text-primary font-medium mt-1 hover:underline">
                  <MessageSquare className="h-3 w-3" /> Write Post-Mortem
                </button>
              )}

              {/* Post-mortem form */}
              <AnimatePresence>
                {reviewingId === t.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-2 p-3 rounded-lg bg-accent/5 border border-accent/10 flex flex-col gap-2">
                      <span className="text-xs font-semibold text-accent">Post-Mortem Review</span>

                      <div className="grid grid-cols-3 gap-1.5">
                        {[{ key: "verdict_correct", label: "Verdict?" }, { key: "timing_correct", label: "Timing?" }, { key: "followed_plan", label: "Followed plan?" }].map(({ key, label }) => (
                          <div key={key}>
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                            <div className="flex gap-1 mt-0.5">
                              <button onClick={() => setReviewData((p) => ({ ...p, [key]: true }))} className={`flex-1 rounded py-1 text-[10px] font-bold ${(reviewData as any)[key] === true ? "bg-verdict-buy/20 text-verdict-buy" : "glass-card text-muted-foreground"}`}>Yes</button>
                              <button onClick={() => setReviewData((p) => ({ ...p, [key]: false }))} className={`flex-1 rounded py-1 text-[10px] font-bold ${(reviewData as any)[key] === false ? "bg-verdict-avoid/20 text-verdict-avoid" : "glass-card text-muted-foreground"}`}>No</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground">Emotion at entry</span>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {emotions.map((e) => (
                            <button key={e} onClick={() => setReviewData((p) => ({ ...p, emotion: e }))} className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${reviewData.emotion === e ? "bg-accent/20 text-accent" : "glass-card text-muted-foreground"}`}>{e}</button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground">Biggest mistake</span>
                        <select value={reviewData.mistake_type} onChange={(e) => setReviewData((p) => ({ ...p, mistake_type: e.target.value }))} className="w-full rounded-lg bg-secondary/50 border border-border/50 px-2 py-1.5 text-xs text-foreground mt-0.5">
                          {mistakes.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                        </select>
                      </div>

                      <Textarea placeholder="What did you learn from this trade?" value={reviewData.lesson_learned} onChange={(e) => setReviewData((p) => ({ ...p, lesson_learned: e.target.value }))} className="bg-secondary/50 min-h-[50px] text-xs" />

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => submitReview(t.id)} className="flex-1 text-xs">Save Review</Button>
                        <Button size="sm" variant="ghost" onClick={() => setReviewingId(null)} className="text-xs text-muted-foreground">Cancel</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          ))}
        </div>
      </div>
    </StoaShell>
  );
};

export default Tracker;
