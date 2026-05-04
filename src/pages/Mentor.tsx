import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StoaShell from "@/components/stoa/StoaShell";
import MentorHero from "@/components/mentor/MentorHero";
import MentorTradeCard from "@/components/mentor/MentorTradeCard";
import MentorIntentCard from "@/components/mentor/MentorIntentCard";
import MentorJournalFeed from "@/components/mentor/MentorJournalFeed";
import MentorPulse from "@/components/mentor/MentorPulse";
import MentorVsYou from "@/components/mentor/MentorVsYou";
import MentorPastList from "@/components/mentor/MentorPastList";
import { useMentorFocus } from "@/hooks/useMentorFocus";
import { Loader2 } from "lucide-react";

type Tab = "now" | "next" | "past" | "journal";

const Mentor = () => {
  const [tab, setTab] = useState<Tab>("now");
  const [profile, setProfile] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [intents, setIntents] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [closed, setClosed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastJournalAt, setLastJournalAt] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const focus = useMentorFocus();
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!focus.tab || !focus.stamp) return;
    setTab(focus.tab);
    if (!focus.itemId) return;
    const id = focus.itemId;
    setHighlightId(id);
    requestAnimationFrame(() => {
      setTimeout(() => {
        itemRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    });
    const t = setTimeout(() => setHighlightId(null), 2400);
    return () => clearTimeout(t);
  }, [focus.stamp]);

  const load = async () => {
    const [{ data: p }, { data: t }, { data: i }, { data: j }, { data: c }] = await Promise.all([
      supabase.from("mentor_profile").select("*").eq("slug","sophos").maybeSingle(),
      supabase.from("mentor_trades").select("*").eq("status","open").order("opened_at",{ascending:false}),
      supabase.from("mentor_intents").select("*").eq("status","pending").order("created_at",{ascending:false}),
      supabase.from("mentor_journal").select("*").order("created_at",{ascending:false}).limit(80),
      supabase.from("mentor_trades").select("*").eq("status","closed").order("closed_at",{ascending:false}).limit(60),
    ]);
    setProfile(p); setTrades(t||[]); setIntents(i||[]); setJournal(j||[]); setClosed(c||[]);
    if (j && j[0]) setLastJournalAt(j[0].created_at);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("mentor-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "mentor_trades" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "mentor_intents" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mentor_journal" }, (p: any) => {
        setLastJournalAt(p?.new?.created_at || new Date().toISOString());
        load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mentor_profile" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const tabs: { key: Tab; label: string; greek: string; count: number }[] = [
    { key: "now",     label: "NOW",     greek: "Παρόν",     count: trades.length },
    { key: "next",    label: "NEXT",    greek: "Μέλλον",    count: intents.length },
    { key: "past",    label: "PAST",    greek: "Παρελθόν",  count: closed.length },
    { key: "journal", label: "JOURNAL", greek: "Βίβλος",    count: journal.length },
  ];

  return (
    <StoaShell crumb="Manteion · Σοφός · The Living Trader">
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: "var(--stoa-muted)" }}>
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Awakening Sophos…
          </div>
        ) : (
          <>
            <MentorPulse profile={profile} lastJournalAt={lastJournalAt} />
            <MentorHero profile={profile} closed={closed} openTrades={trades} />

            <div className="flex items-center gap-1 mb-6 mt-8 overflow-x-auto" style={{ borderBottom: "1px solid var(--stoa-rule)" }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="relative px-4 py-3 text-left transition-all shrink-0"
                  style={{
                    color: tab === t.key ? "var(--stoa-ink)" : "var(--stoa-muted)",
                    borderBottom: tab === t.key ? "2px solid var(--stoa-accent)" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  <div className="stoa-kicker" style={{ color: "inherit" }}>
                    {t.label} <span style={{ opacity: 0.6 }}>· {t.count}</span>
                  </div>
                  <div className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-accent)", opacity: 0.7 }}>
                    {t.greek}
                  </div>
                </button>
              ))}
            </div>

            {tab === "now" && (
              <>
                <div className="space-y-3">
                  {trades.length === 0
                    ? <Empty msg="Sophos is in cash. Patience is a position." />
                    : trades.map((t) => <MentorTradeCard key={t.id} trade={t} />)}
                </div>
                <MentorVsYou profile={profile} mentorClosed={closed} />
              </>
            )}

            {tab === "next" && (
              <div className="space-y-3">
                {intents.length === 0
                  ? <Empty msg="No pending intents. Sophos is watching, not forcing." />
                  : intents.map((i) => <MentorIntentCard key={i.id} intent={i} />)}
              </div>
            )}

            {tab === "past" && <MentorPastList closed={closed} />}

            {tab === "journal" && <MentorJournalFeed entries={journal} />}
          </>
        )}
      </div>
    </StoaShell>
  );
};

const Empty = ({ msg }: { msg: string }) => (
  <div className="rounded-2xl py-12 text-center" style={{
    border: "1px dashed var(--stoa-rule)", color: "var(--stoa-muted)",
  }}>
    <div className="stoa-greek" style={{ color: "var(--stoa-accent)", marginBottom: 6 }}>Ἡσυχία</div>
    <div style={{ fontSize: 14 }}>{msg}</div>
  </div>
);

export default Mentor;
