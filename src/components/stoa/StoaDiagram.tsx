import React from "react";

export type DiagramSpec = {
  id: string;
  type:
    | "candle_anatomy"
    | "risk_reward"
    | "position_sizing"
    | "trend_channel"
    | "support_resistance"
    | "breakout_pattern";
  caption?: string;
  data?: any;
};

const KICKERS: Record<string, string> = {
  candle_anatomy: "ΣΧΗΜΑ",
  risk_reward: "ΚΙΝΔΥΝΟΣ",
  position_sizing: "ΜΕΓΕΘΟΣ",
  trend_channel: "ΡΟΗ",
  support_resistance: "ΟΡΙΑ",
  breakout_pattern: "ΕΚΡΗΞΙΣ",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 11,
  fill: "var(--stoa-ink)",
};
const labelMutedStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 10,
  fill: "var(--stoa-muted)",
};

// ─── 1. CANDLE ANATOMY ─────────────────────────────────────────────
function CandleAnatomy({ data }: { data: any }) {
  const bullish = data?.kind !== "bearish";
  const fill = bullish ? "var(--stoa-accent)" : "hsl(var(--verdict-avoid))";
  const stroke = "var(--stoa-ink)";
  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: "block" }}>
      {/* wick */}
      <line x1="200" y1="40" x2="200" y2="260" stroke={stroke} strokeWidth="1.5" />
      {/* body */}
      <rect x="170" y="100" width="60" height="100" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {/* labels */}
      <line x1="200" y1="40" x2="280" y2="40" stroke={stroke} strokeWidth="0.5" strokeDasharray="2,2" />
      <text x="288" y="44" style={labelStyle}>High</text>
      <line x1="230" y1="100" x2="290" y2="100" stroke={stroke} strokeWidth="0.5" strokeDasharray="2,2" />
      <text x="298" y="104" style={labelStyle}>{bullish ? "Close" : "Open"}</text>
      <line x1="230" y1="200" x2="290" y2="200" stroke={stroke} strokeWidth="0.5" strokeDasharray="2,2" />
      <text x="298" y="204" style={labelStyle}>{bullish ? "Open" : "Close"}</text>
      <line x1="200" y1="260" x2="280" y2="260" stroke={stroke} strokeWidth="0.5" strokeDasharray="2,2" />
      <text x="288" y="264" style={labelStyle}>Low</text>
      {/* annotations on left */}
      <line x1="120" y1="150" x2="168" y2="150" stroke={stroke} strokeWidth="0.5" strokeDasharray="2,2" />
      <text x="50" y="154" style={labelMutedStyle}>Body (range)</text>
      <line x1="140" y1="60" x2="198" y2="60" stroke={stroke} strokeWidth="0.5" strokeDasharray="2,2" />
      <text x="60" y="64" style={labelMutedStyle}>Wick (extremes)</text>
    </svg>
  );
}

// ─── 2. RISK / REWARD ──────────────────────────────────────────────
function RiskReward({ data }: { data: any }) {
  const entry = Number(data?.entry) || 100;
  const stop = Number(data?.stop) || 95;
  const target = Number(data?.target) || 115;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  const r = risk > 0 ? (reward / risk).toFixed(2) : "—";
  const ink = "var(--stoa-ink)";
  const danger = "hsl(var(--verdict-avoid))";
  const accent = "var(--stoa-accent)";
  // Map to y positions
  const minP = Math.min(entry, stop, target);
  const maxP = Math.max(entry, stop, target);
  const range = (maxP - minP) || 1;
  const y = (p: number) => 260 - ((p - minP) / range) * 200;

  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: "block" }}>
      {/* axis */}
      <line x1="60" y1="40" x2="60" y2="270" stroke={ink} strokeWidth="1" />
      {/* target band */}
      <rect x="60" y={y(target)} width="200" height={y(entry) - y(target)} fill={accent} opacity="0.35" />
      {/* risk band */}
      <rect x="60" y={y(entry)} width="200" height={y(stop) - y(entry)} fill={danger} opacity="0.35" />
      {/* lines */}
      <line x1="60" y1={y(entry)} x2="280" y2={y(entry)} stroke={ink} strokeWidth="1.5" />
      <line x1="60" y1={y(stop)} x2="280" y2={y(stop)} stroke={danger} strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="60" y1={y(target)} x2="280" y2={y(target)} stroke={accent} strokeWidth="1.5" strokeDasharray="4,3" />
      {/* labels */}
      <text x="288" y={y(target) + 4} style={labelStyle}>Target {target}</text>
      <text x="288" y={y(entry) + 4} style={labelStyle}>Entry {entry}</text>
      <text x="288" y={y(stop) + 4} style={labelStyle}>Stop {stop}</text>
      {/* R-multiple */}
      <text x="160" y="30" textAnchor="middle" style={{ ...labelStyle, fontSize: 14, fontWeight: 600 }}>
        Reward : Risk = {r}R
      </text>
    </svg>
  );
}

