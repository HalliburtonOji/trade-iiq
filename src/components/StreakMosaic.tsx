import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 30-day mosaic: filled stone = full day (morning+evening),
 * half = partial, empty = missed.
 */
type DayState = "full" | "morning" | "evening" | "missed";

function dateKey(d: Date) { return d.toISOString().slice(0, 10); }

export default function StreakMosaic() {
  const { user } = useAuth();
  const [days, setDays] = useState<{ key: string; state: DayState }[]>([]);
  const [current, setCurrent] = useState(0);
  const [longest, setLongest] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const start = new Date(today); start.setDate(start.getDate() - 29);
      const startISO = start.toISOString();

      const [briefsR, refR, streakR] = await Promise.all([
        supabase.from("daily_briefs").select("brief_date, acknowledged_at")
          .eq("user_id", user.id).gte("brief_date", dateKey(start)),
        supabase.from("evening_reflections").select("reflection_date")
          .eq("user_id", user.id).gte("reflection_date", dateKey(start)),
        supabase.from("practice_streak").select("current_streak, longest_streak")
          .eq("user_id", user.id).maybeSingle(),
      ]);

      if (!active) return;

      const morningSet = new Set(
        (briefsR.data ?? []).filter(b => b.acknowledged_at).map(b => b.brief_date as string)
      );
      const eveningSet = new Set((refR.data ?? []).map(r => r.reflection_date as string));

      const out: { key: string; state: DayState }[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const k = dateKey(d);
        const m = morningSet.has(k);
        const e = eveningSet.has(k);
        out.push({ key: k, state: m && e ? "full" : m ? "morning" : e ? "evening" : "missed" });
      }
      setDays(out);
      setCurrent(streakR.data?.current_streak ?? 0);
      setLongest(streakR.data?.longest_streak ?? 0);
    })();
    return () => { active = false; };
  }, [user]);

  return (
    <div style={{
      background: "var(--stoa-shine)",
      border: "1px solid var(--stoa-rule)",
      borderRadius: 2,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
          PRACTICE · ἝΞΙΣ · 30 DAYS
        </span>
        <span className="stoa-mono" style={{ color: "var(--stoa-ink)", fontSize: 13 }}>
          {current}<span style={{ color: "var(--stoa-muted)" }}> / longest {longest}</span>
        </span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(30, 1fr)",
        gap: 3,
      }}>
        {days.map((d) => {
          const bg =
            d.state === "full" ? "var(--stoa-accent)" :
            d.state === "morning" || d.state === "evening" ? "var(--stoa-rule)" :
            "transparent";
          const border = d.state === "missed" ? "1px solid var(--stoa-rule)" : "none";
          const opacity = d.state === "morning" || d.state === "evening" ? 0.7 : 1;
          return (
            <div
              key={d.key}
              title={`${d.key} · ${d.state}`}
              style={{
                aspectRatio: "1",
                background: bg,
                border,
                borderRadius: 1,
                opacity,
              }}
            />
          );
        })}
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 14, fontSize: 11, color: "var(--stoa-muted)" }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--stoa-accent)", marginRight: 4 }} /> full day</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--stoa-rule)", marginRight: 4 }} /> partial</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, border: "1px solid var(--stoa-rule)", marginRight: 4 }} /> missed</span>
      </div>
    </div>
  );
}
