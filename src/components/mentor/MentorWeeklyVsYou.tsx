import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Loader2 } from "lucide-react";

type WeekRow = { weekKey: string; label: string; userR: number; mentorR: number };

function mondayKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function weekLabel(key: string): string {
  const d = new Date(key + "T12:00:00Z");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** R-multiple = realised P&L ÷ initial risk (|entry - stop|). */
function calcR(t: any): number | null {
  const entry = Number(t.entry_price);
  const sl = Number(t.stop_loss);
  const exit = Number(t.exit_price);
  if (!entry || !sl || !exit) return null;
  const risk = Math.abs(entry - sl);
  if (!risk) return null;
  const dir = t.direction === "short" ? -1 : 1;
  return ((exit - entry) * dir) / risk;
}

const MentorWeeklyVsYou = ({ mentorSlug = "sophos" }: { mentorSlug?: string }) => {
  const [loading, setLoading] = useState(true);
  const [userTrades, setUserTrades] = useState<any[]>([]);
  const [mentorTrades, setMentorTrades] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const sinceIso = new Date(Date.now() - 8 * 7 * 86400_000).toISOString();

      const [userRes, mentorRes] = await Promise.all([
        user ? supabase.from("paper_trades")
          .select("entry_price, exit_price, stop_loss, direction, closed_at, pnl")
          .eq("user_id", user.id).eq("status", "closed")
          .gte("closed_at", sinceIso) : Promise.resolve({ data: [] }),
        supabase.from("mentor_trades")
          .select("entry_price, exit_price, stop_loss, direction, closed_at, pnl, mentor_slug")
          .eq("mentor_slug", mentorSlug).eq("status", "closed")
          .gte("closed_at", sinceIso),
      ]);
      setUserTrades(userRes.data || []);
      setMentorTrades(mentorRes.data || []);
      setLoading(false);
    })();
  }, [mentorSlug]);

  const rows: WeekRow[] = useMemo(() => {
    const map = new Map<string, WeekRow>();
    const ensure = (k: string) => {
      if (!map.has(k)) map.set(k, { weekKey: k, label: `Week of ${weekLabel(k)}`, userR: 0, mentorR: 0 });
      return map.get(k)!;
    };
    for (const t of userTrades) {
      if (!t.closed_at) continue;
      const r = calcR(t); if (r === null) continue;
      ensure(mondayKey(t.closed_at)).userR += r;
    }
    for (const t of mentorTrades) {
      if (!t.closed_at) continue;
      const r = calcR(t); if (r === null) continue;
      ensure(mondayKey(t.closed_at)).mentorR += r;
    }
    return Array.from(map.values()).sort((a, b) => b.weekKey.localeCompare(a.weekKey)).slice(0, 6);
  }, [userTrades, mentorTrades]);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 mt-4 flex items-center gap-2" style={{ border: "1px solid var(--stoa-rule)", color: "var(--stoa-muted)" }}>
        <Loader2 className="h-4 w-4 animate-spin" /> Counting weeks…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl p-5 mt-4 text-center" style={{ border: "1px dashed var(--stoa-rule)", color: "var(--stoa-muted)" }}>
        <div className="stoa-greek mb-1" style={{ color: "var(--stoa-accent)" }}>Ἀγών</div>
        <div style={{ fontSize: 13 }}>Close at least one trade with a stop-loss to start the weekly contest.</div>
      </div>
    );
  }

  // Scale for bar widths
  const maxAbs = Math.max(1, ...rows.flatMap((r) => [Math.abs(r.userR), Math.abs(r.mentorR)]));

  // Tally for streaks
  let userWins = 0, mentorWins = 0;
  rows.forEach((r) => {
    if (r.userR > r.mentorR) userWins++;
    else if (r.mentorR > r.userR) mentorWins++;
  });

  const verdict =
    userWins > mentorWins ? "You're outpacing Sophos — discipline is starting to compound."
      : mentorWins > userWins ? "Sophos is ahead. Study his journal — what is he refusing that you take?"
        : "Neck and neck. The next week of patience decides.";

  const totalUserR = rows.reduce((s, r) => s + r.userR, 0);
  const totalMentorR = rows.reduce((s, r) => s + r.mentorR, 0);
  const youAheadOverall = totalUserR > totalMentorR;

  return (
    <div className="rounded-2xl p-5 mt-4" style={{ border: "1px solid var(--stoa-rule)", background: "var(--stoa-shine)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>WEEKLY R-MULTIPLE</div>
          <div className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-accent)", opacity: 0.75, marginTop: 2 }}>
            Ἀγών · The Contest
          </div>
        </div>
        <div
          className="flex items-center gap-2 stoa-mono rounded-lg px-2.5 py-1"
          style={{ fontSize: 12, background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)" }}
        >
          <Trophy size={14} style={{ color: youAheadOverall ? "var(--stoa-ink)" : "var(--stoa-accent)" }} />
          <span style={{ color: "var(--stoa-ink)", fontWeight: 600 }}>You {userWins}</span>
          <span style={{ color: "var(--stoa-muted)" }}>·</span>
          <span style={{ color: "var(--stoa-accent)", fontWeight: 600 }}>Sophos {mentorWins}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 stoa-kicker" style={{ fontSize: 9, color: "var(--stoa-muted)" }}>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--stoa-ink)" }} />
          YOU · {totalUserR >= 0 ? "+" : ""}{totalUserR.toFixed(2)}R
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--stoa-accent)" }} />
          SOPHOS · {totalMentorR >= 0 ? "+" : ""}{totalMentorR.toFixed(2)}R
        </div>
      </div>

      <div className="space-y-2.5">
        {rows.map((r) => {
          const userPct = (Math.abs(r.userR) / maxAbs) * 100;
          const mentorPct = (Math.abs(r.mentorR) / maxAbs) * 100;
          const youAhead = r.userR > r.mentorR;
          const tied = r.userR === r.mentorR;
          return (
            <div key={r.weekKey}>
              <div className="flex items-center justify-between mb-1">
                <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>{r.label}</span>
                <span
                  className="stoa-kicker"
                  style={{
                    fontSize: 9,
                    color: tied ? "var(--stoa-muted)" : youAhead ? "#22c55e" : "var(--stoa-accent)",
                  }}
                >
                  {tied ? "TIE" : youAhead ? "YOU AHEAD" : "SOPHOS AHEAD"}
                </span>
              </div>
              <BarRow label="YOU"    r={r.userR}   pct={userPct}   accent="var(--stoa-ink)" />
              <BarRow label="SOPHOS" r={r.mentorR} pct={mentorPct} accent="var(--stoa-accent)" />
            </div>
          );
        })}
      </div>

      <div
        className="rounded-lg p-3 mt-4"
        style={{
          background: "var(--stoa-bg)",
          border: "1px solid var(--stoa-rule)",
          fontSize: 13,
          color: "var(--stoa-ink)",
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        {verdict}
      </div>
    </div>
  );
};

