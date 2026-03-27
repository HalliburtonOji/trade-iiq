import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "demo_walkthrough_complete";

const steps = [
  { title: "Welcome! 👋", desc: "You have £10,000 virtual cash to practice trading. No real money at risk!", target: "demo-header" },
  { title: "Pick an Asset", desc: "Choose between Stocks, Crypto, or Forex. Then pick a symbol to trade.", target: "demo-asset-tabs" },
  { title: "Live Chart", desc: "This is a real-time chart. Watch price action, spot patterns, and use indicators like RSI.", target: "demo-chart" },
  { title: "Buy or Sell", desc: "Click BUY to go long (profit when price rises) or SELL to go short (profit when price falls).", target: "demo-buy-sell" },
  { title: "Set a Stop Loss ⚠️", desc: "Always set a Stop Loss — it limits your downside risk. This is required before placing.", target: "demo-stoploss" },
  { title: "Set Take Profit", desc: "Set a target price to lock in gains automatically.", target: "demo-takeprofit" },
  { title: "Check Your Risk", desc: "We show what % of your balance is at stake. Keep it under 2% per trade!", target: "demo-risk" },
  { title: "Place the Order", desc: "Click Place Order to execute. Your position will track live P&L.", target: "demo-place-order" },
  { title: "Close & Review", desc: "When ready, close the position. Our AI will grade your trade and suggest improvements!", target: "demo-order-form" },
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

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 left-4 right-4 z-[70] max-w-sm mx-auto md:bottom-6 md:left-auto md:right-6 md:mx-0">
        <div className="glass-card p-4 border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-bold">{current.title}</p>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{current.desc}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{step + 1}/{steps.length}</span>
            <Button size="sm" onClick={next} className="gap-1 text-xs h-7">
              {step < steps.length - 1 ? "Next" : "Done!"} <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-1 mt-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-0.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuidedWalkthrough;
