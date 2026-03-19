import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Camera, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Trash2, Send, ChevronDown, ChevronUp, Zap, BookOpen, Shield, Eye, Target,
  HelpCircle, Star, MessageSquare, BarChart3, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import GlassCard from "@/components/GlassCard";
import VerdictBadge from "@/components/VerdictBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// ---------- Types ----------
interface IndicatorReading { name: string; value: string; signal: "bullish" | "bearish" | "neutral"; }
interface EntryIdea { type: "long" | "short"; entry: string; stop_loss?: string; target?: string; rationale: string; }
interface Teaching { things_spotted: string[]; risks: string[]; key_lesson: string; suggested_action: string; }
interface Pattern { name: string; type: string; confidence: number; description?: string; }

interface ChartAnalysis {
  symbol_detected?: string;
  timeframe_detected?: string;
  platform_detected?: string;
  chart_type?: string;
  trend_direction: string;
  trend_strength?: number;
  key_patterns: Pattern[];
  support_levels: number[];
  resistance_levels: number[];
  indicator_readings?: IndicatorReading[];
  notable_candles?: string[];
  likely_bias: string;
  bull_case?: string;
  bear_case?: string;
  invalidation_zone?: string;
  entry_ideas?: EntryIdea[];
  risk_warnings: string[];
  confidence_score: number;
  confidence_label: string;
  analysis_summary: string;
  ocr_text?: string[];
  screenshot_quality_score: number;
  quality_notes?: string;
  teaching: Teaching;
  mode?: string;
  // Legacy compat
  trend?: string;
  patterns?: Pattern[];
  verdict?: string;
  confidence?: number;
  reasoning?: string;
  warnings?: string[];
}

interface SavedAnalysis {
  id: string;
  image_url: string;
  symbol: string | null;
  analysis_json: ChartAnalysis;
  created_at: string;
}

interface FollowUpMessage { role: "user" | "ai"; text: string; }

// ---------- Constants ----------
type AnalysisMode = "quick" | "full" | "setup" | "bias" | "teach" | "risk";

const modes: { key: AnalysisMode; label: string; icon: any; desc: string }[] = [
  { key: "quick", label: "Quick Read", icon: Zap, desc: "Fast summary" },
  { key: "full", label: "Full Breakdown", icon: BarChart3, desc: "Complete analysis" },
  { key: "setup", label: "Setup Review", icon: Target, desc: "Is this a good trade?" },
  { key: "bias", label: "Bias Check", icon: Eye, desc: "Bull vs bear" },
  { key: "teach", label: "Teach Me", icon: BookOpen, desc: "Learn from this chart" },
  { key: "risk", label: "Risk Review", icon: Shield, desc: "Worst-case focus" },
];

const trendIcons: Record<string, any> = {
  STRONG_UPTREND: TrendingUp, UPTREND: TrendingUp, SIDEWAYS: Minus,
  DOWNTREND: TrendingDown, STRONG_DOWNTREND: TrendingDown,
};
const trendColors: Record<string, string> = {
  STRONG_UPTREND: "text-verdict-buy", UPTREND: "text-verdict-buy",
  SIDEWAYS: "text-verdict-wait", DOWNTREND: "text-verdict-avoid", STRONG_DOWNTREND: "text-verdict-avoid",
};
const biasVerdict: Record<string, "BUY" | "WAIT" | "AVOID"> = {
  BULLISH: "BUY", BEARISH: "AVOID", NEUTRAL: "WAIT",
  STRONG_BUY: "BUY", BUY: "BUY", HOLD: "WAIT", SELL: "AVOID", STRONG_SELL: "AVOID",
};
const confidenceColors: Record<string, string> = {
  HIGH: "bg-verdict-buy/15 text-verdict-buy", MEDIUM: "bg-verdict-wait/15 text-verdict-wait",
  LOW: "bg-verdict-avoid/15 text-verdict-avoid", UNCLEAR: "bg-muted text-muted-foreground",
};
const actionLabels: Record<string, { label: string; color: string }> = {
  watch: { label: "👀 Watch", color: "bg-primary/10 text-primary" },
  wait: { label: "⏳ Wait", color: "bg-verdict-wait/10 text-verdict-wait" },
  avoid: { label: "🚫 Avoid", color: "bg-verdict-avoid/10 text-verdict-avoid" },
  set_alert: { label: "🔔 Set Alert", color: "bg-accent/10 text-accent" },
  paper_trade_only: { label: "📝 Paper Trade", color: "bg-secondary text-secondary-foreground" },
};

