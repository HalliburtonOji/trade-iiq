import { memo } from "react";

export type IllustrationType =
  | "candlestick-anatomy"
  | "support-resistance"
  | "rsi-gauge"
  | "trend-structure"
  | "macd-crossover"
  | "risk-reward"
  | "position-sizing"
  | "volume-profile"
  | "breakout-retest"
  | "bull-bear-cycle"
  | "session-timeline"
  | "engulfing-pattern"
  | "divergence"
  | "fomo-cycle"
  | "equity-curve";

interface Props {
  type: IllustrationType;
  caption?: string;
}

const LessonIllustration = memo(({ type, caption }: Props) => {
  return (
    <div className="my-4 rounded-xl border border-border/40 bg-secondary/30 p-4 overflow-hidden">
      <div className="w-full aspect-[16/9] flex items-center justify-center">
        <svg viewBox="0 0 640 360" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {renderDiagram(type)}
        </svg>
      </div>
      {caption && (
        <p className="text-[11px] text-muted-foreground text-center mt-2 italic">{caption}</p>
      )}
    </div>
  );
});

function renderDiagram(type: IllustrationType) {
  switch (type) {
    case "candlestick-anatomy":
      return <CandlestickAnatomy />;
    case "support-resistance":
      return <SupportResistance />;
    case "rsi-gauge":
      return <RSIGauge />;
    case "trend-structure":
      return <TrendStructure />;
    case "macd-crossover":
      return <MACDCrossover />;
    case "risk-reward":
      return <RiskReward />;
    case "position-sizing":
      return <PositionSizing />;
    case "volume-profile":
      return <VolumeProfile />;
    case "breakout-retest":
      return <BreakoutRetest />;
    case "bull-bear-cycle":
      return <BullBearCycle />;
    case "session-timeline":
      return <SessionTimeline />;
    case "engulfing-pattern":
      return <EngulfingPattern />;
    case "divergence":
      return <Divergence />;
    case "fomo-cycle":
      return <FOMOCycle />;
    case "equity-curve":
      return <EquityCurve />;
    default:
      return <text x="320" y="180" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="14">Diagram</text>;
  }
}

// ── Candlestick Anatomy ──
function CandlestickAnatomy() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Candlestick Anatomy</text>
      {/* Bullish candle */}
      <line x1="180" y1="60" x2="180" y2="310" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="4"/>
      <rect x="155" y="140" width="50" height="100" rx="3" fill="hsl(var(--verdict-buy))" opacity="0.9"/>
      <line x1="180" y1="70" x2="180" y2="140" stroke="hsl(var(--verdict-buy))" strokeWidth="2.5"/>
      <line x1="180" y1="240" x2="180" y2="300" stroke="hsl(var(--verdict-buy))" strokeWidth="2.5"/>
      {/* Labels */}
      <text x="240" y="75" fill="hsl(var(--muted-foreground))" fontSize="11">← High</text>
      <text x="240" y="148" fill="hsl(var(--verdict-buy))" fontSize="11">← Close</text>
      <text x="240" y="245" fill="hsl(var(--verdict-buy))" fontSize="11">← Open</text>
      <text x="240" y="305" fill="hsl(var(--muted-foreground))" fontSize="11">← Low</text>
      <text x="110" y="100" fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end">Upper</text>
      <text x="110" y="112" fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end">Wick</text>
      <line x1="115" y1="105" x2="175" y2="105" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="3"/>
      <text x="110" y="195" fill="hsl(var(--verdict-buy))" fontSize="11" textAnchor="end" fontWeight="600">Body</text>
      <line x1="115" y1="190" x2="155" y2="190" stroke="hsl(var(--verdict-buy))" strokeWidth="0.5" strokeDasharray="3"/>
      <text x="110" y="275" fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end">Lower</text>
      <text x="110" y="287" fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end">Wick</text>
      <line x1="115" y1="280" x2="175" y2="270" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="3"/>
      <text x="180" y="335" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="12" fontWeight="600">BULLISH</text>
      {/* Bearish candle */}
      <rect x="415" y="140" width="50" height="100" rx="3" fill="hsl(var(--verdict-avoid))" opacity="0.9"/>
      <line x1="440" y1="80" x2="440" y2="140" stroke="hsl(var(--verdict-avoid))" strokeWidth="2.5"/>
      <line x1="440" y1="240" x2="440" y2="290" stroke="hsl(var(--verdict-avoid))" strokeWidth="2.5"/>
      <text x="500" y="148" fill="hsl(var(--verdict-avoid))" fontSize="11">← Open</text>
      <text x="500" y="245" fill="hsl(var(--verdict-avoid))" fontSize="11">← Close</text>
      <text x="440" y="335" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="12" fontWeight="600">BEARISH</text>
    </g>
  );
}

