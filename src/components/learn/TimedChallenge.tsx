import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import { drillsData, type Drill } from "@/data/drillsData";

interface Props {
  onComplete: (correct: number, total: number, xp: number) => void;
  onBack: () => void;
}

const DURATION = 60; // seconds
const XP_PER_CORRECT = 3;

const TimedChallenge = ({ onComplete, onBack }: Props) => {
  // Shuffle quick checks + easy drills
  const [drills] = useState<Drill[]>(() => {
    const pool = drillsData.filter(d => d.practice_type === "quick_check" || d.difficulty === "Easy");
    return [...pool].sort(() => Math.random() - 0.5);
  });

  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [finished]);

  const handleSelect = useCallback((idx: number) => {
    if (showResult || finished) return;
    setSelectedIdx(idx);
    setShowResult(true);
    setAnswered(a => a + 1);
    if (drills[currentIdx].options[idx].isCorrect) {
      setCorrect(c => c + 1);
    }
    // Auto-advance after 600ms
    setTimeout(() => {
      if (currentIdx + 1 >= drills.length) {
        setFinished(true);
      } else {
        setCurrentIdx(i => i + 1);
        setSelectedIdx(null);
        setShowResult(false);
      }
    }, 600);
  }, [showResult, finished, currentIdx, drills]);

  // Finish screen
  if (finished) {
    const xp = correct * XP_PER_CORRECT;
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GlassCard className="border-primary/20 text-center py-8 bg-gradient-to-br from-primary/10 to-accent/5">
            <Zap className="h-10 w-10 text-primary mx-auto mb-3" />
            <p className="text-xl font-bold">Speed Round Complete!</p>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{correct}</p>
                <p className="text-[10px] text-muted-foreground">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{answered}</p>
                <p className="text-[10px] text-muted-foreground">Answered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">{xp}</p>
                <p className="text-[10px] text-muted-foreground">XP</p>
              </div>
            </div>
            <Button className="mt-6" onClick={() => onComplete(correct, answered, xp)}>
              Claim {xp} XP
            </Button>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  const drill = drills[currentIdx];
  if (!drill) return null;

  const timePercent = (timeLeft / DURATION) * 100;
  const isCorrect = selectedIdx !== null && drill.options[selectedIdx].isCorrect;
  const correctIdx = drill.options.findIndex(o => o.isCorrect);

  return (
    <div className="flex flex-col gap-3 px-4 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Quit
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary">{correct} ✓</span>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/30">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className={`text-sm font-mono font-bold ${timeLeft <= 10 ? "text-verdict-avoid" : "text-foreground"}`}>
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1.5 rounded-full bg-muted/30">
        <motion.div
          className={`h-full rounded-full transition-colors ${timeLeft <= 10 ? "bg-verdict-avoid" : "bg-primary/60"}`}
          animate={{ width: `${timePercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <GlassCard className="border-primary/10">
        <p className="text-[13px] font-semibold text-foreground leading-relaxed">{drill.prompt}</p>
      </GlassCard>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {drill.options.map((opt, idx) => {
          let cls = "border-border/50";
          if (showResult && idx === correctIdx) cls = "border-verdict-buy bg-verdict-buy/5";
          else if (showResult && idx === selectedIdx && !opt.isCorrect) cls = "border-verdict-avoid bg-verdict-avoid/5";

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={showResult}
              className={`w-full text-left glass-card p-3 rounded-xl transition-all ${cls}`}
            >
              <div className="flex items-center gap-2">
                {showResult && idx === correctIdx && <CheckCircle2 className="h-4 w-4 text-verdict-buy shrink-0" />}
                {showResult && idx === selectedIdx && !opt.isCorrect && <XCircle className="h-4 w-4 text-verdict-avoid shrink-0" />}
                <span className="text-sm">{opt.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimedChallenge;
