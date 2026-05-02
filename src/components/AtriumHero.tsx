import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Prompt = {
  kicker: string;
  headline: string;
  body: string;
  cta: string;
  to: string;
};

/**
 * State-aware "what to do next" hero for the Atrium (/).
 * Priority: council ready > untethered open trade > closed trade unreviewed >
 * cold hand (no closed trade in 7d) > next codex reading.
 */
function startOfWeek(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // ISO Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export default function AtriumHero() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const weekStart = startOfWeek();
      const sevenAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const today = new Date().toISOString().slice(0, 10);
      const hour = new Date().getHours();

      const [council, openTrades, closedTrades, recentClosed, nextModule, todaysBrief, todaysReflection] = await Promise.all([
        supabase
          .from("council_reviews")
          .select("id, viewed_at, week_starting")
          .eq("user_id", user.id)
          .eq("week_starting", weekStart)
          .maybeSingle(),
        supabase
          .from("paper_trades")
          .select("id, symbol, thesis")
          .eq("user_id", user.id)
          .eq("status", "open")
          .order("opened_at", { ascending: false })
          .limit(5),
        supabase
          .from("paper_trades")
          .select("id, symbol, post_notes, closed_at")
          .eq("user_id", user.id)
          .eq("status", "closed")
          .order("closed_at", { ascending: false })
          .limit(1),
        supabase
          .from("paper_trades")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "closed")
          .gte("closed_at", sevenAgo),
        supabase
          .from("learn_modules")
          .select("slug, title_en, title_gr")
          .eq("is_published", true)
          .order("ordinal", { ascending: true })
          .limit(1),
        supabase
          .from("daily_briefs")
          .select("acknowledged_at")
          .eq("user_id", user.id)
          .eq("brief_date", today)
          .maybeSingle(),
        supabase
          .from("evening_reflections")
          .select("id")
          .eq("user_id", user.id)
          .eq("reflection_date", today)
          .maybeSingle(),
      ]);

      if (!active) return;

      // 0a. Sunday council always wins
      if (council.data && !council.data.viewed_at) {
        setPrompt({
          kicker: "THE COUNCIL · ΒΟΥΛΗ",
          headline: "The Council awaits. Hear thy verdict.",
          body: "Thy week is reviewed. A decree has been drafted.",
          cta: "Enter the Council",
          to: "/council",
        });
        setLoading(false);
        return;
      }

      // 0b. Morning ritual — before 10:00 local, brief not yet acknowledged
      if (hour < 10 && !todaysBrief.data?.acknowledged_at) {
        setPrompt({
          kicker: "ὌΡΘΡΟΣ · MORNING BRIEF",
          headline: "Read today's brief before the bell.",
          body: "One symbol of focus, one bias to watch, one rule to honour.",
          cta: "Open the brief",
          to: "/morning",
        });
        setLoading(false);
        return;
      }

      // 0c. Evening ritual — after 16:00 local, reflection not yet recorded
      if (hour >= 16 && !todaysReflection.data) {
        setPrompt({
          kicker: "ἙΣΠΈΡΑ · EVENING REFLECTION",
          headline: "Close the day with a single honest sentence.",
          body: "What did the market teach? Did rules hold? What guides tomorrow?",
          cta: "Reflect",
          to: "/evening",
        });
        setLoading(false);
        return;
      }

      // 2. Untethered open trade
      const untethered = (openTrades.data || []).find((t: any) => !t.thesis || t.thesis.trim().length < 8);
      if (untethered) {
        setPrompt({
          kicker: "AN UNTETHERED POSITION",
          headline: `${untethered.symbol} stands without a thesis.`,
          body: "A position with no reason cannot be reviewed. Anchor it now.",
          cta: "Anchor the trade",
          to: "/demo-trading",
        });
        setLoading(false);
        return;
      }

      // 3. Closed trade with no review
      const lastClosed = closedTrades.data?.[0];
      if (lastClosed && !lastClosed.post_notes) {
        setPrompt({
          kicker: "A CLOSED TRADE · ΘΕΑΣΙΣ",
          headline: `${lastClosed.symbol} is closed. Its lesson is not yet read.`,
          body: "A trade unreviewed is a tuition unpaid. Take the lesson now.",
          cta: "Review the trade",
          to: "/review",
        });
        setLoading(false);
        return;
      }

      // 4. Cold hand
      const recent = recentClosed.count ?? 0;
      if (recent === 0) {
        setPrompt({
          kicker: "THE HAND GROWS COLD",
          headline: "No closed trades in seven days.",
          body: "Practice keeps the eye sharp. Open a paper trade in the Gymnasium.",
          cta: "Enter the Gymnasium",
          to: "/demo-trading",
        });
        setLoading(false);
        return;
      }

      // 5. Default: today's reading
      const m = nextModule.data?.[0];
      setPrompt({
        kicker: "TODAY'S READING · ΚΩΔΙΞ",
        headline: m ? `${m.title_en}` : "Today's reading awaits in the Codex.",
        body: m?.title_gr ? `${m.title_gr} — a short reading and a quiz.` : "Continue thy study.",
        cta: "Open the Codex",
        to: m ? `/learn/${m.slug}` : "/learn",
      });
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  if (loading || !prompt) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: "100%",
          background: "var(--stoa-shine)",
          border: "1px solid var(--stoa-rule)",
          borderRadius: 2,
          padding: "22px 24px",
          marginBottom: 22,
          minHeight: 120,
        }}
      >
        <div style={{ width: 140, height: 10, background: "var(--stoa-rule)", marginBottom: 12, opacity: 0.6 }} />
        <div style={{ width: "70%", height: 18, background: "var(--stoa-rule)", marginBottom: 8, opacity: 0.5 }} />
        <div style={{ width: "50%", height: 12, background: "var(--stoa-rule)", opacity: 0.35 }} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(prompt.to)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "var(--stoa-shine)",
        border: "1px solid var(--stoa-accent)",
        borderRadius: 2,
        padding: "22px 24px",
        marginBottom: 22,
        cursor: "pointer",
        position: "relative",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <span className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>{prompt.kicker}</span>
          <h2
            className="stoa-display"
            style={{ marginTop: 6, marginBottom: 6, fontSize: 22, color: "var(--stoa-ink)", lineHeight: 1.25 }}
          >
            {prompt.headline}
          </h2>
          <p style={{ margin: 0, color: "var(--stoa-muted)", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
            {prompt.body}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--stoa-accent)", flexShrink: 0 }}>
          <span className="stoa-kicker">{prompt.cta}</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </button>
  );
}
