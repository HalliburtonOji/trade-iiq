import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Zap, Target, GraduationCap, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import { cn } from "@/lib/utils";

export type Personality = "cautious" | "balanced" | "aggressive" | "learner";

interface PersonalityOption {
  id: Personality;
  label: string;
  icon: React.ReactNode;
  description: string;
  traits: string[];
  color: string;
}

const personalities: PersonalityOption[] = [
  {
    id: "cautious",
    label: "Cautious",
    icon: <Shield className="h-5 w-5" />,
    description: "Capital preservation first",
    traits: ["Low-risk setups only", "Strict stop losses", "Conservative sizing"],
    color: "border-verdict-buy/30 bg-verdict-buy/5",
  },
  {
    id: "balanced",
    label: "Balanced",
    icon: <Target className="h-5 w-5" />,
    description: "Risk-reward optimiser",
    traits: ["Mixed risk tolerance", "Disciplined entries", "Moderate position sizes"],
    color: "border-primary/30 bg-primary/5",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    icon: <Zap className="h-5 w-5" />,
    description: "High conviction, high reward",
    traits: ["Momentum plays", "Larger positions", "Higher risk tolerance"],
    color: "border-verdict-avoid/30 bg-verdict-avoid/5",
  },
  {
    id: "learner",
    label: "Learner",
    icon: <GraduationCap className="h-5 w-5" />,
    description: "Building foundations",
    traits: ["Extra guidance", "Paper trading focus", "Education-first"],
    color: "border-accent/30 bg-accent/5",
  },
];

interface Props {
  onSelect?: (p: Personality) => void;
}

const PersonalitySelector = ({ onSelect }: Props) => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Personality>("balanced");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("trading_personality").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.trading_personality) setSelected(data.trading_personality as Personality);
    });
  }, [user]);

  const handleSelect = async (p: Personality) => {
    setSelected(p);
    onSelect?.(p);
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ trading_personality: p }).eq("user_id", user.id);
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-bold">Trading Personality</h3>
        <p className="text-[10px] text-muted-foreground">This tunes your alerts, screener, and coaching style</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {personalities.map((p) => (
          <motion.div key={p.id} whileTap={{ scale: 0.97 }}>
            <GlassCard
              hoverable
              onClick={() => handleSelect(p.id)}
              className={cn(
                "relative flex flex-col gap-2 p-3 border cursor-pointer transition-all",
                selected === p.id ? p.color : "border-border/30",
                selected === p.id && "ring-1 ring-primary/30"
              )}
            >
              {selected === p.id && (
                <div className="absolute top-2 right-2">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={selected === p.id ? "text-primary" : "text-muted-foreground"}>{p.icon}</span>
                <span className="text-xs font-bold">{p.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{p.description}</p>
              <div className="flex flex-col gap-0.5">
                {p.traits.map((t) => (
                  <span key={t} className="text-[9px] text-muted-foreground/70">• {t}</span>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PersonalitySelector;
