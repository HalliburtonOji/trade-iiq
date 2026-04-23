import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BarChart3, Brain, GraduationCap, Shield, TrendingUp, Zap, ArrowRight, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const features = [
  { icon: Brain, title: "AI-Powered Analysis", desc: "Get instant verdicts on any stock, crypto, or forex pair with live data and AI reasoning." },
  { icon: BarChart3, title: "Live Charts & Screener", desc: "TradingView-powered charts with built-in RSI, MACD, and pattern recognition." },
  { icon: Shield, title: "Demo Trading", desc: "Practice with £10,000 virtual cash. Guided walkthrough teaches you risk management." },
  { icon: GraduationCap, title: "Learn & Level Up", desc: "Interactive lessons, flashcards, scenario replays, and pattern drills. Earn XP and badges." },
  { icon: TrendingUp, title: "Trade Tracker", desc: "Log every decision, review outcomes, and discover your Trading DNA with AI coaching." },
  { icon: Zap, title: "Smart Alerts", desc: "Price alerts, coaching nudges, and daily challenges to keep you sharp." },
];

const stats = [
  { value: "55+", label: "Symbols" },
  { value: "AI", label: "Powered" },
  { value: "Free", label: "To Start" },
  { value: "24/7", label: "Markets" },
];

const goldCta = { background: "var(--stoa-accent)", color: "var(--stoa-ink)", border: "none", borderRadius: 2 } as const;
const creamSurface = { background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 } as const;
const creamOutline = { background: "var(--stoa-shine)", color: "var(--stoa-ink)", border: "1px solid var(--stoa-rule)", borderRadius: 2 } as const;

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: "var(--stoa-bg)", color: "var(--stoa-ink)" }}>
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50" style={{ borderBottom: "1px solid var(--stoa-rule)", background: "var(--stoa-bg)" }}>
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <h1 className="stoa-display text-xl font-semibold tracking-tight" style={{ color: "var(--stoa-ink)" }}>
            TradeIQ <span className="stoa-greek" style={{ color: "var(--stoa-accent)", fontStyle: "italic" }}>Προπύλαια</span>
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gap-1.5 stoa-display" style={goldCta}>
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-6">
        <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl text-center relative z-10">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 mb-6" style={{ ...creamSurface, padding: "6px 14px" }}>
            <Zap className="h-3.5 w-3.5" style={{ color: "var(--stoa-accent)" }} />
            <span className="stoa-kicker">AI-Powered Trading Intelligence</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="stoa-display text-4xl md:text-6xl font-semibold tracking-tight leading-tight" style={{ color: "var(--stoa-ink)" }}>
            Make Smarter<br />
            <span className="stoa-greek" style={{ color: "var(--stoa-accent)", fontStyle: "italic" }}>Trading Decisions</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-6 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "var(--stoa-muted)" }}>
            Analyse any market with AI, practice risk-free with demo trading, and level up your skills with interactive lessons. Your complete trading intelligence platform.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 px-8 stoa-display" style={goldCta}>
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={creamOutline}>
              See Features
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Strip */}
      <section style={{ borderTop: "1px solid var(--stoa-rule)", borderBottom: "1px solid var(--stoa-rule)", background: "var(--stoa-shine)" }}>
        <div className="mx-auto max-w-4xl grid grid-cols-4 divide-x" style={{ borderColor: "var(--stoa-rule)" }}>
          {stats.map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="py-8 text-center">
              <p className="stoa-display text-2xl font-semibold" style={{ color: "var(--stoa-accent)" }}>{s.value}</p>
              <p className="stoa-kicker mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="stoa-kicker mb-2">THE GIFTS · Δῶρα</div>
            <h2 className="stoa-display text-3xl font-semibold" style={{ color: "var(--stoa-ink)" }}>Everything You Need</h2>
            <p className="mt-3 max-w-xl mx-auto" style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)" }}>
              From real-time analysis to guided practice — built for traders who want to improve.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 transition-colors"
                style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--stoa-accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--stoa-rule)")}
              >
                <div className="h-10 w-10 flex items-center justify-center mb-4" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-accent)", borderRadius: 2 }}>
                  <f.icon className="h-5 w-5" style={{ color: "var(--stoa-accent)" }} />
                </div>
                <h3 className="stoa-display font-semibold mb-2" style={{ fontSize: 14, color: "var(--stoa-ink)" }}>{f.title}</h3>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "var(--stoa-muted)", lineHeight: 1.55 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6" style={{ background: "var(--stoa-shine)", borderTop: "1px solid var(--stoa-rule)", borderBottom: "1px solid var(--stoa-rule)" }}>
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5" style={{ fill: "var(--stoa-accent)", color: "var(--stoa-accent)" }} />)}
            </div>
            <p className="text-lg italic max-w-2xl mx-auto" style={{ fontFamily: "Georgia, serif", color: "var(--stoa-ink)" }}>
              "TradeIQ completely changed how I approach the market. The AI analysis is surprisingly accurate, and the demo trading feature helped me build confidence before risking real money."
            </p>
            <p className="stoa-kicker mt-4">— Active Trader</p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
          style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderLeft: "3px solid var(--stoa-accent)", borderRadius: 2, padding: 48 }}
        >
          <h2 className="stoa-display text-3xl font-semibold mb-4" style={{ color: "var(--stoa-ink)" }}>Ready to Level Up?</h2>
          <p className="mb-8 max-w-lg mx-auto" style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)" }}>
            Join TradeIQ and start making data-driven trading decisions today. No credit card required.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 px-10 stoa-display" style={goldCta}>
            Get Started — It's Free <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: "1px solid var(--stoa-rule)" }}>
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>© {new Date().getFullYear()} TradeIQ. Not financial advice.</p>
          <div className="flex gap-4">
            <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Stocks</span>
            <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Crypto</span>
            <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Forex</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
