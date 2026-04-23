import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Trophy, Flame, BookOpen, Target, BarChart3, Wallet, Settings, LogOut, ChevronRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
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

  const stoaCrumb = (
    <span>
      <span className="stoa-greek">Πρόσωπον</span> · Profile
    </span>
  );

  if (loading || !profile) {
    return (
      <StoaShell palette="delphi" crumb={stoaCrumb}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </StoaShell>
    );
  }

  const initials = (profile.display_name || user?.email || "U").slice(0, 2).toUpperCase();

  const cream = { background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 } as const;

  return (
    <StoaShell palette="delphi" crumb={stoaCrumb}>
      <div className="flex flex-col gap-2 mb-4 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">GROW · THE PERSONA</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Profile</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Πρόσωπον</span>
        </div>
        <p className="text-sm" style={{ color: "var(--stoa-muted)" }}>thy record and thy rites</p>
      </div>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div
          className="flex items-center gap-4"
          style={{
            background: "var(--stoa-shine)",
            border: "1px solid var(--stoa-rule)",
            borderLeft: "3px solid var(--stoa-accent)",
            borderRadius: 2,
            padding: 18,
          }}
        >
          <Avatar className="h-16 w-16" style={{ border: "2px solid var(--stoa-accent)" }}>
            <AvatarFallback
              className="stoa-display font-bold"
              style={{ background: "var(--stoa-shine)", color: "var(--stoa-accent)", fontSize: 18 }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="stoa-display font-bold truncate" style={{ fontSize: 18, color: "var(--stoa-ink)" }}>
              {profile.display_name || "Trader"}
            </h2>
            <p className="stoa-mono truncate" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-[10px]">{profile.level}</Badge>
              <Badge variant="outline" className="text-[10px] capitalize">{profile.experience_level || "Beginner"}</Badge>
              <Badge variant="outline" className="text-[10px] capitalize">{profile.trading_personality}</Badge>
            </div>
          </div>
        </div>

        {/* Progress Stats */}
        <div>
          <div className="mb-2"><span className="stoa-kicker">PROGRESS · Ἄσκησις</span></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center" style={{ ...cream, padding: 14 }}>
              <Trophy className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
              <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 22 }}>{profile.xp_total.toLocaleString()}</p>
              <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Total XP</p>
            </div>
            <div className="text-center" style={{ ...cream, padding: 14 }}>
              <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
              <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 22 }}>{profile.streak_count}</p>
              <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Day Streak</p>
            </div>
            <div className="text-center" style={{ ...cream, padding: 14 }}>
              <BookOpen className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 22 }}>{stats.lessonsCompleted}</p>
              <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Lessons Done</p>
            </div>
            <div className="text-center" style={{ ...cream, padding: 14 }}>
              <Target className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 22 }}>{stats.drillsCompleted}</p>
              <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Drills Done</p>
            </div>
          </div>
        </div>

        {/* Trading Stats */}
        <div>
          <div className="mb-2"><span className="stoa-kicker">TRADING · Ἐμπορία</span></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center" style={{ ...cream, padding: 14 }}>
              <Wallet className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 18 }}>${profile.paper_balance.toLocaleString()}</p>
              <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Paper Balance</p>
            </div>
            <div className="text-center" style={{ ...cream, padding: 14 }}>
              <BarChart3 className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 18 }}>{stats.totalTrades}</p>
              <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Total Trades</p>
            </div>
            <div className="text-center" style={{ ...cream, padding: 14 }}>
              <Target className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 18 }}>{stats.winRate}%</p>
              <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Win Rate</p>
            </div>
          </div>
        </div>

        {/* Watchlist Summary */}
        {stats.watchlistItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="stoa-kicker">WATCHLIST · Φυλακή</span>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/analysis")}>
                Manage · χειρισμός <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div style={{ ...cream, padding: 12 }}>
              <div className="flex flex-wrap gap-2">
                {stats.watchlistItems.map(w => (
                  <Badge
                    key={w.symbol}
                    variant="secondary"
                    className="stoa-mono font-bold text-xs cursor-pointer"
                    style={{ background: "transparent", border: "1px solid var(--stoa-rule)", color: "var(--stoa-ink)" }}
                    onClick={() => navigate(`/analysis?symbol=${w.symbol}`)}
                  >
                    {w.symbol}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div>
          <div className="mb-2"><span className="stoa-kicker">PREFERENCES · Ἤθη</span></div>
          <div style={cream}>
            {profile.preferred_broker && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--stoa-rule)] first:border-t-0">
                <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Broker</span>
                <span className="stoa-display capitalize" style={{ fontSize: 13, color: "var(--stoa-ink)" }}>{profile.preferred_broker}</span>
              </div>
            )}
            {profile.preferred_assets && profile.preferred_assets.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--stoa-rule)] first:border-t-0">
                <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Assets</span>
                <div className="flex gap-1">
                  {profile.preferred_assets.map(a => (
                    <Badge key={a} variant="outline" className="text-[10px] capitalize">{a}</Badge>
                  ))}
                </div>
              </div>
            )}
            {profile.trading_goals && profile.trading_goals.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--stoa-rule)] first:border-t-0">
                <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Goals</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {profile.trading_goals.map(g => (
                    <Badge key={g} variant="outline" className="text-[10px] capitalize">{g}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
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

        {/* TODO: remove after seeding */}
        {user?.email === "halliburtonoji@gmail.com" && (
          <div className="pt-2">
            <Button
              size="sm"
              className="stoa-display"
              style={{ background: "var(--stoa-accent)", color: "var(--stoa-ink)", border: "1px solid var(--stoa-rule)", borderRadius: 2 }}
              onClick={async () => {
                toast({ title: "Seeding...", description: "Generating 5 Codex Initiates." });
                const { seedCodexInitiates } = await import("@/scripts/seed-codex-initiates");
                const { error } = await seedCodexInitiates();
                if (error) {
                  toast({ title: "Seed failed", description: String(error.message ?? error), variant: "destructive" });
                } else {
                  toast({ title: "Seeded 5 modules", description: "Codex Initiates generated." });
                }
              }}
            >
              Seed Codex Initiates (dev)
            </Button>
          </div>
        )}
      </div>
    </StoaShell>
  );
};

export default Profile;