// ── Support & Resistance ──
function SupportResistance() {
  const pricePath = "M 60,200 L 120,180 L 180,120 L 220,140 L 280,100 L 340,130 L 380,90 L 420,110 L 480,150 L 540,130 L 580,160";
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Support & Resistance Zones</text>
      {/* Resistance zone */}
      <rect x="50" y="80" width="550" height="30" rx="4" fill="hsl(var(--verdict-avoid))" opacity="0.15"/>
      <text x="55" y="100" fill="hsl(var(--verdict-avoid))" fontSize="11" fontWeight="600">Resistance Zone</text>
      {/* Support zone */}
      <rect x="50" y="190" width="550" height="30" rx="4" fill="hsl(var(--verdict-buy))" opacity="0.15"/>
      <text x="55" y="210" fill="hsl(var(--verdict-buy))" fontSize="11" fontWeight="600">Support Zone</text>
      {/* Price line */}
      <path d={pricePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Bounce arrows */}
      <text x="180" y="145" fill="hsl(var(--verdict-avoid))" fontSize="16">↓</text>
      <text x="340" y="145" fill="hsl(var(--verdict-avoid))" fontSize="16">↓</text>
      <text x="250" y="195" fill="hsl(var(--verdict-buy))" fontSize="16">↑</text>
      <text x="460" y="195" fill="hsl(var(--verdict-buy))" fontSize="16">↑</text>
      <text x="320" y="280" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Price bounces between zones. Broken resistance → new support.</text>
    </g>
  );
}

// ── RSI Gauge ──
function RSIGauge() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">RSI (Relative Strength Index)</text>
      {/* Scale */}
      <rect x="80" y="60" width="480" height="40" rx="20" fill="hsl(var(--secondary))"/>
      {/* Oversold zone */}
      <rect x="80" y="60" width="144" height="40" rx="20" fill="hsl(var(--verdict-buy))" opacity="0.3"/>
      {/* Overbought zone */}
      <rect x="416" y="60" width="144" height="40" rx="20" fill="hsl(var(--verdict-avoid))" opacity="0.3"/>
      {/* Labels */}
      <text x="152" y="85" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="12" fontWeight="600">Oversold</text>
      <text x="152" y="120" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">0-30</text>
      <text x="320" y="85" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="600">Neutral</text>
      <text x="320" y="120" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">30-70</text>
      <text x="488" y="85" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="12" fontWeight="600">Overbought</text>
      <text x="488" y="120" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">70-100</text>
      {/* Pointer at 55 */}
      <circle cx="344" cy="80" r="8" fill="hsl(var(--primary))" />
      <text x="344" y="84" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">55</text>
      {/* Key insight */}
      <rect x="80" y="160" width="480" height="80" rx="8" fill="hsl(var(--secondary))" opacity="0.5"/>
      <text x="320" y="185" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="12" fontWeight="600">⚠️ Common Trap</text>
      <text x="320" y="205" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">RSI 70+ does NOT mean "sell"</text>
      <text x="320" y="225" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">In strong uptrends, RSI stays overbought for weeks</text>
      {/* Divergence example */}
      <text x="320" y="280" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="600">Divergence = More Useful Signal</text>
      <text x="200" y="310" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Price: New High ↗</text>
      <text x="440" y="310" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">RSI: Lower High ↘</text>
      <text x="320" y="340" textAnchor="middle" fill="hsl(var(--verdict-wait))" fontSize="11" fontWeight="600">= Fading momentum</text>
    </g>
  );
}

