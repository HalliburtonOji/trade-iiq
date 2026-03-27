import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import { Trophy, Medal } from "lucide-react";

interface LeaderEntry {
  display_name: string;
  xp_total: number;
  level: string;
  isYou: boolean;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("profiles").select("display_name, xp_total, level, user_id").order("xp_total", { ascending: false }).limit(20);
      if (data) {
        setEntries(data.map((d: any) => ({
          display_name: d.display_name || "Anonymous",
          xp_total: d.xp_total,
          level: d.level,
          isYou: d.user_id === user?.id,
        })));
      }
    };
    load();
  }, [user]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-verdict-wait" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">XP Leaderboard</h3>
      </div>
      <div className="flex flex-col gap-1.5">
        {entries.map((e, i) => (
          <div key={i} className={`flex items-center gap-3 p-2 rounded-lg text-xs transition-all ${e.isYou ? "bg-primary/5 border border-primary/10" : ""}`}>
            <span className="w-6 text-center font-bold font-mono text-muted-foreground">{i < 3 ? medals[i] : i + 1}</span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold truncate block">{e.display_name}{e.isYou ? " (You)" : ""}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{e.level}</span>
            <span className="font-bold font-mono text-primary">{e.xp_total} XP</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>}
      </div>
    </GlassCard>
  );
};

export default Leaderboard;
