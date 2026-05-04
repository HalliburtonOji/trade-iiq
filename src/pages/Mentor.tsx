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
import MentorWatchlistRadar from "@/components/mentor/MentorWatchlistRadar";
import MentorLetter from "@/components/mentor/MentorLetter";
import MentorCaseStudyCard from "@/components/mentor/MentorCaseStudyCard";
import MentorMirrorToggle from "@/components/mentor/MentorMirrorToggle";
import MentorReplay from "@/components/mentor/MentorReplay";
import MentorPersonaSwitcher from "@/components/mentor/MentorPersonaSwitcher";
import MentorWeeklyVsYou from "@/components/mentor/MentorWeeklyVsYou";
import MentorMissedWinners from "@/components/mentor/MentorMissedWinners";
import MentorFollowButton from "@/components/mentor/MentorFollowButton";
import MentorConvictionScorecard from "@/components/mentor/MentorConvictionScorecard";
import MentorCoachNotes from "@/components/mentor/MentorCoachNotes";
import MissedTradeSheet from "@/components/mentor/MissedTradeSheet";
import { useMentorFocus } from "@/hooks/useMentorFocus";
import { Loader2 } from "lucide-react";

type Tab = "now" | "next" | "past" | "cases" | "replay" | "journal" | "epistle";

