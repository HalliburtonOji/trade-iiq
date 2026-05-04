import MentorTradeCard from "./MentorTradeCard";

type Props = { closed: any[] };

function weekKey(d: string | null): string {
  if (!d) return "Earlier";
  const date = new Date(d);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  monday.setHours(0,0,0,0);
  return monday.toISOString().slice(0,10);
}

function weekLabel(key: string): string {
  if (key === "Earlier") return "Earlier";
  const d = new Date(key);
  const end = new Date(d); end.setDate(d.getDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  return `Week of ${fmt(d)} – ${fmt(end)}`;
}

const MentorPastList = ({ closed }: Props) => {
  if (!closed.length) {
    return (
      <div className="rounded-2xl py-12 text-center" style={{ border: "1px dashed var(--stoa-rule)", color: "var(--stoa-muted)" }}>
        <div className="stoa-greek" style={{ color: "var(--stoa-accent)", marginBottom: 6 }}>Παρελθόν</div>
        <div style={{ fontSize: 14 }}>No closed trades yet. Sophos has just begun.</div>
      </div>
    );
  }
  const groups = closed.reduce<Record<string, any[]>>((acc, t) => {
    const k = weekKey(t.closed_at);
    (acc[k] ||= []).push(t);
    return acc;
  }, {});
  const keys = Object.keys(groups).sort((a,b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {keys.map((k) => {
        const weekPnl = groups[k].reduce((s,t)=>s+Number(t.pnl||0),0);
        return (
          <div key={k}>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>{weekLabel(k)}</div>
              <div className="stoa-mono" style={{ fontSize: 12, color: weekPnl >= 0 ? "var(--stoa-secondary)" : "var(--stoa-signal)" }}>
                {weekPnl >= 0 ? "+" : ""}£{weekPnl.toFixed(0)}
              </div>
            </div>
            <div className="space-y-2">
              {groups[k].map((t) => <MentorTradeCard key={t.id} trade={t} closed />)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MentorPastList;
