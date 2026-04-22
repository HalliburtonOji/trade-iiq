import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, BookOpen, ArrowRight } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { lessonsData, type Lesson } from "@/data/lessonsData";
import type { QuizAttemptRecord } from "@/hooks/use-learning-progress";

interface Props {
  quizAttempts: QuizAttemptRecord[];
  completedLessons: string[];
  onSelectLesson: (id: string) => void;
}

interface TagCount {
  tag: string;
  count: number;
  source: "quiz" | "review" | "both";
}

const FRIENDLY_TAG: Record<string, string> = {
  fomo: "FOMO",
  no_stop: "No Stop",
  no_stop_loss: "No Stop",
  oversizing: "Oversizing",
  revenge_trade: "Revenge Trades",
  entered_early: "Early Entries",
  ignored_macro: "Ignored Macro",
  overconfidence: "Overconfidence",
  "emotion-sizing": "Emotional Sizing",
  "math-error": "Sizing Math",
  "over-sizing": "Oversizing",
  "recency-bias": "Recency Bias",
  "hot-hand": "Hot Hand Bias",
  "no-rebalance": "Stale Sizing",
  "one-size-fits-all": "Rigid Risk",
};

const friendly = (tag: string) =>
  FRIENDLY_TAG[tag] || tag.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const AdaptiveWeakTagsSidebar = ({ quizAttempts, completedLessons, onSelectLesson }: Props) => {
  const { user } = useAuth();
  const [reviewMistakes, setReviewMistakes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    supabase
      .from("decision_reviews")
      .select("mistake_type,reviewed_date")
      .eq("user_id", user.id)
      .gte("reviewed_date", cutoff.toISOString())
      .then(({ data }) => {
        if (data) {
          setReviewMistakes(
            data
              .map((r) => r.mistake_type)
              .filter((m): m is string => Boolean(m) && m !== "none")
          );
        }
        setLoading(false);
      });
  }, [user]);

  const topTags = useMemo<TagCount[]>(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const counts = new Map<string, { count: number; sources: Set<string> }>();

    quizAttempts.forEach((a) => {
      if (new Date(a.completed_at) < cutoff) return;
      (a.weak_tags || []).forEach((t) => {
        const entry = counts.get(t) || { count: 0, sources: new Set() };
        entry.count += 1;
        entry.sources.add("quiz");
        counts.set(t, entry);
      });
    });
    reviewMistakes.forEach((m) => {
      const entry = counts.get(m) || { count: 0, sources: new Set() };
      entry.count += 1;
      entry.sources.add("review");
      counts.set(m, entry);
    });

    return Array.from(counts.entries())
      .map(([tag, v]) => ({
        tag,
        count: v.count,
        source: (v.sources.size > 1 ? "both" : Array.from(v.sources)[0]) as TagCount["source"],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [quizAttempts, reviewMistakes]);

  const recommended = useMemo<Lesson[]>(() => {
    if (topTags.length === 0) return [];
    const tagSet = new Set(topTags.map((t) => t.tag.toLowerCase()));
    const scored = lessonsData
      .filter((l) => !completedLessons.includes(l.id))
      .map((lesson) => {
        let score = 0;
        lesson.quiz.forEach((q) =>
          q.tags.forEach((t) => {
            if (tagSet.has(t.toLowerCase())) score += 1;
          })
        );
        // Boost the position-sizing lesson when no_stop / sizing tags appear
        if (
          (tagSet.has("no_stop") || tagSet.has("no_stop_loss") || tagSet.has("oversizing")) &&
          lesson.id === "position-sizing-edge"
        ) {
          score += 5;
        }
        return { lesson, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.lesson);
    return scored;
  }, [topTags, completedLessons]);

  if (loading) {
    return (
      <GlassCard className="h-fit">
        <div className="h-32 animate-pulse rounded-lg bg-secondary/30" />
      </GlassCard>
    );
  }

  if (topTags.length === 0) {
    return (
      <GlassCard className="h-fit border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Tailored to You</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Log your first decision or take a quiz to see lessons matched to your weak spots.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-fit">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-verdict-wait" />
        <p className="text-sm font-bold">Your Weak Tags</p>
        <span className="text-[10px] text-muted-foreground ml-auto">last 14 days</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {topTags.map((t, i) => (
          <motion.span
            key={t.tag}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-verdict-avoid/10 text-verdict-avoid border border-verdict-avoid/20"
          >
            {friendly(t.tag)}
            <span className="text-[9px] opacity-70">×{t.count}</span>
          </motion.span>
        ))}
      </div>

      {recommended.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Recommended for you
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {recommended.map((l, i) => (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => onSelectLesson(l.id)}
                className="text-left rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/40 transition-all p-2.5 group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{l.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{l.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {l.category} · {l.duration_minutes} min
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
};

export default AdaptiveWeakTagsSidebar;
