import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BarChart3, Brain, GraduationCap, Shield, TrendingUp, Zap, ArrowRight, Star, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const features = [
  { icon: Brain, title: "AI-Powered Analysis", desc: "Get instant verdicts on any stock, crypto, or forex pair with live data and AI reasoning.", gradient: "from-primary to-accent" },
  { icon: BarChart3, title: "Live Charts & Screener", desc: "TradingView-powered charts with built-in RSI, MACD, and pattern recognition.", gradient: "from-accent to-primary" },
  { icon: Shield, title: "Demo Trading", desc: "Practice with £10,000 virtual cash. Guided walkthrough teaches you risk management.", gradient: "from-verdict-buy to-primary" },
  { icon: GraduationCap, title: "Learn & Level Up", desc: "Interactive lessons, flashcards, scenario replays, and pattern drills. Earn XP and badges.", gradient: "from-verdict-wait to-accent" },
  { icon: TrendingUp, title: "Trade Tracker", desc: "Log every decision, review outcomes, and discover your Trading DNA with AI coaching.", gradient: "from-primary to-verdict-buy" },
  { icon: Zap, title: "Smart Alerts", desc: "Price alerts, coaching nudges, and daily challenges to keep you sharp.", gradient: "from-accent to-verdict-wait" },
];

const stats = [
  { value: "55+", label: "Symbols" },
  { value: "AI", label: "Powered" },
  { value: "Free", label: "To Start" },
  { value: "24/7", label: "Markets" },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight">
            Trade<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">IQ</span>
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gap-1.5">
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />
        <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl text-center relative z-10">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI-Powered Trading Intelligence</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Make Smarter<br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Trading Decisions</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Analyse any market with AI, practice risk-free with demo trading, and level up your skills with interactive lessons. Your complete trading intelligence platform.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 px-8">
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              See Features
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Strip */}
      <section className="border-y border-border/20 bg-card/30">
        <div className="mx-auto max-w-4xl grid grid-cols-4 divide-x divide-border/20">
          {stats.map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="py-8 text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h3 className="text-3xl font-bold">Everything You Need</h3>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">From real-time analysis to guided practice — built for traders who want to improve.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="glass-card p-6 group hover:border-primary/20 transition-all cursor-default">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}>
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h4 className="text-sm font-semibold mb-2">{f.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 bg-card/20 border-y border-border/20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-verdict-wait text-verdict-wait" />)}
            </div>
            <p className="text-lg font-medium italic text-foreground/80 max-w-2xl mx-auto">
              "TradeIQ completely changed how I approach the market. The AI analysis is surprisingly accurate, and the demo trading feature helped me build confidence before risking real money."
            </p>
            <p className="text-sm text-muted-foreground mt-4">— Active Trader</p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center glass-card p-12 border-primary/10 bg-gradient-to-br from-primary/5 to-accent/5">
          <h3 className="text-3xl font-bold mb-4">Ready to Level Up?</h3>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join TradeIQ and start making data-driven trading decisions today. No credit card required.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 px-10">
            Get Started — It's Free <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 px-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} TradeIQ. Not financial advice.</p>
          <div className="flex gap-4">
            <span>Stocks</span><span>Crypto</span><span>Forex</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
