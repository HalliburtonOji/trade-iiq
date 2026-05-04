// MentorCaseStudyCard — compact card for a Sophos case study, used in lists.

import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Props = {
  cs: {
    id: string;
    symbol: string;
    direction: string;
    outcome: "win" | "loss" | "breakeven";
    r_multiple: number | null;
    title: string;
    hook: string;
    tags: string[];
    greek_phrase: string | null;
    created_at: string;
  };
};

const MentorCaseStudyCard = ({ cs }: Props) => {
  const isWin = cs.outcome === "win";
  const isLoss = cs.outcome === "loss";
  const Icon = isWin ? TrendingUp : isLoss ? TrendingDown : Minus;
  const color = isWin ? "var(--stoa-secondary)" : isLoss ? "var(--stoa-signal)" : "var(--stoa-muted)";
  const r = cs.r_multiple !== null ? `${cs.r_multiple >= 0 ? "+" : ""}${cs.r_multiple.toFixed(2)}R` : "—";

  return (
    <Link
      to={`/learn/case/${cs.id}`}
      className="block rounded-2xl p-5 transition-colors hover:opacity-95"
      style={{
        border: "1px solid var(--stoa-rule)",
        background: "var(--stoa-shine)",
        color: "var(--stoa-ink)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="stoa-mono text-xs px-2 py-0.5 rounded"
            style={{ background: "var(--stoa-bg)", color: "var(--stoa-ink)" }}
          >
            {cs.symbol}
          </span>
          <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
            {cs.direction.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ color }}>
          <Icon size={14} />
          <span className="stoa-mono text-xs">{r}</span>
        </div>
      </div>

      <div className="stoa-display mt-3" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.25 }}>
        {cs.title}
      </div>
      {cs.hook && (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--stoa-muted)",
            marginTop: 6,
          }}
        >
          {cs.hook}
        </div>
      )}

      {cs.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {cs.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="stoa-mono text-[10px] px-2 py-0.5 rounded-full"
              style={{
                color: "var(--stoa-accent)",
                border: "1px solid var(--stoa-gold-rule)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
};

export default MentorCaseStudyCard;
