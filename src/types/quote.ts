export type MarketSession = "premarket" | "open" | "after_hours" | "closed" | "24/7" | "active" | "inactive";
export type FreshnessStatus = "live" | "delayed" | "cached" | "stale" | "unavailable";
export type QuoteSource = "finnhub" | "alphavantage" | "cache" | "none";

export interface NormalizedQuote {
  symbol: string;
  asset_type: "stock" | "crypto" | "forex";
  current_price: number | null;
  absolute_change: number | null;
  percent_change: number | null;
  currency: string;
  source: QuoteSource;
  timestamp: string;
  session_status: MarketSession;
  freshness: FreshnessStatus;
  is_fallback: boolean;
  is_stale: boolean;
  cache_age_seconds: number;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  prev_close: number | null;
}

export type MarqueeMode = "default" | "watchlist" | "movers" | "daily_picks";

export function getFreshnessDot(freshness: FreshnessStatus): "verdict-buy" | "verdict-wait" | "verdict-avoid" {
  switch (freshness) {
    case "live":
    case "delayed":
      return "verdict-buy";
    case "cached":
      return "verdict-wait";
    default:
      return "verdict-avoid";
  }
}

export function getSessionLabel(session: MarketSession, assetType: string): string {
  if (assetType === "crypto") return "24/7";
  switch (session) {
    case "premarket": return "Pre-Market";
    case "open": return "Open";
    case "after_hours": return "After Hours";
    case "closed": return "Closed";
    case "active": return "Active";
    case "inactive": return "Inactive";
    default: return "";
  }
}
