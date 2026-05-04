// MentorHero — Sophos profile card

type Props = { profile: any; closed: any[]; openTrades: any[] };

const MentorHero = ({ profile, closed, openTrades }: Props) => {
  const equity = Number(profile?.equity ?? 10000);
  const start = Number(profile?.starting_balance ?? 10000);
  const pct = ((equity / start - 1) * 100);
  const wins = closed.filter(t => Number(t.pnl) > 0).length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : null;
  const days = profile?.born_at ? Math.max(1, Math.floor((Date.now() - new Date(profile.born_at).getTime()) / 86_400_000)) : 1;

  // Build sparkline from closed trades cumulative pnl
  const sorted = [...closed].sort((a,b) => new Date(a.closed_at||0).getTime() - new Date(b.closed_at||0).getTime());
  const points: number[] = [start];
  let run = start;
  for (const t of sorted) { run += Number(t.pnl||0); points.push(run); }
  points.push(equity);

  return (
    <div className="rounded-2xl p-6" style={{
      border: "1px solid var(--stoa-gold-rule)",
      background: "linear-gradient(135deg, color-mix(in oklab, var(--stoa-accent) 8%, transparent), var(--stoa-shine))",
    }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>MANTEION · ΣΟΦΟΣ</div>
          <div className="stoa-display mt-1" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.05, color: "var(--stoa-ink)" }}>
            The Living Trader
          </div>
          <div className="stoa-greek mt-2" style={{ color: "var(--stoa-muted)", fontSize: 15, maxWidth: 520 }}>
            "{profile?.bio || "I trade what I'd want a student to see."}"
          </div>
        </div>
        <div className="text-right">
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>EQUITY</div>
          <div className="stoa-mono" style={{ fontSize: 28, fontWeight: 600, color: "var(--stoa-ink)" }}>
            £{equity.toLocaleString(undefined,{maximumFractionDigits:0})}
          </div>
          <div className="stoa-mono" style={{ fontSize: 13, color: pct >= 0 ? "var(--stoa-secondary)" : "var(--stoa-signal)" }}>
            {pct >= 0 ? "+" : ""}{pct.toFixed(2)}% all-time
          </div>
        </div>
      </div>

      <Sparkline points={points} />

      <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--stoa-rule)" }}>
        <Stat label="OPEN" value={`${openTrades.length}`} />
        <Stat label="CLOSED" value={`${closed.length}`} />
        <Stat label="WIN RATE" value={winRate !== null ? `${winRate}%` : "—"} />
        <Stat label="DAYS ALIVE" value={`${days}`} />
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>{label}</div>
    <div className="stoa-mono" style={{ fontSize: 16, color: "var(--stoa-ink)", marginTop: 2 }}>{value}</div>
  </div>
);

const Sparkline = ({ points }: { points: number[] }) => {
  if (points.length < 2) return <div style={{ height: 56, marginTop: 16 }} />;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const w = 100, h = 28;
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const up = last >= first;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 56, marginTop: 16, display: "block" }}>
      <path d={path} fill="none" stroke={up ? "var(--stoa-secondary)" : "var(--stoa-signal)"} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export default MentorHero;
