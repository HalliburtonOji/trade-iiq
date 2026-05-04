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

  const RISK_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2];

  return (
    <div
      className="rounded-2xl p-4 mb-4 transition-colors"
      style={{
        background: mirrorEnabled
          ? "color-mix(in oklab, var(--stoa-accent) 6%, var(--stoa-surface))"
          : "var(--stoa-surface)",
        border: `1px solid ${mirrorEnabled ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
      }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="rounded-full p-2 shrink-0 transition-colors"
            style={{
              background: mirrorEnabled ? "var(--stoa-accent)" : "var(--stoa-bg)",
              color: mirrorEnabled ? "var(--stoa-bg)" : "var(--stoa-muted)",
              border: mirrorEnabled ? "none" : "1px solid var(--stoa-rule)",
            }}
          >
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="stoa-kicker" style={{ color: "var(--stoa-ink)" }}>MIRROR MODE</div>
              {mirrorEnabled && (
                <span
                  className="stoa-mono inline-flex items-center gap-1"
                  style={{
                    fontSize: 9,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "var(--stoa-accent)",
                    color: "var(--stoa-bg)",
                    fontWeight: 600,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--stoa-bg)", animation: "stoa-pulse 1.4s ease-in-out infinite" }} />
                  LIVE
                </span>
              )}
            </div>
            <div className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-accent)", opacity: 0.85, marginTop: 2 }}>
              Μίμησις — auto-copy every Sophos trade
            </div>
            <div style={{ fontSize: 12, color: "var(--stoa-muted)", marginTop: 4 }}>
              {mirrorEnabled
                ? <>Sizing each trade to <b style={{ color: "var(--stoa-ink)" }}>{riskPct}% risk</b>{copyCount && copyCount > 0 ? <> · {copyCount} mirrored to date</> : null}</>
                : copyCount && copyCount > 0
                  ? <>Off · {copyCount} mirrored historically</>
                  : <>Off — turn on to auto-copy future trades</>}
            </div>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0"
          style={{
            background: mirrorEnabled ? "transparent" : "var(--stoa-accent)",
            border: `1px solid ${mirrorEnabled ? "var(--stoa-rule)" : "var(--stoa-accent)"}`,
            color: mirrorEnabled ? "var(--stoa-muted)" : "var(--stoa-bg)",
            minWidth: 120,
          }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : mirrorEnabled ? "Turn off" : "Turn on Mirror"}
        </button>
      </div>

      {mirrorEnabled && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--stoa-rule)" }}>
          <div className="stoa-kicker mb-2" style={{ color: "var(--stoa-muted)", fontSize: 9 }}>
            RISK PER TRADE
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {RISK_OPTIONS.map((p) => {
              const active = Math.abs(p - riskPct) < 0.001;
              return (
                <button
                  key={p}
                  disabled={saving}
                  onClick={() => persist(true, p)}
                  className="rounded-lg px-3 py-1.5 stoa-mono shrink-0 transition-colors"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    background: active ? "var(--stoa-accent)" : "var(--stoa-bg)",
                    color: active ? "var(--stoa-bg)" : "var(--stoa-ink)",
                    border: `1px solid ${active ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
                  }}
                >
                  {p}%
                </button>
              );
            })}
          </div>
        </div>
      )}

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
