import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type TimeRange = "7D" | "30D" | "90D" | "YTD" | "ALL";

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const ranges: TimeRange[] = ["7D", "30D", "90D", "YTD", "ALL"];

const TimeRangeFilter = ({ value, onChange }: TimeRangeFilterProps) => (
  <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as TimeRange)} className="gap-0.5">
    {ranges.map((r) => (
      <ToggleGroupItem key={r} value={r} className="text-[10px] h-6 px-2 data-[state=on]:bg-primary/20 data-[state=on]:text-primary">
        {r}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);

export default TimeRangeFilter;
export { TimeRangeFilter };
