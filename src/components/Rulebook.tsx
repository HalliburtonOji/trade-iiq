import { useState, useEffect } from "react";
import { Plus, X, Shield, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";

interface Rule {
  id: string;
  rule_text: string;
  category: string;
  is_active: boolean;
}

const categories = ["risk", "timing", "psychology", "strategy", "general"];

const Rulebook = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [newRule, setNewRule] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("trading_rules")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setRules(data as Rule[]); });
  }, [user]);

  const addRule = async () => {
    if (!user || !newRule.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("trading_rules").insert({
      user_id: user.id,
      rule_text: newRule.trim(),
      category: newCategory,
    }).select().single();
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (data) setRules((prev) => [...prev, data as Rule]);
    setNewRule("");
    toast({ title: "Rule added", description: "Your trading rule has been saved." });
  };

  const removeRule = async (id: string) => {
    await supabase.from("trading_rules").update({ is_active: false }).eq("id", id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const categoryColors: Record<string, string> = {
    risk: "text-verdict-avoid bg-verdict-avoid/10",
    timing: "text-verdict-wait bg-verdict-wait/10",
    psychology: "text-accent bg-accent/10",
    strategy: "text-primary bg-primary/10",
    general: "text-muted-foreground bg-muted/50",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">My Trading Rules</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{rules.length} active</span>
      </div>

      {/* Add rule */}
      <div className="flex gap-2">
        <Input
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          placeholder="e.g. Never trade without a stop loss"
          className="flex-1 bg-secondary/50 border-border/50 text-xs"
          onKeyDown={(e) => e.key === "Enter" && addRule()}
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="rounded-lg bg-secondary/50 border border-border/50 px-2 text-xs text-foreground outline-none"
        >
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={addRule}
          disabled={loading || !newRule.trim()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <GlassCard className="text-center py-6">
          <Shield className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No rules yet. Add your first trading rule above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-1.5">
          {rules.map((rule) => (
            <GlassCard key={rule.id} className="flex items-center gap-2 py-2 px-3">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${categoryColors[rule.category] || categoryColors.general}`}>
                {rule.category}
              </span>
              <span className="text-xs text-foreground flex-1">{rule.rule_text}</span>
              <button onClick={() => removeRule(rule.id)} className="text-muted-foreground/40 hover:text-verdict-avoid transition-colors shrink-0">
                <X className="h-3 w-3" />
              </button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rulebook;
