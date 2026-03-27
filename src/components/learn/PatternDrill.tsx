import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Eye } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { type PatternDrill } from "@/data/patternDrills";

interface Props {
  drill: PatternDrill;
  alreadyCompleted: boolean;
  onComplete: (passed: boolean) => void;
  onBack: () => void;
}

const PatternDrillComponent = ({ drill, alreadyCompleted, onComplete, onBack }: Props) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selectedIndex === drill.correctIndex;

  const handleSubmit = useCallback(() => {
    if (selectedIndex === null) return;
    setSubmitted(true);
    onComplete(selectedIndex === drill.correctIndex);
  }, [selectedIndex, drill.correctIndex, onComplete]);

  const handleRetry = () => {
    setSelectedIndex(null);
    setSubmitted(false);
  };

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-medium border border-accent/20">
            Pattern ID
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
            drill.difficulty === "Easy" ? "bg-verdict-buy/15 text-verdict-buy border-verdict-buy/20"
              : drill.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
              : "bg-verdict-avoid/15 text-verdict-avoid border-verdict-avoid/20"
          }`}>{drill.difficulty}</span>
          <span className="text-[10px] text-muted-foreground font-mono">+{drill.xp_reward} XP</span>
        </div>
      </div>

      {/* Pattern description */}
      <GlassCard className="border-accent/15">
        <div className="flex items-start gap-2 mb-2">
          <Eye className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <h2 className="text-sm font-bold">{drill.title}</h2>
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">{drill.description}</p>
      </GlassCard>

      {/* Context */}
      <GlassCard>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chart Context</p>
        <p className="text-xs text-foreground/80 leading-relaxed">{drill.context}</p>
      </GlassCard>

      {/* Question */}
      <p className="text-xs font-semibold text-center text-muted-foreground">What pattern is this?</p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {drill.options.map((option, i) => {
          const isSelected = selectedIndex === i;
          const isCorrectOption = submitted && i === drill.correctIndex;
          const isWrongOption = submitted && isSelected && !isCorrect;

          return (
            <motion.button
              key={i}
              whileTap={!submitted ? { scale: 0.98 } : {}}
              onClick={() => !submitted && setSelectedIndex(i)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                submitted
                  ? isCorrectOption
                    ? "border-verdict-buy bg-verdict-buy/10"
                    : isWrongOption
                    ? "border-verdict-avoid bg-verdict-avoid/10"
                    : "border-border/30 opacity-40"
                  : isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border/30 hover:border-primary/30 hover:bg-primary/5"
              }`}
              disabled={submitted}
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 text-xs font-bold ${
                submitted && isCorrectOption ? "bg-verdict-buy/20 text-verdict-buy" :
                submitted && isWrongOption ? "bg-verdict-avoid/20 text-verdict-avoid" :
                isSelected ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {submitted && isCorrectOption ? <CheckCircle2 className="h-4 w-4" /> :
                 submitted && isWrongOption ? <XCircle className="h-4 w-4" /> :
                 String.fromCharCode(65 + i)}
              </div>
              <span className="text-sm font-medium">{option}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Submit */}
      {!submitted && selectedIndex !== null && (
        <Button onClick={handleSubmit} className="w-full">
          Submit Answer
        </Button>
      )}

      {/* Result */}
      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <GlassCard className={isCorrect ? "border-verdict-buy/20 bg-verdict-buy/5" : "border-verdict-avoid/20 bg-verdict-avoid/5"}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? <CheckCircle2 className="h-5 w-5 text-verdict-buy" /> : <XCircle className="h-5 w-5 text-verdict-avoid" />}
                <p className="text-sm font-bold">
                  {isCorrect ? "Correct! Great pattern recognition." : `Not quite — it's a ${drill.options[drill.correctIndex]}.`}
                </p>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{drill.explanation}</p>
            </GlassCard>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={handleRetry}>
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </Button>
              <Button size="sm" className="flex-1 text-xs" onClick={onBack}>
                Back to Drills
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatternDrillComponent;