// ── Trend Structure ──
function TrendStructure() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Trend & Market Structure</text>
      {/* Uptrend */}
      <text x="170" y="55" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="12" fontWeight="600">Uptrend</text>
      <polyline points="60,280 120,200 160,230 220,160 260,190 320,120" fill="none" stroke="hsl(var(--verdict-buy))" strokeWidth="2.5" strokeLinejoin="round"/>
      <circle cx="120" cy="200" r="4" fill="hsl(var(--verdict-buy))"/>
      <circle cx="220" cy="160" r="4" fill="hsl(var(--verdict-buy))"/>
      <circle cx="320" cy="120" r="4" fill="hsl(var(--verdict-buy))"/>
      <text x="120" y="195" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="9">HH</text>
      <text x="160" y="245" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="9">HL</text>
      <text x="220" y="155" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="9">HH</text>
      <text x="260" y="205" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="9">HL</text>
      {/* Downtrend */}
      <text x="490" y="55" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="12" fontWeight="600">Downtrend</text>
      <polyline points="360,120 400,180 440,150 480,220 520,190 580,260" fill="none" stroke="hsl(var(--verdict-avoid))" strokeWidth="2.5" strokeLinejoin="round"/>
      <circle cx="400" cy="180" r="4" fill="hsl(var(--verdict-avoid))"/>
      <circle cx="480" cy="220" r="4" fill="hsl(var(--verdict-avoid))"/>
      <text x="400" y="195" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="9">LL</text>
      <text x="440" y="145" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="9">LH</text>
      <text x="480" y="235" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="9">LL</text>
      <text x="520" y="185" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="9">LH</text>
      {/* BOS label */}
      <line x1="320" y1="70" x2="320" y2="300" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="4"/>
      <text x="320" y="325" textAnchor="middle" fill="hsl(var(--verdict-wait))" fontSize="11" fontWeight="600">Break of Structure (BOS)</text>
    </g>
  );
}

// ── MACD Crossover ──
function MACDCrossover() {
  const macdLine = "M 60,200 L 120,190 L 180,170 L 240,140 L 300,130 L 360,145 L 420,170 L 480,190 L 540,200";
  const signalLine = "M 60,195 L 120,195 L 180,185 L 240,160 L 300,140 L 360,140 L 420,155 L 480,180 L 540,195";
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">MACD Crossover</text>
      {/* Zero line */}
      <line x1="50" y1="200" x2="590" y2="200" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="4"/>
      <text x="45" y="204" textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="9">0</text>
      {/* Histogram bars */}
      {[120,180,240,300,360,420,480].map((x, i) => {
        const heights = [5, 15, 30, 10, -5, -15, -10];
        const h = heights[i];
        return <rect key={x} x={x-8} y={h > 0 ? 200 - h * 2 : 200} width="16" height={Math.abs(h) * 2} rx="2" fill={h >= 0 ? "hsl(var(--verdict-buy))" : "hsl(var(--verdict-avoid))"} opacity="0.4"/>;
      })}
      {/* MACD & Signal */}
      <path d={macdLine} fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <path d={signalLine} fill="none" stroke="hsl(var(--verdict-avoid))" strokeWidth="2" strokeDasharray="4"/>
      {/* Crossover point */}
      <circle cx="270" cy="150" r="12" fill="none" stroke="hsl(var(--verdict-buy))" strokeWidth="2"/>
      <text x="270" y="135" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="10" fontWeight="600">Bullish Cross</text>
      <circle cx="450" cy="175" r="12" fill="none" stroke="hsl(var(--verdict-avoid))" strokeWidth="2"/>
      <text x="450" y="165" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="10" fontWeight="600">Bearish Cross</text>
      {/* Legend */}
      <line x1="160" y1="300" x2="190" y2="300" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <text x="195" y="304" fill="hsl(var(--muted-foreground))" fontSize="10">MACD Line</text>
      <line x1="310" y1="300" x2="340" y2="300" stroke="hsl(var(--verdict-avoid))" strokeWidth="2" strokeDasharray="4"/>
      <text x="345" y="304" fill="hsl(var(--muted-foreground))" fontSize="10">Signal Line</text>
      <rect x="460" y="294" width="12" height="12" rx="2" fill="hsl(var(--verdict-buy))" opacity="0.4"/>
      <text x="478" y="304" fill="hsl(var(--muted-foreground))" fontSize="10">Histogram</text>
    </g>
  );
}

