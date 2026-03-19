import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Sparkles, TrendingUp, Trophy, Zap, Target } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { lessonsData, microLessons } from "@/data/lessonsData";
import { getLevel, getWeakCategories, type QuizAttemptRecord } from "@/hooks/use-learning-progress";

interface Props {
  completedLessons: string[];
  totalXp: number;
  streak: number;
  quizAttempts: QuizAttemptRecord[];
  onSelectLesson: (lessonId: string) => void;
}

const ForYouTab = ({ completedLessons, totalXp, streak, quizAttempts, onSelectLesson }: Props) => {
  const level = getLevel(totalXp);

  // Daily micro lesson (rotate by day)
  const dailyMicro = useMemo(() => {
    const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return microLessons[day % microLessons.length];
  }, []);

  // Unfinished / first incomplete lesson
  const nextLesson = useMemo(() => {
    return lessonsData.find(l => !completedLessons.includes(l.id));
  }, [completedLessons]);

  // Weak categories
  const weakCats = useMemo(() => getWeakCategories(quizAttempts), [quizAttempts]);
  const weakLesson = useMemo(() => {
    if (weakCats.length === 0) return null;
    return lessonsData.find(l => weakCats.includes(l.category) && !completedLessons.includes(l.id));
  }, [weakCats, completedLessons]);

  // Progress milestone
  const milestone = useMemo(() => {
    const nextLvl = getLevel(totalXp);
    if (totalXp >= 500) return null;
    const xpNeeded = nextLvl.next - totalXp;
    return `Earn ${xpNeeded} more XP to reach ${getLevel(nextLvl.next).name}`;
  }, [totalXp]);

  const cards: React.ReactNode[] = [];

  // Continue learning / recommended starter
  if (completedLessons.length === 0 && nextLesson) {
    cards.push(
      <GlassCard key="starter" hoverable onClick={() => onSelectLesson(nextLesson.id)}
        className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/15"><Sparkles className="h-5 w-5 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary mb-0.5">Recommended for you</p>
            <p className="text-sm font-bold truncate">{nextLesson.title}</p>
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{nextLesson.summary}</p>
            <div className="flex items-center gap-1 mt-2 text-primary text-xs font-medium">
              Start Lesson <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </GlassCard>
    );
  } else if (nextLesson) {
    cards.push(
      <GlassCard key="continue" hoverable onClick={() => onSelectLesson(nextLesson.id)}
        className="border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/15"><BookOpen className="h-5 w-5 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary mb-0.5">Continue Learning</p>
            <p className="text-sm font-bold truncate">{nextLesson.title}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{nextLesson.category} · {nextLesson.duration_minutes} min · +{nextLesson.xp_reward} XP</p>
            <div className="flex items-center gap-1 mt-2 text-primary text-xs font-medium">
              Continue <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Daily micro lesson
  cards.push(
    <GlassCard key="micro" className="border-accent/15 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-accent/15"><Zap className="h-5 w-5 text-accent" /></div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-accent mb-1">Daily Concept</p>
          <p className="text-sm text-foreground/85 leading-relaxed">{dailyMicro.text}</p>
          <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{dailyMicro.category}</span>
        </div>
      </div>
    </GlassCard>
  );

  // Weakest category
  if (weakLesson) {
    cards.push(
      <GlassCard key="weak" hoverable onClick={() => onSelectLesson(weakLesson.id)}
        className="border-amber-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15"><Target className="h-5 w-5 text-amber-400" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-400 mb-0.5">Improve Your Weak Area</p>
            <p className="text-sm font-bold truncate">{weakLesson.title}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Your quiz results suggest reviewing {weakCats[0]}</p>
          </div>
        </div>
      </GlassCard>
    );
  } else if (completedLessons.length === 0) {
    cards.push(
      <GlassCard key="foundation" className="border-amber-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15"><Target className="h-5 w-5 text-amber-400" /></div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-400 mb-0.5">Build Your Foundation</p>
            <p className="text-sm text-foreground/85">Start with Beginner lessons to understand the basics before moving to technical analysis and strategy.</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Milestone
  if (milestone) {
    cards.push(
      <GlassCard key="milestone" className="border-verdict-buy/15">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-verdict-buy/15"><TrendingUp className="h-5 w-5 text-verdict-buy" /></div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-verdict-buy mb-0.5">Next Milestone</p>
            <p className="text-sm text-foreground/85">{milestone}</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Progress summary
  cards.push(
    <GlassCard key="summary">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/15"><Trophy className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary mb-2">Your Progress</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold">{completedLessons.length}</p>
              <p className="text-[10px] text-muted-foreground">Lessons</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{totalXp}</p>
              <p className="text-[10px] text-muted-foreground">Total XP</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{streak}</p>
              <p className="text-[10px] text-muted-foreground">Streak</p>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );

  return (
    <div className="flex flex-col gap-3 mt-3">
      {cards.map((card, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          {card}
        </motion.div>
      ))}
    </div>
  );
};

export default ForYouTab;
