import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScrollText } from "lucide-react";
import VoiceButton from "./VoiceButton";

type Letter = {
  id: string;
  week_starting: string;
  title: string;
  greek_phrase: string | null;
  body_md: string;
  trades_won: number;
  trades_lost: number;
  intents_published: number;
  intents_skipped: number;
  pnl_pct: number | null;
};

const MentorLetter = () => {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("mentor_letters").select("*").eq("mentor_slug", "sophos")
      .order("week_starting", { ascending: false }).limit(12)
      .then(({ data }) => { setLetters((data as Letter[]) || []); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-12" style={{ color: "var(--stoa-muted)" }}>
      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Reading the scrolls…
    </div>
  );

  if (letters.length === 0) {
    return (
      <div className="rounded-2xl py-12 text-center" style={{ border: "1px dashed var(--stoa-rule)", color: "var(--stoa-muted)" }}>
        <ScrollText size={20} style={{ color: "var(--stoa-accent)", margin: "0 auto 8px" }} />
        <div className="stoa-greek" style={{ color: "var(--stoa-accent)", marginBottom: 6 }}>Σιωπή</div>
        <div style={{ fontSize: 14 }}>No letters yet. Sophos writes every Sunday at 17:00 UTC.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {letters.map((l, idx) => (
        <article key={l.id} className="rounded-2xl p-5 space-y-3" style={{
          border: idx === 0 ? "1px solid var(--stoa-gold-rule)" : "1px solid var(--stoa-rule)",
          background: idx === 0
            ? "linear-gradient(135deg, color-mix(in oklab, var(--stoa-accent) 6%, transparent), var(--stoa-shine))"
            : "var(--stoa-surface)",
        }}>
          <header className="space-y-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>
                EPISTLE · WEEK OF {new Date(l.week_starting).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {idx === 0 && <span style={{ color: "var(--stoa-secondary)", marginLeft: 8 }}>· LATEST</span>}
              </div>
              {l.pnl_pct != null && (
                <span className="stoa-mono" style={{
                  fontSize: 12, fontWeight: 600,
                  color: Number(l.pnl_pct) >= 0 ? "var(--stoa-secondary)" : "var(--stoa-signal)",
                }}>
                  {Number(l.pnl_pct) >= 0 ? "+" : ""}{Number(l.pnl_pct).toFixed(2)}%
                </span>
              )}
            </div>
            <h3 style={{ fontFamily: "var(--stoa-font-display)", fontSize: 22, color: "var(--stoa-ink)", lineHeight: 1.25 }}>
              {l.title}
            </h3>
            {l.greek_phrase && (
              <div className="stoa-greek" style={{ color: "var(--stoa-accent)", fontSize: 14, fontStyle: "italic" }}>
                {l.greek_phrase}
              </div>
            )}
          </header>

          <div className="flex flex-wrap gap-x-4 gap-y-1 stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)", borderTop: "1px solid var(--stoa-rule)", borderBottom: "1px solid var(--stoa-rule)", padding: "8px 0" }}>
            <span><span style={{ color: "var(--stoa-secondary)" }}>{l.trades_won}W</span> · <span style={{ color: "var(--stoa-signal)" }}>{l.trades_lost}L</span></span>
            <span>{l.intents_published} intents published</span>
            <span>{l.intents_skipped} setups skipped</span>
          </div>

          <div style={{ color: "var(--stoa-ink)", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {l.body_md}
          </div>

          <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px dashed var(--stoa-rule)" }}>
            <VoiceButton text={`${l.title}. ${l.greek_phrase || ""}. ${l.body_md}`} label="Listen to letter" />
            <div className="stoa-greek" style={{ color: "var(--stoa-muted)", fontSize: 13, fontStyle: "italic" }}>— Σοφός</div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default MentorLetter;
