import { motion } from "framer-motion";
import { Search, BarChart3, ClipboardList, GraduationCap, Sparkles, ChevronRight, TrendingUp, Activity, Shield, Gauge } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import TickerMarquee from "@/components/TickerMarquee";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatDate = () =>
  new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const marketData = [
  { label: "S&P 500", value: "5,218.19", change: "+0.58%", up: true },
  { label: "NASDAQ", value: "16,340.87", change: "+1.24%", up: true },
  { label: "BTC Dom.", value: "52.3%", change: "-0.4%", up: false },
  { label: "Fear & Greed", value: "62", change: "Greed", up: true },
];

const quickActions = [
  { label: "Analyse a ticker", icon: Search, path: "/analysis" },
  { label: "Screen the market", icon: BarChart3, path: "/screener" },
  { label: "Log a decision", icon: ClipboardList, path: "/tracker" },
  { label: "Daily lesson", icon: GraduationCap, path: "/learn" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] } },
};

const Index = () => {
  const navigate = useNavigate();

  return (
    <PageShell>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 px-4 pt-6"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Trade<span className="text-primary">IQ</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {getGreeting()} — {formatDate()}
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-primary mt-1" />
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
          <StatCard label="Win Rate" value="—" icon={<TrendingUp className="h-3.5 w-3.5" />} />
          <StatCard label="Decisions" value="0" icon={<Activity className="h-3.5 w-3.5" />} />
          <StatCard label="Lessons" value="0" icon={<GraduationCap className="h-3.5 w-3.5" />} />
          <StatCard label="XP" value="0" icon={<Shield className="h-3.5 w-3.5" />} />
        </motion.div>

        {/* Ticker */}
        <motion.div variants={fadeUp}>
          <TickerMarquee />
        </motion.div>

        {/* Market Overview */}
        <motion.div variants={fadeUp}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Market Overview
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {marketData.map((m) => (
              <GlassCard key={m.label} className="flex flex-col gap-0.5 p-3">
                <span className="text-[10px] text-muted-foreground font-medium">{m.label}</span>
                <span className="text-sm font-bold font-mono">{m.value}</span>
                <span className={`text-[10px] font-mono font-medium ${m.up ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                  {m.change}
                </span>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((a) => (
              <GlassCard
                key={a.label}
                hoverable
                onClick={() => navigate(a.path)}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <a.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{a.label}</span>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* Watchlist Preview */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Watchlist
            </h2>
          </div>
          <GlassCard className="flex flex-col items-center justify-center py-8 text-center">
            <Gauge className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No watchlist items yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Analyse a ticker to add it</p>
          </GlassCard>
        </motion.div>

        {/* Daily Picks CTA */}
        <motion.div variants={fadeUp}>
          <GlassCard
            hoverable
            onClick={() => navigate("/daily-picks")}
            className="flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
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
