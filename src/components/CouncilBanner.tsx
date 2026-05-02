import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Sunday after 18:00 local: show until clicked or dismissed.
 * Persists by writing viewed_at on council_reviews row when clicked.
 */
function startOfWeek(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export default function CouncilBanner() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const isSundayEvening = now.getDay() === 0 && now.getHours() >= 18;
    if (!isSundayEvening) return;

    const dismissedKey = `council-banner-dismissed-${startOfWeek()}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(dismissedKey)) return;

    let active = true;
    (async () => {
      const { data } = await supabase
        .from("council_reviews")
        .select("id, viewed_at")
        .eq("user_id", user.id)
        .eq("week_starting", startOfWeek())
        .maybeSingle();
      if (!active) return;
      // Show even if no row yet — clicking will trigger summary generation server-side.
      if (data?.viewed_at) return;
      setReviewId(data?.id ?? null);
      setShow(true);
    })();
    return () => { active = false; };
  }, [user]);

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`council-banner-dismissed-${startOfWeek()}`, "1");
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <Link
      to="/council"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 16px",
        marginBottom: 16,
        background: "var(--stoa-bg)",
        border: "1px solid var(--stoa-accent)",
        borderRadius: 2,
        color: "var(--stoa-ink)",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--stoa-accent)",
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <span className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>
            ΒΟΥΛΗ · THE COUNCIL CONVENES
          </span>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-ink)", marginTop: 2 }}>
            Thy week awaits judgement. {reviewId ? "Verdict cached." : "Verdict pending."}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>ENTER</span>
        <ChevronRight size={16} style={{ color: "var(--stoa-accent)" }} />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--stoa-muted)",
            cursor: "pointer",
            padding: 4,
            marginLeft: 4,
          }}
        >
          <X size={14} />
        </button>
      </div>
    </Link>
  );
}
