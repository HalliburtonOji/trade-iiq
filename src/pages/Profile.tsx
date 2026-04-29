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
  const [health, setHealth] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const regenerateInitiates = async () => {
    setRegenerating(true);
    const specs = [
      { track: "markets", level: 1, slug: "markets-01-order-types", title_en: "Order Types", title_gr: "Παραγγελίαι" },
      { track: "chart",   level: 1, slug: "chart-01-candles",       title_en: "Reading Candles", title_gr: "Κηροί" },
      { track: "risk",    level: 1, slug: "risk-01-position-sizing",title_en: "Position Sizing", title_gr: "Μέτρον" },
      { track: "mind",    level: 1, slug: "mind-01-loss-aversion",  title_en: "Loss Aversion", title_gr: "Φόβος" },
      { track: "craft",   level: 1, slug: "craft-01-playbook",      title_en: "Building a Playbook", title_gr: "Τακτική" },
    ];
    toast({ title: "Regenerating 5 Initiate modules…", description: "Takes ~60-90s." });
    for (const spec of specs) {
      const { error } = await supabase.functions.invoke("generate-codex-module", { body: spec });
      if (error) toast({ title: `Failed: ${spec.slug}`, description: error.message, variant: "destructive" });
      else toast({ title: `Regenerated: ${spec.title_en}` });
    }
    toast({ title: "All 5 modules regenerated" });
    setRegenerating(false);
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("api-health-check");
      if (error) throw error;
      setHealth(data);
    } catch (e: any) {
      toast({ title: "Health check failed", description: e.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, lessonsRes, drillsRes, tradesRes, watchlistRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        // Bridge: Codex v2 lessons completed (replaces legacy learning_progress)
        supabase
          .from("learn_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("mode", "lesson")
          .eq("status", "completed"),
        supabase.from("practice_progress").select("id").eq("user_id", user.id).eq("completed", true),
        supabase.from("trade_decisions").select("outcome").eq("user_id", user.id),
        supabase.from("watchlist").select("symbol, type").eq("user_id", user.id).order("added_date", { ascending: false }).limit(10),
      ]);

      if (profileRes.data) setProfile(profileRes.data as ProfileData);

      const trades = tradesRes.data || [];
      const wins = trades.filter(t => t.outcome === "WIN").length;

      setStats({
        lessonsCompleted: lessonsRes.count ?? 0,
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
          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-sm"
            onClick={() => navigate("/council")}
          >
            <Star className="h-4 w-4" />
            The Council awaits — weekly review
          </Button>
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
            <Button
              size="sm"
              className="stoa-kicker ml-2"
              style={{ background: "var(--stoa-shine)", color: "var(--stoa-ink)", border: "1px solid var(--stoa-rule)", borderRadius: 2 }}
              onClick={async () => {
                toast({ title: "Regenerating...", description: "Computing signature + recommendation." });
                const { error } = await supabase.functions.invoke("generate-codex-recommendation", { body: { user_id: user!.id, force: true } });
                if (error) toast({ title: "Failed", description: String(error.message ?? error), variant: "destructive" });
                else toast({ title: "Recommendation regenerated" });
              }}
            >
              Regenerate recommendations (dev)
            </Button>
            <button
              onClick={regenerateInitiates}
              disabled={regenerating}
              className="stoa-kicker ml-2"
              style={{
                background: "var(--stoa-shine)",
                color: "var(--stoa-ink)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                padding: "10px 20px",
                cursor: regenerating ? "not-allowed" : "pointer",
                marginRight: 12,
              }}
            >
              {regenerating ? "Regenerating…" : "Regenerate 5 Initiates (dev)"}
            </button>

            {/* Candle Cache Admin */}
            <div
              style={{
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                padding: 16,
                margin: "16px 0",
              }}
            >
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                CANDLE CACHE · ΧΡΟΝΟΣ
              </span>
              <h3 className="stoa-display" style={{ marginTop: 4, color: "var(--stoa-ink)", fontSize: 18 }}>
                Historical Candle Cache
              </h3>
              <p style={{ marginTop: 6, fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", fontSize: 13 }}>
                Clears all cached candle data. Next scenario load will refetch from Stooq → Finnhub.
              </p>
              <button
                onClick={async () => {
                  const { error } = await supabase.from("candle_cache").delete().neq("symbol", "___none___");
                  toast({
                    title: error ? "Failed" : "Candle cache cleared",
                    description: error?.message,
                    variant: error ? "destructive" : "default",
                  });
                }}
                style={{
                  background: "var(--stoa-shine)",
                  color: "var(--stoa-ink)",
                  border: "1px solid var(--stoa-rule)",
                  borderRadius: 2,
                  padding: "10px 16px",
                  marginTop: 12,
                  cursor: "pointer",
                }}
                className="stoa-display"
              >
                Clear Candle Cache
              </button>
            </div>

            {/* Visual Upgrade — regenerate with diagrams */}
            <div
              style={{
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                padding: 16,
                margin: "16px 0",
              }}
            >
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                VISUAL UPGRADE · ΕΙΚΩΝ
              </span>
              <h3 className="stoa-display" style={{ marginTop: 4, color: "var(--stoa-ink)", fontSize: 18 }}>
                Regenerate Initiates with Diagrams
              </h3>
              <p style={{ marginTop: 6, fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", fontSize: 13 }}>
                Re-runs all 5 Initiate modules with inline SVG diagrams populated. Takes ~60-90s.
              </p>
              <button
                onClick={async () => {
                  const specs = [
                    { track: "markets", level: 1, slug: "markets-01-order-types", title_en: "Order Types", title_gr: "Παραγγελίαι" },
                    { track: "chart",   level: 1, slug: "chart-01-candles",       title_en: "Reading Candles", title_gr: "Κηροί" },
                    { track: "risk",    level: 1, slug: "risk-01-position-sizing",title_en: "Position Sizing", title_gr: "Μέτρον" },
                    { track: "mind",    level: 1, slug: "mind-01-loss-aversion",  title_en: "Loss Aversion", title_gr: "Φόβος" },
                    { track: "craft",   level: 1, slug: "craft-01-playbook",      title_en: "Building a Playbook", title_gr: "Τακτική" },
                  ];
                  toast({ title: "Regenerating with diagrams…", description: "5 modules, ~90s." });
                  for (const spec of specs) {
                    const { error } = await supabase.functions.invoke("generate-codex-module", {
                      body: { ...spec, auto_publish: true, force: true },
                    });
                    toast({
                      title: `${spec.track}: ${error ? "fail" : "ok"}`,
                      description: error?.message,
                      variant: error ? "destructive" : "default",
                    });
                    await new Promise((r) => setTimeout(r, 1500));
                  }
                  toast({ title: "All 5 regenerated with diagrams" });
                }}
                style={{
                  background: "var(--stoa-accent)",
                  color: "var(--stoa-ink)",
                  border: "none",
                  borderRadius: 2,
                  padding: "10px 16px",
                  marginTop: 12,
                  cursor: "pointer",
                }}
                className="stoa-display"
              >
                REGENERATE WITH DIAGRAMS
              </button>
            </div>

            {/* Generate Codex Catalog (Level 1, all 20 modules) */}
            <div
              style={{
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                padding: 16,
                margin: "16px 0",
              }}
            >
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                CATALOG · ΚΑΤΑΛΟΓΟΣ
              </span>
              <h3 className="stoa-display" style={{ marginTop: 4, color: "var(--stoa-ink)", fontSize: 18 }}>
                Generate Codex Catalog (Level 1)
              </h3>
              <p style={{ marginTop: 6, fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", fontSize: 13 }}>
                Bulk-generates all 20 Level-1 modules across the 5 tracks via the Lovable AI Gateway.
                Skips slugs that already have content. Sequential, ~3-5 minutes.
              </p>
              <button
                onClick={async () => {
                  toast({ title: "Generating catalog…", description: "Processing in batches, this may take 3-5 minutes." });
                  let nextIndex: number | null = 0;
                  const totals = { generated: 0, skipped: 0, failed: 0 };
                  let firstFail: { slug: string; error: string } | null = null;
                  let safetyGuard = 0;
                  while (nextIndex !== null && safetyGuard < 30) {
                    safetyGuard++;
                    const { data, error } = await supabase.functions.invoke("bulk-generate-codex", {
                      body: { start_index: nextIndex, batch_size: 3 },
                    });
                    if (error) {
                      toast({ title: "Catalog generation failed", description: error.message, variant: "destructive" });
                      return;
                    }
                    totals.generated += data?.generated?.length ?? 0;
                    totals.skipped += data?.skipped?.length ?? 0;
                    totals.failed += data?.failed?.length ?? 0;
                    if (!firstFail && data?.failed?.[0]) firstFail = data.failed[0];
                    nextIndex = data?.next_index ?? null;
                    if (nextIndex !== null) {
                      toast({ title: `Progress: ${nextIndex}/${data?.total ?? 20}`, description: `${totals.generated} new so far.` });
                    }
                  }
                  toast({
                    title: `Catalog: ${totals.generated} new, ${totals.skipped} skipped, ${totals.failed} failed`,
                    description: firstFail ? `First fail: ${firstFail.slug} — ${firstFail.error}` : "Done.",
                    variant: totals.failed > 0 ? "destructive" : "default",
                  });
                }}
                style={{
                  background: "var(--stoa-accent)",
                  color: "var(--stoa-ink)",
                  border: "none",
                  borderRadius: 2,
                  padding: "10px 16px",
                  marginTop: 12,
                  cursor: "pointer",
                }}
                className="stoa-display"
              >
                GENERATE CATALOG
              </button>
              <button
                onClick={async () => {
                  const FORCE_SLUGS = [
                    "markets-01-order-types",
                    "markets-03-session-times",
                    "risk-02-risk-reward",
                    "chart-02-trend-channels",
                    "craft-01-what-is-playbook",
                    "craft-02-trade-journal",
                    "craft-03-review-rituals",
                    "craft-04-pattern-of-one",
                  ];
                  toast({ title: "Force regenerating…", description: `${FORCE_SLUGS.length} modules. ~3 minutes.` });
                  let nextIndex: number | null = 0;
                  const totals = { generated: 0, failed: 0 };
                  let firstFail: { slug: string; error: string } | null = null;
                  let safety = 0;
                  while (nextIndex !== null && safety < 30) {
                    safety++;
                    const { data, error } = await supabase.functions.invoke("bulk-generate-codex", {
                      body: { start_index: nextIndex, batch_size: 2, force_regenerate: FORCE_SLUGS },
                    });
                    if (error) {
                      toast({ title: "Force-regen failed", description: error.message, variant: "destructive" });
                      return;
                    }
                    totals.generated += data?.generated?.length ?? 0;
                    totals.failed += data?.failed?.length ?? 0;
                    if (!firstFail && data?.failed?.[0]) firstFail = data.failed[0];
                    nextIndex = data?.next_index ?? null;
                  }
                  toast({
                    title: `Force-regen: ${totals.generated} regenerated, ${totals.failed} failed`,
                    description: firstFail ? `First fail: ${firstFail.slug} — ${firstFail.error}` : "Done.",
                    variant: totals.failed > 0 ? "destructive" : "default",
                  });
                }}
                style={{
                  background: "var(--stoa-shine)",
                  color: "var(--stoa-ink)",
                  border: "1px solid var(--stoa-rule)",
                  borderRadius: 2,
                  padding: "10px 16px",
                  marginTop: 8,
                  marginLeft: 8,
                  cursor: "pointer",
                }}
                className="stoa-kicker"
              >
                FORCE REGEN INCOMPLETE
              </button>
            </div>

            {/* API Health Check */}
            <div
              style={{
                background: "var(--stoa-shine)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                padding: 16,
                margin: "16px 0",
              }}
            >
              <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>
                ADMIN · ΔΟΚΙΜΗ
              </span>
              <h3 className="stoa-display" style={{ marginTop: 4, color: "var(--stoa-ink)", fontSize: 18 }}>
                API Health Check
              </h3>
              <p style={{ marginTop: 6, fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)", fontSize: 13 }}>
                Pings every external API. Green = key set + reachable.
              </p>
              <Button
                size="sm"
                className="stoa-display"
                style={{
                  marginTop: 14,
                  background: "var(--stoa-accent)",
                  color: "var(--stoa-ink)",
                  border: "1px solid var(--stoa-rule)",
                  borderRadius: 2,
                }}
                disabled={checking}
                onClick={runHealthCheck}
              >
                {checking ? "Checking…" : "Run health check →"}
              </Button>

              {health && (
                <>
                  <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                    {(["anthropic", "finnhub", "lovable"] as const).map((k) => {
                      const entry = health[k] as { status: string; detail: string } | undefined;
                      if (!entry) return null;
                      const color =
                        entry.status === "ok"
                          ? "var(--stoa-accent)"
                          : entry.status === "missing"
                          ? "var(--stoa-muted)"
                          : "hsl(var(--verdict-avoid))";
                      return (
                        <div key={k} style={{ borderTop: "1px solid var(--stoa-rule)", paddingTop: 8 }}>
                          <div className="stoa-kicker" style={{ color, textTransform: "uppercase" }}>
                            {k.replace("_", " ")} · {entry.status}
                          </div>
                          <div style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "var(--stoa-ink)", marginTop: 2 }}>
                            {entry.detail}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="stoa-mono" style={{ marginTop: 8, fontSize: 11, color: "var(--stoa-muted)" }}>
                    Checked: {health.checked_at}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </StoaShell>
  );
};

export default Profile;
