import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronRight, AlertTriangle, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import GlassCard from "./GlassCard";

interface SmartAlert {
  id: string;
  type: "review_needed" | "streak_warning" | "rule_reminder" | "milestone";
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  path?: string;
}

const SmartAlerts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const result: SmartAlert[] = [];

      const [tradesRes, profileRes, reviewsRes] = await Promise.all([
        supabase.from("trade_decisions").select("id,symbol,outcome,date").eq("user_id", user.id).order("date", { ascending: false }).limit(20),
        supabase.from("profiles").select("streak_count,xp_total,last_active_date").eq("user_id", user.id).single(),
        supabase.from("decision_reviews").select("trade_decision_id").eq("user_id", user.id),
      ]);

      const trades = tradesRes.data || [];
      const profile = profileRes.data;
      const reviewedIds = new Set((reviewsRes.data || []).map(r => r.trade_decision_id));

      // Unreviewed completed trades
      const unreviewed = trades.filter(t => (t.outcome === "WIN" || t.outcome === "LOSS") && !reviewedIds.has(t.id));
      if (unreviewed.length > 0) {
        result.push({
          id: "review",
          type: "review_needed",
          icon: <Clock className="h-4 w-4 text-verdict-wait" />,
          title: `${unreviewed.length} trade${unreviewed.length > 1 ? "s" : ""} need review`,
          description: `${unreviewed[0].symbol} ${unreviewed[0].outcome} — write a post-mortem`,
          color: "border-verdict-wait/20",
          path: "/tracker",
        });
      }

      // Streak at risk
      if (profile?.last_active_date) {
        const lastActive = new Date(profile.last_active_date);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 1 && (profile.streak_count || 0) > 0) {
          result.push({
            id: "streak",
            type: "streak_warning",
            icon: <AlertTriangle className="h-4 w-4 text-verdict-avoid" />,
            title: `${profile.streak_count}-day streak at risk!`,
            description: "Complete a lesson or log a trade to keep it alive",
            color: "border-verdict-avoid/20",
            path: "/learn",
          });
        }
      }

      // Milestone approaching
      if (profile?.xp_total) {
        const milestones = [100, 300, 600, 1000, 2000];
        const next = milestones.find(m => m > profile.xp_total);
        if (next && (next - profile.xp_total) <= 50) {
          result.push({
            id: "milestone",
            type: "milestone",
            icon: <TrendingUp className="h-4 w-4 text-verdict-buy" />,
            title: `${next - profile.xp_total} XP to next level!`,
            description: "Complete lessons and missions to level up",
            color: "border-verdict-buy/20",
            path: "/learn",
          });
        }
      }

      // No trades this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekTrades = trades.filter(t => new Date(t.date) >= weekAgo);
      if (weekTrades.length === 0 && trades.length > 0) {
        result.push({
          id: "inactive",
          type: "rule_reminder",
          icon: <Bell className="h-4 w-4 text-muted-foreground" />,
          title: "No activity this week",
          description: "Stay consistent — analyse a ticker or log a decision",
          color: "border-muted/30",
          path: "/analysis",
        });
      }

      setAlerts(result.slice(0, 3));
    };
    load();
  }, [user, navigate]);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Smart Alerts</h2>
      {alerts.map((alert, i) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.35 }}
        >
          <GlassCard
            hoverable={!!alert.path}
            onClick={alert.path ? () => navigate(alert.path!) : undefined}
            className={`flex items-center gap-3 p-3 border ${alert.color} ${alert.path ? "cursor-pointer" : ""}`}
          >
            {alert.icon}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{alert.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{alert.description}</p>
            </div>
            {alert.path && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default SmartAlerts;
