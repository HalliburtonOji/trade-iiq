// LessonDiagram — explanatory SVG renderer for learn_modules.diagrams jsonb entries.
// Five kinds: candle, trend, sr, risk_box, flow.
// Pure SVG, no external chart lib, Stoa palette throughout.

export type Diagram =
  | { kind: "candle"; title?: string; caption?: string; data: { bars: Array<{ o: number; h: number; l: number; c: number; label?: string }>; annotations?: Array<{ index: number; text: string; pos?: "above" | "below" }> } }
  | { kind: "trend"; title?: string; caption?: string; data: { points: number[]; trendline?: { from: number; to: number }; breakoutAt?: number } }
  | { kind: "sr"; title?: string; caption?: string; data: { points: number[]; levels: Array<{ price: number; label?: string; type?: "support" | "resistance" }> } }
  | { kind: "risk_box"; title?: string; caption?: string; data: { entry: number; stop: number; target: number; symbol?: string } }
  | { kind: "flow"; title?: string; caption?: string; data: { nodes: string[]; orientation?: "horizontal" | "vertical" } };

const COLORS = {
  bg: "var(--stoa-shine)",
  ink: "var(--stoa-ink)",
  accent: "var(--stoa-accent)",
  muted: "var(--stoa-muted)",
  rule: "var(--stoa-rule)",
  danger: "hsl(var(--verdict-avoid))",
};

const Frame = ({ title, caption, children }: { title?: string; caption?: string; children: React.ReactNode }) => (
  <figure
    style={{
      background: COLORS.bg,
      border: `1px solid ${COLORS.rule}`,
      borderRadius: 2,
      margin: "20px 0",
      padding: 14,
    }}
  >
    {title && (
      <figcaption
        className="stoa-kicker"
        style={{ color: COLORS.accent, marginBottom: 10, letterSpacing: "0.14em", fontSize: 10 }}
      >
        {title}
      </figcaption>
    )}
    <div style={{ width: "100%", overflow: "hidden" }}>{children}</div>
    {caption && (
      <p
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 13,
          color: COLORS.muted,
          margin: "10px 0 0",
          textAlign: "center",
        }}
      >
        {caption}
      </p>
    )}
  </figure>
);

const W = 560;
const H = 220;
const PAD = 20;