const Mentor = () => {
  const [tab, setTab] = useState<Tab>("now");
  const [mentorSlug, setMentorSlug] = useState<string>("sophos");
  const [profile, setProfile] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [intents, setIntents] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [closed, setClosed] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastJournalAt, setLastJournalAt] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [missedSheet, setMissedSheet] = useState<{ open: boolean; symbol: string; context: string; tradeId: string | null; pnl: number | null }>({
    open: false, symbol: "", context: "", tradeId: null, pnl: null,
  });
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

  const load = async (slug: string = mentorSlug) => {
    setLoading(true);
    const [{ data: p }, { data: t }, { data: i }, { data: j }, { data: c }, { data: cs }] = await Promise.all([
      supabase.from("mentor_profile").select("*").eq("slug", slug).maybeSingle(),
      supabase.from("mentor_trades").select("*").eq("mentor_slug", slug).eq("status","open").order("opened_at",{ascending:false}),
      supabase.from("mentor_intents").select("*").eq("mentor_slug", slug).eq("status","pending").order("created_at",{ascending:false}),
      supabase.from("mentor_journal").select("*").eq("mentor_slug", slug).order("created_at",{ascending:false}).limit(80),
      supabase.from("mentor_trades").select("*").eq("mentor_slug", slug).eq("status","closed").order("closed_at",{ascending:false}).limit(60),
      supabase.from("mentor_case_studies").select("id,symbol,direction,outcome,r_multiple,title,hook,tags,greek_phrase,created_at,mentor_slug").eq("mentor_slug", slug).order("created_at",{ascending:false}).limit(30),
    ]);
    setProfile(p); setTrades(t||[]); setIntents(i||[]); setJournal(j||[]); setClosed(c||[]); setCases(cs||[]);
    if (j && j[0]) setLastJournalAt(j[0].created_at);
    setLoading(false);
  };

  useEffect(() => {
    load(mentorSlug);
  }, [mentorSlug]);

  // URL-driven Missed Trade prompt: /mentor?missed=AAPL&dir=long&price=192.40&trade=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get("missed");
    if (!symbol) return;
    const dir = params.get("dir") || "long";
    const price = params.get("price") || "";
    const tradeId = params.get("trade");
    setMissedSheet({
      open: true,
      symbol,
      context: `Sophos opened ${symbol} ${dir.toUpperCase()}${price ? ` at ${price}` : ""}.`,
      tradeId,
      pnl: null,
    });
    // Clean the URL so refresh doesn't re-trigger
    const url = new URL(window.location.href);
    ["missed", "dir", "price", "trade"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    // Daily Mission tick: visited the mentor (idempotent per day)
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.rpc("award_xp", {
        p_amount: 5, p_source: "mentor_visit",
        p_ref_id: today, p_ref_table: null as any,
      });
    })();
    const ch = supabase.channel("mentor-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "mentor_trades" }, () => load(mentorSlug))
      .on("postgres_changes", { event: "*", schema: "public", table: "mentor_intents" }, () => load(mentorSlug))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mentor_journal" }, (p: any) => {
        setLastJournalAt(p?.new?.created_at || new Date().toISOString());
        load(mentorSlug);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mentor_profile" }, () => load(mentorSlug))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [mentorSlug]);

  const tabs: { key: Tab; label: string; greek: string; count: number }[] = [
    { key: "now",     label: "NOW",     greek: "Παρόν",        count: trades.length },
    { key: "next",    label: "NEXT",    greek: "Μέλλον",       count: intents.length },
    { key: "past",    label: "PAST",    greek: "Παρελθόν",     count: closed.length },
    { key: "cases",   label: "CASES",   greek: "Αὐτοψία",      count: cases.length },
    { key: "replay",  label: "REPLAY",  greek: "Ἀναπόλησις",   count: 0 },
    { key: "journal", label: "JOURNAL", greek: "Βίβλος",       count: journal.length },
    { key: "epistle", label: "EPISTLE", greek: "Ἐπιστολή",     count: 0 },
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
            <MentorPersonaSwitcher active={mentorSlug} onChange={setMentorSlug} />
            <MentorPulse profile={profile} lastJournalAt={lastJournalAt} />
            <MentorHero profile={profile} closed={closed} openTrades={trades} />
            {mentorSlug === "sophos" && (
              <>
                <div className="mt-4 flex justify-end">
                  <MentorFollowButton mentorSlug="sophos" />
                </div>
                <div className="mt-4"><MentorMirrorToggle /></div>
                <div className="mt-4">
                  <MentorMissedWinners
                    mentorSlug={mentorSlug}
                    onReflect={(t) => setMissedSheet({
                      open: true, symbol: t.symbol, tradeId: t.id, pnl: t.pnl,
                      context: `Sophos closed ${t.symbol} ${t.direction.toUpperCase()} for +£${Number(t.pnl).toFixed(0)}.`,
                    })}
                  />
                </div>
              </>
            )}
            {mentorSlug !== "sophos" && trades.length === 0 && intents.length === 0 && closed.length === 0 && (
              <div className="rounded-2xl py-10 text-center mt-6" style={{ border: "1px dashed var(--stoa-rule)", color: "var(--stoa-muted)" }}>
                <div className="stoa-greek mb-1" style={{ color: profile?.persona_color || "var(--stoa-accent)" }}>{profile?.name || "—"} · ἔρχεται</div>
                <div style={{ fontSize: 13 }}>{profile?.display_name || "This mentor"} is awakening soon. Live decisions begin shortly.</div>
              </div>
            )}

            <div
              className="sticky z-20 -mx-1 px-1 mb-6 mt-8 backdrop-blur"
              style={{
                top: 0,
                background: "color-mix(in oklab, var(--stoa-bg) 88%, transparent)",
                borderBottom: "1px solid var(--stoa-rule)",
              }}
            >
              <div className="flex items-center gap-1 overflow-x-auto">
                {tabs.map((t) => {
                  const isActive = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className="relative px-4 py-3 text-left transition-all shrink-0"
                      style={{
                        color: isActive ? "var(--stoa-ink)" : "var(--stoa-muted)",
                      }}
                    >
                      <div className="stoa-kicker" style={{ color: "inherit" }}>
                        {t.label}
                        {t.count > 0 && (
                          <span
                            className="ml-1.5 inline-flex items-center justify-center rounded-full"
                            style={{
                              fontSize: 9,
                              minWidth: 16,
                              height: 16,
                              padding: "0 5px",
                              background: isActive ? "var(--stoa-accent)" : "var(--stoa-rule)",
                              color: isActive ? "var(--stoa-bg)" : "var(--stoa-muted)",
                              fontWeight: 600,
                            }}
                          >
                            {t.count}
                          </span>
                        )}
                      </div>
                      <div className="stoa-greek" style={{ fontSize: 11, color: "var(--stoa-accent)", opacity: isActive ? 0.95 : 0.55, marginTop: 2 }}>
                        {t.greek}
                      </div>
                      {isActive && (
                        <div
                          className="absolute left-3 right-3"
                          style={{
                            bottom: -1,
                            height: 2,
                            background: "var(--stoa-accent)",
                            borderRadius: 2,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {tab === "now" && (
              <>
                <div className="space-y-3">
                  {trades.length === 0
                    ? <Empty msg="Sophos is in cash. Patience is a position." />
                    : trades.map((t) => (
                        <FocusWrap key={t.id} id={t.id} highlightId={highlightId} refMap={itemRefs}>
                          <MentorTradeCard trade={t} />
                        </FocusWrap>
                      ))}
                </div>
                <MentorVsYou profile={profile} mentorClosed={closed} />
                <MentorWeeklyVsYou mentorSlug={mentorSlug} />
              </>
            )}

            {tab === "next" && (
              <>
                <MentorWatchlistRadar />
                <div className="space-y-3">
                  {intents.length === 0
                    ? <Empty msg="No pending intents. Sophos is watching, not forcing." />
                    : intents.map((i) => (
                        <FocusWrap key={i.id} id={i.id} highlightId={highlightId} refMap={itemRefs}>
                          <MentorIntentCard intent={i} />
                        </FocusWrap>
                      ))}
                </div>
              </>
            )}

            {tab === "past" && <MentorPastList closed={closed} />}

            {tab === "cases" && (
              cases.length === 0
                ? <Empty msg="No case studies yet. Sophos writes one each time he closes a trade." />
                : <div className="grid gap-4 sm:grid-cols-2">
                    {cases.map(c => <MentorCaseStudyCard key={c.id} cs={c} />)}
                  </div>
            )}

            {tab === "journal" && <MentorJournalFeed entries={journal} />}

            {tab === "replay" && <MentorReplay />}

            {tab === "epistle" && <MentorLetter />}
          </>
        )}
      </div>
      <MissedTradeSheet
        open={missedSheet.open}
        onClose={() => setMissedSheet((s) => ({ ...s, open: false }))}
        symbol={missedSheet.symbol}
        context={missedSheet.context}
        tradeId={missedSheet.tradeId}
        pnl={missedSheet.pnl}
      />
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

const FocusWrap = ({ id, highlightId, refMap, children }: { id: string; highlightId: string | null; refMap: React.MutableRefObject<Record<string, HTMLDivElement | null>>; children: React.ReactNode }) => {
  const isHi = highlightId === id;
  return (
    <div
      ref={(el) => { refMap.current[id] = el; }}
      className="rounded-2xl transition-all"
      style={{
        boxShadow: isHi ? "0 0 0 3px var(--stoa-accent)" : "none",
        transform: isHi ? "scale(1.005)" : "none",
      }}
    >
      {children}
    </div>
  );
};

export default Mentor;
