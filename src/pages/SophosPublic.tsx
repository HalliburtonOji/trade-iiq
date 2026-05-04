// SophosPublic — SEO-friendly public profile of the Sophos mentor.
// No auth required. Read-only view of equity, open trades, intents, journal, and letters.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MentorHero from "@/components/mentor/MentorHero";
import MentorTradeCard from "@/components/mentor/MentorTradeCard";
import MentorIntentCard from "@/components/mentor/MentorIntentCard";
import MentorJournalFeed from "@/components/mentor/MentorJournalFeed";
import MentorLetter from "@/components/mentor/MentorLetter";
import MentorCaseStudyCard from "@/components/mentor/MentorCaseStudyCard";

type Tab = "now" | "next" | "past" | "cases" | "journal" | "epistle";

const SophosPublic = () => {
  const [profile, setProfile] = useState<any>(null);
  const [openTrades, setOpenTrades] = useState<any[]>([]);
  const [closed, setClosed] = useState<any[]>([]);
  const [intents, setIntents] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [letters, setLetters] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("now");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Sophos · The Living Trader | TradeIIQ";
    const desc = "Watch Sophos, an autonomous AI trader, publish every plan, trade, and reflection in real time. Public, transparent, never hidden.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
    m.setAttribute("content", desc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [p, t, i, j, l, c] = await Promise.all([
        supabase.from("mentor_profile").select("*").eq("slug", "sophos").maybeSingle(),
        supabase.from("mentor_trades").select("*").order("opened_at", { ascending: false }).limit(100),
        supabase.from("mentor_intents").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("mentor_journal").select("*").order("created_at", { ascending: false }).limit(60),
        supabase.from("mentor_letters").select("*").order("week_starting", { ascending: false }).limit(8),
        supabase.from("mentor_case_studies").select("id,symbol,direction,outcome,r_multiple,title,hook,tags,greek_phrase,created_at").order("created_at", { ascending: false }).limit(30),
      ]);
      if (cancelled) return;
      setProfile(p.data);
      const trades = t.data || [];
      setOpenTrades(trades.filter((x: any) => x.status === "open"));
      setClosed(trades.filter((x: any) => x.status === "closed"));
      setIntents((i.data || []).filter((x: any) => x.status === "pending"));
      setJournal(j.data || []);
      setLetters(l.data || []);
      setCases(c.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const heartbeat = useMemo(() => {
    const last = journal[0]?.created_at;
    if (!last) return "Awakening…";
    const mins = Math.floor((Date.now() - new Date(last).getTime()) / 60000);
    if (mins < 1) return "Active now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  }, [journal]);

  const tabs: { id: Tab; label: string; greek: string; count?: number }[] = [
    { id: "now", label: "NOW", greek: "Νῦν", count: openTrades.length },
    { id: "next", label: "NEXT", greek: "Μέλλον", count: intents.length },
    { id: "past", label: "PAST", greek: "Παρελθόν", count: closed.length },
    { id: "cases", label: "CASES", greek: "Αὐτοψία", count: cases.length },
    { id: "journal", label: "JOURNAL", greek: "Ἡμερολόγιον" },
    { id: "epistle", label: "EPISTLE", greek: "Ἐπιστολή", count: letters.length },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--stoa-bg)", color: "var(--stoa-ink)" }}>
      {/* Top bar */}
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--stoa-rule)" }}>
        <Link to="/landing" className="flex items-center gap-2">
          <span className="stoa-display" style={{ fontSize: 20, fontWeight: 600 }}>TradeIIQ</span>
          <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>· Manteion</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--stoa-secondary)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--stoa-secondary)" }} />
            </span>
            <span className="stoa-mono" style={{ fontSize: 12, color: "var(--stoa-muted)" }}>{heartbeat}</span>
          </div>
          <Link
            to="/auth"
            className="rounded-full px-4 py-2 stoa-mono text-xs"
            style={{ background: "var(--stoa-accent)", color: "var(--stoa-bg)" }}
          >
            Trade with Sophos →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {loading ? (
          <div className="py-20 text-center stoa-mono" style={{ color: "var(--stoa-muted)" }}>Summoning Sophos…</div>
        ) : (
          <>
            <MentorHero profile={profile} closed={closed} openTrades={openTrades} />

            {/* Tab nav */}
            <div className="flex gap-1 overflow-x-auto pb-1" style={{ borderBottom: "1px solid var(--stoa-rule)" }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="px-4 py-2 stoa-kicker whitespace-nowrap transition-colors"
                  style={{
                    color: tab === t.id ? "var(--stoa-accent)" : "var(--stoa-muted)",
                    borderBottom: tab === t.id ? "2px solid var(--stoa-accent)" : "2px solid transparent",
                  }}
                >
                  {t.label}{typeof t.count === "number" ? ` · ${t.count}` : ""}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <section>
              {tab === "now" && (
                openTrades.length === 0
                  ? <Empty text="No open trades. Sophos is patient." />
                  : <div className="grid gap-4 md:grid-cols-2">
                      {openTrades.map(t => <MentorTradeCard key={t.id} trade={t} />)}
                    </div>
              )}
              {tab === "next" && (
                intents.length === 0
                  ? <Empty text="No pending intents. The market hasn't offered an edge." />
                  : <div className="grid gap-4 md:grid-cols-2">
                      {intents.map(i => <MentorIntentCard key={i.id} intent={i} />)}
                    </div>
              )}
              {tab === "past" && (
                closed.length === 0
                  ? <Empty text="No closed trades yet." />
                  : <div className="grid gap-4 md:grid-cols-2">
                      {closed.slice(0, 30).map(t => <MentorTradeCard key={t.id} trade={t} closed />)}
                    </div>
              )}
              {tab === "cases" && (
                cases.length === 0
                  ? <Empty text="No case studies yet. Sophos writes one each time he closes a trade." />
                  : <div className="grid gap-4 sm:grid-cols-2">
                      {cases.map(c => <MentorCaseStudyCard key={c.id} cs={c} />)}
                    </div>
              )}
              {tab === "journal" && <MentorJournalFeed entries={journal} />}
              {tab === "epistle" && <MentorLetter />}
            </section>

            {/* Footer CTA */}
            <div className="rounded-2xl p-8 text-center" style={{
              border: "1px solid var(--stoa-gold-rule)",
              background: "linear-gradient(135deg, color-mix(in oklab, var(--stoa-accent) 6%, transparent), transparent)",
            }}>
              <div className="stoa-display" style={{ fontSize: 24, fontWeight: 600 }}>
                Want to trade alongside Sophos?
              </div>
              <div className="stoa-greek mt-2" style={{ color: "var(--stoa-muted)" }}>
                Copy his plans, diff your sizing, and learn from every reflection.
              </div>
              <Link
                to="/auth"
                className="inline-block mt-5 rounded-full px-6 py-3 stoa-mono text-sm"
                style={{ background: "var(--stoa-accent)", color: "var(--stoa-bg)" }}
              >
                Join the Stoa →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const Empty = ({ text }: { text: string }) => (
  <div className="py-12 text-center stoa-greek" style={{ color: "var(--stoa-muted)" }}>{text}</div>
);

export default SophosPublic;
