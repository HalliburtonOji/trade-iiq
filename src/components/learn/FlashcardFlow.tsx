import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw, Eye, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import { type Flashcard } from "@/data/flashcardsData";
import { type FlashcardRating } from "@/hooks/use-review-engine";

interface Props {
  flashcards: Flashcard[];
  onRate: (flashcardId: string, rating: FlashcardRating) => void;
  onBack: () => void;
  onSelectLesson?: (id: string) => void;
}

const FlashcardFlow = ({ flashcards, onRate, onBack, onSelectLesson }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(0);

  const card = flashcards[currentIndex];
  const isLast = currentIndex >= flashcards.length - 1;

  if (!card || completed >= flashcards.length) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Review
        </button>
        <GlassCard className="border-primary/20 text-center py-8">
          <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-3" />
          <p className="text-lg font-bold">Session Complete</p>
          <p className="text-sm text-muted-foreground mt-1">{completed} flashcard{completed !== 1 ? "s" : ""} reviewed</p>
          <Button className="mt-4" onClick={onBack}>Back to Review</Button>
        </GlassCard>
      </div>
    );
  }

  const handleRate = (rating: FlashcardRating) => {
    onRate(card.id, rating);
    setRevealed(false);
    setCompleted(c => c + 1);
    if (!isLast) setCurrentIndex(i => i + 1);
    else setCurrentIndex(i => i + 1); // triggers completion
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-xs text-muted-foreground font-mono">{currentIndex + 1}/{flashcards.length}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-muted/30">
        <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${((currentIndex) / flashcards.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {/* Card front */}
          <GlassCard className="border-primary/15 bg-gradient-to-br from-primary/5 to-accent/5 min-h-[180px] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/15">
                {card.category}
              </span>
              <span className="text-[10px] text-muted-foreground">{card.concept_tag}</span>
            </div>
            <p className="text-[15px] font-semibold text-foreground leading-relaxed">{card.prompt}</p>
          </GlassCard>

          {/* Answer */}
          {!revealed ? (
            <Button
              className="w-full mt-3 h-11 gap-2"
              variant="outline"
              onClick={() => setRevealed(true)}
            >
              <Eye className="h-4 w-4" /> Reveal Answer
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 mt-3"
            >
              <GlassCard className="border-accent/15">
                <p className="text-[13px] text-foreground/90 leading-relaxed">{card.answer}</p>
              </GlassCard>

              {/* Rating buttons */}
              <p className="text-[11px] text-muted-foreground text-center">How well did you know this?</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-verdict-avoid/30 text-verdict-avoid hover:bg-verdict-avoid/10"
                  onClick={() => handleRate("again")}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Again
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => handleRate("okay")}
                >
                  Okay
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-verdict-buy/30 text-verdict-buy hover:bg-verdict-buy/10"
                  onClick={() => handleRate("easy")}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Easy
                </Button>
              </div>

              {/* Related lesson */}
              {onSelectLesson && (
                <button
                  onClick={() => onSelectLesson(card.related_lesson_id)}
                  className="flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors mt-1"
                >
                  <BookOpen className="h-3 w-3" /> Review related lesson
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FlashcardFlow;
