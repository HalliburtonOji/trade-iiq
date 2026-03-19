import { motion } from "framer-motion";
import { Dumbbell, BarChart3, Shield, Zap } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { lessonsData, microLessons } from "@/data/lessonsData";
import { useMemo } from "react";

interface Props {
  completedLessons: string[];
}

const practiceCards = [
  {
    title: "Scenario Drills",
    description: "Real market scenarios to test your decision-making under pressure. Practice reading setups and choosing entries.",
    icon: Dumbbell,
    color: "text-primary",
    bg: "bg-primary/15",
  },
  {
    title: "Chart Reading Drills",
    description: "Identify patterns, support/resistance, and trend structure on real chart snapshots.",
    icon: BarChart3,
    color: "text-accent",
    bg: "bg-accent/15",
  },
  {
    title: "Risk Drills",
    description: "Calculate position sizes, risk-reward ratios, and stop loss placement in timed exercises.",
    icon: Shield,
    color: "text-verdict-buy",
    bg: "bg-verdict-buy/15",
  },
];

const PracticeTab = ({ completedLessons }: Props) => {
  // Quick concept check based on completed lessons
  const conceptCheck = useMemo(() => {
    if (completedLessons.length === 0) return null;
    const lastCompleted = completedLessons[completedLessons.length - 1];
    const lesson = lessonsData.find(l => l.id === lastCompleted);
    if (!lesson || lesson.quiz.length === 0) return null;
    const q = lesson.quiz[Math.floor(Math.random() * lesson.quiz.length)];
    return { lessonTitle: lesson.title, question: q.question };
  }, [completedLessons]);

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* Intro card */}
      <GlassCard className="border-primary/15 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/15">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Practice Mode</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sharpen your skills with hands-on drills and scenario-based challenges. Full practice system launching soon.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Quick concept check */}
      {conceptCheck && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-accent/15">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-accent mb-1">Quick Concept Check</p>
                <p className="text-[11px] text-muted-foreground mb-1">From: {conceptCheck.lessonTitle}</p>
                <p className="text-sm text-foreground/85">{conceptCheck.question}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Practice categories */}
      {practiceCards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.06 }}
        >
          <GlassCard className="relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{card.title}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                    Coming next
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{card.description}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default PracticeTab;
