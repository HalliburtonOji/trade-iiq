import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import GlassCard from "@/components/GlassCard";
import { type QuizQuestion } from "@/data/lessonsData";

interface Props {
  questions: QuizQuestion[];
  lessonTitle: string;
  xpReward: number;
  passThreshold?: number;
  onComplete: (score: number, total: number, passed: boolean, weakTags: string[]) => void;
  onRetry: () => void;
  onBack: () => void;
}

const QuizFlow = ({ questions, lessonTitle, xpReward, passThreshold = 0.7, onComplete, onRetry, onBack }: Props) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongTags, setWrongTags] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const question = questions[currentIdx];
  const total = questions.length;
  const progress = ((currentIdx + (answered ? 1 : 0)) / total) * 100;
  const passed = score / total >= passThreshold;

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === question.correctAnswer) {
      setScore(s => s + 1);
    } else {
      setWrongTags(prev => [...prev, ...question.tags]);
    }
  };

  const handleNext = () => {
    if (currentIdx < total - 1) {
      setCurrentIdx(i => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
      const finalScore = selected === question.correctAnswer ? score : score;
      const finalPassed = finalScore / total >= passThreshold;
      onComplete(finalScore, total, finalPassed, [...new Set(wrongTags)]);
    }
  };

  if (finished) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
        <GlassCard className={`text-center py-8 ${passed ? "border-verdict-buy/25" : "border-verdict-avoid/25"}`}>
          {passed ? (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                <Trophy className="h-12 w-12 text-verdict-buy mx-auto mb-3" />
              </motion.div>
              <p className="text-lg font-bold text-verdict-buy">Quiz Passed! 🎉</p>
              <p className="text-sm text-foreground/70 mt-1">{score}/{total} correct</p>
              <p className="text-sm font-semibold text-primary mt-2">+{xpReward} XP earned</p>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-verdict-avoid/60 mx-auto mb-3" />
              <p className="text-lg font-bold text-verdict-avoid">Not quite yet</p>
              <p className="text-sm text-foreground/70 mt-1">{score}/{total} correct · Need {Math.ceil(passThreshold * total)}</p>
              <p className="text-[11px] text-muted-foreground mt-2 max-w-[260px] mx-auto">
                Review the lesson content and try again. Focus on the explanations for the questions you missed.
              </p>
            </>
          )}
        </GlassCard>

        <div className="flex gap-2">
          {!passed && (
            <Button variant="outline" className="flex-1 gap-2" onClick={onRetry}>
              <RotateCcw className="h-4 w-4" /> Retry Quiz
            </Button>
          )}
          <Button variant={passed ? "default" : "secondary"} className="flex-1" onClick={onBack}>
            {passed ? "Continue Learning" : "Back to Lesson"}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">Question {currentIdx + 1} of {total}</p>
        <p className="text-xs text-muted-foreground font-mono">{score} correct</p>
      </div>
      <Progress value={progress} className="h-1.5" />

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm font-semibold leading-relaxed">{question.question}</p>

          <div className="flex flex-col gap-2">
            {question.options.map((opt, i) => {
              let style = "glass-card hover:bg-secondary/50";
              if (answered) {
                if (i === question.correctAnswer) {
                  style = "bg-verdict-buy/15 text-verdict-buy border border-verdict-buy/25";
                } else if (i === selected) {
                  style = "bg-verdict-avoid/15 text-verdict-avoid border border-verdict-avoid/25";
                } else {
                  style = "glass-card opacity-40";
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={answered}
                  className={`w-full rounded-xl p-3.5 text-left text-xs font-medium transition-all ${style}`}
                >
                  <span className="text-muted-foreground mr-2 font-mono">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className={`${selected === question.correctAnswer ? "border-verdict-buy/20" : "border-verdict-avoid/20"}`}>
                <div className="flex items-start gap-2">
                  {selected === question.correctAnswer ? (
                    <CheckCircle2 className="h-4 w-4 text-verdict-buy shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-verdict-avoid shrink-0 mt-0.5" />
                  )}
                  <p className="text-[11px] text-foreground/75 leading-relaxed">{question.explanation}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Next button */}
          {answered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button className="w-full gap-2" onClick={handleNext}>
                {currentIdx < total - 1 ? "Next Question" : "See Results"} <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default QuizFlow;
