import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { badges, lessonsData } from "@/data/lessonsData";

interface Props {
  completedLessons: string[];
}

const BadgesTab = ({ completedLessons }: Props) => {
  const earned = badges.map(b => ({
    ...b,
    unlocked: b.condition(completedLessons, lessonsData),
  }));

  return (
    <div className="grid grid-cols-2 gap-2.5 mt-3">
      {earned.map((badge, i) => (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
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
            {!badge.unlocked && (
              <Lock className="h-3 w-3 text-muted-foreground/50 mt-2" />
            )}
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default BadgesTab;
