import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { type TradeScenario } from "@/data/scenarioData";

interface Props {
  scenario: TradeScenario;
  alreadyCompleted: boolean;
  onComplete: (passed: boolean) => void;
  onBack: () => void;
}

const answerIcons = {
  BUY: <TrendingUp className="h-4 w-4" />,
  WAIT: <Minus className="h-4 w-4" />,
  AVOID: <TrendingDown className="h-4 w-4" />,
};

const answerColors = {
  BUY: "border-verdict-buy/30 hover:border-verdict-buy/60 hover:bg-verdict-buy/10",
  WAIT: "border-verdict-wait/30 hover:border-verdict-wait/60 hover:bg-verdict-wait/10",
  AVOID: "border-verdict-avoid/30 hover:border-verdict-avoid/60 hover:bg-verdict-avoid/10",
};

const ScenarioReplay = ({ scenario, alreadyCompleted, onComplete, onBack }: Props) => {
  const [selected, setSelected] = useState<"BUY" | "WAIT" | "AVOID" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === scenario.correctAnswer;

  const handleSubmit = useCallback(() => {
    if (!selected) return;
    setSubmitted(true);
    onComplete(selected === scenario.correctAnswer);
  }, [selected, scenario.correctAnswer, onComplete]);

  const handleRetry = () => {
    setSelected(null);
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
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
            scenario.difficulty === "Easy" ? "bg-verdict-buy/15 text-verdict-buy border-verdict-buy/20"
              : scenario.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
              : "bg-verdict-avoid/15 text-verdict-avoid border-verdict-avoid/20"
          }`}>{scenario.difficulty}</span>
          <span className="text-[10px] text-muted-foreground font-mono">+{scenario.xp_reward} XP</span>
        </div>
      </div>

      {/* Scenario context */}
      <GlassCard className="border-primary/15">
        <h2 className="text-sm font-bold mb-2">{scenario.title}</h2>
        <p className="text-xs text-foreground/80 leading-relaxed">{scenario.context}</p>
      </GlassCard>

      {/* Setup details */}
      <GlassCard>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Setup</p>
        <p className="text-xs text-foreground/80">{scenario.setup}</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {Object.entries(scenario.indicators).map(([key, val]) => (
            <div key={key} className="p-2 rounded-lg bg-secondary/50">
              <span className="text-[9px] text-muted-foreground uppercase">{key}</span>
              <p className="text-xs font-bold font-mono mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Decision buttons */}
      <p className="text-xs font-semibold text-center text-muted-foreground">What's your call?</p>
      <div className="grid grid-cols-3 gap-2">
        {(["BUY", "WAIT", "AVOID"] as const).map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = submitted && choice === scenario.correctAnswer;
          const isWrongChoice = submitted && isSelected && !isCorrect;

          return (
            <motion.button
              key={choice}
              whileTap={!submitted ? { scale: 0.95 } : {}}
              onClick={() => !submitted && setSelected(choice)}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                submitted
                  ? isCorrectChoice
                    ? "border-verdict-buy bg-verdict-buy/15"
                    : isWrongChoice
                    ? "border-verdict-avoid bg-verdict-avoid/15"
                    : "border-border/30 opacity-40"
                  : isSelected
                  ? `border-primary bg-primary/10 shadow-lg`
                  : answerColors[choice]
              }`}
              disabled={submitted}
            >
              {submitted && isCorrectChoice ? <CheckCircle2 className="h-5 w-5 text-verdict-buy" /> :
               submitted && isWrongChoice ? <XCircle className="h-5 w-5 text-verdict-avoid" /> :
               answerIcons[choice]}
              <span className="text-xs font-bold">{choice}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && selected && (
        <Button onClick={handleSubmit} className="w-full">
          Submit Decision
        </Button>
      )}

      {/* Result */}
      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <GlassCard className={isCorrect ? "border-verdict-buy/20 bg-verdict-buy/5" : "border-verdict-avoid/20 bg-verdict-avoid/5"}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? <CheckCircle2 className="h-5 w-5 text-verdict-buy" /> : <XCircle className="h-5 w-5 text-verdict-avoid" />}
                <p className="text-sm font-bold">{isCorrect ? "Correct! Great read." : `Not quite — the answer was ${scenario.correctAnswer}.`}</p>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{scenario.explanation}</p>
            </GlassCard>

            <GlassCard className="border-primary/10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What Actually Happened</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{scenario.outcome}</p>
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

export default ScenarioReplay;
