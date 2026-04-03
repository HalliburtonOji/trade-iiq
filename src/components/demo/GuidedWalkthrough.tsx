import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "demo_walkthrough_complete";

const steps = [
  { title: "Welcome! 👋", desc: "You have £10,000 virtual cash to practice trading. No real money at risk!", target: "demo-header", interactive: false },
  { title: "Your Level", desc: "Your trading level shows your progression. Complete missions and trades to level up and unlock new features!", target: "demo-header", interactive: false },
  { title: "Pick an Asset", desc: "Choose between Stocks, Crypto, or Forex. Then pick a symbol to trade.", target: "demo-asset-tabs", interactive: false },
  { title: "Live Chart 📊", desc: "This is a real-time chart with RSI indicator. Watch price action and spot patterns before trading.", target: "demo-chart", interactive: false },
  { title: "Buy or Sell", desc: "Click BUY to go long (profit when price rises). SELL unlocks at Level 3!", target: "demo-buy-sell", interactive: false },
  { title: "Set a Stop Loss ⚠️", desc: "ALWAYS set a Stop Loss — it limits your downside risk. This is required before placing any order.", target: "demo-stoploss", interactive: false },
  { title: "Set Take Profit 🎯", desc: "Set a target price to lock in gains automatically. Aim for at least 2:1 reward-to-risk.", target: "demo-takeprofit", interactive: false },
  { title: "Check Your Risk", desc: "We show what % of your balance is at stake and your risk:reward ratio. Keep risk under 2%!", target: "demo-risk", interactive: false },
  { title: "Build Your Thesis 📝", desc: "Before placing, write WHY you're taking this trade. Good traders always have a plan.", target: "demo-order-form", interactive: false },
  { title: "Place the Order", desc: "Click Place Order to execute. Your position will track live P&L in real-time.", target: "demo-place-order", interactive: false },
  { title: "Close & Review", desc: "When ready, close the position. Our AI will grade your trade (A-F) and suggest improvements!", target: "demo-order-form", interactive: false },
];

const GuidedWalkthrough = () => {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setActive(true);
    }
  }, []);

  const dismiss = () => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      const target = steps[step + 1]?.target;
      if (target) document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      dismiss();
    }
  };

  if (!active) {
    return (
      <button onClick={() => { setStep(0); setActive(true); }}
        className="fixed bottom-24 left-4 z-50 h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors md:bottom-6 md:left-auto md:right-20">
        <HelpCircle className="h-5 w-5" />
      </button>
    );
  }

  const current = steps[step];

  // Spotlight: highlight the target element
  useEffect(() => {
    if (!active) return;
    const el = document.getElementById(current.target);
    if (el) {
      el.style.position = "relative";
      el.style.zIndex = "65";
      el.style.boxShadow = "0 0 0 4px hsl(var(--primary) / 0.3), 0 0 24px hsl(var(--primary) / 0.15)";
      el.style.borderRadius = "12px";
      el.style.transition = "box-shadow 0.3s ease";
    }
    return () => {
      if (el) {
        el.style.zIndex = "";
        el.style.boxShadow = "";
        el.style.position = "";
      }
    };
  }, [step, active, current.target]);

  return (
    <AnimatePresence>
      {/* Backdrop dim */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-[2px] pointer-events-auto"
        onClick={dismiss}
      />

      {/* Tooltip */}
      <motion.div
        key="tooltip"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 left-4 right-4 z-[70] max-w-sm mx-auto md:bottom-6 md:left-auto md:right-6 md:mx-0"
      >
        <div className="rounded-2xl p-4 border border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-bold">{current.title}</p>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{current.desc}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{step + 1}/{steps.length}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={dismiss} className="text-xs h-7">Skip</Button>
              <Button size="sm" onClick={next} className="gap-1 text-xs h-7">
                {step < steps.length - 1 ? "Next" : "Done!"} <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-0.5 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuidedWalkthrough;
