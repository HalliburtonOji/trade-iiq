import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { lessonsData, badges, type Lesson } from "@/data/lessonsData";

const levels = [
  { name: "Novice", min: 0 },
  { name: "Learner", min: 100 },
  { name: "Trader", min: 300 },
  { name: "Pro Trader", min: 600 },
];

const getLevel = (xp: number) => {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].min) return { ...levels[i], next: levels[i + 1]?.min || levels[i].min + 300 };
  }
  return { ...levels[0], next: 100 };
};

const categories = ["All", "Beginner", "Technical", "Forex", "Strategy", "Analysis"];

const Learn = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [weakAssets, setWeakAssets] = useState<string[]>([]);

  const fetchProgress = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("learning_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", true);
    if (data) {
      setCompletedLessons(data.map((d: any) => d.lesson_id));
      setTotalXp(data.reduce((s: number, d: any) => s + (d.xp_earned || 0), 0));
    }
  };

  useEffect(() => { fetchProgress(); }, [user]);

  // Fetch user mistakes for adaptive recommendations
  useEffect(() => {
    if (!user) return;
    const fetchMistakes = async () => {
      const [reviewsRes, tradesRes] = await Promise.all([
        supabase.from("decision_reviews").select("mistake_type").eq("user_id", user.id),
        supabase.from("trade_decisions").select("asset_type,outcome").eq("user_id", user.id),
      ]);
      if (reviewsRes.data) {
        const m = reviewsRes.data.map(r => r.mistake_type).filter(Boolean) as string[];
        setMistakes(m);
      }
      if (tradesRes.data) {
        const byAsset: Record<string, { w: number; t: number }> = {};
        tradesRes.data.filter(t => t.outcome === "WIN" || t.outcome === "LOSS").forEach(t => {
          if (!byAsset[t.asset_type]) byAsset[t.asset_type] = { w: 0, t: 0 };
          byAsset[t.asset_type].t++;
          if (t.outcome === "WIN") byAsset[t.asset_type].w++;
        });
        const weak = Object.entries(byAsset).filter(([, v]) => v.t >= 2 && v.w / v.t < 0.4).map(([k]) => k);
        setWeakAssets(weak);
      }
    };
    fetchMistakes();
  }, [user]);

  const level = getLevel(totalXp);
  const progress = ((totalXp - level.min) / (level.next - level.min)) * 100;

  const filteredLessons = lessonsData.filter(
    (l) => categoryFilter === "All" || l.category === categoryFilter
  );

  // Adaptive recommendations based on mistakes and weak areas
  const recommendedLessons = useMemo(() => {
    const mistakeToCategory: Record<string, string[]> = {
      fomo: ["Strategy", "Analysis"],
      entered_early: ["Technical", "Strategy"],
      oversizing: ["Strategy", "Beginner"],
      no_stop: ["Strategy", "Technical"],
      revenge_trade: ["Strategy"],
      ignored_macro: ["Analysis", "Forex"],
    };
    const assetToCategory: Record<string, string[]> = {
      forex: ["Forex"],
      crypto: ["Technical", "Analysis"],
      stock: ["Beginner", "Analysis"],
    };

    const priorityCategories = new Set<string>();
    mistakes.forEach(m => {
      (mistakeToCategory[m] || []).forEach(c => priorityCategories.add(c));
    });
    weakAssets.forEach(a => {
      (assetToCategory[a] || []).forEach(c => priorityCategories.add(c));
    });

    if (priorityCategories.size === 0) return [];

    return lessonsData
      .filter(l => priorityCategories.has(l.category) && !completedLessons.includes(l.id))
      .slice(0, 6);
  }, [mistakes, weakAssets, completedLessons]);

  const handleQuizAnswer = async (idx: number, lesson: Lesson) => {
    setQuizAnswer(idx);
    setShowResult(true);
    if (idx === lesson.quiz.correctAnswer && !completedLessons.includes(lesson.id) && user) {
      const { error } = await supabase.from("learning_progress").upsert({
        user_id: user.id,
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        category: lesson.category,
        completed: true,
        xp_earned: lesson.xp,
        completed_date: new Date().toISOString(),
      }, { onConflict: "user_id,lesson_id" });

      if (!error) {
        setCompletedLessons((prev) => [...prev, lesson.id]);
        setTotalXp((prev) => prev + lesson.xp);
        setStreak((prev) => prev + 1);
        toast({ title: `🎉 +${lesson.xp} XP`, description: `Lesson "${lesson.title}" completed!` });
      }
    }
  };

  const earnedBadges = badges.map((b) => ({
    ...b,
    earned: b.condition(completedLessons, lessonsData),
  }));

  if (selectedLesson) {
    return (
      <PageShell>
        <div className="flex flex-col gap-4 px-4 pt-6">
          <button onClick={() => { setSelectedLesson(null); setQuizAnswer(null); setShowResult(false); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Lessons
          </button>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-xl font-bold">{selectedLesson.title}</h1>
            <span className="text-xs text-primary font-medium">{selectedLesson.category} · {selectedLesson.duration} · {selectedLesson.xp} XP</span>
          </motion.div>
          <GlassCard>
            {selectedLesson.content.map((p, i) => (
              <p key={i} className="text-sm text-foreground/80 leading-relaxed mb-3 last:mb-0">{p}</p>
            ))}
          </GlassCard>
          <GlassCard>
            <h3 className="text-sm font-semibold mb-2">Key Takeaways</h3>
            <ul className="space-y-1.5">
              {selectedLesson.takeaways.map((t, i) => (
                <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span> {t}
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <h3 className="text-sm font-semibold mb-3">Quiz</h3>
            <p className="text-sm text-foreground/80 mb-3">{selectedLesson.quiz.question}</p>
            <div className="flex flex-col gap-2">
              {selectedLesson.quiz.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => !showResult && handleQuizAnswer(i, selectedLesson)}
                  disabled={showResult}
                  className={`w-full rounded-lg p-3 text-left text-xs font-medium transition-all ${
                    showResult && i === selectedLesson.quiz.correctAnswer
                      ? "bg-verdict-buy/20 text-verdict-buy border border-verdict-buy/30"
                      : showResult && i === quizAnswer && i !== selectedLesson.quiz.correctAnswer
                      ? "bg-verdict-avoid/20 text-verdict-avoid border border-verdict-avoid/30"
                      : "glass-card hover:bg-secondary/50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {showResult && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 text-center">
                {quizAnswer === selectedLesson.quiz.correctAnswer ? (
                  <div>
                    <span className="text-3xl">🎉</span>
                    <p className="text-sm font-semibold text-verdict-buy mt-1">Correct! +{selectedLesson.xp} XP</p>
                  </div>
                ) : (
                  <p className="text-sm text-verdict-avoid">Not quite — review the lesson and try again!</p>
                )}
              </motion.div>
            )}
          </GlassCard>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Learn</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="font-bold text-sm text-orange-400">{streak}</span>
          </div>
        </div>

        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{level.name}</span>
            <span className="text-muted-foreground font-mono">{totalXp} XP</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-[10px] text-muted-foreground">{level.next - totalXp} XP to next level</p>
        </GlassCard>

        <Tabs defaultValue={recommendedLessons.length > 0 ? "foryou" : "lessons"}>
          <TabsList className="w-full bg-secondary/50">
            {recommendedLessons.length > 0 && (
              <TabsTrigger value="foryou" className="flex-1 text-xs">✨ For You</TabsTrigger>
            )}
            <TabsTrigger value="lessons" className="flex-1 text-xs">Lessons</TabsTrigger>
            <TabsTrigger value="badges" className="flex-1 text-xs">Badges</TabsTrigger>
          </TabsList>

          {/* ADAPTIVE FOR YOU TAB */}
          {recommendedLessons.length > 0 && (
            <TabsContent value="foryou" className="mt-3 flex flex-col gap-3">
              <GlassCard className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Recommended based on your trading</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  These lessons address your most common mistakes and weak areas
                </p>
              </GlassCard>
              {recommendedLessons.map((lesson) => (
                <GlassCard key={lesson.id} hoverable onClick={() => setSelectedLesson(lesson)}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{lesson.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{lesson.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{lesson.category}</span>
                        <span className="text-[10px] text-muted-foreground">{lesson.duration}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">+{lesson.xp} XP</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </TabsContent>
          )}

          <TabsContent value="lessons" className="mt-3 flex flex-col gap-3">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {categories.map((c) => (
                <button key={c} onClick={() => setCategoryFilter(c)} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${categoryFilter === c ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"}`}>{c}</button>
              ))}
            </div>
            {filteredLessons.map((lesson) => {
              const completed = completedLessons.includes(lesson.id);
              return (
                <GlassCard key={lesson.id} hoverable onClick={() => !completed && setSelectedLesson(lesson)} className={completed ? "opacity-40" : ""}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{lesson.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{lesson.title}</span>
                        {completed && <CheckCircle2 className="h-3.5 w-3.5 text-verdict-buy shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{lesson.category}</span>
                        <span className="text-[10px] text-muted-foreground">{lesson.duration}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">+{lesson.xp} XP</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </TabsContent>

          <TabsContent value="badges" className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {earnedBadges.map((b) => (
                <GlassCard key={b.id} className={`flex flex-col items-center text-center py-4 transition-all ${!b.earned ? "opacity-20 grayscale" : "border-primary/20"}`}>
                  <span className="text-3xl mb-2">{b.icon}</span>
                  <span className="text-xs font-semibold">{b.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{b.description}</span>
                </GlassCard>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
};

export default Learn;
