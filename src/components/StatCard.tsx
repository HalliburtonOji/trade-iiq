import GlassCard from "./GlassCard";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

const StatCard = ({ label, value, icon, trend, className }: StatCardProps) => (
  <GlassCard className={cn("flex flex-col gap-1", className)}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {icon && <span className="text-muted-foreground">{icon}</span>}
    </div>
    <span
      className={cn(
        "text-xl font-bold font-mono tracking-tight",
        trend === "up" && "text-verdict-buy",
        trend === "down" && "text-verdict-avoid",
        !trend && "text-foreground"
      )}
    >
      {value}
    </span>
  </GlassCard>
);

export default StatCard;
