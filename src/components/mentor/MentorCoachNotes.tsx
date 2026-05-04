import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircleHeart } from "lucide-react";

const TONE_COLORS: Record<string, string> = {
  praise: "var(--stoa-secondary)",
  caution: "var(--stoa-accent)",
  critique: "var(--stoa-signal)",
  neutral: "var(--stoa-muted)",
};

const MentorCoachNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("mentor_coach_notes")
        .select("*").order("created_at", { ascending: false }).limit(8);
      if (!active) return;
      setNotes(data || []); setLoading(false);
    })();
    const ch = supabase.channel("coach-notes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mentor_coach_notes" },
        (p: any) => setNotes((n) => [p.new, ...n].slice(0, 8)))
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  if (loading || notes.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 mt-6" style={{ background: "var(--stoa-surface)", border: "1px solid var(--stoa-rule)" }}>
      <div className="flex items-center gap-2 mb-3">
        <MessageCircleHeart size={14} style={{ color: "var(--stoa-accent)" }} />
        <div className="stoa-kicker" style={{ color: "var(--stoa-ink)" }}>SOPHOS — ON YOUR TRADES</div>
        <div className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-accent)", marginLeft: "auto" }}>Συμβουλή</div>
      </div>
      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg p-3" style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)" }}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="stoa-kicker" style={{ color: TONE_COLORS[n.tone] || "var(--stoa-muted)" }}>{(n.tone || "neutral").toUpperCase()}</span>
              {n.symbol && <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-ink)" }}>{n.symbol}</span>}
              <span className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)", marginLeft: "auto" }}>
                {new Date(n.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--stoa-ink)", lineHeight: 1.45, fontWeight: 500 }}>{n.headline}</div>
            <div style={{ fontSize: 13, color: "var(--stoa-muted)", lineHeight: 1.55, marginTop: 4 }}>{n.body_text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MentorCoachNotes;
