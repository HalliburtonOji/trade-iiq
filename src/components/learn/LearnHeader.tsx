import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { getLevel } from "@/hooks/use-learning-progress";
import { lessonsData } from "@/data/lessonsData";

interface Props {
  totalXp: number;
  streak: number;
  completedCount: number;
}

const LearnHeader = ({ totalXp, streak, completedCount }: Props) => {
  const level = getLevel(totalXp);
  const progress = level.next === level.min ? 100 : ((totalXp - level.min) / (level.next - level.min)) * 100;
  const totalLessons = lessonsData.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Learn</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {completedCount}/{totalLessons} lessons · Focus on fundamentals
          </p>
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card"
        >
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="font-bold text-sm text-orange-400">{streak}</span>
        </motion.div>
      </div>

      <div className="glass-card p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {level.name}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{totalXp} XP</span>
        </div>
        <Progress value={Math.min(progress, 100)} className="h-2" />
        <p className="text-[10px] text-muted-foreground">
          {totalXp >= 500 ? "Max level reached!" : `${level.next - totalXp} XP to ${getLevel(level.next).name}`}
        </p>
      </div>
    </div>
  );
};

export default LearnHeader;
