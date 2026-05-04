// MentorHero — Sophos profile card (level-2 polish)

type Props = { profile: any; closed: any[]; openTrades: any[] };

const MentorHero = ({ profile, closed, openTrades }: Props) => {
  const equity = Number(profile?.equity ?? 10000);
  const start = Number(profile?.starting_balance ?? 10000);
  const pct = ((equity / start - 1) * 100);
  const delta = equity - start;
  const wins = closed.filter(t => Number(t.pnl) > 0).length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : null;
  const days = profile?.born_at ? Math.max(1, Math.floor((Date.now() - new Date(profile.born_at).getTime()) / 86_400_000)) : 1;
  const accentColor = profile?.persona_color || "var(--stoa-accent)";

  // Build sparkline from closed trades cumulative pnl
  const sorted = [...closed].sort((a, b) => new Date(a.closed_at || 0).getTime() - new Date(b.closed_at || 0).getTime());
  const points: number[] = [start];
  let run = start;
  for (const t of sorted) { run += Number(t.pnl || 0); points.push(run); }
  points.push(equity);

  const personaName = profile?.name || "Σοφός";
  const personaTitle = profile?.display_name || "The Living Trader";

  return (
    <div
      className="relative rounded-2xl p-6 overflow-hidden"
      style={{
        border: "1px solid var(--stoa-gold-rule)",
        background: "linear-gradient(135deg, color-mix(in oklab, var(--stoa-accent) 8%, transparent), var(--stoa-shine))",
      }}
    >
      {/* Soft radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 360,
          height: 360,
          background: `radial-gradient(circle, color-mix(in oklab, ${accentColor} 22%, transparent) 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="stoa-kicker" style={{ color: accentColor }}>MANTEION · {personaName.toUpperCase()}</div>
          <div className="stoa-display mt-1" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.05, color: "var(--stoa-ink)" }}>
            {personaTitle}
          </div>
          <div className="stoa-greek mt-2" style={{ color: "var(--stoa-muted)", fontSize: 14, maxWidth: 520, lineHeight: 1.5, fontStyle: "italic" }}>
            "{profile?.bio || "I trade what I'd want a student to see."}"
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>EQUITY</div>
          <div className="stoa-mono" style={{ fontSize: 26, fontWeight: 600, color: "var(--stoa-ink)", lineHeight: 1.1 }}>
            £{equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div
            className="inline-flex items-center gap-1.5 mt-1.5 rounded-full px-2 py-0.5 stoa-mono"
            style={{
              fontSize: 11,
              background: pct >= 0
                ? "color-mix(in oklab, var(--stoa-secondary) 14%, transparent)"
                : "color-mix(in oklab, var(--stoa-signal) 14%, transparent)",
              color: pct >= 0 ? "var(--stoa-secondary)" : "var(--stoa-signal)",
              border: `1px solid color-mix(in oklab, ${pct >= 0 ? "var(--stoa-secondary)" : "var(--stoa-signal)"} 30%, transparent)`,
            }}
          >
            {pct >= 0 ? "▲" : "▼"} {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
            <span style={{ opacity: 0.6 }}>·</span>
            {delta >= 0 ? "+" : ""}£{Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <Sparkline points={points} />

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--stoa-rule)" }}>
        <Stat label="OPEN" value={`${openTrades.length}`} />
        <Stat label="CLOSED" value={`${closed.length}`} />
        <Stat label="WIN RATE" value={winRate !== null ? `${winRate}%` : "—"} accent={winRate !== null && winRate >= 50} />
        <Stat label="DAYS ALIVE" value={`${days}`} />
      </div>
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div>
    <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 9 }}>{label}</div>
    <div
      className="stoa-mono"
      style={{
        fontSize: 18,
        color: accent ? "var(--stoa-secondary)" : "var(--stoa-ink)",
        marginTop: 2,
        fontWeight: 600,
      }}
    >
      {value}
    </div>
  </div>
);

const Sparkline = ({ points }: { points: number[] }) => {
  if (points.length < 2) return <div style={{ height: 64, marginTop: 16 }} />;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const w = 100, h = 28;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPath = `${path} L${w},${h} L0,${h} Z`;
  const last = points[points.length - 1];
  const first = points[0];
  const up = last >= first;
  const stroke = up ? "var(--stoa-secondary)" : "var(--stoa-signal)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 64, marginTop: 18, display: "block" }}>
      <defs>
        <linearGradient id="spark-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-area)" stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="0.7" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export default MentorHero;
