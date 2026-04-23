import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, Clock, Trash2, MessageSquare, Target, Zap, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import Altar from "@/components/stoa/Altar";
import Meander from "@/components/stoa/Meander";
import GlassCard from "@/components/GlassCard";
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
  const isMobile = useIsMobile();
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
      palette="delphi"
      crumb={
        <span>
          <span className="stoa-greek">Βίβλος</span> · Trade Tracker
        </span>
      }
    >
      {/* ---------- Page header ---------- */}
      <div className="flex flex-col gap-2 mb-2 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">TRAINING · THE SCROLL</span>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="stoa-display text-3xl font-semibold" style={{ color: "var(--stoa-ink)" }}>
            Trade Tracker
          </h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-accent)", opacity: 0.7 }}>
            Βίβλος
          </span>
        </div>
        <p
          style={{
            fontFamily: "Georgia, 'EB Garamond', serif",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--stoa-muted)",
            margin: 0,
          }}
        >
          every decision, inscribed
        </p>
      </div>

      <div style={{ margin: "14px 0 22px" }}>
        <Meander height={16} opacity={0.55} />
      </div>

      {/* ---------- Altar quartet ---------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
          gap: isMobile ? 10 : 14,
          marginBottom: 22,
        }}
      >
        <Altar
          kicker="WIN RATE"
          greek="Νίκη"
          value={total > 0 ? `${winRate}%` : "—"}
          sub={total > 0 ? `${total} closed` : "no closed trades yet"}
        />
        <Altar
          kicker="WINS"
          greek="Ἀρετή"
          value={stats.wins}
          sub={stats.wins > 0 ? "virtue recorded" : "awaiting first"}
        />
        <Altar
          kicker="LOSSES"
          greek="Σφάλμα"
          value={stats.losses}
          sub={stats.losses > 0 ? "lessons inscribed" : "none yet"}
        />
        <Altar
          kicker="PENDING"
          greek="Ἐκκρεμῆ"
          value={stats.pending}
          sub={stats.pending > 0 ? "in play" : "none open"}
          alert={stats.pending > 3}
        />
      </div>

      {/* ---------- Action row ---------- */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <button
          onClick={() => setShowForm(!showForm)}
          className="stoa-display"
          style={{
            flex: 1,
            minHeight: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "0 20px",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "var(--stoa-ink)",
            background: "var(--stoa-shine)",
            border: "1px solid var(--stoa-accent)",
            borderRadius: 2,
            cursor: "pointer",
            transition: "transform 120ms ease, background 120ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(196,162,90,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--stoa-shine)";
          }}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Close the scroll" : "Inscribe a Decision"}
        </button>

        <button
          onClick={() => setShowImport(!showImport)}
          style={{
            minWidth: isMobile ? undefined : 120,
            minHeight: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "0 18px",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--stoa-muted)",
            background: "transparent",
            border: "1px solid var(--stoa-rule)",
            borderRadius: 2,
            cursor: "pointer",
          }}
        >
          <Upload className="h-3.5 w-3.5" />
          CSV
        </button>
      </div>

      {/* ---------- CSV import drawer ---------- */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 18 }}
          >
            <CsvImport onComplete={() => { setShowImport(false); fetchTrades(); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Inscribe form: Manuscript Leaf ---------- */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 22 }}
          >
            <div
              style={{
                position: "relative",
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                padding: isMobile ? "22px 18px" : "28px 28px",
                borderRadius: 2,
              }}
            >
              {/* Top + bottom gold rules */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--stoa-gold-rule)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "var(--stoa-gold-rule)" }} />

              {/* Leaf kicker */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
                <span className="stoa-kicker">NEW LEAF · Φύλλον</span>
                <span style={{ flex: 1, height: 1, background: "var(--stoa-rule)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Symbol */}
                <div>
                  <div className="stoa-kicker" style={{ marginBottom: 6 }}>Symbol · Σύμβολον</div>
                  <Input
                    placeholder="AAPL"
                    value={formData.symbol}
                    onChange={(e) => setFormData((p) => ({ ...p, symbol: e.target.value }))}
                    className="stoa-mono"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--stoa-rule)",
                      color: "var(--stoa-ink)",
                      fontSize: 15,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  />
                </div>

                {/* Asset type as carved tabs */}
                <div>
                  <div className="stoa-kicker" style={{ marginBottom: 6 }}>Asset · Γένος</div>
                  <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--stoa-rule)" }}>
                    {(["stock", "crypto", "forex"] as AssetType[]).map((t) => {
                      const active = formData.assetType === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setFormData((p) => ({ ...p, assetType: t }))}
                          className="stoa-display"
                          style={{
                            flex: 1,
                            padding: "10px 0",
                            fontSize: 13,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                            background: "transparent",
                            border: "none",
                            borderBottom: active ? "2px solid var(--stoa-accent)" : "2px solid transparent",
                            marginBottom: -1,
                            cursor: "pointer",
                          }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Decision as carved tabs with verdict-colored underline */}
                <div>
                  <div className="stoa-kicker" style={{ marginBottom: 6 }}>Decision · Κρίσις</div>
                  <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--stoa-rule)" }}>
                    {(["BUY", "WAIT", "AVOID"] as Decision[]).map((d) => {
                      const active = formData.decision === d;
                      const underline =
                        d === "BUY" ? "hsl(var(--verdict-buy))" :
                        d === "WAIT" ? "hsl(var(--verdict-wait))" :
                        "hsl(var(--verdict-avoid))";
                      return (
                        <button
                          key={d}
                          onClick={() => setFormData((p) => ({ ...p, decision: d }))}
                          className="stoa-display"
                          style={{
                            flex: 1,
                            padding: "12px 0",
                            fontSize: 15,
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                            background: "transparent",
                            border: "none",
                            borderBottom: active ? `2px solid ${underline}` : "2px solid transparent",
                            marginBottom: -1,
                            cursor: "pointer",
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Entry price */}
                <div>
                  <div className="stoa-kicker" style={{ marginBottom: 6 }}>Entry price · Τιμή</div>
                  <Input
                    placeholder="0.00"
                    type="number"
                    value={formData.entryPrice}
                    onChange={(e) => setFormData((p) => ({ ...p, entryPrice: e.target.value }))}
                    className="stoa-mono"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--stoa-rule)",
                      color: "var(--stoa-ink)",
                    }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <div className="stoa-kicker" style={{ marginBottom: 6 }}>Marginalia · Σχόλια</div>
                  <Textarea
                    placeholder="Notes in the margin…"
                    value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    style={{
                      minHeight: 72,
                      background: "transparent",
                      border: "1px solid var(--stoa-rule)",
                      color: "var(--stoa-ink)",
                      fontFamily: "Georgia, 'EB Garamond', serif",
                      fontStyle: "italic",
                      fontSize: 14,
                      lineHeight: 1.55,
                    }}
                  />
                </div>

                {/* Thesis toggle */}
                <button
                  onClick={() => setShowThesis(!showThesis)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 0 8px",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--stoa-accent)",
                    background: "transparent",
                    border: "none",
                    borderTop: "1px dashed var(--stoa-rule)",
                    cursor: "pointer",
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Target className="h-3.5 w-3.5" />
                    {showThesis ? "Hide thesis · Θέσις" : "Add thesis · Θέσις"}
                  </span>
                  {showThesis ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {/* Thesis sub-panel */}
                <AnimatePresence>
                  {showThesis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 14,
                          padding: "16px 18px",
                          background: "rgba(0,0,0,0.02)",
                          border: "1px solid var(--stoa-rule)",
                          borderRadius: 2,
                        }}
                      >
                        <div>
                          <div className="stoa-kicker" style={{ marginBottom: 6 }}>Why this trade · Αἰτία</div>
                          <Textarea
                            placeholder="Breakout above resistance, strong earnings, macro tailwind…"
                            value={formData.thesisWhy}
                            onChange={(e) => setFormData((p) => ({ ...p, thesisWhy: e.target.value }))}
                            style={{
                              minHeight: 68,
                              background: "transparent",
                              border: "1px solid var(--stoa-rule)",
                              color: "var(--stoa-ink)",
                              fontFamily: "Georgia, 'EB Garamond', serif",
                              fontStyle: "italic",
                              fontSize: 13,
                              lineHeight: 1.55,
                            }}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                          <div>
                            <div className="stoa-kicker" style={{ marginBottom: 6 }}>Horizon · Χρόνος</div>
                            <select
                              value={formData.timeHorizon}
                              onChange={(e) => setFormData((p) => ({ ...p, timeHorizon: e.target.value }))}
                              className="stoa-display"
                              style={{
                                width: "100%",
                                padding: "9px 10px",
                                fontSize: 13,
                                background: "var(--stoa-shine)",
                                border: "1px solid var(--stoa-rule)",
                                color: "var(--stoa-ink)",
                                borderRadius: 2,
                              }}
                            >
                              <option value="">Select…</option>
                              {timeHorizons.map((h) => (
                                <option key={h} value={h} style={{ textTransform: "capitalize" }}>{h}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="stoa-kicker" style={{ marginBottom: 6 }}>Confidence · Πίστις</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", height: 39 }}>
                              {[1, 2, 3, 4, 5].map((n) => {
                                const on = formData.confidence >= n;
                                return (
                                  <button
                                    key={n}
                                    onClick={() => setFormData((p) => ({ ...p, confidence: n }))}
                                    aria-label={`Confidence ${n}`}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 999,
                                      background: on ? "var(--stoa-accent)" : "transparent",
                                      border: `1px solid ${on ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
                                      cursor: "pointer",
                                      transition: "background 120ms ease, border-color 120ms ease",
                                    }}
                                  />
                                );
                              })}
                              <span className="stoa-mono" style={{ marginLeft: 6, fontSize: 13, color: "var(--stoa-muted)" }}>
                                {formData.confidence}/5
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="stoa-kicker" style={{ marginBottom: 6 }}>Invalidation · Παύσις</div>
                          <Input
                            placeholder="I'm wrong if price goes to…"
                            type="number"
                            value={formData.invalidationPoint}
                            onChange={(e) => setFormData((p) => ({ ...p, invalidationPoint: e.target.value }))}
                            className="stoa-mono"
                            style={{
                              background: "transparent",
                              border: "1px solid var(--stoa-rule)",
                              color: "var(--stoa-ink)",
                            }}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                          <div>
                            <div className="stoa-kicker" style={{ marginBottom: 6 }}>Catalyst date · Ἡμέρα</div>
                            <Input
                              type="date"
                              value={formData.catalystDate}
                              onChange={(e) => setFormData((p) => ({ ...p, catalystDate: e.target.value }))}
                              className="stoa-mono"
                              style={{
                                background: "transparent",
                                border: "1px solid var(--stoa-rule)",
                                color: "var(--stoa-ink)",
                              }}
                            />
                          </div>
                          <div>
                            <div className="stoa-kicker" style={{ marginBottom: 6 }}>Catalyst · Αἴτιον</div>
                            <Input
                              placeholder="Earnings, CPI, Fed…"
                              value={formData.catalystNote}
                              onChange={(e) => setFormData((p) => ({ ...p, catalystNote: e.target.value }))}
                              style={{
                                background: "transparent",
                                border: "1px solid var(--stoa-rule)",
                                color: "var(--stoa-ink)",
                                fontFamily: "Georgia, 'EB Garamond', serif",
                                fontStyle: "italic",
                                fontSize: 13,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Save — serif display button, gold fill */}
                <button
                  onClick={handleSave}
                  className="stoa-display"
                  style={{
                    marginTop: 4,
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "0 20px",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--stoa-ink)",
                    background: "var(--stoa-accent)",
                    border: "1px solid var(--stoa-accent)",
                    borderRadius: 2,
                    cursor: "pointer",
                  }}
                >
                  Seal & inscribe
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Filter rail ---------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 14 : 20,
          padding: "10px 0",
          marginBottom: 14,
          borderTop: "1px solid var(--stoa-rule)",
          borderBottom: "1px solid var(--stoa-rule)",
          overflowX: "auto",
          whiteSpace: "nowrap",
        }}
        className="no-scrollbar"
      >
        {filters.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="stoa-display"
              style={{
                position: "relative",
                padding: "4px 0",
                fontSize: 12,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--stoa-accent)" : "2px solid transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* ---------- Scroll leaves ---------- */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {filtered.length === 0 && (
          <div
            style={{
              padding: isMobile ? "36px 18px" : "56px 32px",
              textAlign: "center",
              border: "1px solid var(--stoa-rule)",
              background: "var(--stoa-shine)",
              borderRadius: 2,
            }}
          >
            <span className="stoa-greek" style={{ fontSize: 24, color: "var(--stoa-muted)" }}>Κενόν</span>
            <p style={{ margin: "10px 0 4px", fontSize: 14, color: "var(--stoa-ink)" }}>
              No leaves on the scroll yet.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--stoa-muted)", fontStyle: "italic" }}>
              Tap <span className="stoa-display" style={{ color: "var(--stoa-accent)" }}>Inscribe a Decision</span> to begin.
            </p>
          </div>
        )}

        {filtered.map((t, idx) => {
          const capColor =
            t.outcome === "WIN" ? "var(--stoa-accent)" :
            t.outcome === "LOSS" ? "hsl(var(--verdict-avoid))" :
            t.decision === "BUY" ? "var(--stoa-accent)" :
            t.decision === "AVOID" ? "hsl(var(--verdict-avoid))" :
            "var(--stoa-muted)";

          const sealFill = t.outcome === "WIN"
            ? "var(--stoa-accent)"
            : t.outcome === "LOSS"
            ? "hsl(var(--verdict-avoid))"
            : "transparent";
          const sealBorder = t.outcome === "PENDING"
            ? "var(--stoa-rule)"
            : sealFill;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.02 }}
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flexWrap: isMobile ? "nowrap" : "wrap",
                gap: isMobile ? 10 : 20,
                padding: isMobile ? "18px 2px" : "22px 4px",
                borderBottom: "1px solid var(--stoa-rule)",
                alignItems: isMobile ? "stretch" : "flex-start",
              }}
            >
              {/* Zone 1: Illuminated capital */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMobile ? "flex-start" : "center",
                  justifyContent: "flex-start",
                  minWidth: isMobile ? 0 : 92,
                  gap: 2,
                }}
              >
                <span
                  className="stoa-display"
                  style={{
                    fontSize: isMobile ? 26 : 32,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: capColor,
                    lineHeight: 1,
                  }}
                >
                  {t.symbol}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="stoa-kicker"
                    style={{ fontSize: 10, color: "var(--stoa-muted)" }}
                  >
                    {t.asset_type}
                  </span>
                  {t.confidence != null && (
                    <span
                      className="stoa-mono"
                      style={{ fontSize: 10, color: "var(--stoa-accent)", display: "flex", alignItems: "center", gap: 2 }}
                    >
                      <Zap className="h-2.5 w-2.5" />
                      {t.confidence}
                    </span>
                  )}
                </div>
              </div>

              {/* Zone 2: Body */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <VerdictBadge verdict={t.decision as Decision} size="sm" />
                  {t.entry_price != null && (
                    <span className="stoa-mono" style={{ fontSize: 12, color: "var(--stoa-muted)" }}>
                      Entry ${Number(t.entry_price).toFixed(2)}
                    </span>
                  )}
                  {t.time_horizon && (
                    <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)", textTransform: "capitalize" }}>
                      · {t.time_horizon}
                    </span>
                  )}
                  {t.invalidation_point != null && (
                    <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>
                      · stop ${Number(t.invalidation_point).toFixed(2)}
                    </span>
                  )}
                </div>

                {t.thesis_why && (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "Georgia, 'EB Garamond', serif",
                      fontStyle: "italic",
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: "var(--stoa-ink)",
                      paddingLeft: 10,
                      borderLeft: "2px solid var(--stoa-accent)",
                    }}
                  >
                    {t.thesis_why}
                  </p>
                )}

                {t.notes && (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "Georgia, 'EB Garamond', serif",
                      fontStyle: "italic",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--stoa-muted)",
                    }}
                  >
                    {t.notes}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)", letterSpacing: "0.04em" }}>
                    {new Date(t.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  {t.catalyst_note && (
                    <span className="stoa-kicker" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>
                      · {t.catalyst_note}
                    </span>
                  )}
                </div>
              </div>

              {/* Zone 3: Seal + actions */}
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "row" : "column",
                  alignItems: isMobile ? "center" : "flex-end",
                  gap: 10,
                  minWidth: isMobile ? 0 : 120,
                  justifyContent: isMobile ? "space-between" : "flex-start",
                  flexWrap: "wrap",
                }}
              >
                {/* Wax-seal disc */}
                <div
                  aria-label={`Outcome: ${t.outcome.toLowerCase()}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: sealFill,
                    border: `2px solid ${sealBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {t.outcome === "PENDING" && <Clock className="h-3 w-3" style={{ color: "var(--stoa-muted)" }} />}
                </div>

                {/* Pending actions */}
                {t.outcome === "PENDING" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => updateOutcome(t.id, "WIN")}
                      title="Mark as Win"
                      style={{
                        padding: "6px 10px",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "hsl(var(--verdict-buy))",
                        background: "transparent",
                        border: "1px solid hsl(var(--verdict-buy) / 0.3)",
                        borderRadius: 2,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <TrendingUp className="h-3 w-3" /> Win
                    </button>
                    <button
                      onClick={() => updateOutcome(t.id, "LOSS")}
                      title="Mark as Loss"
                      style={{
                        padding: "6px 10px",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "hsl(var(--verdict-avoid))",
                        background: "transparent",
                        border: "1px solid hsl(var(--verdict-avoid) / 0.3)",
                        borderRadius: 2,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <TrendingDown className="h-3 w-3" /> Loss
                    </button>
                    <button
                      onClick={() => deleteTrade(t.id)}
                      title="Delete"
                      style={{
                        padding: "6px 8px",
                        color: "var(--stoa-muted)",
                        background: "transparent",
                        border: "1px solid var(--stoa-rule)",
                        borderRadius: 2,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Post-mortem trigger for completed */}
                {(t.outcome === "WIN" || t.outcome === "LOSS") && reviewingId !== t.id && (
                  <button
                    onClick={() => setReviewingId(t.id)}
                    className="stoa-display"
                    style={{
                      padding: "6px 10px",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--stoa-accent)",
                      background: "transparent",
                      border: "1px solid var(--stoa-accent)",
                      borderRadius: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <MessageSquare className="h-3 w-3" /> Post-mortem
                  </button>
                )}
              </div>

              {/* Post-mortem panel (spans full leaf width when open) */}
              <AnimatePresence>
                {reviewingId === t.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden", flexBasis: "100%", width: "100%" }}
                  >
                    <div
                      style={{
                        marginTop: 14,
                        padding: isMobile ? "18px 16px" : "22px 24px",
                        background: "var(--stoa-shine)",
                        border: "1px solid var(--stoa-rule)",
                        borderRadius: 2,
                        position: "relative",
                      }}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--stoa-gold-rule)" }} />

                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
                        <span className="stoa-kicker">POST-MORTEM · Ἀνάκρισις</span>
                        <span style={{ flex: 1, height: 1, background: "var(--stoa-rule)" }} />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {/* Yes/No triptych */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                            gap: 12,
                          }}
                        >
                          {[
                            { key: "verdict_correct", label: "Verdict", greek: "Κρίσις" },
                            { key: "timing_correct", label: "Timing", greek: "Χρόνος" },
                            { key: "followed_plan", label: "Followed plan", greek: "Τάξις" },
                          ].map(({ key, label, greek }) => (
                            <div key={key}>
                              <div className="stoa-kicker" style={{ marginBottom: 6 }}>
                                {label} · {greek}
                              </div>
                              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--stoa-rule)" }}>
                                {[
                                  { v: true, label: "Yes", color: "hsl(var(--verdict-buy))" },
                                  { v: false, label: "No", color: "hsl(var(--verdict-avoid))" },
                                ].map(({ v, label: l, color }) => {
                                  const active = (reviewData as any)[key] === v;
                                  return (
                                    <button
                                      key={l}
                                      onClick={() => setReviewData((p) => ({ ...p, [key]: v }))}
                                      className="stoa-display"
                                      style={{
                                        flex: 1,
                                        padding: "8px 0",
                                        fontSize: 12,
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                        color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                                        background: "transparent",
                                        border: "none",
                                        borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
                                        marginBottom: -1,
                                        cursor: "pointer",
                                      }}
                                    >
                                      {l}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Emotion at entry */}
                        <div>
                          <div className="stoa-kicker" style={{ marginBottom: 8 }}>Emotion at entry · Πάθος</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {emotions.map((e) => {
                              const active = reviewData.emotion === e;
                              return (
                                <button
                                  key={e}
                                  onClick={() => setReviewData((p) => ({ ...p, emotion: e }))}
                                  className="stoa-display"
                                  style={{
                                    padding: "5px 12px",
                                    fontSize: 11,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    color: active ? "var(--stoa-ink)" : "var(--stoa-muted)",
                                    background: active ? "var(--stoa-shine)" : "transparent",
                                    border: `1px solid ${active ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
                                    borderRadius: 2,
                                    cursor: "pointer",
                                  }}
                                >
                                  {e}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Mistake select */}
                        <div>
                          <div className="stoa-kicker" style={{ marginBottom: 6 }}>Biggest mistake · Σφάλμα</div>
                          <select
                            value={reviewData.mistake_type}
                            onChange={(e) => setReviewData((p) => ({ ...p, mistake_type: e.target.value }))}
                            className="stoa-display"
                            style={{
                              width: "100%",
                              padding: "9px 10px",
                              fontSize: 13,
                              background: "var(--stoa-shine)",
                              border: "1px solid var(--stoa-rule)",
                              color: "var(--stoa-ink)",
                              borderRadius: 2,
                              textTransform: "capitalize",
                            }}
                          >
                            {mistakes.map((m) => (
                              <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                        </div>

                        {/* Lesson learned — italic serif */}
                        <div>
                          <div className="stoa-kicker" style={{ marginBottom: 6 }}>Lesson learned · Μάθημα</div>
                          <Textarea
                            placeholder="What did you learn from this trade?"
                            value={reviewData.lesson_learned}
                            onChange={(e) => setReviewData((p) => ({ ...p, lesson_learned: e.target.value }))}
                            style={{
                              minHeight: 64,
                              background: "transparent",
                              border: "1px solid var(--stoa-rule)",
                              color: "var(--stoa-ink)",
                              fontFamily: "Georgia, 'EB Garamond', serif",
                              fontStyle: "italic",
                              fontSize: 14,
                              lineHeight: 1.55,
                            }}
                          />
                        </div>

                        {/* Action row */}
                        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                          <button
                            onClick={() => submitReview(t.id)}
                            className="stoa-display"
                            style={{
                              flex: 1,
                              minHeight: 42,
                              padding: "0 18px",
                              fontSize: 13,
                              fontWeight: 600,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--stoa-ink)",
                              background: "var(--stoa-accent)",
                              border: "1px solid var(--stoa-accent)",
                              borderRadius: 2,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                            }}
                          >
                            Seal review
                          </button>
                          <button
                            onClick={() => setReviewingId(null)}
                            style={{
                              minHeight: 42,
                              padding: "0 18px",
                              fontSize: 12,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--stoa-muted)",
                              background: "transparent",
                              border: "1px solid var(--stoa-rule)",
                              borderRadius: 2,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </StoaShell>
  );
};

export default Tracker;
