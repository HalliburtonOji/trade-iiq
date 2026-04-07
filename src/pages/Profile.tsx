import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Trophy, Flame, BookOpen, Target, BarChart3, Wallet, Settings, LogOut, ChevronRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  display_name: string | null;
  experience_level: string | null;
  trading_personality: string;
  preferred_broker: string | null;
  preferred_assets: string[] | null;
  trading_goals: string[] | null;
  xp_total: number;
  streak_count: number;
  paper_balance: number;
  trading_level: number;
  level: string;
}

interface Stats {
  lessonsCompleted: number;
  drillsCompleted: number;
  totalTrades: number;
  winRate: number;
  watchlistCount: number;
  watchlistItems: { symbol: string; type: string }[];
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ lessonsCompleted: 0, drillsCompleted: 0, totalTrades: 0, winRate: 0, watchlistCount: 0, watchlistItems: [] });
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, lessonsRes, drillsRes, tradesRes, watchlistRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("learning_progress").select("id").eq("user_id", user.id).eq("completed", true),
        supabase.from("practice_progress").select("id").eq("user_id", user.id).eq("completed", true),
        supabase.from("trade_decisions").select("outcome").eq("user_id", user.id),
        supabase.from("watchlist").select("symbol, type").eq("user_id", user.id).order("added_date", { ascending: false }).limit(10),
      ]);

      if (profileRes.data) setProfile(profileRes.data as ProfileData);

      const trades = tradesRes.data || [];
      const wins = trades.filter(t => t.outcome === "WIN").length;

      setStats({
        lessonsCompleted: lessonsRes.data?.length || 0,
        drillsCompleted: drillsRes.data?.length || 0,
        totalTrades: trades.length,
        winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0,
        watchlistCount: watchlistRes.data?.length || 0,
        watchlistItems: (watchlistRes.data || []) as { symbol: string; type: string }[],
      });
      setLoading(false);
    };
    load();
  }, [user]);

  const resetBalance = async () => {
    if (!user) return;
    setResetting(true);
    const { error } = await supabase.from("profiles").update({ paper_balance: 10000 }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfile(prev => prev ? { ...prev, paper_balance: 10000 } : prev);
      toast({ title: "Balance reset", description: "Paper trading balance restored to $10,000." });
    }
    setResetting(false);
  };

  if (loading || !profile) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  const initials = (profile.display_name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <PageShell>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <GlassCard className="flex items-center gap-4 p-5">
          <Avatar className="h-16 w-16 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{profile.display_name || "Trader"}</h1>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-[10px]">{profile.level}</Badge>
              <Badge variant="outline" className="text-[10px] capitalize">{profile.experience_level || "Beginner"}</Badge>
              <Badge variant="outline" className="text-[10px] capitalize">{profile.trading_personality}</Badge>
            </div>
          </div>
        </GlassCard>

        {/* Progress Stats */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Progress</h2>
          <div className="grid grid-cols-2 gap-3">
            <GlassCard className="p-4 text-center">
              <Trophy className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
              <p className="text-xl font-bold">{profile.xp_total.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total XP</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
              <p className="text-xl font-bold">{profile.streak_count}</p>
              <p className="text-[10px] text-muted-foreground">Day Streak</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <BookOpen className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-xl font-bold">{stats.lessonsCompleted}</p>
              <p className="text-[10px] text-muted-foreground">Lessons Done</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Target className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-xl font-bold">{stats.drillsCompleted}</p>
              <p className="text-[10px] text-muted-foreground">Drills Done</p>
            </GlassCard>
          </div>
        </div>

        {/* Trading Stats */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trading</h2>
          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="p-4 text-center">
              <Wallet className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">${profile.paper_balance.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Paper Balance</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <BarChart3 className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{stats.totalTrades}</p>
              <p className="text-[10px] text-muted-foreground">Total Trades</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Target className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-lg font-bold">{stats.winRate}%</p>
              <p className="text-[10px] text-muted-foreground">Win Rate</p>
            </GlassCard>
          </div>
        </div>

        {/* Watchlist Summary */}
        {stats.watchlistItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Watchlist ({stats.watchlistCount})</h2>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/analysis")}>
                Manage <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <GlassCard className="p-3">
              <div className="flex flex-wrap gap-2">
                {stats.watchlistItems.map(w => (
                  <Badge key={w.symbol} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10" onClick={() => navigate(`/analysis?symbol=${w.symbol}`)}>
                    {w.symbol}
                  </Badge>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Preferences */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preferences</h2>
          <GlassCard className="divide-y divide-border/30">
            {profile.preferred_broker && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Broker</span>
                <span className="text-sm font-medium capitalize">{profile.preferred_broker}</span>
              </div>
            )}
            {profile.preferred_assets && profile.preferred_assets.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Assets</span>
                <div className="flex gap-1">
                  {profile.preferred_assets.map(a => (
                    <Badge key={a} variant="outline" className="text-[10px] capitalize">{a}</Badge>
                  ))}
                </div>
              </div>
            )}
            {profile.trading_goals && profile.trading_goals.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Goals</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {profile.trading_goals.map(g => (
                    <Badge key={g} variant="outline" className="text-[10px] capitalize">{g}</Badge>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-3 text-sm" onClick={resetBalance} disabled={resetting}>
            <RotateCcw className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`} />
            {resetting ? "Resetting..." : "Reset Paper Balance"}
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 text-sm text-destructive hover:text-destructive" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </PageShell>
  );
};

export default Profile;
