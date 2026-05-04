import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, SkipForward, Sparkles, CheckCircle2, BookOpen, Settings2, Play, Pause } from "lucide-react";

const ICONS: Record<string, any> = {
  open: TrendingUp,
  close: TrendingDown,
  skip: SkipForward,
  intent_published: Sparkles,
  intent_resolved: CheckCircle2,
  adjust: Settings2,
  reflection_daily: BookOpen,
  reflection_weekly: BookOpen,
};

const KIND_LABEL: Record<string, string> = {
  open: "OPENED",
  close: "CLOSED",
  skip: "SKIPPED",
  intent_published: "PLANNED",
  intent_resolved: "RESOLVED",
  adjust: "ADJUSTED",
  reflection_daily: "REFLECTED",
  reflection_weekly: "WEEKLY",
};

type DayBucket = {
  date: string; // YYYY-MM-DD
  entries: any[];
  opened: number;
  closed: number;
  planned: number;
  skipped: number;
  pnl: number;
};

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

const fmtDate = (k: string) =>
  new Date(k + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

const MentorReplay = () => {
  const [loading, setLoading] = useState(true);
  const [journal, setJournal] = useState<any[]>([]);
  const [closed, setClosed] = useState<any[]>([]);
  const [dayIdx, setDayIdx] = useState(0); // 0 = most recent day with activity
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: j }, { data: c }] = await Promise.all([
        supabase.from("mentor_journal").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("mentor_trades").select("id,symbol,direction,pnl,pnl_percent,closed_at,entry_price,exit_price").eq("status", "closed").order("closed_at", { ascending: false }).limit(200),
      ]);
      setJournal(j || []);
      setClosed(c || []);
      setLoading(false);
    })();
  }, []);

  // Bucket all journal entries by day, attach pnl from closed trades.
  const days: DayBucket[] = useMemo(() => {
    const map = new Map<string, DayBucket>();
    for (const e of journal) {
      const k = dayKey(e.created_at);
      if (!map.has(k)) map.set(k, { date: k, entries: [], opened: 0, closed: 0, planned: 0, skipped: 0, pnl: 0 });
      const b = map.get(k)!;
      b.entries.push(e);
      if (e.kind === "open") b.opened++;
      else if (e.kind === "close") b.closed++;
      else if (e.kind === "intent_published") b.planned++;
      else if (e.kind === "skip") b.skipped++;
    }
    for (const t of closed) {
      if (!t.closed_at) continue;
      const k = dayKey(t.closed_at);
      if (!map.has(k)) map.set(k, { date: k, entries: [], opened: 0, closed: 0, planned: 0, skipped: 0, pnl: 0 });
      map.get(k)!.pnl += Number(t.pnl || 0);
    }
    // newest first
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [journal, closed]);

  // Auto-play: tick backwards through history every 1.8s
  useEffect(() => {
    if (!playing || days.length === 0) return;
    const t = window.setInterval(() => {
      setDayIdx((prev) => {
        if (prev >= days.length - 1) { setPlaying(false); return prev; }
        return prev + 1;
      });
    }, 1800);
    return () => window.clearInterval(t);
  }, [playing, days.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: "var(--stoa-muted)" }}>
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Rewinding the scroll…
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="rounded-2xl py-12 text-center" style={{ border: "1px dashed var(--stoa-rule)", color: "var(--stoa-muted)" }}>
        <div className="stoa-greek" style={{ color: "var(--stoa-accent)", marginBottom: 6 }}>Ἀναπόλησις</div>
        <div style={{ fontSize: 14 }}>Sophos has no past to replay yet.</div>
      </div>
    );
  }

  const day = days[Math.min(dayIdx, days.length - 1)];

  // Cumulative running stats up to & including this day (oldest → newest)
  const cumulative = useMemo(() => {
    const oldestFirst = [...days].reverse();
    let cumPnl = 0, cumTrades = 0, cumWins = 0;
    const upTo = oldestFirst.findIndex((d) => d.date === day.date);
    for (let i = 0; i <= upTo; i++) {
      cumPnl += oldestFirst[i].pnl;
      cumTrades += oldestFirst[i].closed;
    }
    // count wins by re-scanning closed trades up to this day
    for (const t of closed) {
      if (!t.closed_at) continue;
      if (dayKey(t.closed_at) <= day.date && Number(t.pnl) > 0) cumWins++;
    }
    return { cumPnl, cumTrades, cumWins };
  }, [day.date, days, closed]);

  const winRate = cumulative.cumTrades > 0 ? Math.round((cumulative.cumWins / cumulative.cumTrades) * 100) : 0;

  return (
    <div>
      {/* Scrubber */}
      <div
        className="rounded-2xl p-4 mb-6"
        style={{ background: "var(--stoa-surface)", border: "1px solid var(--stoa-rule)" }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="min-w-0">
            <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>REPLAYING</div>
            <div className="stoa-greek" style={{ color: "var(--stoa-accent)", fontSize: 12, opacity: 0.8 }}>Ἀναπόλησις · Recollection</div>
            <div style={{ fontSize: 16, color: "var(--stoa-ink)", marginTop: 4, fontWeight: 500 }}>
              {fmtDate(day.date)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Newer day"
              onClick={() => setDayIdx((i) => Math.max(0, i - 1))}
              disabled={dayIdx === 0}
              className="rounded-lg p-2 transition-opacity disabled:opacity-30"
              style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)", color: "var(--stoa-ink)" }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="rounded-lg px-3 py-2 text-sm flex items-center gap-2"
              style={{ background: playing ? "var(--stoa-accent)" : "var(--stoa-bg)", color: playing ? "var(--stoa-bg)" : "var(--stoa-ink)", border: "1px solid var(--stoa-rule)" }}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              aria-label="Older day"
              onClick={() => setDayIdx((i) => Math.min(days.length - 1, i + 1))}
              disabled={dayIdx >= days.length - 1}
              className="rounded-lg p-2 transition-opacity disabled:opacity-30"
              style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)", color: "var(--stoa-ink)" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={days.length - 1}
          value={dayIdx}
          onChange={(e) => setDayIdx(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "hsl(var(--accent, 220 13% 60%))" }}
        />
        <div className="flex justify-between mt-1 stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>
          <span>{days[days.length - 1]?.date}</span>
          <span>{days[0]?.date}</span>
        </div>

        {/* Day stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
          <Stat label="Planned" value={day.planned} />
          <Stat label="Opened" value={day.opened} />
          <Stat label="Closed" value={day.closed} />
          <Stat label="Skipped" value={day.skipped} />
          <Stat
            label="Day P&L"
            value={`${day.pnl >= 0 ? "+" : ""}£${day.pnl.toFixed(0)}`}
            tone={day.pnl > 0 ? "good" : day.pnl < 0 ? "bad" : "neutral"}
          />
        </div>
      </div>

      {/* Cumulative state-of-the-world */}
      <div
        className="rounded-2xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3"
        style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)" }}
      >
        <div>
          <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>SOPHOS AS OF THIS DAY</div>
          <div style={{ fontSize: 13, color: "var(--stoa-muted)", marginTop: 4 }}>
            Cumulative — what he had learned by the close of {new Date(day.date + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short" })}
          </div>
        </div>
        <div className="flex gap-4 stoa-mono" style={{ fontSize: 13 }}>
          <span style={{ color: "var(--stoa-ink)" }}>{cumulative.cumTrades} trades</span>
          <span style={{ color: "var(--stoa-ink)" }}>{winRate}% win</span>
          <span style={{ color: cumulative.cumPnl >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
            {cumulative.cumPnl >= 0 ? "+" : ""}£{cumulative.cumPnl.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Day timeline */}
      {day.entries.length === 0 ? (
        <div className="rounded-2xl py-10 text-center" style={{ border: "1px dashed var(--stoa-rule)", color: "var(--stoa-muted)" }}>
          A quiet day. Sophos watched and waited.
        </div>
      ) : (
        <div className="space-y-2">
          {[...day.entries].reverse().map((e) => {
            const Icon = ICONS[e.kind] ?? BookOpen;
            const t = new Date(e.created_at);
            return (
              <div
                key={e.id}
                className="flex gap-3 p-3 rounded-xl"
                style={{ border: "1px solid var(--stoa-rule)", background: "var(--stoa-shine)" }}
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)", color: "var(--stoa-accent)" }}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                      {KIND_LABEL[e.kind] ?? e.kind.replace("_", " ").toUpperCase()}
                    </span>
                    {e.symbol && (
                      <span className="stoa-mono" style={{ fontSize: 12, color: "var(--stoa-ink)" }}>{e.symbol}</span>
                    )}
                    <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)", marginLeft: "auto" }}>
                      {t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p style={{ color: "var(--stoa-ink)", fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>{e.body_text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "good" | "bad" | "neutral" }) => (
  <div className="rounded-xl p-2 text-center" style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)" }}>
    <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 9 }}>{label}</div>
    <div
      className="stoa-mono"
      style={{
        fontSize: 16,
        marginTop: 2,
        fontWeight: 600,
        color: tone === "good" ? "#22c55e" : tone === "bad" ? "#ef4444" : "var(--stoa-ink)",
      }}
    >
      {value}
    </div>
  </div>
);

export default MentorReplay;
