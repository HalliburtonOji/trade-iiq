import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  activityData: { date: string; xp: number }[];
}

const StreakCalendar = ({ activityData }: Props) => {
  const grid = useMemo(() => {
    const today = new Date();
    const days: { date: string; xp: number; level: number }[] = [];
    const xpMap = new Map(activityData.map(d => [d.date, d.xp]));

    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const xp = xpMap.get(dateStr) || 0;
      const level = xp === 0 ? 0 : xp < 20 ? 1 : xp < 50 ? 2 : xp < 100 ? 3 : 4;
      days.push({ date: dateStr, xp, level });
    }
    return days;
  }, [activityData]);

  const colors = [
    "bg-secondary/30",
    "bg-verdict-buy/20",
    "bg-verdict-buy/40",
    "bg-verdict-buy/60",
    "bg-verdict-buy/80",
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-[3px]">
        {grid.map((d) => (
          <div key={d.date} title={`${d.date}: ${d.xp} XP`}
            className={cn("h-3 w-3 rounded-sm transition-colors", colors[d.level])} />
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2">
        <span className="text-[9px] text-muted-foreground">Less</span>
        {colors.map((c, i) => <div key={i} className={cn("h-2.5 w-2.5 rounded-sm", c)} />)}
        <span className="text-[9px] text-muted-foreground">More</span>
      </div>
    </div>
  );
};

export default StreakCalendar;
