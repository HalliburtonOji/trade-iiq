import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { lessonsData, difficultyColors } from "@/data/lessonsData";

const categories = ["All", "Beginner", "Technical", "Risk", "Psychology", "Strategy"];

interface Props {
  completedLessons: string[];
  onSelectLesson: (lessonId: string) => void;
}

const LessonsTab = ({ completedLessons, onSelectLesson }: Props) => {
  const [filter, setFilter] = useState("All");

  const filtered = lessonsData.filter(l => filter === "All" || l.category === filter);

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* Category filter chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              filter === c
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "glass-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Lessons list */}
      {filtered.map((lesson, i) => {
        const completed = completedLessons.includes(lesson.id);
        return (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <GlassCard
              hoverable
              onClick={() => onSelectLesson(lesson.id)}
              className={completed ? "opacity-50" : ""}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{lesson.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{lesson.title}</span>
                    {completed && <CheckCircle2 className="h-4 w-4 text-verdict-buy shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{lesson.summary}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/15">
                      {lesson.category}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${difficultyColors[lesson.difficulty]}`}>
                      {lesson.difficulty}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{lesson.duration_minutes} min</span>
                    <span className="text-[10px] text-muted-foreground font-mono">+{lesson.xp_reward} XP</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
};

export default LessonsTab;
