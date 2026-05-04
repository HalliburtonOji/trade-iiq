import { useEffect, useMemo, useState } from "react";
import { Activity, Moon } from "lucide-react";
import MentorIntentTicker from "./MentorIntentTicker";

type Props = { profile: any; lastJournalAt?: string | null };

function isUSSession(now = new Date()): boolean {
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 570 && mins < 960;
}

const MentorPulse = ({ profile, lastJournalAt }: Props) => {
  const [now, setNow] = useState(Date.now());
  const [pulse, setPulse] = useState(false);

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (!lastJournalAt) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 2400);
    return () => clearTimeout(t);
  }, [lastJournalAt]);

  const inSession = isUSSession();
  const lastTickIso = profile?.stats_json?.last_tick || profile?.updated_at;
  const lastTickMs = lastTickIso ? new Date(lastTickIso).getTime() : null;
  const ageSec = lastTickMs ? Math.floor((now - lastTickMs) / 1000) : null;

  const cadenceMs = inSession ? 5 * 60_000 : 30 * 60_000;
  const nextInSec = lastTickMs ? Math.max(0, Math.floor((lastTickMs + cadenceMs - now) / 1000)) : null;
  const stalled = ageSec !== null && inSession && ageSec > 15 * 60;

  const ageLabel = useMemo(() => {
    if (ageSec === null) return "—";
    if (ageSec < 60) return `${ageSec}s ago`;
    if (ageSec < 3600) return `${Math.floor(ageSec/60)}m ago`;
    return `${Math.floor(ageSec/3600)}h ago`;
  }, [ageSec]);

  return (
    <div
      className="rounded-xl p-3 mb-4 transition-all space-y-3"
      style={{
        border: `1px solid ${pulse ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
        background: pulse ? "color-mix(in oklab, var(--stoa-accent) 8%, var(--stoa-shine))" : "var(--stoa-shine)",
        boxShadow: pulse ? "0 0 0 4px color-mix(in oklab, var(--stoa-accent) 18%, transparent)" : "none",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{
              background: stalled ? "var(--stoa-signal)" : inSession ? "var(--stoa-secondary)" : "var(--stoa-muted)",
              boxShadow: inSession && !stalled ? "0 0 8px var(--stoa-secondary)" : "none",
              animation: inSession && !stalled ? "stoa-pulse 1.6s ease-in-out infinite" : "none",
            }}
          />
          <div className="min-w-0">
            <div className="stoa-kicker" style={{ color: stalled ? "var(--stoa-signal)" : "var(--stoa-ink)" }}>
              {stalled ? "HEARTBEAT STALLED" : inSession ? "AWAKE · SCANNING" : "RESTING · OFF-SESSION"}
            </div>
            <div className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)", marginTop: 2 }}>
              last tick {ageLabel}{nextInSec !== null && !stalled ? ` · next in ${Math.floor(nextInSec/60)}m ${nextInSec%60}s` : ""}
            </div>
          </div>
        </div>
        <div style={{ color: "var(--stoa-muted)" }}>
          {inSession ? <Activity size={16} /> : <Moon size={16} />}
        </div>
      </div>

      <MentorIntentTicker />

      <style>{`@keyframes stoa-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
};

export default MentorPulse;
