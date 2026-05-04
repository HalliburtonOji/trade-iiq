import { useEffect, useState } from "react";
import { Clock, Copy, Bell, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MentorPlanDiff from "./MentorPlanDiff";

const MentorIntentCard = ({ intent }: { intent: any }) => {
  const [copies, setCopies] = useState<number | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  useEffect(() => {
    supabase.rpc("mentor_source_copy_count", { p_kind: "intent", p_id: intent.id })
      .then(({ data }) => setCopies(typeof data === "number" ? data : null));
  }, [intent.id]);

  const hoursLeft = Math.max(0, Math.round((new Date(intent.valid_until).getTime() - Date.now()) / 3600_000));
  const isLong = intent.direction === "long";

  const setAlert = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("mentor_intent_watchers").insert({ user_id: user.id, intent_id: intent.id });
    if (intent.trigger_value && (intent.trigger_kind === "price_above" || intent.trigger_kind === "price_below")) {
      await supabase.from("price_alerts").insert({
        user_id: user.id, symbol: intent.symbol,
        target_price: Number(intent.trigger_value),
        direction: intent.trigger_kind === "price_above" ? "above" : "below",
      });
    }
    toast({ title: "Watching this plan", description: `We'll ping you when Sophos opens ${intent.symbol}.` });
  };

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{
      border: "1px solid var(--stoa-gold-rule)",
      background: "linear-gradient(135deg, color-mix(in oklab, var(--stoa-accent) 5%, transparent), var(--stoa-shine))",
    }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="stoa-mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--stoa-ink)" }}>{intent.symbol}</span>
            <span className="stoa-kicker" style={{ color: isLong ? "var(--stoa-secondary)" : "var(--stoa-signal)" }}>
              {intent.direction.toUpperCase()}
            </span>
            <span className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>· PENDING INTENT</span>
          </div>
          <p style={{ color: "var(--stoa-ink)", fontSize: 14, lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>
            "{intent.trigger_condition_text}"
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0" style={{ color: "var(--stoa-muted)" }}>
          {hoursLeft > 0 ? <Clock size={12} /> : <Hourglass size={12} />}
          <span className="stoa-mono" style={{ fontSize: 11 }}>{hoursLeft}h</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 stoa-mono" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>
        {intent.entry_hint && <span>entry ~{Number(intent.entry_hint).toFixed(2)}</span>}
        <span>sl {Number(intent.stop_loss).toFixed(2)}</span>
        <span>tp {Number(intent.take_profit).toFixed(2)}</span>
        <span>risk {intent.size_pct}%</span>
        {copies !== null && copies > 0 && <span style={{ color: "var(--stoa-accent)" }}>· {copies} copied</span>}
      </div>

      {intent.thesis && (
        <p style={{ color: "var(--stoa-muted)", fontSize: 13, lineHeight: 1.5 }}>{intent.thesis}</p>
      )}

      {intent.conviction != null && (
        <div className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)" }}>
          <div className="flex items-center gap-1.5">
            <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>CONVICTION</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((n) => (
                <span key={n} className="h-1.5 w-3 rounded-sm" style={{
                  background: n <= Number(intent.conviction)
                    ? (Number(intent.conviction) >= 4 ? "var(--stoa-secondary)" : Number(intent.conviction) >= 3 ? "var(--stoa-accent)" : "var(--stoa-signal)")
                    : "var(--stoa-rule)",
                }} />
              ))}
            </div>
            <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-ink)", marginLeft: 4 }}>{intent.conviction}/5</span>
          </div>
        </div>
      )}

      {Array.isArray(intent.fail_reasons) && intent.fail_reasons.length > 0 && (
        <div className="space-y-1">
          <div className="stoa-kicker" style={{ color: "var(--stoa-signal)", opacity: 0.85 }}>HOW THIS COULD FAIL</div>
          <ul className="space-y-0.5" style={{ color: "var(--stoa-muted)", fontSize: 12, lineHeight: 1.45 }}>
            {intent.fail_reasons.slice(0,3).map((r: string, idx: number) => (
              <li key={idx} className="flex gap-2"><span style={{ color: "var(--stoa-signal)" }}>·</span><span>{r}</span></li>
            ))}
          </ul>
        </div>
      )}

      {intent.invalidation_text && (
        <p className="stoa-kicker" style={{ color: "var(--stoa-signal)", opacity: 0.8 }}>
          INVALIDATE IF · {intent.invalidation_text}
        </p>
      )}

      <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--stoa-rule)" }}>
        <button onClick={() => setDiffOpen(true)}
          className="flex-1 rounded-lg py-2 px-3 flex items-center justify-center gap-2"
          style={{ background: "var(--stoa-accent)", color: "var(--stoa-bg)", fontFamily: "var(--stoa-font-kicker)", fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <Copy size={12} /> Preview & copy
        </button>
        <button onClick={setAlert}
          className="rounded-lg py-2 px-3 flex items-center gap-2"
          style={{ border: "1px solid var(--stoa-rule)", color: "var(--stoa-ink)", fontFamily: "var(--stoa-font-kicker)", fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <Bell size={12} /> Alert
        </button>
      </div>

      <MentorPlanDiff
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        source={{
          kind: "intent",
          id: intent.id,
          symbol: intent.symbol,
          direction: intent.direction,
          entry: Number(intent.entry_hint || intent.trigger_value),
          stop_loss: Number(intent.stop_loss),
          take_profit: Number(intent.take_profit),
          size_pct: Number(intent.size_pct),
          thesis: intent.thesis,
        }}
      />
    </div>
  );
};

export default MentorIntentCard;