// ── Risk Reward ──
function RiskReward() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Risk : Reward Ratio (1:2)</text>
      {/* Entry line */}
      <line x1="100" y1="180" x2="540" y2="180" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <text x="555" y="184" fill="hsl(var(--primary))" fontSize="11" fontWeight="600">Entry $100</text>
      {/* Stop loss */}
      <line x1="100" y1="240" x2="540" y2="240" stroke="hsl(var(--verdict-avoid))" strokeWidth="2" strokeDasharray="4"/>
      <text x="555" y="244" fill="hsl(var(--verdict-avoid))" fontSize="11" fontWeight="600">Stop $97</text>
      <rect x="100" y="180" width="440" height="60" fill="hsl(var(--verdict-avoid))" opacity="0.08"/>
      <text x="320" y="215" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="12" fontWeight="600">Risk: $3 (1x)</text>
      {/* Take profit */}
      <line x1="100" y1="60" x2="540" y2="60" stroke="hsl(var(--verdict-buy))" strokeWidth="2" strokeDasharray="4"/>
      <text x="555" y="64" fill="hsl(var(--verdict-buy))" fontSize="11" fontWeight="600">Target $106</text>
      <rect x="100" y="60" width="440" height="120" fill="hsl(var(--verdict-buy))" opacity="0.08"/>
      <text x="320" y="125" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="12" fontWeight="600">Reward: $6 (2x)</text>
      {/* Result */}
      <text x="320" y="300" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="600">At 1:2 R:R, you only need 34% win rate to profit</text>
      <text x="320" y="320" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Win 5/10 trades → Net +$15 | Win rate matters less than R:R</text>
    </g>
  );
}

// ── Position Sizing ──
function PositionSizing() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Position Sizing Formula</text>
      {/* Formula box */}
      <rect x="120" y="50" width="400" height="50" rx="8" fill="hsl(var(--primary))" opacity="0.1" stroke="hsl(var(--primary))" strokeWidth="1"/>
      <text x="320" y="80" textAnchor="middle" fill="hsl(var(--primary))" fontSize="14" fontWeight="bold">Shares = Risk Amount ÷ Stop Distance</text>
      {/* Example A */}
      <rect x="60" y="130" width="240" height="120" rx="8" fill="hsl(var(--secondary))" opacity="0.5"/>
      <text x="180" y="155" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="600">Trade A</text>
      <text x="180" y="175" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Entry: $50 | Stop: $48</text>
      <text x="180" y="195" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Risk $100 ÷ $2 stop</text>
      <text x="180" y="220" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="13" fontWeight="bold">= 50 shares</text>
      {/* Example B */}
      <rect x="340" y="130" width="240" height="120" rx="8" fill="hsl(var(--secondary))" opacity="0.5"/>
      <text x="460" y="155" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="600">Trade B</text>
      <text x="460" y="175" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Entry: $200 | Stop: $190</text>
      <text x="460" y="195" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Risk $100 ÷ $10 stop</text>
      <text x="460" y="220" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="13" fontWeight="bold">= 10 shares</text>
      {/* Key point */}
      <text x="320" y="290" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="600">Same $100 risk, different share counts</text>
      <text x="320" y="310" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Wider stop → fewer shares. Consistent risk regardless of price.</text>
    </g>
  );
}

