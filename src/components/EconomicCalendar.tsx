import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, AlertTriangle, TrendingUp, Landmark, Briefcase } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { getUpcomingEvents, getImpactColor, getImpactBg, type EconomicEvent } from "@/data/economicCalendarData";

const categoryIcons: Record<string, React.ReactNode> = {
  central_bank: <Landmark className="h-3.5 w-3.5" />,
  employment: <Briefcase className="h-3.5 w-3.5" />,
  inflation: <TrendingUp className="h-3.5 w-3.5" />,
  gdp: <TrendingUp className="h-3.5 w-3.5" />,
  earnings: <Briefcase className="h-3.5 w-3.5" />,
  other: <Calendar className="h-3.5 w-3.5" />,
};

const EconomicCalendar = () => {
  const events = useMemo(() => getUpcomingEvents(8), []);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <GlassCard className="py-4 text-center">
        <Calendar className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No upcoming events</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Economic Calendar</h3>
      </div>
      <div className="divide-y divide-border/20">
        {events.map((event) => {
          const dateObj = new Date(event.date + "T00:00:00");
          const dayLabel = dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
          const isExpanded = expanded === event.id;

          return (
            <motion.div
              key={event.id}
              className="px-4 py-2.5 hover:bg-secondary/30 cursor-pointer transition-colors"
              onClick={() => setExpanded(isExpanded ? null : event.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${getImpactBg(event.impact)}`}>
                  {categoryIcons[event.category] || <Calendar className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold truncate">{event.event}</p>
                    {event.impact === "high" && <AlertTriangle className="h-3 w-3 text-verdict-avoid shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{event.time}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground font-medium">{event.currency}</span>
                  </div>
                </div>
                <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </div>
              {isExpanded && (event.previous || event.forecast) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 ml-10 flex gap-4">
                  {event.previous && (
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase">Previous</span>
                      <p className="text-xs font-bold font-mono">{event.previous}</p>
                    </div>
                  )}
                  {event.forecast && (
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase">Forecast</span>
                      <p className="text-xs font-bold font-mono text-primary">{event.forecast}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default EconomicCalendar;
