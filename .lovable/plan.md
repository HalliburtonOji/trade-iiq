

# TradeIQ — Full MVP Build Plan

## Phase 1: Foundation & Design System
- Set up the Obsidian Glass design system: dark theme (#080c18), glass cards (white/[0.03] + backdrop-blur), indigo accent (#6366f1), Geist + IBM Plex Mono fonts
- Create reusable components: VerdictBadge (BUY/WAIT/AVOID with glow), StatCard, BottomNav, TickerMarquee, GlassCard, SetupScoreMeter
- Set up routing for all pages: Home, Analysis, Tracker, Learn, Portfolio, Screener, Daily Picks
- Enable Lovable Cloud: database, auth, edge functions, secrets

## Phase 2: Database & Auth
- Enable authentication (email/password)
- Create database tables:
  - **Watchlist**: symbol, name, type, added_date, user_id
  - **TradeDecision**: symbol, asset_type, decision, entry_price, notes, outcome, pnl_percent, date, user_id
  - **LearningProgress**: lesson_id, lesson_title, category, completed, xp_earned, completed_date, user_id
  - **DailyPicksCache**: date, stocks (json), crypto (json), forex (json)
  - **AnalysisCache**: symbol, asset_type, verdict, confidence, risk_score, technicals_json, macro_json, targets_json, last_updated
- RLS policies so users only see their own data
- Store Alpha Vantage API key in secrets

## Phase 3: Home Page
- Greeting with time-based message + today's date
- Stats row: Win Rate, Total Decisions, Lessons Completed, Total XP (pulled from DB)
- Scrolling ticker marquee with hardcoded market data (NVDA, BTC, TSLA, META, ETH, AAPL, SOL)
- Market overview grid: S&P 500, NASDAQ, BTC Dominance, Fear & Greed Index (static values)
- Quick action buttons: Analyse, Screen, Log Decision, Daily Lesson
- Watchlist preview from DB with "Analyse →" links
- Daily Picks link button
- Fixed bottom nav

## Phase 4: Analysis Page
- Asset type toggle: Stock / Crypto / Forex
- Search input with Go button + popular ticker chips (AAPL, NVDA, TSLA, BTC, ETH, EUR/USD)
- Edge function to fetch from Alpha Vantage (GLOBAL_QUOTE for stocks, CURRENCY_EXCHANGE_RATE for crypto/forex) with caching to AnalysisCache
- Result card: live price, % change, AI Verdict badge with setup score
- Tabbed content:
  - **Verdict**: Risk meter, sentiment bar, 3 macro bullets, tip linking to Learn
  - **Technicals**: RSI, MACD, Bollinger, Trend in 2×2 grid
  - **Macro**: 3 macro factors with icons
  - **Targets**: Bear / Base / Bull price targets
- Hardcoded analysis data for 10 symbols (AAPL, NVDA, TSLA, MSFT, META, GOOGL, AMD, BTC, ETH, SOL), default fallback for unknown
- "Add to Watchlist" and "Log Decision" buttons
- Skeleton loaders during fetch

## Phase 5: Tracker Page
- Stats row: Win Rate, Wins, Losses, Pending
- Log New Decision form: symbol, asset type toggle, decision toggle (BUY/WAIT/AVOID), entry price, notes → saves to TradeDecision with outcome PENDING
- Filter chips: ALL / PENDING / WIN / LOSS / BUY / WAIT / AVOID
- Decision cards: symbol, type, date, verdict badge, outcome icon, entry price, notes
- "What would I have made?" button → edge function fetches live price, calculates % P&L inline
- Win / Loss / Delete buttons for PENDING decisions

## Phase 6: Learn Page
- XP level progress bar (Novice → Learner → Trader → Pro Trader)
- Streak counter
- Tabs: Lessons | Badges
- **Lessons tab**: category filter chips, 10 lesson cards with icon/title/category/duration/XP, completed lessons greyed with ✅
- Lesson detail view: written content (2-3 paragraphs), 4 key takeaways, quiz with 4 multiple choice options
- Correct answer → award XP, save to LearningProgress, celebration animation
- **Badges tab**: 8 badges in 2-col grid (First Steps, Bookworm, Rising Trader, etc.), unearned greyed out
- 10 hardcoded lessons: Stock Market, RSI, MACD, Crypto vs Stocks, Forex, Risk Management, Sentiment, Bull vs Bear, Support & Resistance, Position Sizing

## Phase 7: Portfolio Page
- Portfolio Health Score as circular progress ring (green/yellow/red), calculated from win rate (40%), decision count (30%), diversification (30%)
- Stats: Win Rate, Total Decisions, Avg P&L
- Diversification bar chart: Stocks vs Crypto vs Forex
- Tabs: Overview | P&L | Paper Trade
  - **Overview**: Win/Loss/Pending counts, watchlist
  - **P&L**: For BUY decisions with entry price, edge function fetches live price, shows % gain/loss with colour bar
  - **Paper Trade**: £10,000 virtual portfolio, balance display, form (symbol, shares, price), localStorage trades list with remove

## Phase 8: Screener Page
- Asset type tabs: Stocks / Crypto / Forex
- Search input
- Filter dropdowns (2×2): Verdict, Risk, Momentum, Sentiment
- Results count + BUY signal count
- Asset cards: symbol, name, sector, verdict badge, % change, RSI, momentum/sentiment/risk pills
- Tap to expand: reason text + "Full Analysis →" link
- Pre-loaded: 10 stocks, 5 crypto, 3 forex (hardcoded)

## Phase 9: Daily Picks Page
- Edge function generates 6 AI picks (2 stocks, 2 crypto, 2 forex) using Lovable AI
- Pick cards: symbol, type, price, verdict badge, 2-3 insight bullets
- Cache to DailyPicksCache — if same date exists, show cached data
- Quick add to watchlist button

## Design Principles Throughout
- Mobile-first, max-width 480px centered
- All navigation via programmatic routing
- Skeleton loaders on every data fetch
- "Last updated" timestamps on cached data
- Smooth animations: fade-in results, slide-up forms (cubic-bezier 0.2, 0.8, 0.2, 1)
- Empty states with guidance text
- Error handling with toast notifications