// ── Volume Profile ──
function VolumeProfile() {
  const bars = [30, 50, 80, 45, 90, 120, 60, 35, 70, 55, 40, 25];
  const colors = [0,0,1,0,1,1,0,0,1,0,0,0]; // 1=green, 0=red-ish
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Volume Confirms Price Moves</text>
      {/* Price line */}
      <polyline points="80,250 120,230 160,200 200,220 240,180 280,140 320,160 360,190 400,150 440,170 480,200 520,220" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Volume bars */}
      {bars.map((h, i) => (
        <rect key={i} x={80 + i * 40 - 12} y={310 - h} width="24" height={h} rx="2" fill={colors[i] ? "hsl(var(--verdict-buy))" : "hsl(var(--verdict-avoid))"} opacity="0.5"/>
      ))}
      {/* Annotation */}
      <circle cx="280" cy="140" r="15" fill="none" stroke="hsl(var(--verdict-buy))" strokeWidth="1.5"/>
      <text x="280" y="125" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="9" fontWeight="600">Breakout +</text>
      <text x="280" y="115" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="9" fontWeight="600">High Volume ✓</text>
    </g>
  );
}

// ── Breakout & Retest ──
function BreakoutRetest() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Breakout → Retest → Continuation</text>
      {/* Resistance level */}
      <line x1="50" y1="160" x2="590" y2="160" stroke="hsl(var(--verdict-avoid))" strokeWidth="1.5" strokeDasharray="6"/>
      <text x="55" y="150" fill="hsl(var(--verdict-avoid))" fontSize="10">Resistance → Support</text>
      {/* Price path */}
      <polyline points="60,250 100,220 140,200 180,170 200,160 230,165 260,140 290,100 320,110 350,150 370,160 400,155 430,120 480,80 540,70" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Retest annotation */}
      <circle cx="370" cy="160" r="18" fill="none" stroke="hsl(var(--verdict-buy))" strokeWidth="2"/>
      <text x="370" y="195" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="11" fontWeight="600">Retest = Best Entry</text>
      {/* Steps */}
      <text x="200" y="270" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">1. Consolidation</text>
      <text x="320" y="290" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="11">2. Break + Volume</text>
      <text x="440" y="310" textAnchor="middle" fill="hsl(var(--primary))" fontSize="11">3. Retest holds → Go</text>
    </g>
  );
}

// ── Bull Bear Cycle ──
function BullBearCycle() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Market Cycle</text>
      <polyline points="40,280 120,220 200,140 280,80 340,100 400,180 460,250 520,300 580,290" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinejoin="round"/>
      {/* Phases */}
      <rect x="80" y="190" width="100" height="24" rx="12" fill="hsl(var(--verdict-buy))" opacity="0.2"/>
      <text x="130" y="206" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="10" fontWeight="600">Accumulation</text>
      <rect x="210" y="70" width="80" height="24" rx="12" fill="hsl(var(--verdict-buy))" opacity="0.2"/>
      <text x="250" y="86" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="10" fontWeight="600">Bull Run</text>
      <rect x="330" y="90" width="90" height="24" rx="12" fill="hsl(var(--verdict-wait))" opacity="0.2"/>
      <text x="375" y="106" textAnchor="middle" fill="hsl(var(--verdict-wait))" fontSize="10" fontWeight="600">Distribution</text>
      <rect x="440" y="240" width="80" height="24" rx="12" fill="hsl(var(--verdict-avoid))" opacity="0.2"/>
      <text x="480" y="256" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="10" fontWeight="600">Bear Market</text>
    </g>
  );
}

