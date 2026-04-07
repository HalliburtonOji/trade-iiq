import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Target, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

interface DigestData {
  stats: { total_decisions: number; win_rate: number; wins: number; losses: number };
  worst_habit: { type: string; count: number } | null;
  best_trade: { symbol: string; pnl_percent: number } | null;
  ai_focus: string | null;
  xp: { earned_this_week: number; streak: number };
  lessons_completed: number;
  reviews_written: number;
}

const WeeklyCoachingReport = () => {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not logged in"); setLoading(false); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weekly-digest`, {
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setDigest(data);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    }
    setLoading(false);
  };

  if (!digest) {
    return (
      <GlassCard className="text-center py-8 space-y-4">
        <Sparkles className="h-10 w-10 mx-auto text-primary/50" />
        <div>
          <p className="font-medium">Weekly Coaching Report</p>
          <p className="text-xs text-muted-foreground">AI-generated analysis of your trading week</p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button onClick={generate} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Report
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard className="text-center">
          <p className="text-lg font-bold text-primary">{digest.stats.win_rate}%</p>
          <p className="text-[10px] text-muted-foreground">Win Rate</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-lg font-bold">{digest.stats.wins}W / {digest.stats.losses}L</p>
          <p className="text-[10px] text-muted-foreground">Record</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-lg font-bold">{digest.xp.earned_this_week}</p>
          <p className="text-[10px] text-muted-foreground">XP Earned</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-lg font-bold">{digest.reviews_written}</p>
          <p className="text-[10px] text-muted-foreground">Reviews</p>
        </GlassCard>
      </div>

      {digest.best_trade && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-emerald-500" /><h4 className="text-sm font-semibold">Best Trade</h4></div>
          <p className="text-sm text-muted-foreground">{digest.best_trade.symbol} — +{digest.best_trade.pnl_percent}%</p>
        </GlassCard>
      )}

      {digest.worst_habit && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-amber-500" /><h4 className="text-sm font-semibold">Top Habit to Fix</h4></div>
          <p className="text-sm text-muted-foreground capitalize">{digest.worst_habit.type.replace(/_/g, " ")} — {digest.worst_habit.count}× this week</p>
        </GlassCard>
      )}

      {digest.ai_focus && (
        <GlassCard className="border-primary/20">
          <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold">AI Coach Focus</h4></div>
          <p className="text-sm text-muted-foreground leading-relaxed">{digest.ai_focus}</p>
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center gap-2 mb-1"><BookOpen className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold">Learning</h4></div>
        <p className="text-sm text-muted-foreground">{digest.lessons_completed} lessons completed · {digest.xp.streak} day streak</p>
      </GlassCard>

      <Button variant="outline" onClick={generate} disabled={loading} size="sm" className="gap-1.5">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Refresh
      </Button>
    </div>
  );
};

export default WeeklyCoachingReport;