function CandleDiagram({ data, title, caption }: Extract<Diagram, { kind: "candle" }>) {
  const bars = data.bars || [];
  if (bars.length === 0) return null;
  const allVals = bars.flatMap((b) => [b.o, b.h, b.l, b.c]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const barW = (W - PAD * 2) / bars.length;
  const candleW = Math.max(6, barW * 0.55);
  const yFor = (v: number) => PAD + ((max - v) / range) * (H - PAD * 2);
  return (
    <Frame title={title} caption={caption}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* baseline */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={COLORS.rule} strokeWidth={1} />
        {bars.map((b, i) => {
          const x = PAD + barW * i + barW / 2;
          const bullish = b.c >= b.o;
          const top = yFor(Math.max(b.o, b.c));
          const bot = yFor(Math.min(b.o, b.c));
          const fill = bullish ? COLORS.accent : COLORS.danger;
          return (
            <g key={i}>
              <line x1={x} y1={yFor(b.h)} x2={x} y2={yFor(b.l)} stroke={fill} strokeWidth={1.5} />
              <rect
                x={x - candleW / 2}
                y={top}
                width={candleW}
                height={Math.max(2, bot - top)}
                fill={bullish ? "transparent" : fill}
                stroke={fill}
                strokeWidth={1.5}
              />
              {b.label && (
                <text x={x} y={H - 4} textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fill={COLORS.muted}>
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
        {(data.annotations || []).map((a, i) => {
          const bar = bars[a.index];
          if (!bar) return null;
          const x = PAD + barW * a.index + barW / 2;
          const y = a.pos === "below" ? yFor(bar.l) + 14 : yFor(bar.h) - 8;
          return (
            <text key={i} x={x} y={y} textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fill={COLORS.ink} fontStyle="italic">
              {a.text}
            </text>
          );
        })}
      </svg>
    </Frame>
  );
}

function TrendDiagram({ data, title, caption }: Extract<Diagram, { kind: "trend" }>) {
  const pts = data.points || [];
  if (pts.length === 0) return null;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / Math.max(1, pts.length - 1);
  const yFor = (v: number) => PAD + ((max - v) / range) * (H - PAD * 2);
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${PAD + stepX * i} ${yFor(v)}`).join(" ");
  return (
    <Frame title={title} caption={caption}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={COLORS.rule} strokeWidth={1} />
        <path d={path} fill="none" stroke={COLORS.ink} strokeWidth={1.5} />
        {data.trendline && (
          <line
            x1={PAD}
            y1={yFor(data.trendline.from)}
            x2={W - PAD}
            y2={yFor(data.trendline.to)}
            stroke={COLORS.accent}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}
        {typeof data.breakoutAt === "number" && data.breakoutAt < pts.length && (
          <g>
            <circle cx={PAD + stepX * data.breakoutAt} cy={yFor(pts[data.breakoutAt])} r={5} fill={COLORS.accent} />
            <text x={PAD + stepX * data.breakoutAt} y={yFor(pts[data.breakoutAt]) - 10} textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fontStyle="italic" fill={COLORS.ink}>
              breakout
            </text>
          </g>
        )}
      </svg>
    </Frame>
  );
}

function SRDiagram({ data, title, caption }: Extract<Diagram, { kind: "sr" }>) {
  const pts = data.points || [];
  const levels = data.levels || [];
  const allVals = [...pts, ...levels.map((l) => l.price)];
  if (allVals.length === 0) return null;
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / Math.max(1, pts.length - 1);
  const yFor = (v: number) => PAD + ((max - v) / range) * (H - PAD * 2);
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${PAD + stepX * i} ${yFor(v)}`).join(" ");
  return (
    <Frame title={title} caption={caption}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {levels.map((lvl, i) => {
          const y = yFor(lvl.price);
          const color = lvl.type === "resistance" ? COLORS.danger : COLORS.accent;
          return (
            <g key={i}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={color} strokeWidth={1} strokeDasharray="3 4" />
              <text x={W - PAD} y={y - 4} textAnchor="end" fontFamily="Georgia, serif" fontSize="11" fontStyle="italic" fill={color}>
                {lvl.label || `${lvl.type ?? ""} ${lvl.price}`}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke={COLORS.ink} strokeWidth={1.5} />
      </svg>
    </Frame>
  );
}

function RiskBoxDiagram({ data, title, caption }: Extract<Diagram, { kind: "risk_box" }>) {
  const { entry, stop, target } = data;
  const all = [entry, stop, target];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const yFor = (v: number) => PAD + 10 + ((max - v) / range) * (H - PAD * 2 - 20);
  const yE = yFor(entry);
  const yS = yFor(stop);
  const yT = yFor(target);
  const xL = PAD + 60;
  const xR = W - PAD - 80;
  const riskBox = { y: Math.min(yE, yS), h: Math.abs(yE - yS) };
  const rewardBox = { y: Math.min(yE, yT), h: Math.abs(yE - yT) };
  const riskAbs = Math.abs(entry - stop);
  const rewardAbs = Math.abs(target - entry);
  const rr = riskAbs > 0 ? (rewardAbs / riskAbs).toFixed(2) : "—";
  return (
    <Frame title={title || `Risk · Reward (${data.symbol ?? ""})`} caption={caption}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* reward zone (above entry if target>entry, else below) */}
        <rect x={xL} y={rewardBox.y} width={xR - xL} height={rewardBox.h} fill={COLORS.accent} fillOpacity={0.18} stroke={COLORS.accent} strokeWidth={1} />
        {/* risk zone */}
        <rect x={xL} y={riskBox.y} width={xR - xL} height={riskBox.h} fill={COLORS.danger} fillOpacity={0.15} stroke={COLORS.danger} strokeWidth={1} />
        {/* level lines */}
        {[
          { y: yT, label: `TARGET · ${target}`, color: COLORS.accent },
          { y: yE, label: `ENTRY · ${entry}`, color: COLORS.ink },
          { y: yS, label: `STOP · ${stop}`, color: COLORS.danger },
        ].map((l, i) => (
          <g key={i}>
            <line x1={xL} y1={l.y} x2={xR} y2={l.y} stroke={l.color} strokeWidth={1.5} />
            <text x={xL - 8} y={l.y + 4} textAnchor="end" fontFamily="Georgia, serif" fontSize="11" fill={l.color}>
              {l.label}
            </text>
          </g>
        ))}
        {/* RR text */}
        <text x={xR + 8} y={yE + 4} fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill={COLORS.ink}>
          R · R = 1 : {rr}
        </text>
      </svg>
    </Frame>
  );
}

function FlowDiagram({ data, title, caption }: Extract<Diagram, { kind: "flow" }>) {
  const nodes = data.nodes || [];
  const horizontal = data.orientation !== "vertical";
  if (nodes.length === 0) return null;
  if (horizontal) {
    const boxW = (W - PAD * 2 - (nodes.length - 1) * 20) / nodes.length;
    const boxH = 60;
    const y = (H - boxH) / 2;
    return (
      <Frame title={title} caption={caption}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          {nodes.map((n, i) => {
            const x = PAD + i * (boxW + 20);
            return (
              <g key={i}>
                <rect x={x} y={y} width={boxW} height={boxH} fill={COLORS.bg} stroke={COLORS.accent} strokeWidth={1.5} rx={2} />
                <foreignObject x={x + 4} y={y + 4} width={boxW - 8} height={boxH - 8}>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      fontFamily: "Georgia, serif",
                      fontSize: 12,
                      lineHeight: 1.3,
                      color: COLORS.ink,
                    }}
                  >
                    {n}
                  </div>
                </foreignObject>
                {i < nodes.length - 1 && (
                  <g>
                    <line x1={x + boxW} y1={y + boxH / 2} x2={x + boxW + 16} y2={y + boxH / 2} stroke={COLORS.muted} strokeWidth={1.5} />
                    <polygon points={`${x + boxW + 20},${y + boxH / 2} ${x + boxW + 14},${y + boxH / 2 - 4} ${x + boxW + 14},${y + boxH / 2 + 4}`} fill={COLORS.muted} />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </Frame>
    );
  }
  const boxW = W - PAD * 2;
  const boxH = (H - PAD * 2 - (nodes.length - 1) * 12) / nodes.length;
  return (
    <Frame title={title} caption={caption}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {nodes.map((n, i) => {
          const yT = PAD + i * (boxH + 12);
          return (
            <g key={i}>
              <rect x={PAD} y={yT} width={boxW} height={boxH} fill={COLORS.bg} stroke={COLORS.accent} strokeWidth={1.5} rx={2} />
              <foreignObject x={PAD + 6} y={yT + 4} width={boxW - 12} height={boxH - 8}>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    fontFamily: "Georgia, serif",
                    fontSize: 13,
                    color: COLORS.ink,
                  }}
                >
                  {n}
                </div>
              </foreignObject>
              {i < nodes.length - 1 && (
                <polygon
                  points={`${PAD + boxW / 2},${yT + boxH + 10} ${PAD + boxW / 2 - 5},${yT + boxH + 2} ${PAD + boxW / 2 + 5},${yT + boxH + 2}`}
                  fill={COLORS.muted}
                />
              )}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

export default function LessonDiagram({ diagram }: { diagram: Diagram }) {
  switch (diagram.kind) {
    case "candle":
      return <CandleDiagram {...diagram} />;
    case "trend":
      return <TrendDiagram {...diagram} />;
    case "sr":
      return <SRDiagram {...diagram} />;
    case "risk_box":
      return <RiskBoxDiagram {...diagram} />;
    case "flow":
      return <FlowDiagram {...diagram} />;
    default:
      return null;
  }
}
