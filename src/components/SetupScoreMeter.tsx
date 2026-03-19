import { cn } from "@/lib/utils";

interface SetupScoreMeterProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
  className?: string;
}

const getColor = (score: number) => {
  if (score >= 70) return "text-verdict-buy";
  if (score >= 40) return "text-verdict-wait";
  return "text-verdict-avoid";
};

const getStrokeColor = (score: number) => {
  if (score >= 70) return "hsl(var(--verdict-buy))";
  if (score >= 40) return "hsl(var(--verdict-wait))";
  return "hsl(var(--verdict-avoid))";
};

const dims = { sm: 48, md: 64, lg: 80 };
const strokes = { sm: 3, md: 4, lg: 5 };
const fonts = { sm: "text-xs", md: "text-sm", lg: "text-lg" };

const SetupScoreMeter = ({ score, size = "md", className }: SetupScoreMeterProps) => {
  const d = dims[size];
  const stroke = strokes[size];
  const r = (d - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={d} height={d} className="-rotate-90">
        <circle
          cx={d / 2} cy={d / 2} r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={d / 2} cy={d / 2} r={r}
          fill="none"
          stroke={getStrokeColor(score)}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={cn("absolute font-bold font-mono", fonts[size], getColor(score))}>
        {score}
      </span>
    </div>
  );
};

export default SetupScoreMeter;