// ─── 3. POSITION SIZING ────────────────────────────────────────────
function PositionSizing({ data }: { data: any }) {
  const account = Number(data?.account) || 10000;
  const riskPct = Number(data?.risk_pct) || 1;
  const entry = Number(data?.entry) || 100;
  const stop = Number(data?.stop) || 98;
  const riskUsd = (account * riskPct) / 100;
  const perShare = Math.max(0.01, Math.abs(entry - stop));
  const shares = Math.floor(riskUsd / perShare);
  const ink = "var(--stoa-ink)";
  const accent = "var(--stoa-accent)";
  const danger = "hsl(var(--verdict-avoid))";

  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: "block" }}>
      {/* Account ring */}
      <circle cx="80" cy="100" r="50" fill="none" stroke={ink} strokeWidth="1.5" />
      <text x="80" y="100" textAnchor="middle" style={{ ...labelStyle, fontSize: 12 }}>${account.toLocaleString()}</text>
      <text x="80" y="115" textAnchor="middle" style={labelMutedStyle}>Account</text>
      {/* Risk slice */}
      <path d={`M80 100 L80 50 A50 50 0 0 1 ${80 + 50 * Math.sin(2 * Math.PI * (riskPct / 100))} ${100 - 50 * Math.cos(2 * Math.PI * (riskPct / 100))} Z`} fill={danger} opacity="0.6" />
      <text x="80" y="170" textAnchor="middle" style={labelMutedStyle}>{riskPct}% risk</text>

      {/* Arrow */}
      <line x1="140" y1="100" x2="200" y2="100" stroke={ink} strokeWidth="1" markerEnd="url(#ar)" />
      <defs>
        <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill={ink} />
        </marker>
      </defs>

      {/* Risk USD box */}
      <rect x="200" y="70" width="100" height="60" fill="none" stroke={accent} strokeWidth="1.5" />
      <text x="250" y="95" textAnchor="middle" style={{ ...labelStyle, fontSize: 14, fontWeight: 600 }}>${riskUsd.toFixed(0)}</text>
      <text x="250" y="115" textAnchor="middle" style={labelMutedStyle}>at risk</text>

      {/* Distance to stop */}
      <text x="60" y="220" style={labelStyle}>Entry {entry} → Stop {stop}</text>
      <text x="60" y="240" style={labelMutedStyle}>= ${perShare.toFixed(2)} per share</text>

      {/* Result */}
      <line x1="320" y1="100" x2="350" y2="100" stroke={ink} strokeWidth="1" markerEnd="url(#ar)" />
      <text x="350" y="100" style={{ ...labelStyle, fontSize: 18, fontWeight: 700, fill: "var(--stoa-accent)" }}>= {shares}</text>
      <text x="350" y="118" style={labelMutedStyle}>shares</text>

      {/* Formula */}
      <text x="200" y="270" textAnchor="middle" style={{ ...labelMutedStyle, fontStyle: "italic" }}>
        shares = (account × risk%) ÷ |entry − stop|
      </text>
    </svg>
  );
}

// ─── 4. TREND CHANNEL ──────────────────────────────────────────────
function TrendChannel({ data }: { data: any }) {
  const up = data?.direction !== "down";
  const ink = "var(--stoa-ink)";
  const accent = "var(--stoa-accent)";
  // Three waves, ascending/descending
  const path = up
    ? "M40 240 L100 200 L140 220 L200 160 L240 180 L300 110 L360 130"
    : "M40 60 L100 100 L140 80 L200 140 L240 120 L300 190 L360 170";
  const upperLine = up ? "M40 220 L360 90" : "M40 40 L360 170";
  const lowerLine = up ? "M40 260 L360 130" : "M40 80 L360 210";
  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: "block" }}>
      <line x1="40" y1="40" x2="40" y2="280" stroke={ink} strokeWidth="0.5" />
      <line x1="40" y1="280" x2="380" y2="280" stroke={ink} strokeWidth="0.5" />
      <path d={upperLine} stroke={accent} strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
      <path d={lowerLine} stroke={accent} strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
      <path d={path} stroke={ink} strokeWidth="2" fill="none" />
      <text x="370" y={up ? 85 : 35} textAnchor="end" style={labelStyle}>Resistance</text>
      <text x="370" y={up ? 125 : 215} textAnchor="end" style={labelStyle}>Support</text>
      <text x="200" y="20" textAnchor="middle" style={{ ...labelStyle, fontSize: 13, fontWeight: 600 }}>
        {up ? "Up-channel" : "Down-channel"}
      </text>
    </svg>
  );
}

