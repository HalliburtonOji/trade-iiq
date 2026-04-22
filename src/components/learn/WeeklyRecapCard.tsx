import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarRange, ArrowRight, Activity } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RecapStats {
  total: number;
  noStop: number;
  fomo: number;
  topMistake: string | null;
}

const friendlyMistake = (m: string) =>
  m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const WeeklyRecapCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<RecapStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const since = new Date();
    since.setDate(since.getDate() - 7);

    Promise.all([
      supabase
        .from("trade_decisions")
        .select("id,invalidation_point,date")
        .eq("user_id", user.id)
        .gte("date", since.toISOString()),
      supabase
        .from("decision_reviews")
        .select("emotion,mistake_type,reviewed_date")
        .eq("user_id", user.id)
        .gte("reviewed_date", since.toISOString()),
    ]).then(([trades, reviews]) => {
      const tradeRows = trades.data || [];
      const reviewRows = reviews.data || [];
      const noStop = tradeRows.filter((t) => t.invalidation_point == null).length;
      const fomo =
        reviewRows.filter((r) => r.emotion === "fomo" || r.mistake_type === "fomo").length;

      const mistakeCounts = new Map<string, number>();
      reviewRows.forEach((r) => {
        if (r.mistake_type && r.mistake_type !== "none") {
          mistakeCounts.set(r.mistake_type, (mistakeCounts.get(r.mistake_type) || 0) + 1);
        }
      });
      const topMistake =
        Array.from(mistakeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      setStats({ total: tradeRows.length, noStop, fomo, topMistake });
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <GlassCard className="h-fit">
        <div className="h-28 animate-pulse rounded-lg bg-secondary/30" />
      </GlassCard>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <GlassCard className="h-fit border-accent/15 bg-gradient-to-br from-accent/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <CalendarRange className="h-4 w-4 text-accent" />
          <p className="text-sm font-bold">This Week</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          No trades logged this week. Log a decision to start building your audit trail.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full text-xs h-8"
          onClick={() => navigate("/tracker")}
        >
          Log a decision <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-fit">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">This Week's Recap</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-2 mb-3"
      >
        <div className="rounded-lg bg-secondary/40 border border-border/40 p-2 text-center">
          <p className="text-base font-bold font-mono">{stats.total}</p>
          <p className="text-[9px] text-muted-foreground uppercase">trades</p>
        </div>
        <div
          className={`rounded-lg border p-2 text-center ${
            stats.noStop > 0
              ? "bg-verdict-avoid/10 border-verdict-avoid/20 text-verdict-avoid"
              : "bg-secondary/40 border-border/40"
          }`}
        >
          <p className="text-base font-bold font-mono">{stats.noStop}</p>
          <p className="text-[9px] uppercase opacity-80">no stop</p>
        </div>
        <div
          className={`rounded-lg border p-2 text-center ${
            stats.fomo > 0
              ? "bg-verdict-wait/10 border-verdict-wait/20 text-verdict-wait"
              : "bg-secondary/40 border-border/40"
          }`}
        >
          <p className="text-base font-bold font-mono">{stats.fomo}</p>
          <p className="text-[9px] uppercase opacity-80">FOMO</p>
        </div>
      </motion.div>

      {stats.topMistake && (
        <p className="text-[11px] text-muted-foreground mb-3">
          Top mistake: <span className="text-foreground font-medium">{friendlyMistake(stats.topMistake)}</span>
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs h-8"
        onClick={() => navigate("/review")}
      >
        View Audit <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </GlassCard>
  );
};

export default WeeklyRecapCard;
