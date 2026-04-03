import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Trophy, Check, Lock } from "lucide-react";
import { tradingMissions, type MissionStats } from "@/data/tradingMissions";
import GlassCard from "@/components/GlassCard";

interface Props {
  stats: MissionStats;
  completedIds: string[];
}

const TIER_CONFIG = {
  beginner: { label: "Beginner", color: "text-verdict-buy" },
  intermediate: { label: "Intermediate", color: "text-verdict-wait" },
  advanced: { label: "Advanced", color: "text-chart-purple" },
} as const;

const TradingMissions = ({ stats, completedIds }: Props) => {
  const [open, setOpen] = useState(true);
  const [tier, setTier] = useState<"beginner" | "intermediate" | "advanced">("beginner");

  const missions = tradingMissions.filter((m) => m.tier === tier);
  const totalDone = completedIds.length;
  const totalMissions = tradingMissions.length;

  return (
    <GlassCard className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-verdict-wait" />
          <span className="text-xs font-bold">Missions</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {totalDone}/{totalMissions}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-1.5 mt-3 mb-2">
              {(Object.keys(TIER_CONFIG) as Array<keyof typeof TIER_CONFIG>).map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                    tier === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {TIER_CONFIG[t].label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {missions.map((m) => {
                const done = completedIds.includes(m.id) || m.check(stats);
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2 p-2 rounded-lg transition-all ${
                      done ? "bg-verdict-buy/5" : "bg-secondary/20"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 h-4 w-4 rounded-full flex items-center justify-center ${
                      done ? "bg-verdict-buy/20 text-verdict-buy" : "bg-secondary text-muted-foreground/40"
                    }`}>
                      {done ? <Check className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                        {m.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{m.description}</p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">+{m.xp}xp</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};

export default TradingMissions;
