import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import GlassCard from "@/components/GlassCard";

interface Trade {
  id: string;
  decision: string;
  outcome: string;
  confidence: number | null;
  asset_type: string;
  date: string;
  pnl_percent: number | null;
  symbol?: string;
  notes?: string;
  thesis_why?: string;
}

interface TradeDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trades: Trade[];
  title: string;
}

const TradeDetailSheet = ({ open, onOpenChange, trades, title }: TradeDetailSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="max-h-[70vh] bg-background border-border">
      <SheetHeader>
        <SheetTitle className="text-sm">{title} — {trades.length} trades</SheetTitle>
      </SheetHeader>
      <div className="flex flex-col gap-2 mt-3 overflow-y-auto max-h-[50vh] pr-1">
        {trades.map((t) => (
          <GlassCard key={t.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono">{t.symbol || "—"}</span>
                <span className={`text-[10px] font-bold ${t.decision === "BUY" ? "text-verdict-buy" : t.decision === "WAIT" ? "text-verdict-wait" : "text-verdict-avoid"}`}>{t.decision}</span>
              </div>
              <div className="flex items-center gap-2">
                {t.pnl_percent != null && (
                  <span className={`text-[10px] font-mono font-bold ${t.pnl_percent >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                    {t.pnl_percent > 0 ? "+" : ""}{t.pnl_percent}%
                  </span>
                )}
                <span className={`text-[10px] font-bold ${t.outcome === "WIN" ? "text-verdict-buy" : t.outcome === "LOSS" ? "text-verdict-avoid" : "text-muted-foreground"}`}>{t.outcome}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              <span>{new Date(t.date).toLocaleDateString()}</span>
              <span className="capitalize">{t.asset_type}</span>
              {t.confidence && <span>⚡{t.confidence}</span>}
            </div>
            {t.thesis_why && <p className="text-[10px] text-muted-foreground/70 mt-1 italic line-clamp-2">{t.thesis_why}</p>}
          </GlassCard>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);

export default TradeDetailSheet;