const BarRow = ({ label, r, pct, accent }: { label: string; r: number; pct: number; accent: string }) => {
  const positive = r >= 0;
  return (
    <div className="flex items-center gap-2 my-1">
      <span className="stoa-kicker shrink-0" style={{ width: 56, fontSize: 9, color: "var(--stoa-muted)" }}>{label}</span>
      <div
        className="flex-1 h-5 rounded-md relative overflow-hidden"
        style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)" }}
      >
        {/* center axis */}
        <div className="absolute top-0 bottom-0" style={{ left: "50%", width: 1, background: "var(--stoa-rule)", opacity: 0.7 }} />
        <div
          className="absolute top-0 bottom-0 transition-all"
          style={{
            width: `${Math.max(2, pct / 2)}%`,
            background: positive ? accent : "color-mix(in srgb, #ef4444 70%, var(--stoa-bg))",
            opacity: positive ? 0.9 : 0.75,
            left: positive ? "50%" : "auto",
            right: positive ? "auto" : "50%",
          }}
        />
      </div>
      <span
        className="stoa-mono shrink-0"
        style={{
          width: 60,
          fontSize: 12,
          fontWeight: 600,
          textAlign: "right",
          color: positive ? "var(--stoa-ink)" : "#ef4444",
        }}
      >
        {positive ? "+" : ""}{r.toFixed(2)}R
      </span>
    </div>
  );
};

export default MentorWeeklyVsYou;