// ── Session Timeline ──
function SessionTimeline() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Global Trading Sessions (EST)</text>
      {/* Timeline bar */}
      <rect x="60" y="80" width="520" height="30" rx="4" fill="hsl(var(--secondary))"/>
      {/* Asia */}
      <rect x="60" y="80" width="173" height="30" rx="4" fill="hsl(var(--verdict-wait))" opacity="0.3"/>
      <text x="146" y="100" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600">🌏 Asia</text>
      {/* London */}
      <rect x="233" y="80" width="173" height="30" rx="4" fill="hsl(var(--primary))" opacity="0.3"/>
      <text x="320" y="100" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600">🇬🇧 London</text>
      {/* NY */}
      <rect x="370" y="80" width="210" height="30" rx="4" fill="hsl(var(--verdict-buy))" opacity="0.3"/>
      <text x="475" y="100" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600">🇺🇸 New York</text>
      {/* Overlap highlight */}
      <rect x="370" y="130" width="36" height="30" rx="4" fill="hsl(var(--primary))" opacity="0.2"/>
      <text x="388" y="150" textAnchor="middle" fill="hsl(var(--primary))" fontSize="9" fontWeight="600">Overlap</text>
      {/* Time labels */}
      <text x="60" y="130" fill="hsl(var(--muted-foreground))" fontSize="9">7PM</text>
      <text x="233" y="130" fill="hsl(var(--muted-foreground))" fontSize="9">3AM</text>
      <text x="370" y="130" fill="hsl(var(--muted-foreground))" fontSize="9">8AM</text>
      <text x="475" y="130" fill="hsl(var(--muted-foreground))" fontSize="9">9:30AM</text>
      <text x="580" y="130" fill="hsl(var(--muted-foreground))" fontSize="9">4PM</text>
      {/* Key insight */}
      <rect x="100" y="190" width="440" height="60" rx="8" fill="hsl(var(--primary))" opacity="0.08"/>
      <text x="320" y="215" textAnchor="middle" fill="hsl(var(--primary))" fontSize="12" fontWeight="600">London-NY Overlap = Peak Liquidity</text>
      <text x="320" y="235" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">8 AM – 12 PM EST: Best time for day trading</text>
    </g>
  );
}

// ── Engulfing Pattern ──
function EngulfingPattern() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Engulfing Candlestick Patterns</text>
      {/* Bullish Engulfing */}
      <text x="180" y="60" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="12" fontWeight="600">Bullish Engulfing</text>
      {/* Small red */}
      <rect x="145" y="140" width="25" height="50" rx="2" fill="hsl(var(--verdict-avoid))" opacity="0.8"/>
      <line x1="157" y1="120" x2="157" y2="140" stroke="hsl(var(--verdict-avoid))" strokeWidth="2"/>
      <line x1="157" y1="190" x2="157" y2="210" stroke="hsl(var(--verdict-avoid))" strokeWidth="2"/>
      {/* Large green */}
      <rect x="180" y="120" width="35" height="90" rx="2" fill="hsl(var(--verdict-buy))" opacity="0.8"/>
      <line x1="197" y1="100" x2="197" y2="120" stroke="hsl(var(--verdict-buy))" strokeWidth="2"/>
      <line x1="197" y1="210" x2="197" y2="240" stroke="hsl(var(--verdict-buy))" strokeWidth="2"/>
      <text x="180" y="280" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Green body covers red</text>
      <text x="180" y="295" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="10" fontWeight="600">→ Buyers take control</text>
      {/* Bearish Engulfing */}
      <text x="460" y="60" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="12" fontWeight="600">Bearish Engulfing</text>
      <rect x="425" y="140" width="25" height="50" rx="2" fill="hsl(var(--verdict-buy))" opacity="0.8"/>
      <line x1="437" y1="120" x2="437" y2="140" stroke="hsl(var(--verdict-buy))" strokeWidth="2"/>
      <line x1="437" y1="190" x2="437" y2="210" stroke="hsl(var(--verdict-buy))" strokeWidth="2"/>
      <rect x="460" y="120" width="35" height="90" rx="2" fill="hsl(var(--verdict-avoid))" opacity="0.8"/>
      <line x1="477" y1="100" x2="477" y2="120" stroke="hsl(var(--verdict-avoid))" strokeWidth="2"/>
      <line x1="477" y1="210" x2="477" y2="240" stroke="hsl(var(--verdict-avoid))" strokeWidth="2"/>
      <text x="460" y="280" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Red body covers green</text>
      <text x="460" y="295" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="10" fontWeight="600">→ Sellers take control</text>
    </g>
  );
}

