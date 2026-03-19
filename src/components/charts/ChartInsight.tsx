import { Lightbulb } from "lucide-react";

interface ChartInsightProps {
  text: string;
}

const ChartInsight = ({ text }: ChartInsightProps) => {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 mb-2">
      <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
      <p className="text-[11px] text-foreground/80 leading-relaxed">{text}</p>
    </div>
  );
};

export default ChartInsight;
