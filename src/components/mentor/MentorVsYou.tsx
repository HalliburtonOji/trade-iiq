import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = { profile: any; mentorClosed: any[] };

const MentorVsYou = ({ profile, mentorClosed }: Props) => {
  const [you, setYou] = useState<{ winRate: number | null; trades: number; equityPct: number | null }>({ winRate: null, trades: 0, equityPct: null });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: closed } = await supabase.from("paper_trades").select("pnl,pnl_percent").eq("user_id", user.id).eq("status","closed");
      const c = closed || [];
      const wins = c.filter(t => Number(t.pnl) > 0).length;
      const winRate = c.length ? Math.round((wins / c.length) * 100) : null;
      const totalPnl = c.reduce((s, t) => s + Number(t.pnl || 0), 0);
      const { data: prof } = await supabase.from("profiles").select("paper_balance").eq("user_id", user.id).maybeSingle();
      const startBal = 10000;
      const equityPct = totalPnl !== 0 ? (totalPnl / startBal) * 100 : (prof?.paper_balance ? ((Number(prof.paper_balance) / startBal - 1) * 100) : null);
      setYou({ winRate, trades: c.length, equityPct });
    })();
  }, []);

  const sWins = mentorClosed.filter(t => Number(t.pnl) > 0).length;
  const sWinRate = mentorClosed.length ? Math.round((sWins / mentorClosed.length) * 100) : null;
  const sEquity = Number(profile?.equity ?? 10000);
  const sStart = Number(profile?.starting_balance ?? 10000);
  const sEquityPct = ((sEquity / sStart) - 1) * 100;

  const Cell = ({ label, you, sophos, suffix = "%" }: { label: string; you: string | number | null; sophos: string | number | null; suffix?: string }) => {
    const yNum = typeof you === "number" ? you : null;
    const sNum = typeof sophos === "number" ? sophos : null;
    const delta = yNum !== null && sNum !== null ? yNum - sNum : null;
    const youAhead = delta !== null && delta > 0;
    return (
      <div className="flex-1 min-w-0">
        <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>{label}</div>
        <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
          <div>
            <div className="stoa-mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--stoa-ink)", lineHeight: 1 }}>
              {you === null || you === undefined ? "—" : `${you}${suffix}`}
            </div>
            <div className="stoa-kicker" style={{ fontSize: 9, color: "var(--stoa-muted)", marginTop: 2 }}>YOU</div>
          </div>
          <div style={{ color: "var(--stoa-muted)" }}>·</div>
          <div>
            <div className="stoa-mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--stoa-accent)", lineHeight: 1 }}>
              {sophos === null || sophos === undefined ? "—" : `${sophos}${suffix}`}
            </div>
            <div className="stoa-kicker" style={{ fontSize: 9, color: "var(--stoa-muted)", marginTop: 2 }}>SOPHOS</div>
          </div>
        </div>
        {delta !== null && (
          <div className="stoa-mono" style={{ fontSize: 11, marginTop: 6, color: youAhead ? "var(--stoa-secondary)" : "var(--stoa-signal)" }}>
            {youAhead ? "+" : ""}{delta.toFixed(1)}{suffix} {youAhead ? "vs Sophos" : "behind"}
          </div>
        )}
      </div>
    );
  };

  let takeaway = "Trade more to compare yourself against Sophos.";
  if (you.trades >= 3 && sWinRate !== null && you.winRate !== null) {
    if (you.winRate >= sWinRate + 5) takeaway = "You pick winners more often than Sophos. Now match the discipline on losers.";
    else if (sWinRate >= you.winRate + 5) takeaway = "Sophos converts more setups. Study the journal — what is he refusing that you take?";
    else takeaway = "Hit-rate is similar. Edge will come from how you size and exit, not from picking more.";
  }

  return (
    <div className="rounded-2xl p-5 mt-4" style={{ border: "1px solid var(--stoa-rule)", background: "var(--stoa-shine)" }}>
      <div className="stoa-kicker mb-3" style={{ color: "var(--stoa-accent)" }}>YOU vs ΣΟΦΟΣ</div>
      <div className="flex flex-wrap gap-6">
        <Cell label="WIN RATE" you={you.winRate} sophos={sWinRate} suffix="%" />
        <Cell label="EQUITY" you={you.equityPct !== null ? Number(you.equityPct.toFixed(1)) : null} sophos={Number(sEquityPct.toFixed(1))} suffix="%" />
        <Cell label="CLOSED TRADES" you={you.trades} sophos={mentorClosed.length} suffix="" />
      </div>
      <div style={{ fontSize: 13, color: "var(--stoa-muted)", marginTop: 14, fontStyle: "italic", lineHeight: 1.5 }}>
        {takeaway}
      </div>
    </div>
  );
};

export default MentorVsYou;
