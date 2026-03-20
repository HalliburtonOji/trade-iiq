import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import { type Drill, practiceTypeLabels } from "@/data/drillsData";
import { lessonsData, difficultyColors } from "@/data/lessonsData";

interface Props {
  drill: Drill;
  alreadyCompleted: boolean;
  onComplete: (passed: boolean) => void;
  onBack: () => void;
  onSelectLesson?: (id: string) => void;
}

const DrillDetail = ({ drill, alreadyCompleted, onComplete, onBack, onSelectLesson }: Props) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (idx: number) => {
    if (submitted) return;
    setSelectedIndex(idx);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    setSubmitted(true);
    const passed = drill.options[selectedIndex].isCorrect;
    onComplete(passed);
  };

  const handleRetry = () => {
    setSelectedIndex(null);
    setSubmitted(false);
  };

  const isCorrect = selectedIndex !== null && drill.options[selectedIndex].isCorrect;
  const correctIdx = drill.options.findIndex(o => o.isCorrect);
  const relatedLessons = drill.related_lesson_ids
    .map(id => lessonsData.find(l => l.id === id))
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Practice
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/15">
            {practiceTypeLabels[drill.practice_type]}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${difficultyColors[drill.difficulty]}`}>
            {drill.difficulty}
          </span>
          <span className="text-[10px] text-primary font-mono font-semibold">+{drill.xp_reward} XP</span>
        </div>
        <h1 className="text-xl font-bold mt-2">{drill.title}</h1>
        <p className="text-[11px] text-muted-foreground mt-1">{drill.summary}</p>
      </motion.div>

      {/* Prompt */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
          <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-line">{drill.prompt}</p>
          {drill.context && (
            <p className="text-[11px] text-muted-foreground mt-2 italic">{drill.context}</p>
          )}
        </GlassCard>
      </motion.div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {drill.options.map((opt, idx) => {
          let borderClass = "border-border/50 hover:border-primary/30";
          let bgClass = "";

          if (selectedIndex === idx && !submitted) {
            borderClass = "border-primary ring-1 ring-primary/30";
          }
          if (submitted) {
            if (idx === correctIdx) {
              borderClass = "border-verdict-buy";
              bgClass = "bg-verdict-buy/5";
            } else if (idx === selectedIndex && !opt.isCorrect) {
              borderClass = "border-verdict-avoid";
              bgClass = "bg-verdict-avoid/5";
            } else {
              borderClass = "border-border/20 opacity-40";
            }
          }

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + idx * 0.05 }}
            >
              <button
                onClick={() => handleSelect(idx)}
                disabled={submitted}
                className={`w-full text-left glass-card p-3.5 rounded-xl transition-all ${borderClass} ${bgClass}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    submitted && idx === correctIdx
                      ? "border-verdict-buy bg-verdict-buy"
                      : submitted && idx === selectedIndex && !opt.isCorrect
                        ? "border-verdict-avoid bg-verdict-avoid"
                        : selectedIndex === idx
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                  }`}>
                    {submitted && idx === correctIdx && <CheckCircle2 className="h-3 w-3 text-background" />}
                    {submitted && idx === selectedIndex && !opt.isCorrect && <XCircle className="h-3 w-3 text-background" />}
                    {!submitted && selectedIndex === idx && <div className="w-2 h-2 rounded-full bg-background" />}
                  </div>
                  <span className="text-sm font-medium">{opt.label}</span>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <Button
          className="w-full h-12 text-sm font-semibold"
          disabled={selectedIndex === null}
          onClick={handleSubmit}
        >
          Submit Answer <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-3"
          >
            {/* Result banner */}
            <GlassCard className={isCorrect
              ? "border-verdict-buy/25 bg-gradient-to-br from-verdict-buy/10 to-transparent"
              : "border-verdict-avoid/25 bg-gradient-to-br from-verdict-avoid/10 to-transparent"
            }>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect
                  ? <CheckCircle2 className="h-5 w-5 text-verdict-buy" />
                  : <XCircle className="h-5 w-5 text-verdict-avoid" />
                }
                <p className={`text-sm font-bold ${isCorrect ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                  {isCorrect ? "Correct!" : "Not quite."}
                  {!alreadyCompleted && isCorrect && ` +${drill.xp_reward} XP`}
                </p>
              </div>
              <p className="text-[13px] text-foreground/80 leading-relaxed">{drill.explanation}</p>
            </GlassCard>

            {/* Key takeaway */}
            <GlassCard className="border-accent/15">
              <p className="text-xs font-bold text-accent mb-1">Key Takeaway</p>
              <p className="text-[13px] text-foreground/80 leading-relaxed">{drill.key_takeaway}</p>
            </GlassCard>

            {/* Actions */}
            <div className="flex gap-2">
              {!isCorrect && (
                <Button variant="outline" className="flex-1 gap-1.5" onClick={handleRetry}>
                  <RotateCcw className="h-3.5 w-3.5" /> Try Again
                </Button>
              )}
              <Button className="flex-1 gap-1.5" onClick={onBack}>
                {isCorrect ? "Next Drill" : "Back to Practice"} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Related lessons */}
            {relatedLessons.length > 0 && onSelectLesson && (
              <div className="flex flex-col gap-2 mt-1">
                <p className="text-xs font-semibold text-muted-foreground">Related Lessons</p>
                {relatedLessons.map(rl => rl && (
                  <GlassCard key={rl.id} hoverable onClick={() => onSelectLesson(rl.id)}>
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{rl.title}</p>
                        <p className="text-[10px] text-muted-foreground">{rl.category} · {rl.duration_minutes} min</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DrillDetail;
