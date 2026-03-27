

# TradeIQ: Feature Improvements & Add-ons

Based on research into TraderSync, Edgewonk, TradeZella, TradingGame, TrendSpider, and Koyfin, here are the highest-impact improvements grouped into three areas: **Analysis**, **Training**, and **App-wide enhancements**.

---

## Problem

1. **Analysis is static** — only ~10 hardcoded symbols with fake prices. Any other symbol shows $0.00 with generic text. No live data, no real technicals.
2. **Training lacks applied simulation** — lessons and drills are theoretical. No paper trading, no replay, no "what would you do?" with real chart scenarios.
3. **Missing competitive features** — no news feed, no economic calendar, no portfolio P&L tracking, no social/community, no trade replay.

---

## What Gets Built

### A. Analysis Overhaul

1. **Live AI Analysis for Any Symbol**
   - New edge function `analyze-symbol` that fetches real-time price via the existing `live-quote` pipeline, then sends data to Lovable AI (Gemini 2.5 Flash) to generate verdict, technicals, setup score, risk score, targets, and summary
   - Results cached in the existing `analysis_cache` table (15-min TTL) to avoid redundant AI calls
   - Analysis page gets a searchable Command dropdown with 50+ popular symbols (stocks, crypto, forex) plus free-text entry for any symbol

2. **Expanded Symbol Library**
   - New `src/data/symbolLists.ts` with categorized symbols: ~30 stocks, ~15 crypto, ~10 forex pairs with display names and exchange prefixes
   - Screener data also expanded to ~40+ assets

3. **Economic Calendar Widget**
   - Lightweight component showing upcoming market-moving events (FOMC, CPI, NFP, earnings dates)
   - Seeded from static data initially, upgradeable to API later
   - Shown on Analysis page and Home dashboard

4. **News Sentiment Strip**
   - Edge function using Perplexity `sonar` to fetch recent news for a searched symbol
   - Shows 3-5 headline summaries with sentiment tags (Bullish/Bearish/Neutral) and source citations
   - Appears as a collapsible section in the Analysis results

### B. Training & Learning Upgrades

5. **Paper Trading Simulator**
   - Virtual $10,000 portfolio (already exists as `paper_balance` in profiles)
   - "Paper Trade" button on Analysis results — logs a simulated position with entry price
   - New `paper_trades` table: symbol, entry_price, quantity, direction, status, exit_price, pnl
   - Portfolio page shows open positions with live P&L (via live-quote), trade history, and running balance
   - Position close with actual profit/loss calculation

6. **Trade Replay / "What Would You Do?" Scenarios**
   - New component that shows a historical chart screenshot + context, asks user to decide BUY/WAIT/AVOID
   - Reveals what actually happened with explanation
   - 10+ seeded scenarios across different setups (breakouts, reversals, traps, consolidation)
   - Integrated into Practice tab as a new drill type

7. **Interactive Chart Pattern Recognition Drills**
   - Show a chart image with a pattern forming, ask user to identify it
   - Options: Head & Shoulders, Double Bottom, Bull Flag, Wedge, etc.
   - 15+ seeded pattern drills with real chart examples
   - Awards XP on correct identification

8. **Strategy Backtesting Lite**
   - User selects a strategy rule (e.g., "Buy when RSI < 30 and MACD crosses bullish")
   - Shows historical examples where this triggered, with outcomes
   - Simple win rate and avg return display
   - Teaches users to think systematically about strategy rules

### C. App-Wide Enhancements

9. **Portfolio Dashboard Upgrade**
   - Consolidate paper trades, watchlist, and real trade decisions into one view
   - Show total paper P&L, best/worst positions, sector allocation pie
   - Win rate by asset type, by strategy, by time of day

10. **Notifications & Alerts System**
    - Price alert: notify when a watchlist symbol hits a target price
    - Review reminder: "You have 3 flashcards due"
    - Coaching alert: "New weakness detected in your recent trades"
    - Stored in a `notifications` table, shown as a bell icon with badge count
    - In-app notification panel (not push notifications yet)

11. **Social Proof / Community Lite**
    - Anonymous aggregate stats: "72% of TradeIQ users rated NVDA as BUY this week"
    - Leaderboard for XP (opt-in, display names only)
    - Shown as small social strips on Analysis and Home pages

12. **CSV Trade Import**
    - Already has a `CsvImport` component — enhance it to parse common broker CSV formats
    - Auto-map columns to trade_decisions fields
    - Bulk import for users migrating from spreadsheets

13. **Enhanced AI Chatbot**
    - Add markdown rendering for chat responses (react-markdown)
    - Add context awareness: chatbot knows user's recent trades, weak areas, completed lessons
    - Quick action buttons: "Analyze AAPL", "Show my weak areas", "Quiz me on RSI"

---

## Technical Details

### New Edge Function: `analyze-symbol`
- Calls existing `live-quote` function internally for real price data
- Sends price + volume + RSI data to `google/gemini-2.5-flash` with structured prompt
- Returns `AnalysisResult`-shaped JSON
- Upserts result into `analysis_cache` table with 15-min TTL
- Falls back to hardcoded `analysisData` if AI call fails

### New Edge Function: `symbol-news`
- Uses Perplexity `sonar` model to search `"{symbol} stock market news today"`
- Returns 3-5 summarized headlines with sentiment and citations
- Requires Perplexity connector

### Database Changes
- New table `paper_trades`: id, user_id, symbol, asset_type, direction (long/short), entry_price, quantity, exit_price, pnl, status (open/closed), opened_at, closed_at
- New table `notifications`: id, user_id, type, title, body, read, link, created_at
- New table `price_alerts`: id, user_id, symbol, target_price, direction (above/below), triggered, created_at
- RLS on all new tables: user can only access own rows

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/analyze-symbol/index.ts` | Live AI analysis |
| `supabase/functions/symbol-news/index.ts` | News sentiment via Perplexity |
| `src/data/symbolLists.ts` | Categorized symbol catalog |
| `src/data/scenarioData.ts` | Trade replay scenarios |
| `src/data/patternDrills.ts` | Chart pattern recognition drills |
| `src/components/EconomicCalendar.tsx` | Calendar widget |
| `src/components/NewsSentiment.tsx` | News strip component |
| `src/components/PaperTradeButton.tsx` | Paper trade entry |
| `src/components/NotificationPanel.tsx` | In-app notifications |
| `src/components/learn/ScenarioReplay.tsx` | What-would-you-do drills |
| `src/components/learn/PatternDrill.tsx` | Pattern recognition drills |

### Modified Files
| File | Change |
|------|--------|
| `src/pages/Analysis.tsx` | Command dropdown, live AI fetch, news strip, economic calendar |
| `src/pages/Portfolio.tsx` | Paper trade positions, P&L tracking |
| `src/components/learn/PracticeTab.tsx` | Add scenario + pattern drill sections |
| `src/components/AIChatbot.tsx` | Markdown rendering, context-aware prompts |
| `src/pages/Index.tsx` | Economic calendar widget, notification bell |
| `supabase/functions/chat/index.ts` | Accept user context for smarter responses |

---

## Build Order

1. **Live AI Analysis** — analyze-symbol edge function + symbol lists + Analysis page rewrite (fixes the $0 problem)
2. **Paper Trading** — paper_trades table + paper trade flow + Portfolio upgrade
3. **Training drills** — scenario replay + pattern recognition + Practice tab integration
4. **News + Calendar** — Perplexity connector + news edge function + economic calendar
5. **Notifications** — table + panel + alert triggers
6. **Chatbot upgrade** — markdown + context awareness
7. **Social/community** — aggregate stats + leaderboard (lighter lift)

