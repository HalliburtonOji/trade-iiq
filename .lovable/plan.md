# Demo Trading: Complete Rebuild - Beginner to Pro

## What's Wrong Now

The current Demo Trading page is a basic order form with a chart. It has no structure, no progression, no educational context, no performance analytics, and no way to guide someone from complete beginner to competent trader. It's just "pick a symbol, click buy."

## Research Insights

Based on TradingGame (4.5M users), TradingView Paper Trading, and IBKR:

- **Structured progression** is the key differentiator: beginners start with guided "lesson trades" (forced scenarios), not free trading
- **Missions/challenges** tie each trade to a learning objective ("Place a trade with a 2:1 risk-reward ratio")
- **Performance dashboard** tracks win rate, average R:R, best/worst trades, equity curve over time
- **Pre-trade checklist** forces users to build a thesis before executing (why are you trading?)
- **Post-trade journal** captures emotions, mistakes, and lessons — not just P&L
- **Progressive unlocks** gate complexity: market orders first, then limit orders, then leverage, then multi-leg strategies

---

## What Gets Built

### 1. Progression System with Trading Levels

A 5-tier skill level system that gates features and tracks readiness:


| Level | Name       | Requirement                       | Unlocks                                |
| ----- | ---------- | --------------------------------- | -------------------------------------- |
| 1     | Observer   | Complete walkthrough              | Market orders, single positions        |
| 2     | Apprentice | 5 trades + 1 lesson completed     | Multiple positions, limit orders       |
| 3     | Trader     | 20 trades, 40%+ win rate          | Short selling, all asset types         |
| 4     | Strategist | 50 trades, set SL on 80%+         | Leverage (2x-5x), advanced order types |
| 5     | Pro        | 100 trades, positive equity curve | Full access, mentorship challenges     |


Level displayed prominently on the page with XP bar. Computed from `paper_trades` history.

### 2. Pre-Trade Thesis Builder

Before placing any order, users must fill a quick thesis:

- **Why?** (dropdown: breakout, reversal, momentum, news catalyst, support bounce)
- **Confidence** (1-5 stars)
- **Invalidation** ("I'm wrong if price goes below/above ___")
- Stored in `paper_trades.thesis` as structured JSON

This teaches deliberate decision-making from day one.

### 3. Trading Missions (Structured Challenges)

A set of progressive missions that teach specific skills:

**Beginner missions:**

- "Place your first BUY order on any stock"
- "Set a stop loss within 2% of entry"
- "Close a trade in profit"
- "Place a trade with at least 2:1 reward-to-risk ratio"

**Intermediate missions:**

- "Hold a position for at least 1 hour"
- "Close 3 consecutive trades with stop losses set"
- "Achieve a 50% win rate over 10 trades"
- "Place a SHORT trade"

**Advanced missions:**

- "Place a trade based on RSI being oversold (<30)"
- "Achieve positive P&L over 20 trades"
- "Keep average risk per trade under 2%"

Each mission awards XP and can trigger achievement celebrations. Missions panel shown as a collapsible sidebar section on the demo page.

### 4. Performance Dashboard Tab

A new "Stats" tab alongside Open/History showing:

- **Equity curve** (line chart of balance over time)
- **Win rate** (pie chart or percentage)
- **Average risk:reward ratio**
- **Best & worst trades** (highlighted cards)
- **Trades by asset type** (bar chart)
- **Average hold time**
- **P&L by day of week** (heatmap)
- **Streak tracker** (current winning/losing streak)

All computed from `paper_trades` history. Uses Recharts (already in project).

### 5. Enhanced Order Form

- **Order type selector**: Market (default) / Limit (unlocked at Level 2)
- **Quick position sizing buttons**: 1%, 2%, 5% of balance
- **Auto-calculated risk:reward ratio** display when SL and TP are set
- **Suggested stop loss** based on recent support/ATR (hint text, not binding)
- **Thesis fields** integrated into the form (see #2)
- **Confirmation dialog** for large positions (>10% of balance)

### 6. Improved Trade History with Journal

Each closed trade in history becomes expandable:

- Entry/exit prices, P&L, duration
- The thesis they wrote before entering
- AI review grade (if generated)
- User can add post-trade notes: "I panicked and closed early" / "Should have waited for confirmation"
- Emotion tag: Calm, FOMO, Revenge, Greedy, Fearful
- Filter history by: win/loss, asset type, direction, emotion

### 7. Real-Time Position Alerts

- Visual + toast alert when price approaches stop loss (within 1%)
- Visual + toast alert when price approaches take profit (within 1%)
- Alert when risk exceeds 5% of balance
- Color-coded position cards: green glow when profitable, red glow when losing, amber when near SL/TP

### 8. Tutorial Overlay Enhancements

Replace the current basic tooltip walkthrough with a richer system:

- **Spotlight mode**: dims the rest of the page and highlights the target element
- **Interactive steps**: some steps require user action ("Now click BUY") before advancing
- **Contextual tips**: show mini-tips when user hovers over specific elements (e.g., "RSI below 30 means oversold")
- **Video placeholder areas**: space for future short tutorial clips

---

## Technical Details

### New Components


| File                                       | Purpose                                           |
| ------------------------------------------ | ------------------------------------------------- |
| `src/components/demo/TradingLevel.tsx`     | Level badge + XP progress bar                     |
| `src/components/demo/ThesisBuilder.tsx`    | Pre-trade thesis form                             |
| `src/components/demo/TradingMissions.tsx`  | Mission checklist with progress                   |
| `src/components/demo/PerformanceStats.tsx` | Stats dashboard with charts                       |
| `src/components/demo/TradeJournal.tsx`     | Expandable trade history with notes               |
| `src/components/demo/PositionAlerts.tsx`   | Price proximity alerts logic                      |
| `src/data/tradingMissions.ts`              | Mission definitions (30+ missions across 3 tiers) |


### Modified Files


| File                                        | Change                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/DemoTrading.tsx`                 | Major rewrite: add level display, thesis builder in order form, missions panel, stats tab, improved history, position alerts, limit orders |
| `src/components/demo/GuidedWalkthrough.tsx` | Spotlight mode, interactive steps                                                                                                          |
| `src/components/demo/TradeReview.tsx`       | Add emotion/journal fields to review modal                                                                                                 |


### Database Migration

- Add columns to `paper_trades`: `thesis_json` (jsonb, structured thesis), `order_type` (text, default 'market'), `emotion` (text), `post_notes` (text), `leverage` (numeric, default 1)
- Add `trading_level` column to `profiles` (integer, default 1)

### No New Edge Functions

All stats and level computation happen client-side from `paper_trades` data. Missions are evaluated client-side against trade history.

### Build Order

1. Database migration (new columns)
2. Trading missions data file
3. Level system + thesis builder components
4. Rewrite DemoTrading.tsx with new layout (level bar, missions panel, enhanced form, stats tab)
5. Performance stats dashboard with Recharts
6. Trade journal with expandable history
7. Position alerts
8. Walkthrough upgrade (spotlight + interactive)  
implement all  
