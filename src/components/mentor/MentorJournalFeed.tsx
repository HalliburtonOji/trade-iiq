import { useState } from "react";
import { TrendingUp, TrendingDown, SkipForward, Sparkles, CheckCircle2, Settings2, BookOpen, ChevronDown } from "lucide-react";
import VoiceButton from "./VoiceButton";

const ICONS: Record<string, any> = {
  open: TrendingUp,
  close: TrendingDown,
  skip: SkipForward,
  intent_published: Sparkles,
  intent_resolved: CheckCircle2,
  adjust: Settings2,
  manage: Settings2,
  reflection_daily: BookOpen,
  reflection_weekly: BookOpen,
};

const KIND_COLORS: Record<string, string> = {
  open: "var(--stoa-secondary)",
  close: "var(--stoa-signal)",
  skip: "var(--stoa-muted)",
  intent_published: "var(--stoa-accent)",
  intent_resolved: "var(--stoa-secondary)",
  manage: "var(--stoa-accent)",
};

const SkipDetails = ({ payload, body_text }: { payload: any; body_text: string }) => {
  const reasons: string[] = Array.isArray(payload?.fail_reasons) ? payload.fail_reasons : [];
  const ctx = payload?.ctx || payload?.context || null;
  const skipReason = payload?.skip_reason;
  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--stoa-rule)" }}>
      {skipReason && (
        <div style={{ fontSize: 12, color: "var(--stoa-ink)", lineHeight: 1.5, marginBottom: 8, fontStyle: "italic" }}>"{skipReason}"</div>
      )}
      {reasons.length > 0 && (
        <ul className="space-y-0.5 mb-2" style={{ color: "var(--stoa-muted)", fontSize: 12, lineHeight: 1.45 }}>
          {reasons.slice(0, 4).map((r, i) => (
            <li key={i} className="flex gap-2"><span style={{ color: "var(--stoa-signal)" }}>·</span><span>{r}</span></li>
          ))}
        </ul>
      )}
      {ctx && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 stoa-mono mt-2" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>
          {ctx.price != null && <span>price {Number(ctx.price).toFixed(2)}</span>}
          {ctx.rsi14 != null && <span>RSI {Number(ctx.rsi14).toFixed(1)}</span>}
          {ctx.trend && <span>trend {ctx.trend}</span>}
          {ctx.vol_regime && <span>vol {ctx.vol_regime}</span>}
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--stoa-muted)", marginTop: 8, lineHeight: 1.5 }}>
        <span className="stoa-greek" style={{ color: "var(--stoa-accent)" }}>Διδαχή · </span>
        Skipping IS the lesson. The setup didn't meet his standard — note what was missing and watch how the chart resolves.
      </div>
    </div>
  );
};

const FeedRow = ({ e }: { e: any }) => {
  const Icon = ICONS[e.kind] ?? BookOpen;
  const t = new Date(e.created_at);
  const isSkip = e.kind === "skip";
  const [open, setOpen] = useState(false);

  return (
    <div className="flex gap-3 p-3 rounded-xl transition-colors" style={{
      border: `1px solid ${isSkip && open ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
      background: "var(--stoa-shine)",
      cursor: isSkip ? "pointer" : "default",
    }} onClick={isSkip ? () => setOpen((o) => !o) : undefined}>
      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{
        background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)",
        color: KIND_COLORS[e.kind] || "var(--stoa-accent)",
      }}>
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="stoa-kicker" style={{ color: KIND_COLORS[e.kind] || "var(--stoa-muted)" }}>{e.kind.replace("_", " ").toUpperCase()}</span>
          {e.symbol && <span className="stoa-mono" style={{ fontSize: 12, color: "var(--stoa-ink)" }}>{e.symbol}</span>}
          <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)", marginLeft: "auto" }}>
            {t.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          {isSkip && <ChevronDown size={12} style={{ color: "var(--stoa-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />}
        </div>
        <p style={{ color: "var(--stoa-ink)", fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>{e.body_text}</p>
        {isSkip && open && <SkipDetails payload={e.payload || {}} body_text={e.body_text} />}
      </div>
    </div>
  );
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
      {entries.map((e) => <FeedRow key={e.id} e={e} />)}
    </div>
  );
};

export default MentorJournalFeed;