const quickQuestions = [
  "Where would you place invalidation?",
  "Is this a fake breakout?",
  "What is the safest entry?",
  "What would make this bullish?",
  "Explain the RSI divergence here",
  "Is volume confirming the move?",
];

const indicatorOptions = ["RSI", "MACD", "Bollinger Bands", "Moving Averages", "Volume", "Stochastic", "Fibonacci", "VWAP", "Ichimoku"];

// Normalize legacy analysis fields
function normalize(a: ChartAnalysis): ChartAnalysis {
  return {
    ...a,
    trend_direction: a.trend_direction || a.trend || "SIDEWAYS",
    key_patterns: a.key_patterns || a.patterns || [],
    likely_bias: a.likely_bias || (a.verdict ? (biasVerdict[a.verdict] === "BUY" ? "BULLISH" : biasVerdict[a.verdict] === "AVOID" ? "BEARISH" : "NEUTRAL") : "NEUTRAL"),
    risk_warnings: a.risk_warnings || a.warnings || [],
    confidence_score: a.confidence_score ?? a.confidence ?? 0.5,
    confidence_label: a.confidence_label || "MEDIUM",
    analysis_summary: a.analysis_summary || a.reasoning || "",
    screenshot_quality_score: a.screenshot_quality_score || 7,
    teaching: a.teaching || { things_spotted: [], risks: [], key_lesson: "", suggested_action: "watch" },
  };
}

