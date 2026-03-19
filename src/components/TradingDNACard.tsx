import { useState, useEffect } from "react";
import { Dna, RefreshCw, Zap, AlertTriangle, Target, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "./ui/progress";

interface TradingDNA {
  best_asset_class: string;
  worst_asset_class: string;
  favourite_strategy: string;
  most_common_mistake: string;
  best_confidence_range: string;
  worst_emotional_trigger: string;
  overconfidence_score: number;
  strengths: string[];
  weaknesses: string[];
  personality_type: string;
  edge_statement: string;
  danger_zone: string;
}

const TradingDNACard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dna, setDna] = useState<TradingDNA | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("trading_dna")
      .select("dna_json, updated_at")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.dna_json && typeof data.dna_json === "object") {
          setDna(data.dna_json as unknown as TradingDNA);
          setLastUpdated(data.updated_at);
        }
      });
  }, [user]);

  const generateDNA = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("trading-dna");
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Cannot generate DNA", description: data.error, variant: "destructive" });
        return;
      }
      if (data?.dna) {
        setDna(data.dna);
        setLastUpdated(new Date().toISOString());
        toast({ title: "Trading DNA updated", description: "Your profile has been refreshed." });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate DNA", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const personalityColors: Record<string, string> = {
    cautious: "text-verdict-buy bg-verdict-buy/10",
    balanced: "text-primary bg-primary/10",
    aggressive: "text-verdict-avoid bg-verdict-avoid/10",
    learner: "text-verdict-wait bg-verdict-wait/10",
  };

  if (!dna) {
    return (
      <GlassCard className="text-center py-8">
        <Dna className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm font-semibold mb-1">Trading DNA</p>
        <p className="text-xs text-muted-foreground mb-4">AI analysis of your trading personality, strengths, and blind spots.</p>
        <button
          onClick={generateDNA}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Dna className="h-3.5 w-3.5" />}
          {loading ? "Analysing..." : "Generate My DNA"}
        </button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Trading DNA</h3>
          {dna.personality_type && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${personalityColors[dna.personality_type] || ""}`}>
              {dna.personality_type}
            </span>
          )}
        </div>
        <button
          onClick={generateDNA}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Edge & Danger */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <GlassCard className="py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="h-3 w-3 text-verdict-buy" />
            <span className="text-[10px] font-semibold text-verdict-buy uppercase tracking-wider">Your Edge</span>
          </div>
          <p className="text-xs text-foreground">{dna.edge_statement}</p>
        </GlassCard>
        <GlassCard className="py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="h-3 w-3 text-verdict-avoid" />
            <span className="text-[10px] font-semibold text-verdict-avoid uppercase tracking-wider">Danger Zone</span>
          </div>
          <p className="text-xs text-foreground">{dna.danger_zone}</p>
        </GlassCard>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <GlassCard className="py-2 text-center">
          <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Best Asset</p>
          <p className="text-xs font-bold font-mono">{dna.best_asset_class}</p>
        </GlassCard>
        <GlassCard className="py-2 text-center">
          <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Worst Asset</p>
          <p className="text-xs font-bold font-mono text-verdict-avoid">{dna.worst_asset_class}</p>
        </GlassCard>
        <GlassCard className="py-2 text-center">
          <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Best Confidence</p>
          <p className="text-xs font-bold font-mono">{dna.best_confidence_range}</p>
        </GlassCard>
        <GlassCard className="py-2 text-center">
          <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Fav Strategy</p>
          <p className="text-xs font-bold font-mono text-primary">{dna.favourite_strategy}</p>
        </GlassCard>
        <GlassCard className="py-2 text-center">
          <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Top Mistake</p>
          <p className="text-xs font-bold font-mono text-verdict-avoid">{dna.most_common_mistake}</p>
        </GlassCard>
        <GlassCard className="py-2 text-center">
          <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Worst Trigger</p>
          <p className="text-xs font-bold font-mono text-verdict-wait">{dna.worst_emotional_trigger}</p>
        </GlassCard>
      </div>

      {/* Overconfidence meter */}
      <GlassCard className="py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3 w-3 text-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Overconfidence Score</span>
          </div>
          <span className="text-xs font-bold font-mono">{dna.overconfidence_score}/100</span>
        </div>
        <Progress value={dna.overconfidence_score} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground mt-1">
          {dna.overconfidence_score > 70 ? "You tend to be overconfident — consider sizing down." :
           dna.overconfidence_score > 40 ? "Moderate confidence calibration." :
           "Well-calibrated confidence levels."}
        </p>
      </GlassCard>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <GlassCard className="py-3">
          <p className="text-[10px] font-semibold text-verdict-buy uppercase tracking-wider mb-2 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Strengths
          </p>
          <ul className="space-y-1">
            {dna.strengths?.map((s, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-verdict-buy mt-0.5">•</span>{s}
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard className="py-3">
          <p className="text-[10px] font-semibold text-verdict-avoid uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Weaknesses
          </p>
          <ul className="space-y-1">
            {dna.weaknesses?.map((w, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-verdict-avoid mt-0.5">•</span>{w}
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      {lastUpdated && (
        <p className="text-[9px] text-muted-foreground/40 text-right">
          Updated {new Date(lastUpdated).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default TradingDNACard;
