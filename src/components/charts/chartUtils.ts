import type { TimeRange } from "./TimeRangeFilter";

export interface Trade {
  id: string;
  decision: string;
  outcome: string;
  confidence: number | null;
  asset_type: string;
  date: string;
  pnl_percent: number | null;
  symbol?: string;
  notes?: string;
  thesis_why?: string;
  time_horizon?: string | null;
}

export interface Review {
  emotion: string | null;
  trade_decision_id: string;
  mistake_type?: string | null;
  followed_plan?: boolean | null;
}

export const CHART_COLORS = {
  primary: "hsl(239, 84%, 67%)",
  accent: "hsl(258, 90%, 66%)",
  buy: "hsl(142, 71%, 45%)",
  wait: "hsl(45, 93%, 47%)",
  avoid: "hsl(0, 72%, 51%)",
  muted: "hsl(220, 15%, 50%)",
};

export const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.accent, CHART_COLORS.buy, CHART_COLORS.wait, CHART_COLORS.avoid, "hsl(200, 60%, 50%)", "hsl(320, 60%, 50%)"];

export function filterByTimeRange(trades: Trade[], range: TimeRange): Trade[] {
  if (range === "ALL") return trades;
  const now = new Date();
  let cutoff: Date;
  switch (range) {
    case "7D": cutoff = new Date(now.getTime() - 7 * 86400000); break;
    case "30D": cutoff = new Date(now.getTime() - 30 * 86400000); break;
    case "90D": cutoff = new Date(now.getTime() - 90 * 86400000); break;
    case "YTD": cutoff = new Date(now.getFullYear(), 0, 1); break;
    default: return trades;
  }
  return trades.filter(t => new Date(t.date) >= cutoff);
}

export function getCompleted(trades: Trade[]): Trade[] {
  return trades.filter(t => t.outcome === "WIN" || t.outcome === "LOSS")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function fmtDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function generateWinRateInsight(data: { rate: number }[]): string {
  if (data.length < 4) return "";
  const first = data.slice(0, Math.floor(data.length / 2));
  const second = data.slice(Math.floor(data.length / 2));
  const avgFirst = Math.round(first.reduce((s, d) => s + d.rate, 0) / first.length);
  const avgSecond = Math.round(second.reduce((s, d) => s + d.rate, 0) / second.length);
  const diff = avgSecond - avgFirst;
  if (Math.abs(diff) < 3) return `Your win rate has been steady around ${avgSecond}% — consistency is strength.`;
  if (diff > 0) return `Your win rate improved from ${avgFirst}% to ${avgSecond}% — your recent decisions are sharper.`;
  return `Your win rate dropped from ${avgFirst}% to ${avgSecond}% — review recent losses for patterns.`;
}

export function generatePnlInsight(trades: Trade[]): string {
  if (trades.length < 3) return "";
  const withPnl = trades.filter(t => t.pnl_percent != null);
  if (withPnl.length < 2) return "";
  const totalPnl = withPnl.reduce((s, t) => s + (t.pnl_percent || 0), 0);
  const best = withPnl.reduce((b, t) => (t.pnl_percent || 0) > (b.pnl_percent || 0) ? t : b);
  const topContributors = withPnl.filter(t => (t.pnl_percent || 0) > 0).sort((a, b) => (b.pnl_percent || 0) - (a.pnl_percent || 0)).slice(0, 3);
  if (totalPnl > 0 && topContributors.length > 0) {
    const topPnl = topContributors.reduce((s, t) => s + (t.pnl_percent || 0), 0);
    const pct = Math.round((topPnl / totalPnl) * 100);
    return `${pct}% of your gains came from your top ${topContributors.length} trades. Best: ${best.symbol || "unknown"} at +${(best.pnl_percent || 0).toFixed(1)}%.`;
  }
  return totalPnl >= 0
    ? `Cumulative P&L is +${totalPnl.toFixed(1)}% across ${withPnl.length} trades.`
    : `Cumulative P&L is ${totalPnl.toFixed(1)}% — focus on cutting losses faster.`;
}

export function generateConfidenceInsight(calibration: { level: number; rate: number; count: number }[]): string {
  const meaningful = calibration.filter(c => c.count >= 2);
  if (meaningful.length < 2) return "";
  const best = meaningful.reduce((b, c) => c.rate > b.rate ? c : b);
  const worst = meaningful.reduce((w, c) => c.rate < w.rate ? c : w);
  if (best.level === worst.level) return `Confidence ${best.level}/5 dominates with ${best.rate}% win rate.`;
  const diff = best.rate - worst.rate;
  if (diff > 15) {
    return `Confidence ${best.level}/5 wins ${best.rate}% vs ${worst.level}/5 at ${worst.rate}% — a ${diff}pp gap.`;
  }
  return `Win rates are similar across confidence levels — your calibration is solid.`;
}

export function generateAssetInsight(trades: Trade[]): string {
  const counts: Record<string, { wins: number; total: number; losses: number }> = {};
  trades.forEach(t => {
    if (!counts[t.asset_type]) counts[t.asset_type] = { wins: 0, total: 0, losses: 0 };
    counts[t.asset_type].total++;
    if (t.outcome === "WIN") counts[t.asset_type].wins++;
    if (t.outcome === "LOSS") counts[t.asset_type].losses++;
  });
  const entries = Object.entries(counts).filter(([, v]) => v.total >= 2);
  if (entries.length < 2) return "";
  const totalTrades = entries.reduce((s, [, v]) => s + v.total, 0);
  const totalLosses = entries.reduce((s, [, v]) => s + v.losses, 0);
  // Find asset with disproportionate losses
  for (const [name, v] of entries) {
    const tradePct = Math.round((v.total / totalTrades) * 100);
    const lossPct = totalLosses > 0 ? Math.round((v.losses / totalLosses) * 100) : 0;
    if (lossPct > tradePct + 15) {
      return `${name} is ${tradePct}% of decisions but ${lossPct}% of losses — consider reducing exposure.`;
    }
  }
  const best = entries.reduce((b, e) => (e[1].wins / e[1].total) > (b[1].wins / b[1].total) ? e : b);
  return `${best[0]} is your strongest asset class at ${Math.round((best[1].wins / best[1].total) * 100)}% win rate.`;
}

export function generateEmotionInsight(reviews: Review[], trades: Trade[]): string {
  const emotionOutcomes: Record<string, { wins: number; total: number }> = {};
  reviews.forEach(r => {
    if (!r.emotion) return;
    const trade = trades.find(t => t.id === r.trade_decision_id);
    if (!trade || (trade.outcome !== "WIN" && trade.outcome !== "LOSS")) return;
    if (!emotionOutcomes[r.emotion]) emotionOutcomes[r.emotion] = { wins: 0, total: 0 };
    emotionOutcomes[r.emotion].total++;
    if (trade.outcome === "WIN") emotionOutcomes[r.emotion].wins++;
  });
  const entries = Object.entries(emotionOutcomes).filter(([, v]) => v.total >= 2);
  if (entries.length < 2) return "";
  const worst = entries.reduce((w, e) => (e[1].wins / e[1].total) < (w[1].wins / w[1].total) ? e : w);
  const worstRate = Math.round((worst[1].wins / worst[1].total) * 100);
  return `${worst[0]}-tagged trades have your worst win rate at ${worstRate}%.`;
}
