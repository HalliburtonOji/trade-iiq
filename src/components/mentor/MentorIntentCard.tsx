import { useEffect, useState } from "react";
import { Clock, Copy, Bell, Loader2, Check, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const MentorIntentCard = ({ intent }: { intent: any }) => {
  const [copies, setCopies] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.rpc("mentor_source_copy_count", { p_kind: "intent", p_id: intent.id })
      .then(({ data }) => setCopies(typeof data === "number" ? data : null));
  }, [intent.id]);

  const hoursLeft = Math.max(0, Math.round((new Date(intent.valid_until).getTime() - Date.now()) / 3600_000));
  const isLong = intent.direction === "long";

  const copy = async () => {
    setCopying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mentor-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ source_kind: "intent", source_id: intent.id }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Copy failed");
      setCopied(true);
      toast({ title: "Plan copied", description: `${intent.symbol} pending plan added to your demo book.` });
      setTimeout(() => navigate("/demo-trading"), 1200);
    } catch (e: any) {
      toast({ title: "Could not copy", description: e.message, variant: "destructive" });
    } finally { setCopying(false); }
  };

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
      {intent.invalidation_text && (
        <p className="stoa-kicker" style={{ color: "var(--stoa-signal)", opacity: 0.8 }}>
          INVALIDATE IF · {intent.invalidation_text}
        </p>
      )}

      <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--stoa-rule)" }}>
        <button onClick={copy} disabled={copying || copied}
          className="flex-1 rounded-lg py-2 px-3 flex items-center justify-center gap-2"
          style={{ background: "var(--stoa-accent)", color: "var(--stoa-bg)", fontFamily: "var(--stoa-font-kicker)", fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", opacity: copying||copied?0.6:1 }}>
          {copying ? <Loader2 size={12} className="animate-spin" /> : copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy plan"}
        </button>
        <button onClick={setAlert}
          className="rounded-lg py-2 px-3 flex items-center gap-2"
          style={{ border: "1px solid var(--stoa-rule)", color: "var(--stoa-ink)", fontFamily: "var(--stoa-font-kicker)", fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <Bell size={12} /> Alert
        </button>
      </div>
    </div>
  );
};

export default MentorIntentCard;
