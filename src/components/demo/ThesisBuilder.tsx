import { Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface ThesisData {
  reason: string;
  confidence: number;
  invalidation: string;
}

interface Props {
  thesis: ThesisData;
  onChange: (thesis: ThesisData) => void;
  direction: "long" | "short";
}

const REASONS = [
  { value: "breakout", label: "Breakout" },
  { value: "reversal", label: "Reversal" },
  { value: "momentum", label: "Momentum" },
  { value: "news", label: "News Catalyst" },
  { value: "support", label: "Support Bounce" },
  { value: "resistance", label: "Resistance Rejection" },
  { value: "trend", label: "Trend Following" },
  { value: "mean-reversion", label: "Mean Reversion" },
];

const ThesisBuilder = ({ thesis, onChange, direction }: Props) => {
  return (
    <div className="space-y-2 p-3 rounded-xl bg-secondary/30 border border-border/20">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Trade Thesis</p>

      <div>
        <label className="text-[10px] text-muted-foreground mb-1 block">Why this trade?</label>
        <Select value={thesis.reason} onValueChange={(v) => onChange({ ...thesis, reason: v })}>
          <SelectTrigger className="h-8 text-xs bg-background/50">
            <SelectValue placeholder="Select reason..." />
          </SelectTrigger>
          <SelectContent>
            {REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground mb-1 block">Confidence</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onChange({ ...thesis, confidence: n })}
              className="transition-colors"
            >
              <Star
                className={`h-4 w-4 ${n <= thesis.confidence ? "text-verdict-wait fill-verdict-wait" : "text-muted-foreground/30"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground mb-1 block">
          I'm wrong if price goes {direction === "long" ? "below" : "above"}:
        </label>
        <Input
          type="number"
          value={thesis.invalidation}
          onChange={(e) => onChange({ ...thesis, invalidation: e.target.value })}
          placeholder="$"
          className="h-8 text-xs bg-background/50"
        />
      </div>
    </div>
  );
};

export default ThesisBuilder;
