import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Trophy, Map } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import SkillHeatmap from "./SkillHeatmap";
import { badges, lessonsData } from "@/data/lessonsData";
import { type ConceptMastery, type CategoryMastery } from "@/hooks/use-coaching-engine";

interface Props {
  completedLessons: string[];
  conceptMastery?: ConceptMastery[];
  categoryMastery?: CategoryMastery[];
}

const BadgesTab = ({ completedLessons, conceptMastery = [], categoryMastery = [] }: Props) => {
  const [tab, setTab] = useState<"badges" | "mastery">("badges");

  const earned = badges.map(b => ({
    ...b,
    unlocked: b.condition(completedLessons, lessonsData),
  }));
  const unlockedCount = earned.filter(b => b.unlocked).length;

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* Tab switcher */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setTab("badges")}
          className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === "badges" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "glass-card text-muted-foreground"
          }`}
        >
          <Trophy className="h-3.5 w-3.5" /> Badges ({unlockedCount}/{earned.length})
        </button>
        <button
          onClick={() => setTab("mastery")}
          className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === "mastery" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "glass-card text-muted-foreground"
          }`}
        >
          <Map className="h-3.5 w-3.5" /> Skill Map
        </button>
      </div>

      {tab === "mastery" && conceptMastery.length > 0 ? (
        <SkillHeatmap conceptMastery={conceptMastery} categoryMastery={categoryMastery} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {earned.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <GlassCard
                className={`flex flex-col items-center text-center py-5 px-3 transition-all ${
                  badge.unlocked
                    ? "border-primary/25 bg-gradient-to-b from-primary/5 to-transparent"
                    : "opacity-30 grayscale"
                }`}
              >
                <span className="text-3xl mb-2">{badge.icon}</span>
                <span className="text-xs font-bold">{badge.name}</span>
                <span className="text-[10px] text-muted-foreground mt-1">{badge.description}</span>
                <span className="text-[9px] text-muted-foreground/70 mt-1.5">{badge.requirement}</span>
                {!badge.unlocked && <Lock className="h-3 w-3 text-muted-foreground/50 mt-2" />}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BadgesTab;