// ---------- Component ----------
const ChartAnalyzer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Core state
  const [symbol, setSymbol] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("full");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ChartAnalysis | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Context form
  const [showContext, setShowContext] = useState(false);
  const [timeframe, setTimeframe] = useState("");
  const [assetType, setAssetType] = useState("");
  const [userObservation, setUserObservation] = useState("");
  const [question, setQuestion] = useState("");
  const [strategy, setStrategy] = useState("");
  const [userBias, setUserBias] = useState("");
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);

  // Follow-up chat
  const [followUp, setFollowUp] = useState("");
  const [chatMessages, setChatMessages] = useState<FollowUpMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => { if (user) loadHistory(); }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase.from("chart_analyses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    if (data) setHistory(data as unknown as SavedAnalysis[]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Please select an image file", variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: "Image must be under 10MB", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => { setPreview(reader.result as string); setResult(null); setResultId(null); setChatMessages([]); };
    reader.readAsDataURL(file);
  };

  const analyzeChart = async () => {
    if (!preview || !user) return;
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chart_screenshots").upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("chart_screenshots").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;
      setUploading(false);
      setAnalyzing(true);

      const context: any = {};
      if (timeframe) context.timeframe = timeframe;
      if (assetType) context.asset_type = assetType;
      if (userObservation) context.user_observation = userObservation;
      if (question) context.question = question;
      if (strategy) context.strategy = strategy;
      if (userBias) context.bias = userBias;
      if (selectedIndicators.length) context.indicators_used = selectedIndicators;

      const { data, error } = await supabase.functions.invoke("analyze-chart", {
        body: { image_url: imageUrl, symbol: symbol || undefined, mode, context: Object.keys(context).length ? context : undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(normalize(data.analysis));
      setResultId(data.id);
      setPreview(imageUrl);
      setChatMessages([]);
      await loadHistory();
      toast({ title: "Chart analyzed!", description: `${modes.find(m => m.key === mode)?.label} complete` });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message || "Try again", variant: "destructive" });
    } finally { setUploading(false); setAnalyzing(false); }
  };

  const sendFollowUp = async (q?: string) => {
    const text = q || followUp.trim();
    if (!text || !resultId) return;
    setChatMessages(prev => [...prev, { role: "user", text }]);
    setFollowUp("");
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-chart", {
        body: { follow_up: text, analysis_id: resultId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setChatMessages(prev => [...prev, { role: "ai", text: data.answer }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: "ai", text: `Error: ${e.message}` }]);
    } finally { setChatLoading(false); }
  };

  const deleteAnalysis = async (id: string) => {
    await supabase.from("chart_analyses").delete().eq("id", id);
    setHistory(prev => prev.filter(a => a.id !== id));
    toast({ title: "Analysis deleted" });
  };

  const viewSaved = (saved: SavedAnalysis) => {
    setPreview(saved.image_url);
    setResult(normalize(saved.analysis_json));
    setResultId(saved.id);
    setSymbol(saved.symbol || "");
    setChatMessages([]);
    setShowHistory(false);
  };

  const resetAll = () => {
    setResult(null); setResultId(null); setPreview(null); setSymbol(""); setChatMessages([]);
    setShowContext(false); setTimeframe(""); setAssetType(""); setUserObservation("");
    setQuestion(""); setStrategy(""); setUserBias(""); setSelectedIndicators([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const trend = result?.trend_direction || "SIDEWAYS";
  const TrendIcon = trendIcons[trend] || Minus;

  return (
    <div className="flex flex-col gap-3">
      {/* Upload Area */}
      <GlassCard
        className="flex flex-col items-center justify-center py-6 cursor-pointer border-dashed border-2 border-border/50 hover:border-primary/30 transition-colors"
        onClick={() => !result && fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        {preview ? (
          <img src={preview} alt="Chart preview" className="w-full max-h-48 object-contain rounded-lg" />
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Upload Chart Screenshot</p>
            <p className="text-xs text-muted-foreground mt-1">TradingView, MetaTrader, broker apps, or any chart</p>
            <div className="flex flex-wrap gap-1 mt-3 justify-center">
              {["TradingView", "MT4/MT5", "Thinkorswim", "Broker App"].map(p => (
                <span key={p} className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{p}</span>
              ))}
            </div>
          </>
        )}
      </GlassCard>

      {/* Controls (pre-analysis) */}
      {preview && !result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
          {/* Mode selector */}
          <div className="flex flex-wrap gap-1.5">
            {modes.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-all flex items-center gap-1 ${mode === m.key ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]" : "glass-card text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-3 w-3" /> {m.label}
                </button>
              );
            })}
          </div>

          {/* Symbol + Analyze */}
          <div className="flex gap-2">
            <Input placeholder="Symbol (optional)" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="bg-secondary/50 flex-1" />
            <Button onClick={analyzeChart} disabled={uploading || analyzing} className="gap-1.5 whitespace-nowrap">
              {uploading || analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : analyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>

          {/* Context toggle */}
          <button onClick={() => setShowContext(!showContext)} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors self-start">
            {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showContext ? "Hide context" : "Add context for better analysis"}
          </button>

          {/* Context form */}
          <AnimatePresence>
            {showContext && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <GlassCard className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={timeframe} onValueChange={setTimeframe}>
                      <SelectTrigger className="bg-secondary/50 text-xs h-8"><SelectValue placeholder="Timeframe" /></SelectTrigger>
                      <SelectContent>
                        {["1m", "5m", "15m", "1H", "4H", "1D", "1W", "1M"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={assetType} onValueChange={setAssetType}>
                      <SelectTrigger className="bg-secondary/50 text-xs h-8"><SelectValue placeholder="Asset type" /></SelectTrigger>
                      <SelectContent>
                        {["Stock", "Crypto", "Forex", "Commodity", "Index"].map(t => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Strategy style" value={strategy} onChange={e => setStrategy(e.target.value)} className="bg-secondary/50 text-xs h-8" />
                    <Select value={userBias} onValueChange={setUserBias}>
                      <SelectTrigger className="bg-secondary/50 text-xs h-8"><SelectValue placeholder="Your bias" /></SelectTrigger>
                      <SelectContent>
                        {["Bullish", "Bearish", "Neutral", "Unsure"].map(t => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea placeholder="What do you see? What do you want help with?" value={userObservation} onChange={e => setUserObservation(e.target.value)} className="bg-secondary/50 text-xs min-h-[48px]" rows={2} />
                  <Input placeholder="Specific question (optional)" value={question} onChange={e => setQuestion(e.target.value)} className="bg-secondary/50 text-xs h-8" />
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Indicators on chart:</p>
                    <div className="flex flex-wrap gap-1">
                      {indicatorOptions.map(ind => (
                        <button
                          key={ind}
                          onClick={() => setSelectedIndicators(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind])}
                          className={`rounded-full px-2 py-0.5 text-[9px] font-medium transition-all ${selectedIndicators.includes(ind) ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
                        >
                          {ind}
                        </button>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">

            {/* Screenshot quality warning */}
            {result.screenshot_quality_score < 5 && (
              <GlassCard className="border-verdict-avoid/20 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-verdict-avoid flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground">{result.quality_notes || "Low quality screenshot — results may be unreliable."}</p>
              </GlassCard>
            )}

            {/* Header card */}
            <GlassCard className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${trend.includes("UP") ? "bg-verdict-buy/10" : trend.includes("DOWN") ? "bg-verdict-avoid/10" : "bg-verdict-wait/10"}`}>
                  <TrendIcon className={`h-5 w-5 ${trendColors[trend] || "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {(symbol || result.symbol_detected) && <span className="text-xs font-bold font-mono">{symbol || result.symbol_detected}</span>}
                    {result.timeframe_detected && <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{result.timeframe_detected}</span>}
                    {result.platform_detected && <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{result.platform_detected}</span>}
                  </div>
                  <p className={`text-sm font-bold ${trendColors[trend]}`}>{trend.replace(/_/g, " ")}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <VerdictBadge verdict={biasVerdict[result.likely_bias] || biasVerdict[result.verdict || ""] || "WAIT"} size="md" />
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${confidenceColors[result.confidence_label] || confidenceColors.MEDIUM}`}>
                  {result.confidence_label} • {Math.round(result.confidence_score * 100)}%
                </span>
              </div>
            </GlassCard>

            {/* Summary */}
            <GlassCard className="bg-primary/3">
              <p className="text-xs text-foreground/80 leading-relaxed">{result.analysis_summary}</p>
            </GlassCard>

            {/* Tabbed details */}
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="w-full bg-secondary/50 flex-wrap h-auto gap-0.5 p-1">
                <TabsTrigger value="analysis" className="flex-1 text-[10px] py-1">Analysis</TabsTrigger>
                <TabsTrigger value="levels" className="flex-1 text-[10px] py-1">Levels</TabsTrigger>
                <TabsTrigger value="entries" className="flex-1 text-[10px] py-1">Entries</TabsTrigger>
                <TabsTrigger value="learn" className="flex-1 text-[10px] py-1">Learn</TabsTrigger>
              </TabsList>

              {/* Analysis tab */}
              <TabsContent value="analysis" className="mt-3 flex flex-col gap-2">
                {/* Patterns */}
                {result.key_patterns.length > 0 && (
                  <GlassCard>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Patterns</p>
                    <div className="flex flex-col gap-1.5">
                      {result.key_patterns.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${p.type === "bullish" ? "bg-verdict-buy" : p.type === "bearish" ? "bg-verdict-avoid" : "bg-muted-foreground"}`} />
                            <span className="text-xs font-medium">{p.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground">{Math.round(p.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Indicator readings */}
                {result.indicator_readings && result.indicator_readings.length > 0 && (
                  <GlassCard>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Indicators</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {result.indicator_readings.map((ind, i) => (
                        <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-secondary/30">
                          <span className="text-[10px] font-medium">{ind.name}</span>
                          <span className={`text-[9px] font-mono ${ind.signal === "bullish" ? "text-verdict-buy" : ind.signal === "bearish" ? "text-verdict-avoid" : "text-muted-foreground"}`}>{ind.value}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Notable candles */}
                {result.notable_candles && result.notable_candles.length > 0 && (
                  <GlassCard>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Candle Patterns</p>
                    <div className="flex flex-wrap gap-1">
                      {result.notable_candles.map((c, i) => (
                        <span key={i} className="rounded-full px-2 py-0.5 text-[9px] bg-secondary text-muted-foreground">{c}</span>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Bull/Bear case */}
                {(result.bull_case || result.bear_case) && (
                  <div className="grid grid-cols-1 gap-2">
                    {result.bull_case && (
                      <GlassCard className="p-3">
                        <p className="text-[10px] text-verdict-buy font-semibold mb-1">🐂 Bull Case</p>
                        <p className="text-[11px] text-foreground/80 leading-relaxed">{result.bull_case}</p>
                      </GlassCard>
                    )}
                    {result.bear_case && (
                      <GlassCard className="p-3">
                        <p className="text-[10px] text-verdict-avoid font-semibold mb-1">🐻 Bear Case</p>
                        <p className="text-[11px] text-foreground/80 leading-relaxed">{result.bear_case}</p>
                      </GlassCard>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Levels tab */}
              <TabsContent value="levels" className="mt-3 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {result.support_levels.length > 0 && (
                    <GlassCard className="p-3">
                      <p className="text-[10px] text-verdict-buy uppercase tracking-wider mb-1.5 font-semibold">Support</p>
                      {result.support_levels.map((l, i) => (
                        <p key={i} className="text-xs font-mono font-medium text-verdict-buy">{typeof l === "number" ? `$${l.toLocaleString()}` : l}</p>
                      ))}
                    </GlassCard>
                  )}
                  {result.resistance_levels.length > 0 && (
                    <GlassCard className="p-3">
                      <p className="text-[10px] text-verdict-avoid uppercase tracking-wider mb-1.5 font-semibold">Resistance</p>
                      {result.resistance_levels.map((l, i) => (
                        <p key={i} className="text-xs font-mono font-medium text-verdict-avoid">{typeof l === "number" ? `$${l.toLocaleString()}` : l}</p>
                      ))}
                    </GlassCard>
                  )}
                </div>
                {result.invalidation_zone && (
                  <GlassCard className="border-verdict-avoid/20 p-3">
                    <p className="text-[10px] text-verdict-avoid font-semibold mb-1">⚠️ Invalidation Zone</p>
                    <p className="text-xs font-mono text-foreground/80">{result.invalidation_zone}</p>
                  </GlassCard>
                )}
              </TabsContent>

              {/* Entries tab */}
              <TabsContent value="entries" className="mt-3 flex flex-col gap-2">
                {result.entry_ideas && result.entry_ideas.length > 0 ? result.entry_ideas.map((e, i) => (
                  <GlassCard key={i} className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className={`text-[9px] ${e.type === "long" ? "border-verdict-buy/30 text-verdict-buy" : "border-verdict-avoid/30 text-verdict-avoid"}`}>
                        {e.type.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] font-mono">Entry: {e.entry}</span>
                    </div>
                    {e.stop_loss && <p className="text-[10px] text-muted-foreground">SL: {e.stop_loss}</p>}
                    {e.target && <p className="text-[10px] text-muted-foreground">TP: {e.target}</p>}
                    <p className="text-[11px] text-foreground/70 mt-1">{e.rationale}</p>
                  </GlassCard>
                )) : (
                  <GlassCard className="text-center py-4">
                    <p className="text-xs text-muted-foreground">No entry ideas for this analysis mode</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Try "Setup Review" or "Full Breakdown" mode</p>
                  </GlassCard>
                )}
              </TabsContent>

              {/* Learn tab */}
              <TabsContent value="learn" className="mt-3 flex flex-col gap-2">
                {result.teaching && (
                  <>
                    <GlassCard>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">🔍 Things Spotted</p>
                      <ul className="space-y-1">
                        {result.teaching.things_spotted.map((t, i) => (
                          <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                            <Star className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" /> {t}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                    <GlassCard>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">⚡ Risks</p>
                      <ul className="space-y-1">
                        {result.teaching.risks.map((r, i) => (
                          <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-verdict-avoid mt-0.5 flex-shrink-0" /> {r}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                    <GlassCard className="bg-primary/5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">📚 Key Lesson</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{result.teaching.key_lesson}</p>
                    </GlassCard>
                    {result.teaching.suggested_action && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Suggested:</span>
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${actionLabels[result.teaching.suggested_action]?.color || "bg-secondary text-muted-foreground"}`}>
                          {actionLabels[result.teaching.suggested_action]?.label || result.teaching.suggested_action}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Warnings */}
            {result.risk_warnings.length > 0 && (
              <GlassCard className="border-verdict-avoid/20">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-verdict-avoid" />
                  <p className="text-xs font-semibold text-verdict-avoid">Warnings</p>
                </div>
                <ul className="space-y-1">
                  {result.risk_warnings.map((w, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-verdict-avoid mt-0.5">•</span> {w}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            {/* Follow-up chat */}
            {resultId && (
              <GlassCard>
                <button onClick={() => setShowChat(!showChat)} className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold">Ask Follow-Up Questions</span>
                  </div>
                  {showChat ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {showChat && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-3 flex flex-col gap-2">
                        {/* Quick questions */}
                        <div className="flex flex-wrap gap-1">
                          {quickQuestions.map(q => (
                            <button key={q} onClick={() => sendFollowUp(q)} disabled={chatLoading} className="rounded-full px-2.5 py-1 text-[9px] bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
                              {q}
                            </button>
                          ))}
                        </div>

                        {/* Chat messages */}
                        {chatMessages.length > 0 && (
                          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                            {chatMessages.map((msg, i) => (
                              <div key={i} className={`text-[11px] leading-relaxed p-2 rounded-lg ${msg.role === "user" ? "bg-primary/10 text-primary self-end ml-8" : "bg-secondary/50 text-foreground/80 self-start mr-8"}`}>
                                {msg.text}
                              </div>
                            ))}
                            {chatLoading && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Thinking...</div>
                            )}
                          </div>
                        )}

                        {/* Input */}
                        <div className="flex gap-1.5">
                          <Input
                            placeholder="Ask about this chart..."
                            value={followUp}
                            onChange={e => setFollowUp(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendFollowUp()}
                            className="bg-secondary/50 text-xs h-8 flex-1"
                            disabled={chatLoading}
                          />
                          <Button size="sm" onClick={() => sendFollowUp()} disabled={chatLoading || !followUp.trim()} className="h-8 w-8 p-0">
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            )}

            <Button variant="outline" size="sm" onClick={resetAll}>Analyze Another Chart</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {!result && history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past Analyses</h3>
            <button onClick={() => setShowHistory(!showHistory)} className="text-[10px] text-primary">{showHistory ? "Hide" : `Show all (${history.length})`}</button>
          </div>
          <div className="flex flex-col gap-2">
            {(showHistory ? history : history.slice(0, 3)).map(a => {
              const an = normalize(a.analysis_json);
              return (
                <GlassCard key={a.id} className="flex items-center gap-3 cursor-pointer" onClick={() => viewSaved(a)}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    <img src={a.image_url} alt="chart" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {a.symbol && <span className="text-xs font-bold font-mono">{a.symbol}</span>}
                      <VerdictBadge verdict={biasVerdict[an.likely_bias] || "WAIT"} size="sm" />
                      {an.mode && <span className="text-[8px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">{an.mode}</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {an.trend_direction?.replace(/_/g, " ")} • {an.confidence_label} • {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteAnalysis(a.id); }} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartAnalyzer;
