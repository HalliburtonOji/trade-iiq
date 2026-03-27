import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import GlassCard from "@/components/GlassCard";

interface SkillNode {
  id: string; label: string; category: string; requiredXp: number;
}

const skillNodes: SkillNode[] = [
  { id: "basics", label: "Market Basics", category: "fundamentals", requiredXp: 0 },
  { id: "candles", label: "Candlestick Patterns", category: "technical", requiredXp: 30 },
  { id: "indicators", label: "Indicators (RSI, MACD)", category: "technical", requiredXp: 60 },
  { id: "support", label: "Support & Resistance", category: "technical", requiredXp: 100 },
  { id: "risk", label: "Risk Management", category: "risk", requiredXp: 50 },
  { id: "position", label: "Position Sizing", category: "risk", requiredXp: 120 },
  { id: "psychology", label: "Trading Psychology", category: "psychology", requiredXp: 80 },
  { id: "patterns", label: "Chart Patterns", category: "technical", requiredXp: 150 },
  { id: "strategies", label: "Trading Strategies", category: "advanced", requiredXp: 200 },
  { id: "advanced", label: "Advanced Analysis", category: "advanced", requiredXp: 300 },
];

interface Props {
  totalXp: number;
  completedLessons: string[];
}

const SkillTree = ({ totalXp, completedLessons }: Props) => {
  return (
    <GlassCard>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Skill Tree</h3>
      <div className="flex flex-col gap-2">
        {skillNodes.map((node, i) => {
          const unlocked = totalXp >= node.requiredXp;
          const completed = totalXp >= (skillNodes[i + 1]?.requiredXp || node.requiredXp + 50);
          return (
            <motion.div key={node.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${completed ? "bg-verdict-buy/5 border border-verdict-buy/10" : unlocked ? "bg-primary/5 border border-primary/10" : "opacity-40"}`}>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${completed ? "bg-verdict-buy/20" : unlocked ? "bg-primary/20" : "bg-secondary"}`}>
                {completed ? <Check className="h-3.5 w-3.5 text-verdict-buy" /> : unlocked ? <span className="text-[10px] font-bold text-primary">!</span> : <Lock className="h-3 w-3 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{node.label}</p>
                <p className="text-[9px] text-muted-foreground">{node.requiredXp} XP required</p>
              </div>
              {unlocked && !completed && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">In Progress</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default SkillTree;
