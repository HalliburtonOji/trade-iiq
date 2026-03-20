import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { type ConceptMastery, type CategoryMastery } from "@/hooks/use-coaching-engine";

interface Props {
  conceptMastery: ConceptMastery[];
  categoryMastery: CategoryMastery[];
  onSelectLesson?: (id: string) => void;
}

const stateColors: Record<string, string> = {
  not_started: "bg-muted/20 text-muted-foreground",
  emerging: "bg-amber-500/20 text-amber-400",
  building: "bg-primary/20 text-primary",
  solid: "bg-verdict-buy/20 text-verdict-buy",
  needs_review: "bg-verdict-avoid/20 text-verdict-avoid",
  slipping: "bg-verdict-avoid/30 text-verdict-avoid",
};

const stateLabels: Record<string, string> = {
  not_started: "Not started",
  emerging: "Emerging",
  building: "Building",
  solid: "Solid",
  needs_review: "Needs review",
  slipping: "Slipping",
};

const SkillHeatmap = ({ conceptMastery, categoryMastery }: Props) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Category mastery */}
      <p className="text-xs font-semibold text-muted-foreground">Category Mastery</p>
      <div className="grid grid-cols-2 gap-2">
        {categoryMastery.map((cat, i) => (
          <motion.div key={cat.category} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
            <GlassCard className="py-3 px-3">
              <p className="text-xs font-bold mb-1">{cat.category}</p>
              <div className="w-full h-1.5 rounded-full bg-muted/30 mb-1.5">
                <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${cat.progress}%` }} />
              </div>
              <p className="text-[10px] text-primary font-medium">{cat.strengthState}</p>
              {cat.weaknessState && <p className="text-[9px] text-verdict-avoid mt-0.5">{cat.weaknessState}</p>}
              <p className="text-[9px] text-muted-foreground mt-1">{cat.recommendedAction}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Concept heatmap */}
      <p className="text-xs font-semibold text-muted-foreground mt-1">Concept Mastery</p>
      <div className="grid grid-cols-3 gap-1.5">
        {conceptMastery.map((c, i) => (
          <motion.div
            key={c.concept}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className={`rounded-xl p-2.5 text-center ${stateColors[c.state]} border border-white/5`}
          >
            <p className="text-[10px] font-bold leading-tight">{c.concept}</p>
            <p className="text-[8px] mt-0.5 opacity-80">{stateLabels[c.state]}</p>
            <div className="w-full h-1 rounded-full bg-black/20 mt-1.5">
              <div className="h-full rounded-full bg-current opacity-60 transition-all" style={{ width: `${c.score}%` }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SkillHeatmap;
