# Plan: Broker Integration, Live Charts Tab, and Collapsible Sidebar

## What You Get

1. **Smart Broker Launcher** — Pre-fill trade details (symbol, decision, price) and let users pick a broker to open. Users can search supported brokers, favorite one for quick access, and launch directly from Analysis or Tracker.
2. **Live Charts Page** — A new "Charts" page with embedded TradingView widgets for professional candlestick, line, and area charts with full technical overlays (RSI, MACD, Bollinger Bands, MAs), plus timeframe controls. No API calls needed — TradingView's free embed handles everything.
3. **Collapsible Sidebar** — The desktop SideNav collapses to an icon-only rail with a toggle button, preserving the animated active indicator and sign-out. State persists via localStorage.

---

## Technical Details

### 1. Broker Launcher

**New component: `src/components/BrokerLauncher.tsx**`

- Modal/sheet that receives `{ symbol, decision, price, assetType }`
- Searchable list of brokers with deep-link URL templates:
  - Trading 212: `https://app.trading212.com/`
  - Interactive Brokers: `https://www.interactivebrokers.com/`
  - eToro, Freetrade, Robinhood, Webull, Plus500, IG, Saxo, etc.
- Each broker card shows name, logo placeholder, and "Open" button
- Favorite broker stored in `profiles` table (new column `preferred_broker text`)
- Favorited broker appears pinned at top with a star
- Opens broker URL in new tab with `window.open()`
- Pre-fill info shown as a copyable summary card (symbol, decision, entry price, notes) so users can paste into their broker

**Integration points:**

- "Execute Trade" button on Analysis page (next to Log Decision)
- "Open in Broker" button on Tracker trade cards
- MarketSignals result panel

**DB change:** Add `preferred_broker` column to `profiles` table.

### 2. Live Charts Page (TradingView Embed)

**New page: `src/pages/Charts.tsx**`

TradingView provides free embeddable widgets that handle all charting — no API key needed, no rate limits, professional-grade charts.

- **Advanced Chart Widget**: Full candlestick/line/area charts with built-in technical indicators (RSI, MACD, Bollinger, MA, Volume), drawing tools, and timeframe selection
- Symbol search input at top
- Asset type tabs (Stock / Crypto / Forex) that adjust the exchange prefix
- TradingView widget loaded via `<script>` tag in a `useEffect`
- Watchlist symbols shown as quick-access chips
- Chart style toggle: Candlestick / Line / Area (passed as widget config)

**Route:** `/charts` added to `App.tsx` with ProtectedRoute

**Nav update:** Add "Charts" item with `BarChart3` icon to SideNav and BottomNav

### 3. Collapsible Sidebar

**Modify: `src/components/SideNav.tsx**`

- Add `collapsed` state with localStorage persistence
- Toggle button (chevron icon) at the bottom or top of the sidebar
- Collapsed state: `w-16` with icons only, no labels, no section titles
- Expanded state: `w-64` with full labels (current behaviour)
- Tooltip on hover for collapsed icon buttons (show label)
- Brand shrinks to just "T" logo mark when collapsed
- Smooth width transition with `transition-all duration-300`

**Modify: `src/components/PageShell.tsx**`

- Read collapsed state and adjust `ml-64` → `ml-16` accordingly
- Pass collapsed state down or use shared state (localStorage + context or just read localStorage)

---

## Build Order

1. Collapsible sidebar (SideNav + PageShell)
2. Live Charts page with TradingView embed
3. Broker Launcher component + profiles column migration
4. Wire broker launcher into Analysis, Tracker, and MarketSignals  
  
add an ai chatbot that can do everything for the user and have proper conversations, explanations and perform all the features in the app straight from chat also whatsapp integration for this

---

## Files Created / Modified


| Action    | File                                              |
| --------- | ------------------------------------------------- |
| Create    | `src/pages/Charts.tsx`                            |
| Create    | `src/components/BrokerLauncher.tsx`               |
| Modify    | `src/components/SideNav.tsx` — collapsible logic  |
| Modify    | `src/components/PageShell.tsx` — dynamic margin   |
| Modify    | `src/components/BottomNav.tsx` — add Charts       |
| Modify    | `src/App.tsx` — add /charts route                 |
| Modify    | `src/pages/Analysis.tsx` — broker launcher button |
| Migration | Add `preferred_broker` column to `profiles`       |
