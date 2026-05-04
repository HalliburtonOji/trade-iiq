import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Target, ShieldX, Hourglass } from "lucide-react";
import { toast } from "sonner";

type Choice = "tp_hit" | "sl_hit" | "expired";

const LABELS: Record<Choice, { label: string; greek: string; Icon: any }> = {
  tp_hit:  { label: "Hits target",  greek: "Νίκη",   Icon: Target },
  sl_hit:  { label: "Hits stop",    greek: "Πτῶσις", Icon: ShieldX },
  expired: { label: "Expires",      greek: "Σιωπή",  Icon: Hourglass },
};

const MentorPredictionPoll = ({ intentId, mentorSlug, symbol }: { intentId: string; mentorSlug: string; symbol: string }) => {
  const [me, setMe] = useState<Choice | null>(null);
  const [counts, setCounts] = useState<Record<Choice, number>>({ tp_hit: 0, sl_hit: 0, expired: 0 });
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data } = await supabase.from("mentor_predictions").select("prediction,user_id").eq("intent_id", intentId);
    const c: Record<Choice, number> = { tp_hit: 0, sl_hit: 0, expired: 0 };
    (data || []).forEach((r: any) => { c[r.prediction as Choice] = (c[r.prediction as Choice] || 0) + 1; });
    setCounts(c);
    const mine = (data || []).find((r: any) => r.user_id === user?.id);
    setMe((mine?.prediction as Choice) || null);
  };

  useEffect(() => { load(); }, [intentId]);

  const vote = async (choice: Choice) => {
    if (!userId) { toast.error("Sign in to vote."); return; }
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("mentor_predictions").upsert({
        user_id: userId, intent_id: intentId, mentor_slug: mentorSlug, symbol, prediction: choice,
      }, { onConflict: "user_id,intent_id" });
      if (error) throw error;
      setMe(choice);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Vote failed");
    } finally { setBusy(false); }
  };

  const total = counts.tp_hit + counts.sl_hit + counts.expired;

  return (
    <div className="rounded-lg p-3" style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>YOUR CALL</div>
        <div className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>{total} {total === 1 ? "vote" : "votes"}</div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(LABELS) as Choice[]).map((k) => {
          const { label, greek, Icon } = LABELS[k];
          const active = me === k;
          const pct = total ? Math.round((counts[k] / total) * 100) : 0;
          return (
            <button key={k} onClick={() => vote(k)} disabled={busy}
              className="rounded-md p-2 transition-all relative overflow-hidden"
              style={{
                background: active ? "var(--stoa-accent)" : "var(--stoa-surface)",
                border: `1px solid ${active ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
                color: active ? "var(--stoa-bg)" : "var(--stoa-ink)",
                textAlign: "left",
              }}>
              {!active && total > 0 && (
                <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: "color-mix(in oklab, var(--stoa-accent) 12%, transparent)" }} />
              )}
              <div style={{ position: "relative" }}>
                <div className="flex items-center gap-1">
                  <Icon size={11} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
                  {active && <CheckCircle2 size={11} style={{ marginLeft: "auto" }} />}
                </div>
                <div className="stoa-mono" style={{ fontSize: 10, marginTop: 2, opacity: 0.75 }}>{pct}%</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MentorPredictionPoll;