// ── Divergence ──
function Divergence() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">RSI Divergence</text>
      {/* Price chart */}
      <text x="55" y="60" fill="hsl(var(--muted-foreground))" fontSize="10">Price</text>
      <polyline points="80,180 160,130 240,160 320,100 400,140 480,80 560,110" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round"/>
      <line x1="320" y1="95" x2="480" y2="75" stroke="hsl(var(--verdict-buy))" strokeWidth="1.5" strokeDasharray="4"/>
      <text x="400" y="70" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="10">Higher High ↗</text>
      {/* RSI chart */}
      <line x1="70" y1="220" x2="570" y2="220" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5"/>
      <text x="55" y="225" fill="hsl(var(--muted-foreground))" fontSize="10">RSI</text>
      <polyline points="80,300 160,260 240,280 320,240 400,270 480,260 560,280" fill="none" stroke="hsl(var(--verdict-wait))" strokeWidth="2" strokeLinejoin="round"/>
      <line x1="320" y1="235" x2="480" y2="255" stroke="hsl(var(--verdict-avoid))" strokeWidth="1.5" strokeDasharray="4"/>
      <text x="400" y="250" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="10">Lower High ↘</text>
      {/* Label */}
      <rect x="180" y="315" width="280" height="30" rx="8" fill="hsl(var(--verdict-avoid))" opacity="0.1"/>
      <text x="320" y="335" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="12" fontWeight="600">⚠️ Bearish Divergence = Momentum fading</text>
    </g>
  );
}

// ── FOMO Cycle ──
function FOMOCycle() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">The FOMO Trap</text>
      {/* Price spike and crash */}
      <polyline points="60,280 120,260 180,220 240,160 300,100 340,70 360,80 380,120 420,180 480,250 540,280" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Smart money entry */}
      <circle cx="180" cy="220" r="6" fill="hsl(var(--verdict-buy))"/>
      <text x="180" y="250" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="10" fontWeight="600">Smart money buys</text>
      {/* FOMO entry */}
      <circle cx="340" cy="70" r="6" fill="hsl(var(--verdict-avoid))"/>
      <text x="340" y="55" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="10" fontWeight="600">FOMO buys here 😰</text>
      {/* Panic sell */}
      <circle cx="480" cy="250" r="6" fill="hsl(var(--verdict-avoid))"/>
      <text x="480" y="275" textAnchor="middle" fill="hsl(var(--verdict-avoid))" fontSize="10">Panic sells -30%</text>
      {/* Patient re-entry */}
      <circle cx="540" cy="280" r="6" fill="hsl(var(--verdict-buy))"/>
      <text x="540" y="305" textAnchor="middle" fill="hsl(var(--verdict-buy))" fontSize="10" fontWeight="600">Patient re-entry</text>
    </g>
  );
}

// ── Equity Curve ──
function EquityCurve() {
  return (
    <g>
      <text x="320" y="28" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="bold">Good vs Bad Risk Management</text>
      {/* Good curve */}
      <polyline points="60,250 120,240 180,220 240,210 300,200 360,180 420,170 480,150 540,130" fill="none" stroke="hsl(var(--verdict-buy))" strokeWidth="2.5" strokeLinejoin="round"/>
      <text x="550" y="125" fill="hsl(var(--verdict-buy))" fontSize="10" fontWeight="600">1-2% risk/trade</text>
      {/* Bad curve */}
      <polyline points="60,250 120,230 180,260 240,200 300,270 360,180 420,300 480,150 540,320" fill="none" stroke="hsl(var(--verdict-avoid))" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="6"/>
      <text x="550" y="325" fill="hsl(var(--verdict-avoid))" fontSize="10" fontWeight="600">10%+ risk/trade</text>
      {/* Starting point */}
      <circle cx="60" cy="250" r="5" fill="hsl(var(--primary))"/>
      <text x="60" y="270" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">$10k start</text>
    </g>
  );
}

LessonIllustration.displayName = "LessonIllustration";
export default LessonIllustration;
