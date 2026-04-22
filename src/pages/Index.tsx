import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  BarChart3,
  ClipboardList,
  GraduationCap,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Activity,
  Shield,
  Gauge,
  LogOut,
  Lightbulb,
  Flame,
  Target,
  Scale,
  Compass,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import TickerMarquee from "@/components/TickerMarquee";
import DailyMissions from "@/components/DailyMissions";
import DQSWidget from "@/components/DQSWidget";
import CoachCards from "@/components/CoachCards";
import SmartAlerts from "@/components/SmartAlerts";
import NotificationPanel from "@/components/NotificationPanel";
import EconomicCalendar from "@/components/EconomicCalendar";
import StoaShell from "@/components/stoa/StoaShell";
import Altar from "@/components/stoa/Altar";
import PedimentCap from "@/components/stoa/PedimentCap";
import Meander from "@/components/stoa/Meander";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatDate = () =>
  new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const quickActions = [
  { label: "Analyse a ticker", icon: Search, path: "/analysis", gradient: "from-primary/20 to-primary/5" },
  { label: "Screen the market", icon: BarChart3, path: "/screener", gradient: "from-accent/20 to-accent/5" },
  { label: "Log a decision", icon: ClipboardList, path: "/tracker", gradient: "from-verdict-buy/20 to-verdict-buy/5" },
  { label: "Daily lesson", icon: GraduationCap, path: "/learn", gradient: "from-verdict-wait/20 to-verdict-wait/5" },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] as const } },
};

interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  type: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [winRate, setWinRate] = useState<string>("—");
  const [totalDecisions, setTotalDecisions] = useState(0);
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [marketData] = useState([
    { label: "S&P 500", value: "—", change: "—", up: true },
    { label: "NASDAQ", value: "—", change: "—", up: true },
    { label: "BTC Dom.", value: "52.3%", change: "-0.4%", up: false },
    { label: "Fear & Greed", value: "62", change: "Greed", up: true },
  ]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Trader";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [tradesRes, lessonsRes, watchlistRes, profileRes] = await Promise.all([
        supabase.from("trade_decisions").select("outcome").eq("user_id", user.id),
        supabase.from("learning_progress").select("xp_earned").eq("user_id", user.id).eq("completed", true),
        supabase.from("watchlist").select("*").eq("user_id", user.id).order("added_date", { ascending: false }).limit(5),
        supabase.from("profiles").select("xp_total").eq("user_id", user.id).single(),
      ]);

      if (tradesRes.data) {
        const wins = tradesRes.data.filter((t: any) => t.outcome === "WIN").length;
        const losses = tradesRes.data.filter((t: any) => t.outcome === "LOSS").length;
        const completed = wins + losses;
        setTotalDecisions(tradesRes.data.length);
        setWinRate(completed > 0 ? `${Math.round((wins / completed) * 100)}%` : "—");
      }
      if (lessonsRes.data) {
        setLessonsCompleted(lessonsRes.data.length);
        const xp = lessonsRes.data.reduce((s: number, d: any) => s + (d.xp_earned || 0), 0);
        setTotalXp(profileRes.data?.xp_total || xp);
      }
      if (watchlistRes.data) setWatchlist(watchlistRes.data);
    };
    load();
  }, [user]);

  // Stoa — derived Moirai values from existing state
  const wins = (() => {
    const n = parseInt(winRate);
    if (Number.isNaN(n)) return 0;
    return Math.round((n / 100) * totalDecisions);
  })();
  const losses = Math.max(0, totalDecisions - wins);
  const winRateNumeric = (() => {
    const n = parseInt(winRate);
    return Number.isNaN(n) ? null : n;
  })();
  const edgeState: "strong" | "neutral" | "weak" =
    winRateNumeric === null
      ? "neutral"
      : winRateNumeric >= 60
      ? "strong"
      : winRateNumeric >= 45
      ? "neutral"
      : "weak";
  const sessionLabel = (() => {
    const h = new Date().getUTCHours();
    if (h >= 13 && h < 21) return "NY OPEN";
    if (h >= 7 && h < 13) return "LONDON";
    if (h >= 0 && h < 7) return "TOKYO";
    return "AFTER HOURS";
  })();
  const clockLabel = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <StoaShell
      palette="delphi"
      crumb="Ναός · Temple"
      rightBar={
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>{sessionLabel}</span>
          <span className="stoa-mono" style={{ fontSize: 13, color: "var(--stoa-ink)" }}>{clockLabel}</span>
          <NotificationPanel />
        </div>
      }
    >
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">
        {/* Temple — Pediment */}
        <motion.div variants={fadeUp} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 8 }}>
          <PedimentCap variant="triangle" width={180} />
          <div style={{ marginTop: 14 }}>
            <div className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>{formatDate()}</div>
            <h1
              className="stoa-display"
              style={{
                fontSize: "clamp(34px, 5vw, 52px)",
                fontWeight: 500,
                margin: "6px 0 4px",
                color: "var(--stoa-ink)",
                letterSpacing: "0.01em",
              }}
            >
              {getGreeting()},{" "}
              <span style={{ color: "var(--stoa-accent)", fontStyle: "italic" }}>{displayName}</span>
            </h1>
            <div className="stoa-greek" style={{ color: "var(--stoa-muted)", fontSize: 16 }}>
              Ναός · the temple of decisions
            </div>
          </div>
          <div style={{ width: "min(100%, 520px)", marginTop: 14 }}>
            <Meander height={16} opacity={0.55} />
          </div>
        </motion.div>

        {/* Temple — Entablature (hero edge reading) */}
        <motion.div variants={fadeUp}>
          <Altar capped={false} className="">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 0" }}>
              <div className="stoa-kicker">EDGE · WIN RATE ON CLOSED DECISIONS</div>
              <div
                className="stoa-mono"
                style={{
                  fontSize: "clamp(56px, 12vw, 132px)",
                  lineHeight: 1,
                  marginTop: 10,
                  color: "var(--stoa-ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {winRate === "—" ? "—" : winRate}
              </div>
              <div style={{ marginTop: 12, color: "var(--stoa-muted)", fontSize: 13 }}>
                {totalDecisions} decisions logged · {lessonsCompleted} lessons · {totalXp} XP
              </div>
              <div style={{ width: "min(100%, 360px)", marginTop: 16 }}>
                <Meander height={12} opacity={0.4} />
              </div>
              <div
                className="stoa-greek"
                style={{
                  marginTop: 12,
                  color:
                    edgeState === "strong"
                      ? "var(--stoa-secondary)"
                      : edgeState === "weak"
                      ? "var(--stoa-signal)"
                      : "var(--stoa-muted)",
                  fontSize: 15,
                }}
              >
                {edgeState === "strong"
                  ? "Ἐπίκουρος — the edge favours thee"
                  : edgeState === "weak"
                  ? "Ἀδικία — the ledger is unjust, review thy reasoning"
                  : "Ἰσορροπία — balance; let the evidence speak"}
              </div>
            </div>
          </Altar>
        </motion.div>

        {/* Moirai colonnade — six altars */}
        <motion.div variants={fadeUp}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, minmax(0,1fr))" : "repeat(6, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <Altar
              kicker="DECISIONS"
              greek="Κλωθώ"
              value={<span className="stoa-mono">{totalDecisions}</span>}
              sub="logged"
            />
            <Altar
              kicker="WINS"
              greek="Λάχεσις"
              value={<span className="stoa-mono">{wins}</span>}
              sub="closed favourable"
              alert={wins > 0 ? false : false}
            />
            <Altar
              kicker="LOSSES"
              greek="Ἄτροπος"
              value={<span className="stoa-mono">{losses}</span>}
              sub="closed adverse"
              alert={losses > 0}
            />
            <Altar
              kicker="WIN RATE"
              greek="Νίκη"
              value={<span className="stoa-mono">{winRate}</span>}
              sub="of closed"
            />
            <Altar
              kicker="LESSONS"
              greek="Λόγος"
              value={<span className="stoa-mono">{lessonsCompleted}</span>}
              sub="studied"
            />
            <Altar
              kicker="XP"
              greek="Ἐλπίς"
              value={<span className="stoa-mono">{totalXp}</span>}
              sub="earned"
            />
          </div>
        </motion.div>

        {/* Ticker */}
        <motion.div variants={fadeUp}>
          <TickerMarquee />
        </motion.div>

        {/* Coach Cards + DQS side by side on desktop */}
        <div className={isMobile ? "space-y-4" : "grid grid-cols-2 gap-4"}>
          <motion.div variants={fadeUp}>
            <DQSWidget />
            <div className="mt-3">
              <SmartAlerts />
            </div>
          </motion.div>
          <motion.div variants={fadeUp}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Coach Insights</h2>
            <CoachCards />
          </motion.div>
        </div>

        {/* Daily Missions */}
        <motion.div variants={fadeUp}>
          <DailyMissions />
        </motion.div>

        {/* Economic Calendar */}
        <motion.div variants={fadeUp}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Economic Calendar</h2>
          <EconomicCalendar />
        </motion.div>

        {/* Market Overview + Quick Actions side by side on desktop */}
        <div className={isMobile ? "space-y-4" : "grid grid-cols-2 gap-4"}>
          <motion.div variants={fadeUp}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Market Overview</h2>
            <div className="grid grid-cols-2 gap-2">
              {marketData.map((m) => (
                <GlassCard key={m.label} className="flex flex-col gap-0.5 p-3">
                  <span className="text-[10px] text-muted-foreground font-medium">{m.label}</span>
                  <span className="text-sm font-bold font-mono">{m.value}</span>
                  <span className={`text-[10px] font-mono font-medium ${m.up ? "text-verdict-buy" : "text-verdict-avoid"}`}>{m.change}</span>
                </GlassCard>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((a) => (
                <GlassCard key={a.label} hoverable onClick={() => navigate(a.path)} className="flex items-center gap-3 p-3 cursor-pointer">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${a.gradient}`}>
                    <a.icon className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{a.label}</span>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Watchlist + CTAs */}
        <div className={isMobile ? "space-y-4" : "grid grid-cols-3 gap-4"}>
          <motion.div variants={fadeUp} className={isMobile ? "" : "col-span-2"}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Watchlist</h2>
            </div>
            {watchlist.length === 0 ? (
              <GlassCard className="flex flex-col items-center justify-center py-8 text-center">
                <Gauge className="h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">No watchlist items yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Analyse a ticker to add it</p>
              </GlassCard>
            ) : (
              <div className="flex flex-col gap-2">
                {watchlist.map((w) => (
                  <GlassCard key={w.id} hoverable onClick={() => navigate("/analysis")} className="flex items-center justify-between p-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono">{w.symbol}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{w.type}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>

          <div className="flex flex-col gap-4">
            <motion.div variants={fadeUp}>
              <GlassCard hoverable onClick={() => navigate("/insights")} className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/5 to-primary/5 border-accent/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20">
                    <Lightbulb className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Your Insights</p>
                    <p className="text-[10px] text-muted-foreground">Strategy & habits</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </GlassCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <GlassCard hoverable onClick={() => navigate("/daily-picks")} className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Today's AI Picks</p>
                    <p className="text-[10px] text-muted-foreground">6 curated opportunities</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </StoaShell>
  );
};

export default Index;
