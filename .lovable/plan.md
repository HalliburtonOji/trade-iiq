

# Unified Plan: Demo Trading Simulator + Full Feature Upgrade

## Overview

This is a single unified build that combines everything from the approved improvement plan (landing page, UI polish, deeper analysis, gamification, adventurous trading, social features) with a new flagship **Demo Trading** page — a guided, interactive trading simulator with live charts, step-by-step coaching, and real-time paper execution.

---

## The Demo Trading Page

Based on research into TradingGame (4.5M users), TradingView Paper Trading, IBKR Simulator, and Goat Funded Trader, the best demo trading experiences share these elements:

- **Live chart embedded directly in the trading interface** (not a separate page)
- **Guided walkthrough on first visit** — tooltip-driven steps teaching users how to read the chart, place an order, set stop-loss/take-profit, and review results
- **One-click order placement** with BUY/SELL buttons alongside the chart
- **Real-time position tracking** with floating P&L overlay on the chart
- **Risk controls built in** — force users to set a stop-loss before confirming
- **Post-trade review** — after closing, show what went right/wrong with AI coaching
- **Progressive complexity** — start with simple market orders, unlock limit orders and leverage after completing introductory trades

### Demo Trading Page Design

```text
┌─────────────────────────────────────────────────┐
│  Demo Trading          Balance: £10,000   P&L   │
│  [AAPL ▼] [Stock|Crypto|Forex]                  │
├─────────────────────────────────────────────────┤
│                                                 │
│          TradingView Advanced Chart              │
│          (with drawing tools + indicators)       │
│                                                 │
│   ┌─ Open Position Overlay ──────────────┐      │
│   │ AAPL LONG @ $182.50  P&L: +$45.20   │      │
│   │ SL: $178  TP: $195  [Close Position] │      │
│   └──────────────────────────────────────┘      │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐                     │
│  │  🟢 BUY  │  │  🔴 SELL │   Units: [___]     │
│  └──────────┘  └──────────┘   Stop Loss: [___]  │
│                               Take Profit:[___] │
│  Risk: 2.3% of balance       [Place Order]      │
├─────────────────────────────────────────────────┤
│  Open Positions (2)  │  Trade History (14)       │
│  AAPL +2.4% ● LIVE   │  NVDA +5.1% ✓ closed   │
│  BTC  -0.8% ● LIVE   │  TSLA -1.2% ✗ closed   │
└─────────────────────────────────────────────────┘
```

### Guided Walkthrough (First Visit)

A step-by-step tooltip tour that highlights UI elements in sequence:

1. "Welcome to Demo Trading! You have £10,000 virtual cash to practice with."
2. "Pick a symbol from the dropdown — try AAPL to start."
3. "This is a live chart. Use the timeframe buttons and add indicators like RSI."
4. "Ready to trade? Click BUY to go long, or SELL to go short."
5. "Always set a Stop Loss — this limits your downside risk."
6. "Set a Take Profit target to lock in gains automatically."
7. "Review your risk — we show what % of your balance is at stake."
8. "Click Place Order to execute. Your position will track live."
9. "When ready, close the position and see your AI trade review."

State stored in `localStorage` (`demo_walkthrough_complete`) so it only shows once.

### AI Trade Review (Post-Close)

When a user closes a position, call the existing `chat` edge function with structured context:
- Entry/exit price, P&L, duration held, stop-loss/take-profit hit or manual close
- Returns: grade (A-F), what went well, what to improve, lesson link suggestion

---

## Full Unified Build Order

### Phase A: Foundation (Landing + UI + Sidebar)

1. **Public Landing Page** — `src/pages/Landing.tsx`
   - Hero with animated headline, CTA buttons, feature showcase cards, social proof strip
   - Becomes default route for unauthenticated users (replace redirect to `/auth`)
   - Framer Motion scroll animations, glassmorphic design

2. **Onboarding Wizard** — `src/components/OnboardingWizard.tsx`
   - 3-step flow: experience level → preferred assets → trading goals
   - New profile columns: `experience_level`, `preferred_assets`, `trading_goals`
   - Shows on first login, tailors recommendations

3. **UI Polish**
   - Theme toggle (dark/light) in sidebar — `src/components/ThemeToggle.tsx`
   - Light theme CSS variables in `index.css`
   - Skeleton loaders on all data-fetching pages
   - Animated stat counters on dashboard

### Phase B: Demo Trading Simulator

4. **Demo Trading Page** — `src/pages/DemoTrading.tsx`
   - TradingView chart embed (reuse pattern from Charts page)
   - Symbol selector with asset type tabs
   - BUY/SELL order form with units, stop-loss, take-profit inputs
   - Risk calculator (% of balance at stake)
   - Reads/writes to `paper_trades` DB table (already created)
   - Live P&L tracking for open positions using `live-quote` pipeline
   - Trade history panel with closed positions
   - Balance display synced with profiles `paper_balance`

5. **Guided Walkthrough** — `src/components/demo/GuidedWalkthrough.tsx`
   - Tooltip-based step-by-step tour using absolute positioned highlight overlays
   - 9 steps covering chart reading, order placement, risk management
   - Persisted in localStorage, dismissable, re-triggerable from help button

6. **AI Trade Review** — `src/components/demo/TradeReview.tsx`
   - Post-close modal calling `chat` edge function with trade context
   - Shows grade, strengths, improvements, and suggested lesson
   - Option to save review to trade history

### Phase C: Deeper Analysis

7. **Multi-Symbol Compare** — `src/components/SymbolCompare.tsx`
   - Side-by-side comparison of 2-3 symbols (verdict, scores, price change)
   - New tab on Analysis page

