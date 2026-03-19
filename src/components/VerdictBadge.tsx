import { cn } from "@/lib/utils";

type Verdict = "BUY" | "WAIT" | "AVOID";

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const config: Record<Verdict, { bg: string; text: string; glow: string }> = {
  BUY: {
    bg: "bg-verdict-buy/15",
    text: "text-verdict-buy",
    glow: "shadow-[0_0_12px_hsl(var(--verdict-buy)/0.3)]",
  },
  WAIT: {
    bg: "bg-verdict-wait/15",
    text: "text-verdict-wait",
    glow: "shadow-[0_0_12px_hsl(var(--verdict-wait)/0.3)]",
  },
  AVOID: {
    bg: "bg-verdict-avoid/15",
    text: "text-verdict-avoid",
    glow: "shadow-[0_0_12px_hsl(var(--verdict-avoid)/0.3)]",
  },
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
  lg: "px-4 py-1.5 text-sm",
};

const VerdictBadge = ({ verdict, size = "md", className }: VerdictBadgeProps) => {
  const c = config[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold tracking-wide",
        c.bg, c.text, c.glow,
        sizes[size],
        className
      )}
    >
      {verdict}
    </span>
  );
};

export default VerdictBadge;
