import { motion } from "framer-motion";
import { Shield, Star, Award, Crown, Gem } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { LEVEL_CONFIG } from "@/data/tradingMissions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const LEVEL_ICONS = [Shield, Star, Award, Crown, Gem];
const LEVEL_COLORS = ["text-muted-foreground", "text-primary", "text-verdict-buy", "text-verdict-wait", "text-chart-purple"];

interface Props {
  level: number;
  totalTrades: number;
  xp: number;
}

const TradingLevel = ({ level, totalTrades, xp }: Props) => {
  const config = LEVEL_CONFIG[Math.min(level - 1, 4)];
  const nextConfig = LEVEL_CONFIG[Math.min(level, 4)];
  const Icon = LEVEL_ICONS[Math.min(level - 1, 4)];
  const color = LEVEL_COLORS[Math.min(level - 1, 4)];
  const progress = level >= 5 ? 100 : Math.min(100, (totalTrades / nextConfig.minTrades) * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 glass-card px-3 py-2 rounded-xl cursor-help"
          >
            <div className={`${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Lv.{level} {config.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{xp} XP</span>
              </div>
              <Progress value={progress} className="h-1.5 mt-1" />
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs font-semibold mb-1">Level {level}: {config.name}</p>
          <p className="text-[10px] text-muted-foreground">Unlocks: {config.unlocks}</p>
          {level < 5 && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Next: {nextConfig.minTrades} trades needed for Lv.{level + 1}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TradingLevel;
