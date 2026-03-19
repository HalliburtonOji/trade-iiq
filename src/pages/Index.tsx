import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, BarChart3, ClipboardList, GraduationCap, Sparkles, ChevronRight, TrendingUp, Activity, Shield, Gauge, LogOut, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import TickerMarquee from "@/components/TickerMarquee";
import DailyMissions from "@/components/DailyMissions";

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
  const [winRate, setWinRate] = useState<string>("—");
  const [totalDecisions, setTotalDecisions] = useState(0);
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [marketData, setMarketData] = useState([
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

  return (
    <PageShell>
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4 px-4 pt-6">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Trade<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">IQ</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{getGreeting()}, {displayName}</p>
            <p className="text-[10px] text-muted-foreground/60">{formatDate()}</p>
          </div>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors mt-1">
            <LogOut className="h-4 w-4" />
          </button>
        </motion.div>

        {/* Stats - REAL DATA */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
          <StatCard label="Win Rate" value={winRate} icon={<TrendingUp className="h-3.5 w-3.5" />} trend={winRate !== "—" && parseInt(winRate) >= 50 ? "up" : winRate !== "—" ? "down" : "neutral"} />
          <StatCard label="Decisions" value={totalDecisions} icon={<Activity className="h-3.5 w-3.5" />} />
          <StatCard label="Lessons" value={lessonsCompleted} icon={<GraduationCap className="h-3.5 w-3.5" />} />
          <StatCard label="XP" value={totalXp} icon={<Shield className="h-3.5 w-3.5" />} />
        </motion.div>

        {/* Ticker */}
        <motion.div variants={fadeUp}>
          <TickerMarquee />
        </motion.div>

        {/* Daily Missions */}
        <motion.div variants={fadeUp}>
          <DailyMissions />
        </motion.div>

        {/* Market Overview */}
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

        {/* Quick Actions */}
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

        {/* Watchlist - REAL DATA */}
        <motion.div variants={fadeUp}>
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

        {/* Insights CTA */}
        <motion.div variants={fadeUp}>
          <GlassCard hoverable onClick={() => navigate("/insights")} className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/5 to-primary/5 border-accent/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20">
                <Lightbulb className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold">Your Insights</p>
                <p className="text-[10px] text-muted-foreground">Strategy, habits & performance</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </GlassCard>
        </motion.div>

        {/* Daily Picks CTA */}
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
      </motion.div>
    </PageShell>
  );
};

export default Index;
