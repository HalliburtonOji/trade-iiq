import { TrendingUp, TrendingDown, SkipForward, Sparkles, CheckCircle2, Settings2, BookOpen } from "lucide-react";

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

const MentorJournalFeed = ({ entries }: { entries: any[] }) => {
  if (!entries.length) {
    return (
      <div className="rounded-2xl py-12 text-center" style={{ border: "1px dashed var(--stoa-rule)", color: "var(--stoa-muted)" }}>
        <div className="stoa-greek mb-1" style={{ color: "var(--stoa-accent)" }}>Σιωπή</div>
        Sophos has not spoken yet.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map((e) => {
        const Icon = ICONS[e.kind] ?? BookOpen;
        const t = new Date(e.created_at);
        return (
          <div key={e.id} className="flex gap-3 p-3 rounded-xl" style={{ border: "1px solid var(--stoa-rule)", background: "var(--stoa-shine)" }}>
            <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{
              background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)", color: "var(--stoa-accent)",
            }}>
              <Icon size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>{e.kind.replace("_"," ").toUpperCase()}</span>
                {e.symbol && <span className="stoa-mono" style={{ fontSize: 12, color: "var(--stoa-ink)" }}>{e.symbol}</span>}
                <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)", marginLeft: "auto" }}>
                  {t.toLocaleString(undefined,{ month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                </span>
              </div>
              <p style={{ color: "var(--stoa-ink)", fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>{e.body_text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MentorJournalFeed;
