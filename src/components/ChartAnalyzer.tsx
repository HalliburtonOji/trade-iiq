import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Camera, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, Trash2, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import GlassCard from "@/components/GlassCard";
import VerdictBadge from "@/components/VerdictBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChartAnalysis {
  trend: string;
  patterns: { name: string; type: string; confidence: number }[];
  support_levels: number[];
  resistance_levels: number[];
  indicators_spotted?: string[];
  verdict: string;
  confidence: number;
  reasoning: string;
  warnings: string[];
}

interface SavedAnalysis {
  id: string;
  image_url: string;
  symbol: string | null;
  analysis_json: ChartAnalysis;
  created_at: string;
}

const trendIcons: Record<string, any> = {
  STRONG_UPTREND: TrendingUp,
  UPTREND: TrendingUp,
  SIDEWAYS: Minus,
  DOWNTREND: TrendingDown,
  STRONG_DOWNTREND: TrendingDown,
};

const trendColors: Record<string, string> = {
  STRONG_UPTREND: "text-verdict-buy",
  UPTREND: "text-verdict-buy",
  SIDEWAYS: "text-verdict-wait",
  DOWNTREND: "text-verdict-avoid",
  STRONG_DOWNTREND: "text-verdict-avoid",
};

const verdictMap: Record<string, "BUY" | "WAIT" | "AVOID"> = {
  STRONG_BUY: "BUY",
  BUY: "BUY",
  HOLD: "WAIT",
  SELL: "AVOID",
  STRONG_SELL: "AVOID",
};

const ChartAnalyzer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [symbol, setSymbol] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ChartAnalysis | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chart_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as unknown as SavedAnalysis[]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image must be under 10MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const analyzeChart = async () => {
    if (!preview || !user) return;
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload to storage
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chart_screenshots")
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chart_screenshots")
        .getPublicUrl(path);

      const imageUrl = urlData.publicUrl;
      setUploading(false);
      setAnalyzing(true);

      // Call analyze-chart edge function
      const { data, error } = await supabase.functions.invoke("analyze-chart", {
        body: { image_url: imageUrl, symbol: symbol || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.analysis);
      await loadHistory();
      toast({ title: "Chart analyzed!", description: "AI has processed your chart screenshot" });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message || "Try again", variant: "destructive" });
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    await supabase.from("chart_analyses").delete().eq("id", id);
    setHistory(prev => prev.filter(a => a.id !== id));
    toast({ title: "Analysis deleted" });
  };

  const viewSaved = (saved: SavedAnalysis) => {
    setPreview(saved.image_url);
    setResult(saved.analysis_json);
    setSymbol(saved.symbol || "");
    setShowHistory(false);
  };

  const TrendIcon = result ? trendIcons[result.trend] || Minus : Minus;

  return (
    <div className="flex flex-col gap-3">
      {/* Upload Area */}
      <GlassCard
        className="flex flex-col items-center justify-center py-6 cursor-pointer border-dashed border-2 border-border/50 hover:border-primary/30 transition-colors"
        onClick={() => fileRef.current?.click()}
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
            <p className="text-xs text-muted-foreground mt-1">From TradingView, your broker, or any charting app</p>
          </>
        )}
      </GlassCard>

      {preview && (
        <div className="flex gap-2">
          <Input
            placeholder="Symbol (optional)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-secondary/50"
          />
          <Button onClick={analyzeChart} disabled={uploading || analyzing} className="gap-1.5 whitespace-nowrap">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : analyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3"
          >
            {/* Header */}
            <GlassCard className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${result.trend.includes("UP") ? "bg-verdict-buy/10" : result.trend.includes("DOWN") ? "bg-verdict-avoid/10" : "bg-verdict-wait/10"}`}>
                  <TrendIcon className={`h-5 w-5 ${trendColors[result.trend] || "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trend</p>
                  <p className={`text-sm font-bold ${trendColors[result.trend]}`}>
                    {result.trend.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <VerdictBadge verdict={verdictMap[result.verdict] || "WAIT"} size="md" />
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">{Math.round(result.confidence * 100)}% conf.</p>
              </div>
            </GlassCard>

            {/* Patterns */}
            {result.patterns.length > 0 && (
              <GlassCard>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Patterns Detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.patterns.map((p, i) => (
                    <span
                      key={i}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                        p.type === "bullish" ? "bg-verdict-buy/10 text-verdict-buy" :
                        p.type === "bearish" ? "bg-verdict-avoid/10 text-verdict-avoid" :
                        "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* S/R Levels */}
            <div className="grid grid-cols-2 gap-2">
              {result.support_levels.length > 0 && (
                <GlassCard className="p-3">
                  <p className="text-[10px] text-verdict-buy uppercase tracking-wider mb-1.5">Support</p>
                  {result.support_levels.map((l, i) => (
                    <p key={i} className="text-xs font-mono font-medium text-verdict-buy">${l.toLocaleString()}</p>
                  ))}
                </GlassCard>
              )}
              {result.resistance_levels.length > 0 && (
                <GlassCard className="p-3">
                  <p className="text-[10px] text-verdict-avoid uppercase tracking-wider mb-1.5">Resistance</p>
                  {result.resistance_levels.map((l, i) => (
                    <p key={i} className="text-xs font-mono font-medium text-verdict-avoid">${l.toLocaleString()}</p>
                  ))}
                </GlassCard>
              )}
            </div>

            {/* Indicators */}
            {result.indicators_spotted && result.indicators_spotted.length > 0 && (
              <GlassCard>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Indicators Spotted</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.indicators_spotted.map((ind, i) => (
                    <span key={i} className="rounded-full px-2.5 py-1 text-[10px] font-medium bg-primary/10 text-primary">{ind}</span>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Reasoning */}
            <GlassCard className="bg-primary/3">
              <p className="text-xs font-semibold mb-1.5">AI Reasoning</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{result.reasoning}</p>
            </GlassCard>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <GlassCard className="border-verdict-avoid/20">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-verdict-avoid" />
                  <p className="text-xs font-semibold text-verdict-avoid">Warnings</p>
                </div>
                <ul className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-verdict-avoid mt-0.5">•</span> {w}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            <Button variant="outline" size="sm" onClick={() => { setResult(null); setPreview(null); setSymbol(""); if (fileRef.current) fileRef.current.value = ""; }}>
              Analyze Another Chart
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {!result && history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past Analyses</h3>
            <button onClick={() => setShowHistory(!showHistory)} className="text-[10px] text-primary">
              {showHistory ? "Hide" : `Show all (${history.length})`}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {(showHistory ? history : history.slice(0, 3)).map((a) => (
              <GlassCard key={a.id} className="flex items-center gap-3 cursor-pointer" onClick={() => viewSaved(a)}>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                  <img src={a.image_url} alt="chart" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {a.symbol && <span className="text-xs font-bold font-mono">{a.symbol}</span>}
                    <VerdictBadge verdict={verdictMap[a.analysis_json?.verdict] || "WAIT"} size="sm" />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {a.analysis_json?.trend?.replace(/_/g, " ")} • {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id); }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartAnalyzer;
