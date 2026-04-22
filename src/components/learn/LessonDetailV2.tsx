import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Lightbulb, BookOpen, CheckCircle2, ArrowRight, Dumbbell, Sparkles, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import GlassCard from "@/components/GlassCard";
import QuizFlow from "./QuizFlow";
import LessonIllustration from "./LessonIllustration";
import LessonPdfExport from "./LessonPdfExport";
import InteractiveCalculator from "./InteractiveCalculator";
import { type Lesson, lessonsData, difficultyColors } from "@/data/lessonsData";
import { drillsData, practiceTypeLabels } from "@/data/drillsData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetchActiveRecommendations, dismissRecommendation } from "@/hooks/use-learn-nudges";

interface Props {
  lesson: Lesson;
  completed: boolean;
  onBack: () => void;
  onLessonComplete: () => void;
  onSelectLesson: (id: string) => void;
  onSelectDrill?: (drillId: string) => void;
}

const LessonDetailV2 = ({ lesson, completed, onBack, onLessonComplete, onSelectLesson, onSelectDrill }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [reflection, setReflection] = useState("");
  const [recommendedRowId, setRecommendedRowId] = useState<string | null>(null);
  const [recommendedReason, setRecommendedReason] = useState<string | null>(null);

  const relatedDrills = useMemo(
    () => drillsData.filter((d) => d.related_lesson_ids.includes(lesson.id)),
    [lesson.id]
  );
  const relatedLessons = lessonsData.filter((l) => lesson.related_lessons.includes(l.id));
  const nextDrill = relatedDrills[0];

  // Check if this lesson is in the user's active recommendation pool
  useEffect(() => {
    if (!user) return;
    fetchActiveRecommendations(user.id).then((rows) => {
      const match = rows.find((r) => r.lesson_id === lesson.id);
      if (match) {
        setRecommendedRowId(match.id);
        setRecommendedReason(match.reason);
      }
    });
  }, [user, lesson.id]);

  const handleQuizComplete = async (score: number, total: number, passed: boolean, weakTags: string[]) => {
    if (!user) return;

    await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      lesson_id: lesson.id,
      score,
      total_questions: total,
      passed,
      weak_tags: weakTags,
    });

    if (passed && !completed) {
      await supabase.from("learning_progress").upsert(
        {
          user_id: user.id,
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          category: lesson.category,
          completed: true,
          xp_earned: lesson.xp_reward,
          completed_date: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );

      // Auto-dismiss the recommendation if it was pinned
      if (recommendedRowId) {
        await dismissRecommendation(recommendedRowId);
        setRecommendedRowId(null);
      }

      toast({ title: `🎉 +${lesson.xp_reward} XP`, description: `"${lesson.title}" completed!` });
      setQuizCompleted(true);
      onLessonComplete();
    }
  };

  if (showQuiz) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-24 max-w-2xl mx-auto w-full">
        <button
          onClick={() => setShowQuiz(false)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Lesson
        </button>
        <h2 className="text-lg font-bold">Quiz: {lesson.title}</h2>
        <QuizFlow
          questions={lesson.quiz}
          lessonTitle={lesson.title}
          xpReward={lesson.xp_reward}
          onComplete={handleQuizComplete}
          onRetry={() => setShowQuiz(true)}
          onBack={() => {
            setShowQuiz(false);
            if (quizCompleted) onBack();
          }}
        />

        {quizCompleted && nextDrill && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Great! Apply it now</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Lock in what you learned with: <span className="text-foreground font-medium">{nextDrill.title}</span>
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs" onClick={() => onSelectDrill?.(nextDrill.id)}>
                  Apply Now <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={onBack}>
                  Continue Learning
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24 max-w-2xl mx-auto w-full">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Recommendation ribbon */}
      {recommendedRowId && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-lg border border-verdict-avoid/30 bg-verdict-avoid/10 px-3 py-2 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-verdict-avoid shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-verdict-avoid">Strengthen this</p>
              <p className="text-[11px] text-foreground/80">
                Recommended based on a recent post-mortem{recommendedReason ? ` (${recommendedReason.replace(/_/g, " ")})` : ""}.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Title */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          {completed && <CheckCircle2 className="h-5 w-5 text-verdict-buy" />}
          <h1 className="text-xl font-bold">{lesson.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/15">
            {lesson.category}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${difficultyColors[lesson.difficulty]}`}>
            {lesson.difficulty}
          </span>
          <span className="text-[10px] text-muted-foreground">{lesson.duration_minutes} min</span>
          <span className="text-[10px] text-primary font-mono font-semibold">+{lesson.xp_reward} XP</span>
          <LessonPdfExport lesson={lesson} />
        </div>
      </motion.div>

      {/* Content sections */}
      {lesson.content.map((section, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
          <GlassCard>
            <h3 className="text-sm font-bold mb-2 capitalize">{section.heading}</h3>
            {section.body.map((p, j) => (
              <p key={j} className="text-[13px] text-foreground/80 leading-relaxed mb-2.5 last:mb-0">
                {p}
              </p>
            ))}
          </GlassCard>
          {lesson.illustrations
            ?.filter((ill) => (ill.afterSection ?? 0) === i)
            .map((ill, idx) => (
              <LessonIllustration key={`ill-${i}-${idx}`} type={ill.type} caption={ill.caption} />
            ))}
        </motion.div>
      ))}

      {/* Interactive element slot */}
      {lesson.interactive_element?.type === "calculator" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <InteractiveCalculator />
        </motion.div>
      )}

      {/* Why it matters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassCard className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start gap-2.5">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-primary mb-1">Why this matters</p>
              <p className="text-[13px] text-foreground/80 leading-relaxed">{lesson.why_it_matters}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Practical example */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <GlassCard className="border-accent/15">
          <div className="flex items-start gap-2.5">
            <BookOpen className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-accent mb-1">Practical example</p>
              <p className="text-[13px] text-foreground/80 leading-relaxed">{lesson.practical_example}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Common mistake */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <GlassCard className="border-verdict-avoid/20 bg-gradient-to-br from-verdict-avoid/5 to-transparent">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-verdict-avoid shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-verdict-avoid mb-1">Common mistake</p>
              <p className="text-[13px] text-foreground/80 leading-relaxed">{lesson.common_mistake}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Key takeaways */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <GlassCard>
          <h3 className="text-sm font-bold mb-2">Key Takeaways</h3>
          <ul className="space-y-2">
            {lesson.takeaways.map((t, i) => (
              <li key={i} className="text-[13px] text-foreground/80 flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">•</span> {t}
              </li>
            ))}
          </ul>
        </GlassCard>
      </motion.div>

      {/* Reflection prompt */}
      {lesson.reflection_prompt && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
          <GlassCard>
            <p className="text-xs font-bold mb-1">Reflect</p>
            <p className="text-[12px] text-muted-foreground mb-2">{lesson.reflection_prompt}</p>
            <Textarea
              placeholder="Write 1–2 sentences..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="bg-secondary/40 min-h-[60px] text-xs"
            />
          </GlassCard>
        </motion.div>
      )}

      {/* Quiz CTA */}
      {!completed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Button className="w-full gap-2 h-12 text-sm font-semibold" onClick={() => setShowQuiz(true)}>
            Take Quiz <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
      {completed && (
        <GlassCard className="border-verdict-buy/20 text-center py-4">
          <CheckCircle2 className="h-6 w-6 text-verdict-buy mx-auto mb-1" />
          <p className="text-sm font-semibold text-verdict-buy">Lesson Completed</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">+{lesson.xp_reward} XP earned</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowQuiz(true)}>
            Retake Quiz
          </Button>
        </GlassCard>
      )}

      {/* Practice this concept */}
      {relatedDrills.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" /> Practice This Concept
          </p>
          {relatedDrills.slice(0, 3).map((drill) => (
            <GlassCard key={drill.id} hoverable onClick={() => onSelectDrill?.(drill.id)}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{practiceTypeLabels[drill.practice_type] === "Scenarios" ? "🎯" : "⚡"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{drill.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {practiceTypeLabels[drill.practice_type]} · +{drill.xp_reward} XP
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Related lessons */}
      {relatedLessons.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-xs font-semibold text-muted-foreground">Related Lessons</p>
          {relatedLessons.map((rl) => (
            <GlassCard key={rl.id} hoverable onClick={() => onSelectLesson(rl.id)}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{rl.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{rl.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {rl.category} · {rl.duration_minutes} min
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonDetailV2;
