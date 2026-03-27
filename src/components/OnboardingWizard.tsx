import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, GraduationCap, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const experienceLevels = [
  { value: "beginner", label: "Beginner", desc: "New to trading, learning the basics" },
  { value: "intermediate", label: "Intermediate", desc: "Some experience, want to improve" },
  { value: "advanced", label: "Advanced", desc: "Experienced, optimising strategy" },
];

const assetOptions = [
  { value: "stock", label: "Stocks", emoji: "📈" },
  { value: "crypto", label: "Crypto", emoji: "₿" },
  { value: "forex", label: "Forex", emoji: "💱" },
  { value: "options", label: "Options", emoji: "📊" },
];

const goalOptions = [
  { value: "learn", label: "Learn fundamentals", icon: GraduationCap },
  { value: "improve", label: "Improve win rate", icon: Target },
  { value: "practice", label: "Practice risk-free", icon: TrendingUp },
];

interface Props {
  onComplete: () => void;
}

const OnboardingWizard = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState("beginner");
  const [assets, setAssets] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleAsset = (v: string) => setAssets(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleGoal = (v: string) => setGoals(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({
      experience_level: experience,
      preferred_assets: assets,
      trading_goals: goals,
      onboarding_complete: true,
    } as any).eq("user_id", user.id);
    setSaving(false);
    onComplete();
  };

  const steps = [
    // Step 0: Experience
    <div key="exp" className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">Welcome to TradeIQ! 👋</h2>
        <p className="text-sm text-muted-foreground mt-1">What's your trading experience?</p>
      </div>
      {experienceLevels.map((l) => (
        <button key={l.value} onClick={() => setExperience(l.value)}
          className={`glass-card p-4 text-left transition-all ${experience === l.value ? "border-primary/40 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]" : "hover:bg-secondary/30"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{l.label}</p>
              <p className="text-xs text-muted-foreground">{l.desc}</p>
            </div>
            {experience === l.value && <Check className="h-4 w-4 text-primary" />}
          </div>
        </button>
      ))}
    </div>,

    // Step 1: Assets
    <div key="assets" className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">What do you trade?</h2>
        <p className="text-sm text-muted-foreground mt-1">Select all that apply</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {assetOptions.map((a) => (
          <button key={a.value} onClick={() => toggleAsset(a.value)}
            className={`glass-card p-4 text-center transition-all ${assets.includes(a.value) ? "border-primary/40 bg-primary/5" : "hover:bg-secondary/30"}`}>
            <span className="text-2xl block mb-1">{a.emoji}</span>
            <p className="text-sm font-semibold">{a.label}</p>
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Goals
    <div key="goals" className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">Your goals</h2>
        <p className="text-sm text-muted-foreground mt-1">What matters most to you?</p>
      </div>
      {goalOptions.map((g) => (
        <button key={g.value} onClick={() => toggleGoal(g.value)}
          className={`glass-card p-4 text-left transition-all flex items-center gap-3 ${goals.includes(g.value) ? "border-primary/40 bg-primary/5" : "hover:bg-secondary/30"}`}>
          <g.icon className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm font-semibold">{g.label}</span>
          {goals.includes(g.value) && <Check className="h-4 w-4 text-primary ml-auto" />}
        </button>
      ))}
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {steps[step]}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>Back</Button>
          ) : <div />}
          {step < 2 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1.5">
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={finish} disabled={saving} className="gap-1.5">
              {saving ? "Saving..." : "Let's Go!"} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <button onClick={onComplete} className="block mx-auto mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Skip for now
        </button>
      </motion.div>
    </div>
  );
};

export default OnboardingWizard;
