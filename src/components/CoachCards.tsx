import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, AlertTriangle, ClipboardCheck, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import GlassCard from "./GlassCard";

interface CoachCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  action?: () => void;
}

const CoachCards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CoachCard[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const result: CoachCard[] = [];

      const [tradesRes, reviewsRes, rulesRes] = await Promise.all([
        supabase.from("trade_decisions").select("symbol,outcome,decision,confidence,date,invalidation_point,thesis_why").eq("user_id", user.id).order("date", { ascending: false }).limit(50),
        supabase.from("decision_reviews").select("mistake_type,followed_plan,emotion").eq("user_id", user.id).order("reviewed_date", { ascending: false }).limit(30),
        supabase.from("trading_rules").select("rule_text").eq("user_id", user.id).eq("is_active", true),
      ]);

      const trades = tradesRes.data || [];
      const reviews = reviewsRes.data || [];
      const completed = trades.filter(t => t.outcome === "WIN" || t.outcome === "LOSS");

      // Edge statement: best performing decision type
      if (completed.length >= 3) {
        const byDecision: Record<string, { w: number; t: number }> = {};
        completed.forEach(t => {
          if (!byDecision[t.decision]) byDecision[t.decision] = { w: 0, t: 0 };
          byDecision[t.decision].t++;
          if (t.outcome === "WIN") byDecision[t.decision].w++;
        });
        const best = Object.entries(byDecision).sort((a, b) => (b[1].w / b[1].t) - (a[1].w / a[1].t))[0];
        if (best && best[1].t >= 2) {
          const rate = Math.round((best[1].w / best[1].t) * 100);
          result.push({
            icon: <Zap className="h-4 w-4 text-verdict-buy" />,
            title: "Your Edge",
            description: `${best[0]} calls win ${rate}% of the time`,
            color: "border-verdict-buy/20 bg-verdict-buy/5",
          });
        }
      }

      // Pending reviews
      const pendingReview = trades.filter(t => (t.outcome === "WIN" || t.outcome === "LOSS")).slice(0, 3);
      if (pendingReview.length > 0) {
        result.push({
          icon: <ClipboardCheck className="h-4 w-4 text-primary" />,
          title: "1-Minute Task",
          description: `Review your ${pendingReview[0].symbol} ${pendingReview[0].decision} decision`,
          color: "border-primary/20 bg-primary/5",
          action: () => navigate("/tracker"),
        });
      }

      // Worst mistake pattern
      const mistakeCounts: Record<string, number> = {};
      reviews.forEach(r => {
        if (r.mistake_type && r.mistake_type !== "none") {
          mistakeCounts[r.mistake_type] = (mistakeCounts[r.mistake_type] || 0) + 1;
        }
      });
      const topMistake = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0];
      if (topMistake) {
        const labels: Record<string, string> = {
          entered_early: "entering too early", fomo: "FOMO", oversizing: "oversizing",
          no_stop: "trading without stop losses", revenge_trade: "revenge trading", ignored_macro: "ignoring macro",
        };
        result.push({
          icon: <AlertTriangle className="h-4 w-4 text-verdict-avoid" />,
          title: "Watch Out",
          description: `Your most common mistake is ${labels[topMistake[0]] || topMistake[0]} (${topMistake[1]}×)`,
          color: "border-verdict-avoid/20 bg-verdict-avoid/5",
        });
      }

      // Learning nudge
      const noThesis = trades.filter(t => !t.thesis_why || t.thesis_why.length < 5).length;
      const noInvalidation = trades.filter(t => t.decision === "BUY" && !t.invalidation_point).length;
      if (noInvalidation >= 3) {
        result.push({
          icon: <GraduationCap className="h-4 w-4 text-accent" />,
          title: "Growth Prompt",
          description: `${noInvalidation} BUY trades lack a stop-loss — learn about risk management`,
          color: "border-accent/20 bg-accent/5",
          action: () => navigate("/learn"),
        });
      } else if (noThesis >= 3) {
        result.push({
          icon: <GraduationCap className="h-4 w-4 text-accent" />,
          title: "Growth Prompt",
          description: `${noThesis} trades lack a thesis — build the habit of documenting why`,
          color: "border-accent/20 bg-accent/5",
          action: () => navigate("/tracker"),
        });
      }

      setCards(result.slice(0, 4));
    };
    load();
  }, [user, navigate]);

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.35 }}
        >
          <GlassCard
            hoverable={!!card.action}
            onClick={card.action}
            className={`flex flex-col gap-1.5 p-3 border ${card.color} ${card.action ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              {card.icon}
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{card.title}</span>
            </div>
            <p className="text-xs text-foreground leading-snug">{card.description}</p>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default CoachCards;