// ─── 5. SUPPORT / RESISTANCE ───────────────────────────────────────
function SupportResistance({ data }: { data: any }) {
  const levels: { price: number; label: string; type: "support" | "resistance" }[] =
    Array.isArray(data?.levels) && data.levels.length > 0
      ? data.levels
      : [
          { price: 120, label: "Resistance", type: "resistance" },
          { price: 100, label: "Pivot", type: "resistance" },
          { price: 80, label: "Support", type: "support" },
        ];
  const minP = Math.min(...levels.map((l) => l.price));
  const maxP = Math.max(...levels.map((l) => l.price));
  const range = (maxP - minP) || 1;
  const ink = "var(--stoa-ink)";
  const accent = "var(--stoa-accent)";
  const danger = "hsl(var(--verdict-avoid))";
  const y = (p: number) => 260 - ((p - minP) / range) * 200;
  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: "block" }}>
      <line x1="50" y1="30" x2="50" y2="280" stroke={ink} strokeWidth="0.5" />
      {levels.map((lv, i) => {
        const c = lv.type === "support" ? accent : danger;
        return (
          <g key={i}>
            <line x1="50" y1={y(lv.price)} x2="320" y2={y(lv.price)} stroke={c} strokeWidth="1.5" strokeDasharray="6,4" />
            <text x="328" y={y(lv.price) + 4} style={labelStyle}>{lv.label} ({lv.price})</text>
          </g>
        );
      })}
      {/* sample squiggle */}
      <path d="M60 170 Q100 130 140 180 T220 160 T300 200" stroke={ink} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ─── 6. BREAKOUT PATTERN ───────────────────────────────────────────
function BreakoutPattern({ data }: { data: any }) {
  const pattern = data?.pattern || "compression";
  const ink = "var(--stoa-ink)";
  const accent = "var(--stoa-accent)";
  let upper = "";
  let lower = "";
  let trigger = 280;
  if (pattern === "triangle") {
    upper = "M40 80 L300 160";
    lower = "M40 220 L300 160";
    trigger = 160;
  } else if (pattern === "flag") {
    upper = "M40 100 L80 140 L300 80";
    lower = "M40 200 L80 240 L300 180";
    trigger = 80;
  } else {
    // compression
    upper = "M40 100 L160 160 L300 160";
    lower = "M40 220 L160 160 L300 160";
    trigger = 160;
  }
  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: "block" }}>
      <line x1="30" y1="20" x2="30" y2="280" stroke={ink} strokeWidth="0.5" />
      <line x1="30" y1="280" x2="380" y2="280" stroke={ink} strokeWidth="0.5" />
      <path d={upper} stroke={ink} strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
      <path d={lower} stroke={ink} strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
      {/* breakout candle */}
      <rect x="305" y={trigger - 30} width="14" height="30" fill={accent} stroke={ink} strokeWidth="1" />
      <line x1="312" y1={trigger - 50} x2="312" y2={trigger} stroke={ink} strokeWidth="1" />
      {/* trigger line */}
      <line x1="30" y1={trigger} x2="380" y2={trigger} stroke={accent} strokeWidth="1" strokeDasharray="2,3" />
      <text x="340" y={trigger - 10} style={{ ...labelStyle, fontWeight: 600 }}>Trigger</text>
      <text x="200" y="22" textAnchor="middle" style={{ ...labelStyle, fontSize: 13, fontWeight: 600 }}>
        {pattern.charAt(0).toUpperCase() + pattern.slice(1)} breakout
      </text>
    </svg>
  );
}

function renderSvg(spec: DiagramSpec) {
  switch (spec.type) {
    case "candle_anatomy":     return <CandleAnatomy data={spec.data} />;
    case "risk_reward":        return <RiskReward data={spec.data} />;
    case "position_sizing":    return <PositionSizing data={spec.data} />;
    case "trend_channel":      return <TrendChannel data={spec.data} />;
    case "support_resistance": return <SupportResistance data={spec.data} />;
    case "breakout_pattern":   return <BreakoutPattern data={spec.data} />;
    default: return null;
  }
}

export function StoaDiagram({ spec }: { spec: DiagramSpec }) {
  return (
    <figure
      style={{
        background: "var(--stoa-shine)",
        border: "1px solid var(--stoa-rule)",
        borderRadius: 2,
        padding: 16,
        margin: "20px 0",
      }}
    >
      <div className="stoa-kicker" style={{ color: "var(--stoa-accent)", marginBottom: 8 }}>
        {KICKERS[spec.type] || "ΣΧΗΜΑ"}
      </div>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto" }}>
        {renderSvg(spec)}
      </div>
      {spec.caption && (
        <figcaption
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--stoa-muted)",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          {spec.caption}
        </figcaption>
      )}
    </figure>
  );
}

export default StoaDiagram;