8. **Sector Heatmap** — `src/components/SectorHeatmap.tsx`
   - Color-coded grid of sector performance on Screener page
   - Click sector to filter symbols

9. **AI "What If" Scenarios** — `supabase/functions/what-if/index.ts`
   - "What happens to NVDA if Fed cuts rates?" using Gemini
   - Accessible from Analysis page

### Phase D: Gamification

10. **Streak Calendar** — `src/components/learn/StreakCalendar.tsx`
    - GitHub-style heatmap of daily learning activity
    - Shown on Learn header

11. **Daily Challenge** — `src/components/learn/DailyChallenge.tsx`
    - One challenge per day with bonus XP
    - DB table: `daily_challenges`

12. **Skill Tree** — `src/components/learn/SkillTree.tsx`
    - Visual mastery path showing progression through topics
    - Nodes light up as lessons complete

13. **Achievement Celebrations** — `src/components/AchievementCelebration.tsx`
    - Full-screen confetti on level-up and badge unlock
    - canvas-confetti library

### Phase E: Adventurous Trading Tools

14. **Risk Simulator** — `src/components/RiskSimulator.tsx`
    - "What if your portfolio drops 30%?" drawdown modeling
    - Interactive position size inputs

15. **Leverage Calculator** — `src/components/LeverageCalculator.tsx`
    - Slider showing P&L curves at 2x, 5x, 10x leverage
    - Visual warnings at dangerous levels

16. **Options Strategy Visualizer** — `src/components/OptionsVisualizer.tsx`
    - Payoff diagrams for covered call, iron condor, straddle, bull spread
    - Interactive strike price adjustment

17. **Volatility Scanner** — `src/components/VolatilityScanner.tsx`
    - High-volatility symbols list on Screener page
    - Sorted by recent price swing magnitude

### Phase F: Social & Community

18. **Sentiment Polls** — `src/components/SentimentPoll.tsx`
    - BUY/WAIT/AVOID vote per symbol on Analysis page
    - Aggregate display: "68% say BUY"
    - DB table: `community_votes`

19. **Shared Analysis Feed** — `src/pages/Community.tsx`
    - Publish trade ideas, browse others' analysis
    - Like/bookmark system
    - DB tables: `trade_ideas`, `idea_likes`

20. **XP Leaderboard** — `src/components/Leaderboard.tsx`
    - Weekly/monthly/all-time rankings
    - Opt-in with display name

### Phase G: Chatbot & Polish

21. **Enhanced AI Chatbot**
    - Markdown rendering (react-markdown)
    - Context-aware: knows user's trades, weak areas, demo performance
    - Quick action buttons: "Analyze AAPL", "Quiz me", "Show my stats"

---

## Technical Summary

### New Files (25)

| File | Purpose |
|------|---------|
| `src/pages/Landing.tsx` | Public landing page |
| `src/pages/DemoTrading.tsx` | Guided demo trading simulator |
| `src/pages/Community.tsx` | Social feed |
| `src/components/OnboardingWizard.tsx` | First-login wizard |
| `src/components/ThemeToggle.tsx` | Dark/light toggle |
| `src/components/demo/GuidedWalkthrough.tsx` | Step-by-step tooltip tour |
| `src/components/demo/TradeReview.tsx` | AI post-trade review |
| `src/components/SymbolCompare.tsx` | Multi-symbol comparison |
| `src/components/SectorHeatmap.tsx` | Sector performance grid |
| `src/components/SentimentPoll.tsx` | Community vote widget |
| `src/components/Leaderboard.tsx` | XP rankings |
| `src/components/RiskSimulator.tsx` | Drawdown modeling |
| `src/components/LeverageCalculator.tsx` | Leverage P&L curves |
| `src/components/OptionsVisualizer.tsx` | Options payoff diagrams |
| `src/components/VolatilityScanner.tsx` | High-volatility finder |
| `src/components/AchievementCelebration.tsx` | Confetti celebrations |
| `src/components/learn/StreakCalendar.tsx` | Activity heatmap |
| `src/components/learn/DailyChallenge.tsx` | Daily challenge system |
| `src/components/learn/SkillTree.tsx` | Visual mastery path |
| `supabase/functions/what-if/index.ts` | AI scenario analysis |

### Modified Files (10)

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/demo-trading`, `/community`, `/landing` routes |
| `src/components/SideNav.tsx` | Add Demo Trading + Community nav items, theme toggle |
| `src/components/BottomNav.tsx` | Add Demo Trading item |
| `src/pages/Analysis.tsx` | Compare tab, sentiment poll, what-if button |
| `src/pages/Screener.tsx` | Sector heatmap, volatility scanner |
| `src/pages/Portfolio.tsx` | Link to demo trading, paper trade sync |
| `src/components/learn/LearnHeader.tsx` | Streak calendar, daily challenge |
| `src/components/AIChatbot.tsx` | Markdown rendering, context awareness |
| `src/pages/Index.tsx` | Live market data, animated counters, continue card |
| `src/index.css` | Light theme CSS variables |

### Database Migrations (1)

New tables: `community_votes`, `trade_ideas`, `idea_likes`, `daily_challenges`
New profile columns: `experience_level`, `preferred_assets`, `trading_goals`
RLS on all new tables: users access own rows only; community tables allow authenticated reads.

### Build Order

1. Landing page + onboarding wizard
2. Demo Trading simulator with guided walkthrough
3. UI polish (theme toggle, skeletons, animated counters)
4. Deeper analysis (compare, heatmap, what-if)
5. Gamification (streak, challenges, skill tree, celebrations)
6. Adventurous tools (risk sim, leverage calc, options viz)
7. Social/community (polls, feed, leaderboard)
8. Chatbot upgrade (markdown, context, quick actions)

