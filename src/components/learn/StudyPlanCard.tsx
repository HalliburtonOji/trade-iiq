import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, BookOpen, Dumbbell, RotateCcw, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { type StudyPlanDay } from "@/hooks/use-coaching-engine";

interface Props {
  plan: StudyPlanDay[];
  onSelectLesson?: (id: string) => void;
  onSelectDrill?: (id: string) => void;
}

const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

const StudyPlanCard = ({ plan, onSelectLesson, onSelectDrill }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const today = plan.find(d => d.day === dayOfWeek) || plan[0];
  const totalMinutes = plan.reduce((s, d) => s + d.estimatedMinutes, 0);

  return (
    <div className="flex flex-col gap-2">
      {/* Today's focus */}
      <GlassCard
        hoverable
        onClick={() => {
          if (today.lessonId && onSelectLesson) onSelectLesson(today.lessonId);
          else if (today.drillId && onSelectDrill) onSelectDrill(today.drillId);
        }}
        className="border-primary/20 bg-gradient-to-br from-primary/8 to-accent/5"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/15">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary mb-0.5">Today's Focus</p>
            <p className="text-sm font-bold">{today.focus}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">~{today.estimatedMinutes} min</p>
            <div className="flex items-center gap-1 mt-2 text-primary text-xs font-medium">
              Start Now <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Expand full plan */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
      >
        <span className="font-semibold">Weekly Plan · ~{totalMinutes} min</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-1.5 overflow-hidden"
          >
            {plan.map((day, i) => {
              const isToday = day.day === dayOfWeek;
              return (
                <motion.div key={day.day} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <GlassCard
                    hoverable={!!(day.lessonId || day.drillId)}
                    onClick={() => {
                      if (day.lessonId && onSelectLesson) onSelectLesson(day.lessonId);
                      else if (day.drillId && onSelectDrill) onSelectDrill(day.drillId);
                    }}
                    className={isToday ? "border-primary/25 bg-primary/5" : "opacity-70"}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded-lg bg-muted/20">
                        {day.lessonId ? <BookOpen className="h-3.5 w-3.5 text-primary" /> :
                         day.drillId ? <Dumbbell className="h-3.5 w-3.5 text-accent" /> :
                         <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-bold">{day.day}</p>
                          {isToday && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">TODAY</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{day.focus}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">{day.estimatedMinutes}m</span>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudyPlanCard;
