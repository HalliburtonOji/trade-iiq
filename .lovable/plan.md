# Fix Watchlist, Price Data & Enhance Lessons

## Issues Found

### 1. Watchlist "Add" Button Broken

**Root cause**: The watchlist table has RLS policies for SELECT, INSERT, and DELETE — but **no UPDATE policy**. The `addToWatchlist` function uses `upsert()` with `onConflict`, which requires UPDATE permission. When a symbol already exists, the upsert fails silently.

**Fix**: Add an UPDATE RLS policy for the watchlist table, and also add an `insert` fallback so new entries work even without the upsert path.

### 2. Prices Showing $0

**Root cause**: The `live-quote` edge function uses Finnhub for stocks and Alpha Vantage for crypto/forex. Two problems:

- **Crypto symbols**: Alpha Vantage's `CURRENCY_EXCHANGE_RATE` endpoint is unreliable for many crypto symbols (SOL, DOGE, ADA often return empty). The function falls back to stale cache, which may also be $0.
- **Stocks after hours**: Finnhub returns `c: 0` for some symbols outside market hours, and the function treats `0` as "no data."

**Fix**: 

- Add CoinGecko as a free fallback for crypto prices (no API key needed, generous rate limits)
- In `analyze-symbol`, when `livePrice` is 0, have the AI still estimate reasonable price targets from its training data rather than returning $0 targets
- Show "Price unavailable" instead of "$0.00" in the UI when price is null/0

### 3. Lessons Need Visual Guides

**Current state**: Lessons are pure text with `ContentSection { heading, body[] }`. No images, diagrams, or downloadable materials.

**Enhancement**: 

- Add an `illustrations` field to the lesson data structure containing descriptions and diagram types (candlestick patterns, chart examples, indicator readings)
- Generate SVG/canvas-based visual diagrams inline for each lesson section (e.g., candlestick anatomy, support/resistance zones, RSI divergence)
- Add a "Download PDF" button per lesson that generates a styled PDF with lesson content and diagrams using the browser's print-to-PDF or jsPDF

---

## Technical Plan

### Database Migration

```sql
-- Add UPDATE policy for watchlist (fixes upsert)
CREATE POLICY "Users can update own watchlist" 
  ON public.watchlist FOR UPDATE 
  USING (auth.uid() = user_id);
```

### File Changes


| File                                          | Change                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `supabase/functions/live-quote/index.ts`      | Add CoinGecko fallback for crypto; handle `price === 0` as unavailable                                         |
| `supabase/functions/analyze-symbol/index.ts`  | When price is 0, instruct AI to estimate from knowledge; don't return $0 targets                               |
| `src/pages/Analysis.tsx`                      | Show "Price unavailable" when price is 0/null instead of "$0.00"                                               |
| `src/data/lessonsData.ts`                     | Add `illustrations` array to each lesson with diagram type + description                                       |
| `src/components/learn/LessonDetail.tsx`       | Render inline SVG diagrams per section; add "Download as PDF" button                                           |
| `src/components/learn/LessonIllustration.tsx` | New component: renders visual diagrams (candlestick anatomy, S&R zones, indicator charts) as styled SVG/canvas |
| `src/components/learn/LessonPdfExport.tsx`    | New component: generates downloadable PDF with lesson content + visuals using jsPDF + html2canvas              |


### CoinGecko Integration (in live-quote)

Free API, no key needed. Maps common crypto symbols to CoinGecko IDs:

```typescript
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana",
  XRP: "ripple", DOGE: "dogecoin", ADA: "cardano",
  AVAX: "avalanche-2", DOT: "polkadot", // etc.
};
// GET https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true
```

### Lesson Visual Diagrams

Each lesson gets 2-4 inline illustrations rendered as React components:

- **Candlestick anatomy**: labeled SVG showing open/close/high/low
- **S&R zones**: price chart with horizontal zone bands
- **RSI gauge**: animated meter showing overbought/oversold
- **Trend structure**: HH/HL/LH/LL diagram with annotations
- **MACD crossover**: two-line chart with histogram

### PDF Export

Uses jsPDF + html2canvas to capture the rendered lesson (including diagrams) as a downloadable PDF. Button appears at the top of each lesson detail page.

### Build Order

1. Database migration (watchlist UPDATE policy)
2. Fix live-quote with CoinGecko crypto fallback
3. Fix analyze-symbol to handle $0 prices gracefully
4. Fix Analysis.tsx UI for $0 display
5. Create lesson illustration components
6. Add illustrations data to lessonsData.ts
7. Integrate visuals into LessonDetail + PDF export  
implement all