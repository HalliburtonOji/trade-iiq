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
      className="group relative block rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]"
      style={{
        border: `1px solid ${isWin ? "var(--stoa-gold-rule)" : "var(--stoa-rule)"}`,
        background: "var(--stoa-shine)",
        color: "var(--stoa-ink)",
      }}
    >
      {/* outcome ribbon */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: color, opacity: 0.7 }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="stoa-mono text-xs px-2 py-0.5 rounded font-semibold"
            style={{ background: "var(--stoa-bg)", color: "var(--stoa-ink)", border: "1px solid var(--stoa-rule)" }}
          >
            {cs.symbol}
          </span>
          <span className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 9 }}>
            {cs.direction.toUpperCase()}
          </span>
        </div>
        <div
          className="flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{
            color,
            background: `color-mix(in oklab, ${color} 12%, transparent)`,
            border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
          }}
        >
          <Icon size={12} />
          <span className="stoa-mono" style={{ fontSize: 11, fontWeight: 600 }}>{r}</span>
        </div>
      </div>

      <div className="stoa-display mt-3" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>
        {cs.title}
      </div>
      {cs.hook && (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--stoa-muted)",
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          {cs.hook}
        </div>
      )}

      {cs.greek_phrase && (
        <div
          className="stoa-greek mt-3"
          style={{
            fontSize: 11,
            color: "var(--stoa-accent)",
            opacity: 0.85,
            paddingLeft: 8,
            borderLeft: "2px solid var(--stoa-gold-rule)",
          }}
        >
          {cs.greek_phrase}
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
