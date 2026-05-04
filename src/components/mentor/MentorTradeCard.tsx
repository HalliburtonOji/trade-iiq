import { useEffect, useState } from "react";
import { ChevronDown, Copy, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MentorPlanDiff from "./MentorPlanDiff";

type Props = { trade: any; closed?: boolean };

const MentorTradeCard = ({ trade, closed = false }: Props) => {
  const [open, setOpen] = useState(false);
  const [copies, setCopies] = useState<number | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  useEffect(() => {
    supabase.rpc("mentor_source_copy_count", { p_kind: "trade", p_id: trade.id })
      .then(({ data }) => setCopies(typeof data === "number" ? data : null));
  }, [trade.id]);

  const isLong = trade.direction === "long";
  const pnl = closed ? Number(trade.pnl ?? 0) : 0;
  const pct = closed ? Number(trade.pnl_percent ?? 0) : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      border: "1px solid var(--stoa-rule)",
      background: "var(--stoa-shine)",
    }}>
      <div className="flex items-center justify-between p-4 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{
            border: "1px solid var(--stoa-rule)",
            color: isLong ? "var(--stoa-secondary)" : "var(--stoa-signal)",
            background: "var(--stoa-bg)",
          }}>
            {isLong ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>
          <div className="min-w-0">
            <div className="stoa-mono" style={{ fontWeight: 600, color: "var(--stoa-ink)", fontSize: 16 }}>
              {trade.symbol} <span className="stoa-kicker" style={{ color: "var(--stoa-muted)", marginLeft: 6 }}>{trade.direction.toUpperCase()}</span>
            </div>
            <div className="stoa-mono" style={{ fontSize: 12, color: "var(--stoa-muted)" }}>
              entry {Number(trade.entry_price).toFixed(2)} · sl {Number(trade.stop_loss).toFixed(2)} · tp {Number(trade.take_profit).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          {closed ? (
            <>
              <div className="stoa-mono" style={{ fontSize: 14, fontWeight: 600, color: pnl >= 0 ? "var(--stoa-secondary)" : "var(--stoa-signal)" }}>
                {pnl >= 0 ? "+" : ""}£{pnl.toFixed(0)}
              </div>
              <div className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>
                {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
              </div>
            </>
          ) : (
            <div className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>OPEN</div>
          )}
        </div>
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 transition-all"
        style={{ borderTop: "1px solid var(--stoa-rule)", color: "var(--stoa-muted)" }}
      >
        <span className="stoa-kicker">PLAN {copies !== null && copies > 0 ? `· ${copies} copied` : ""}</span>
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ background: "var(--stoa-bg)" }}>
          <p style={{ color: "var(--stoa-ink)", fontSize: 14, lineHeight: 1.6, fontFamily: "var(--stoa-font-body)" }}>
            {trade.thesis || "—"}
          </p>
          {closed && trade.close_reflection && (
            <div className="rounded-lg p-3" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)" }}>
              <div className="stoa-kicker mb-1" style={{ color: "var(--stoa-accent)" }}>REFLECTION</div>
              <p style={{ color: "var(--stoa-ink)", fontSize: 13, lineHeight: 1.5, fontStyle: "italic" }}>
                {trade.close_reflection}
              </p>
            </div>
          )}
          {!closed && (
            <button
              onClick={() => setDiffOpen(true)}
              className="w-full rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 transition-all"
              style={{
                background: "var(--stoa-accent)",
                color: "var(--stoa-bg)",
                fontFamily: "var(--stoa-font-kicker)",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <Copy size={14} /> Preview & copy this plan
            </button>
          )}
        </div>
      )}

      {!closed && (
        <MentorPlanDiff
          open={diffOpen}
          onClose={() => setDiffOpen(false)}
          source={{
            kind: "trade",
            id: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            entry: Number(trade.entry_price),
            stop_loss: Number(trade.stop_loss),
            take_profit: Number(trade.take_profit),
            thesis: trade.thesis,
          }}
        />
      )}
    </div>
  );
};

export default MentorTradeCard;
