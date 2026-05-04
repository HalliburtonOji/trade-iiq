import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

/**
 * Mirror Mode — opt-in auto-copy of every Sophos trade.
 * Each trade is sized to a user-chosen risk % of the user's paper account.
 */
const MentorMirrorToggle = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mirrorEnabled, setMirrorEnabled] = useState(false);
  const [riskPct, setRiskPct] = useState(0.5);
  const [copyCount, setCopyCount] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [{ data: f }, { count }] = await Promise.all([
        supabase.from("mentor_followers")
          .select("mirror_enabled, mirror_risk_pct").eq("user_id", user.id).maybeSingle(),
        supabase.from("mentor_copies")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id).eq("source_kind", "trade"),
      ]);

      if (f) {
        setMirrorEnabled(!!f.mirror_enabled);
        setRiskPct(Number(f.mirror_risk_pct) || 0.5);
      }
      setCopyCount(count ?? 0);
      setLoading(false);
    })();
  }, []);

  const persist = async (enabled: boolean, pct: number) => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("mentor_followers")
        .upsert({
          user_id: userId,
          mirror_enabled: enabled,
          mirror_risk_pct: pct,
        }, { onConflict: "user_id" });
      if (error) throw error;
      setMirrorEnabled(enabled);
      setRiskPct(pct);
      toast.success(enabled ? `Mirror Mode on · ${pct}% risk per trade` : "Mirror Mode off");
    } catch (e: any) {
      toast.error(e.message || "Could not save mirror settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!mirrorEnabled) {
      // Going from OFF to ON — show confirmation
      setConfirming(true);
      return;
    }
    await persist(false, riskPct);
  };

  const confirmEnable = async () => {
    setConfirming(false);
    await persist(true, riskPct);
  };

  if (loading) return null;
  if (!userId) return null;

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        background: "var(--stoa-surface)",
        border: `1px solid ${mirrorEnabled ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
      }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="rounded-full p-2 shrink-0"
            style={{
              background: mirrorEnabled ? "var(--stoa-accent)" : "var(--stoa-rule)",
              color: mirrorEnabled ? "var(--stoa-bg)" : "var(--stoa-muted)",
            }}
          >
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="stoa-kicker" style={{ color: "var(--stoa-ink)" }}>
              MIRROR MODE {mirrorEnabled && <span style={{ color: "var(--stoa-accent)" }}>· LIVE</span>}
            </div>
            <div className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-accent)", opacity: 0.8 }}>
              Μίμησις — auto-copy every Sophos trade
            </div>
            {copyCount !== null && copyCount > 0 && (
              <div style={{ fontSize: 12, color: "var(--stoa-muted)", marginTop: 4 }}>
                {copyCount} trade{copyCount === 1 ? "" : "s"} mirrored to date
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mirrorEnabled && (
            <select
              value={riskPct}
              disabled={saving}
              onChange={(e) => persist(true, Number(e.target.value))}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: "var(--stoa-bg)",
                border: "1px solid var(--stoa-rule)",
                color: "var(--stoa-ink)",
              }}
            >
              {[0.25, 0.5, 0.75, 1, 1.5, 2].map(p => (
                <option key={p} value={p}>{p}% risk</option>
              ))}
            </select>
          )}
          <button
            onClick={handleToggle}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: mirrorEnabled ? "transparent" : "var(--stoa-accent)",
              border: `1px solid ${mirrorEnabled ? "var(--stoa-rule)" : "var(--stoa-accent)"}`,
              color: mirrorEnabled ? "var(--stoa-muted)" : "var(--stoa-bg)",
            }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mirrorEnabled ? "Turn off" : "Turn on Mirror"}
          </button>
        </div>
      </div>

      {confirming && (
        <div
          className="mt-4 rounded-xl p-4"
          style={{ background: "var(--stoa-bg)", border: "1px solid var(--stoa-accent)" }}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0" style={{ color: "var(--stoa-accent)" }} />
            <div className="flex-1">
              <div className="stoa-kicker" style={{ color: "var(--stoa-ink)" }}>READ FIRST</div>
              <div style={{ fontSize: 13, color: "var(--stoa-muted)", marginTop: 6, lineHeight: 1.5 }}>
                When Mirror Mode is on, <b style={{ color: "var(--stoa-ink)" }}>every</b> trade Sophos opens will be auto-copied
                to your paper account, sized to <b style={{ color: "var(--stoa-ink)" }}>{riskPct}%</b> of your balance.
                You can turn this off any time. Past trades are <b>not</b> back-filled — you only mirror trades opened after now.
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={confirmEnable}
                  className="rounded-lg px-3 py-2 text-sm font-medium"
                  style={{ background: "var(--stoa-accent)", color: "var(--stoa-bg)" }}
                >
                  I understand — turn on
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: "transparent", border: "1px solid var(--stoa-rule)", color: "var(--stoa-muted)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorMirrorToggle;
