import { Flame, AlertCircle, CheckCircle2 } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";

interface Props {
  pendingCount: number;
  reviewCount: number;
}

const AccountabilityWidget = ({ pendingCount, reviewCount }: Props) => {
  return (
    <GlassCard className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Flame className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Accountability</p>
          <p className="text-xs text-muted-foreground">{reviewCount} reviews completed</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {pendingCount > 0 ? (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <AlertCircle className="h-3 w-3" /> {pendingCount} pending
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 text-[10px] text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> All reviewed
          </Badge>
        )}
      </div>
    </GlassCard>
  );
};

export default AccountabilityWidget;
