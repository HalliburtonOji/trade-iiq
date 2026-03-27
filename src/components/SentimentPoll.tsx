import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface Props {
  symbol: string;
}

const options = ["BUY", "WAIT", "AVOID"] as const;
const colors: Record<string, string> = { BUY: "bg-verdict-buy/20 text-verdict-buy border-verdict-buy/30", WAIT: "bg-verdict-wait/20 text-verdict-wait border-verdict-wait/30", AVOID: "bg-verdict-avoid/20 text-verdict-avoid border-verdict-avoid/30" };

const SentimentPoll = ({ symbol }: Props) => {
  const { user } = useAuth();
  const [userVote, setUserVote] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({ BUY: 0, WAIT: 0, AVOID: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVotes();
  }, [symbol, user]);

  const loadVotes = async () => {
    const { data } = await supabase.from("community_votes").select("vote, user_id").eq("symbol", symbol);
    if (data) {
      const c: Record<string, number> = { BUY: 0, WAIT: 0, AVOID: 0 };
      data.forEach((v: any) => { c[v.vote] = (c[v.vote] || 0) + 1; });
      setCounts(c);
      if (user) {
        const mine = data.find((v: any) => v.user_id === user.id);
        if (mine) setUserVote((mine as any).vote);
      }
    }
  };

  const vote = async (v: string) => {
    if (!user || loading) return;
    setLoading(true);
    await supabase.from("community_votes").upsert({ user_id: user.id, symbol, vote: v } as any, { onConflict: "user_id,symbol" });
    setUserVote(v);
    await loadVotes();
    setLoading(false);
  };

  const total = Object.values(counts).reduce((s, c) => s + c, 0);

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Community Sentiment</span>
        {total > 0 && <span className="text-[10px] text-muted-foreground ml-auto">{total} votes</span>}
      </div>
      <div className="flex gap-2">
        {options.map((opt) => {
          const pct = total > 0 ? Math.round((counts[opt] / total) * 100) : 0;
          return (
            <button key={opt} onClick={() => vote(opt)} disabled={loading}
              className={`flex-1 rounded-xl p-3 text-center transition-all border ${userVote === opt ? colors[opt] : "border-border/20 hover:border-border/40"}`}>
              <p className="text-xs font-bold">{opt}</p>
              {total > 0 && <p className="text-lg font-bold font-mono mt-1">{pct}%</p>}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default SentimentPoll;
