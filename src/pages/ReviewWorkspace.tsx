import { useState, useEffect } from "react";
import { BarChart3, AlertTriangle, Brain, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import WeeklyCoachingReport from "@/components/review/WeeklyCoachingReport";
import AccountabilityWidget from "@/components/review/AccountabilityWidget";

interface TradeData {
  id: string; symbol: string; direction: string; pnl_percent: number | null; emotion: string | null; status: string; asset_type: string; thesis_json: any; opened_at: string; closed_at: string | null;
}

interface ReviewData {
  id: string; trade_decision_id: string; mistake_type: string | null; emotion: string | null; followed_plan: boolean | null; execution_quality: string | null; verdict_correct: boolean | null;
}

const ReviewWorkspace = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [t, r, d] = await Promise.all([
        supabase.from("paper_trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }),
        supabase.from("decision_reviews").select("*").eq("user_id", user.id),
        supabase.from("trade_decisions").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      ]);
      setTrades((t.data || []) as TradeData[]);
      setReviews((r.data || []) as ReviewData[]);
      setDecisions(d.data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const closedTrades = trades.filter(t => t.status === "closed" && t.pnl_percent !== null);
  const wins = closedTrades.filter(t => (t.pnl_percent || 0) > 0);
  const losses = closedTrades.filter(t => (t.pnl_percent || 0) <= 0);
  const winRate = closedTrades.length > 0 ? Math.round((wins.length / closedTrades.length) * 100) : 0;

  // Win rate by asset type
  const assetTypes = [...new Set(closedTrades.map(t => t.asset_type))];
  const winByAsset = assetTypes.map(a => {
    const at = closedTrades.filter(t => t.asset_type === a);
    const w = at.filter(t => (t.pnl_percent || 0) > 0);
    return { asset: a, winRate: at.length > 0 ? Math.round((w.length / at.length) * 100) : 0, count: at.length };
  }).sort((a, b) => b.winRate - a.winRate);

  // Mistake breakdown
  const mistakeCounts: Record<string, number> = {};
  reviews.forEach(r => {
    if (r.mistake_type && r.mistake_type !== "none") {
      mistakeCounts[r.mistake_type] = (mistakeCounts[r.mistake_type] || 0) + 1;
    }
  });
  const mistakes = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]);
  const totalMistakes = mistakes.reduce((s, m) => s + m[1], 0);

  // Emotional patterns
  const emotionCounts: Record<string, { wins: number; total: number }> = {};
  closedTrades.forEach(t => {
    const e = t.emotion || "neutral";
    if (!emotionCounts[e]) emotionCounts[e] = { wins: 0, total: 0 };
    emotionCounts[e].total++;
    if ((t.pnl_percent || 0) > 0) emotionCounts[e].wins++;
  });
  const emotions = Object.entries(emotionCounts).map(([e, d]) => ({
    emotion: e, winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0, count: d.total,
  })).sort((a, b) => b.count - a.count);

  // Pending reviews (decisions without a review)
  const reviewedIds = new Set(reviews.map(r => r.trade_decision_id));
  const pendingReviews = decisions.filter(d => !reviewedIds.has(d.id) && d.outcome !== "PENDING");

  // Strategy breakdown from thesis_json
  const strategyCounts: Record<string, { wins: number; total: number }> = {};
  closedTrades.forEach(t => {
    const s = (t.thesis_json as any)?.strategy || "unknown";
    if (!strategyCounts[s]) strategyCounts[s] = { wins: 0, total: 0 };
    strategyCounts[s].total++;
    if ((t.pnl_percent || 0) > 0) strategyCounts[s].wins++;
  });
  const strategies = Object.entries(strategyCounts).map(([s, d]) => ({
    strategy: s, winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0, count: d.total,
  })).sort((a, b) => b.count - a.count);

  const stoaCrumb = (
    <span>
      <span className="stoa-greek">Κάτοπτρον</span> · Review
    </span>
  );

  if (loading) return <StoaShell palette="delphi" crumb={stoaCrumb}><div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></StoaShell>;

  return (
    <StoaShell palette="delphi" crumb={stoaCrumb}>
      <div className="flex flex-col gap-2 mb-4 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">GROW · THE MIRROR</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Review</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Κάτοπτρον</span>
        </div>
        <p className="text-sm" style={{ color: "var(--stoa-muted)" }}>watch thyself trade</p>
      </div>
      <div className="space-y-6">
        <AccountabilityWidget pendingCount={pendingReviews.length} reviewCount={reviews.length} />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 }}>
            <TabsTrigger value="overview" className="text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Overview</TabsTrigger>
            <TabsTrigger value="setups" className="text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Setups</TabsTrigger>
            <TabsTrigger value="mistakes" className="text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Mistakes</TabsTrigger>
            <TabsTrigger value="emotions" className="text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Emotions</TabsTrigger>
            <TabsTrigger value="coaching" className="text-xs stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Coaching</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 14 }}>
                <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 24 }}>{closedTrades.length}</p>
                <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Closed Trades</p>
              </div>
              <div className="text-center" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 14 }}>
                <p className="stoa-mono font-bold text-primary" style={{ fontSize: 24 }}>{winRate}%</p>
                <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Win Rate</p>
              </div>
              <div className="text-center" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 14 }}>
                <p className="stoa-mono font-bold text-[color:var(--stoa-ink)]" style={{ fontSize: 24 }}>{reviews.length}</p>
                <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Reviews Done</p>
              </div>
              <div className="text-center" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 14 }}>
                <p className="stoa-mono font-bold text-amber-500" style={{ fontSize: 24 }}>{pendingReviews.length}</p>
                <p className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>Pending Reviews</p>
              </div>
            </div>

            <div style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 14 }}>
              <div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4" style={{ color: "var(--stoa-accent)" }} /> <span className="stoa-kicker">BY ASSET · Ὕλη</span></div>
              {winByAsset.length === 0 ? <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 14, color: "var(--stoa-muted)" }}>No data yet</p> : (
                <div className="space-y-2">
                  {winByAsset.map(a => (
                    <div key={a.asset} className="flex items-center gap-3">
                      <span className="stoa-display capitalize w-16" style={{ fontSize: 12, color: "var(--stoa-ink)" }}>{a.asset}</span>
                      <Progress value={a.winRate} className="flex-1 h-2" />
                      <span className="stoa-mono w-16 text-right" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>{a.winRate}% ({a.count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="setups" className="space-y-4">
            <div style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 14 }}>
              <div className="mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: "var(--stoa-accent)" }} /> <span className="stoa-kicker">BY SETUP · Τέχνη</span></div>
              {strategies.length === 0 ? <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 14, color: "var(--stoa-muted)" }}>No setup data — add strategies to your thesis</p> : (
                <div className="space-y-3">
                  {strategies.map(s => (
                    <div key={s.strategy} className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-[10px] w-24 justify-center capitalize stoa-kicker">{s.strategy}</Badge>
                      <Progress value={s.winRate} className="flex-1 h-2" />
                      <span className="stoa-mono w-20 text-right" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>{s.winRate}% ({s.count} trades)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mistakes" className="space-y-4">
            <div style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 14 }}>
              <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> <span className="stoa-kicker">MISTAKES · Ἁμαρτία</span></div>
              {mistakes.length === 0 ? <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 14, color: "var(--stoa-muted)" }}>No mistakes recorded yet — review your trades to track patterns</p> : (
                <div className="space-y-3">
                  {mistakes.map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="stoa-display capitalize w-28" style={{ fontSize: 12, color: "var(--stoa-ink)" }}>{type.replace(/_/g, " ")}</span>
                      <Progress value={totalMistakes > 0 ? (count / totalMistakes) * 100 : 0} className="flex-1 h-2" />
                      <span className="stoa-mono w-12 text-right" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>{count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="emotions" className="space-y-4">
            <div style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: 14 }}>
              <div className="mb-3 flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500" /> <span className="stoa-kicker">BY EMOTION · Πάθη</span></div>
              {emotions.length === 0 ? <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 14, color: "var(--stoa-muted)" }}>No emotional data — tag emotions on your trades</p> : (
                <div className="space-y-3">
                  {emotions.map(e => (
                    <div key={e.emotion} className="flex items-center gap-3">
                      <span className="stoa-display capitalize w-20" style={{ fontSize: 12, color: "var(--stoa-ink)" }}>{e.emotion}</span>
                      <Progress value={e.winRate} className="flex-1 h-2" />
                      <span className="stoa-mono w-20 text-right" style={{ fontSize: 11, color: "var(--stoa-muted)" }}>{e.winRate}% ({e.count} trades)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="coaching">
            <WeeklyCoachingReport />
          </TabsContent>
        </Tabs>
      </div>
    </StoaShell>
  );
};

export default ReviewWorkspace;
