

# Plan: Charts, Live Market Data, and Screenshot Analysis

## What You Get

1. **Performance Charts** — Recharts-powered visualizations across the app: win rate over time, P&L curve, confidence calibration bar chart, asset class donut, and emotion distribution
2. **Additional Market Data Source** — Add Finnhub as a secondary free API (60 calls/min free tier, real-time US stocks) alongside Alpha Vantage, with automatic failover
3. **Chart Screenshot Analysis** — Users upload broker/charting app screenshots, AI analyzes them (support/resistance, patterns, trend), and saves the analysis with the image to cloud storage

---

## Technical Details

### 1. Performance Charts (Recharts)

Already have `recharts` and `src/components/ui/chart.tsx` in the project. Will build:

**New component: `src/components/PerformanceCharts.tsx`**
- **Win Rate Trend** — Line chart plotting cumulative win rate over time from `trade_decisions` (sorted by date)
- **P&L Curve** — Area chart of cumulative P&L % from completed trades
- **Confidence Calibration** — Bar chart (confidence 1-5 vs actual win rate) — replaces the current Progress bars in Insights
- **Asset Breakdown** — Pie/donut chart (stock/crypto/forex win distribution)
- **Emotion Distribution** — Radar or pie chart from `decision_reviews` emotions

**Integration points:**
- Add "📊 Charts" tab to Insights page
- Add a mini P&L sparkline to the Portfolio Overview tab
- Add win rate trend mini-chart to the Home dashboard

### 2. Finnhub as Secondary Market Data Source

**Why Finnhub:** 60 API calls/min on free tier (vs Alpha Vantage's 25/day), real-time US stock quotes, WebSocket support for live prices.

**Implementation:**
- User provides a Finnhub API key (free at finnhub.io) — store via `add_secret`
- Update `market-signals` edge function to try Finnhub first for stock quotes (`/quote?symbol=X`), fall back to Alpha Vantage
- Add Finnhub real-time quote endpoint for the Analysis page to show live price updates without burning Alpha Vantage calls
- New edge function: `supabase/functions/live-quote/index.ts` — lightweight quote fetcher that tries Finnhub then Alpha Vantage, returns price + change + volume
- Update `TickerMarquee` on home page to fetch actual prices from this endpoint instead of showing "—"

**Edge function logic:**
```text
live-quote:
  1. Check analysis_cache (< 5 min old? return cached)
  2. Try Finnhub /quote (if key exists)
  3. Fallback to Alpha Vantage GLOBAL_QUOTE
  4. Cache result in analysis_cache
  5. Return { price, change, changePercent, volume, source, cached_at }
```

### 3. Chart Screenshot Analysis

**Storage setup:**
- Create `chart_screenshots` storage bucket (SQL migration)
- Create `chart_analyses` database table:
  ```
  id uuid PK
  user_id uuid NOT NULL
  image_url text NOT NULL
  symbol text
  analysis_json jsonb
  created_at timestamptz DEFAULT now()
  ```
- RLS: users can CRUD own rows

**New edge function: `supabase/functions/analyze-chart/index.ts`**
- Receives `{ image_url, symbol? }` 
- Calls Lovable AI (Gemini 2.5 Pro — best for image+text reasoning) with the screenshot
- Uses tool calling to return structured JSON:
  ```
  { trend, patterns[], support_levels[], resistance_levels[],
    indicators_spotted[], verdict, confidence, reasoning, warnings[] }
  ```
- Saves analysis to `chart_analyses` table

**New component: `src/components/ChartAnalyzer.tsx`**
- File upload dropzone (accept image/*)
- Optional symbol input
- Upload to `chart_screenshots` bucket via Supabase Storage SDK
- Call `analyze-chart` edge function with the public URL
- Display results: trend badge, pattern cards, S/R levels, AI reasoning
- Gallery view of past analyses

**Integration:**
- Add to Analysis page as a new "📸 Chart" tab
- Add to Tracker page as "Attach Chart" option when logging a decision

---

## Build Order

1. **Finnhub secret + live-quote edge function** — unlocks real market data across the app
2. **Storage bucket + chart_analyses table** (single migration)
3. **analyze-chart edge function** — AI vision analysis
4. **ChartAnalyzer component** — upload + display
5. **PerformanceCharts component** — all Recharts visualizations
6. **Integrate** — wire charts into Insights, Portfolio, Home, and Analysis pages

---

## Files Created/Modified

| Action | File |
|--------|------|
| Create | `supabase/functions/live-quote/index.ts` |
| Create | `supabase/functions/analyze-chart/index.ts` |
| Create | `src/components/PerformanceCharts.tsx` |
| Create | `src/components/ChartAnalyzer.tsx` |
| Create | SQL migration (bucket + table + RLS) |
| Modify | `src/pages/Insights.tsx` — add Charts tab |
| Modify | `src/pages/Analysis.tsx` — add Chart tab + live price |
| Modify | `src/pages/Index.tsx` — live ticker data |
| Modify | `src/components/TickerMarquee.tsx` — real prices |
| Modify | `src/pages/Portfolio.tsx` — mini P&L chart |
| Modify | `supabase/config.toml` — new functions |

