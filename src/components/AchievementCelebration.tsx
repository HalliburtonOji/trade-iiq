import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface Props {
  show: boolean;
  title: string;
  subtitle?: string;
  onDone: () => void;
}

const AchievementCelebration = ({ show, title, subtitle, onDone }: Props) => {
  useEffect(() => {
    if (!show) return;
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#6366f1", "#8b5cf6", "#22c55e", "#eab308"] });
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-center pointer-events-auto">
            <p className="text-5xl mb-2">🏆</p>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementCelebration;
