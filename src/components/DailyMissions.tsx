import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Target, CheckCircle2, Circle, Zap, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";

interface Mission {
  id: string;
  label: string;
  icon: string;
  completed: boolean;
}

const defaultMissions: Omit<Mission, "completed">[] = [
  { id: "analyse", label: "Analyse 1 asset", icon: "🔍" },
  { id: "decision", label: "Log 1 decision", icon: "📝" },
  { id: "lesson", label: "Complete 1 lesson", icon: "📚" },
  { id: "watchlist", label: "Add to watchlist", icon: "⭐" },
  { id: "review", label: "Review a trade", icon: "🔄" },
  { id: "mentor_visit", label: "Read Sophos's journal", icon: "🏛️" },
  { id: "mentor_diff", label: "Diff a Sophos plan", icon: "⚖️" },
];

interface DailyMissionsProps {
  analysed?: boolean;
  logged?: boolean;
  lessoned?: boolean;
  watchlisted?: boolean;
  reviewed?: boolean;
  mentorVisited?: boolean;
  mentorDiffed?: boolean;
}

const DailyMissions = ({ analysed = false, logged = false, lessoned = false, watchlisted = false, reviewed = false, mentorVisited = false, mentorDiffed = false }: DailyMissionsProps) => {
  const completionMap: Record<string, boolean> = {
    analyse: analysed,
    decision: logged,
    lesson: lessoned,
    watchlist: watchlisted,
    review: reviewed,
    mentor_visit: mentorVisited,
    mentor_diff: mentorDiffed,
  };

  const missions = defaultMissions.map((m) => ({
    ...m,
    completed: completionMap[m.id] || false,
  }));

  const completedCount = missions.filter((m) => m.completed).length;
  const totalXp = completedCount * 10;

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Daily Missions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-verdict-wait" />
          <span className="text-[10px] font-bold font-mono text-verdict-wait">{totalXp} XP</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / missions.length) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">{completedCount}/{missions.length} completed</span>

      <div className="flex flex-col gap-1.5">
        {missions.map((m) => (
          <div key={m.id} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-all ${m.completed ? "bg-verdict-buy/5" : ""}`}>
            {m.completed ? (
              <CheckCircle2 className="h-4 w-4 text-verdict-buy shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
            )}
            <span className="text-xs">{m.icon}</span>
            <span className={`text-xs ${m.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {completedCount === missions.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-2"
        >
          <span className="text-lg">🎉</span>
          <p className="text-xs font-semibold text-verdict-buy mt-0.5">All missions complete!</p>
        </motion.div>
      )}
    </GlassCard>
  );
};

export default DailyMissions;
