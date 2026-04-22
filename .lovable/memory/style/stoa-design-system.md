---
name: Stoa Design System
description: Stoa is a parallel design system (acropolis metaphor) added alongside legacy TradeIQ. Tokens, fonts, layout, routes.
type: design
---

# Stoa — design system overview

Stoa is the new design language for TradeIQ. Each page is a different ancient building. Two palettes share one type kit.

## Palettes (CSS vars on :root, override with `.p-pompeii`)
- **Delphi Night (default):** `--bg #0E1116`, `--ink #F2EAD7`, `--muted #9AA0A6`, `--accent #D4A94A` (gold), `--secondary #6F7B3F` (olive), `--signal #C1440E` (vermillion), `--rule rgba(242,234,215,0.12)`, `--gold-rule rgba(212,169,74,0.35)`.
- **Pompeii (light parchment):** `--bg #EFE6D2`, `--ink #2B1D13`, `--muted #6B5A43`, `--accent #C19A3A`, `--secondary #7A7A3A`, `--signal #9A2A1E`.

Pages that should use Pompeii: `/journal`, `/learn` (apply `pompeii` prop on `StoaLayout`).

## Fonts (loaded in `src/index.css`)
- Cormorant Garamond — display + Greek italics (`.display`, `.greek`)
- IBM Plex Serif — body (default in `.stoa-body` / StoaLayout)
- Inter — kickers / UI labels uppercase 11px, letter-spacing 0.14em (`.kicker`)
- IBM Plex Mono — data/numbers (`.mono`, `.data`)

`font-variant-numeric: tabular-nums` applied to body globally.

## Shared kit (`src/components/stoa/`)
- `Meander.tsx` — Greek-key band via mask-image. Inherits `var(--accent)`. Prop `opacity` (default 0.6).
- `PedimentCap.tsx` — `variant="triangle"` (default, 14px tall) or `variant="rule"` (gold line + diamond tick).
- `Altar.tsx` — universal stat/section card. Props: kicker/greek/title/value/sub/alert/capped/children. Hover border → `--gold-rule`. Alert state uses `--signal` border + 6px dot.

## Layout
- `src/layouts/StoaLayout.tsx` — 220px sidebar + 1fr main, 56px sticky top bar.
- Sidebar sections: ACROPOLIS (Temple/Scroll/Codex/Agora/Amphitheater/Sanctuary) + UTILITY (Ergon/Kanon — Kanon dev-only).
- Each nav item shows English kicker + Greek italic. Active item = 2px left gold bar + 4% gold tint.
- Responsive: <1100px sidebar = 80px rail, <720px = 56px mini (Greek glyph only). Top-bar search collapses to icon at mini.
- Top bar: breadcrumbs (Stoa · Greek · English), centered command palette (⌘K), live ET clock + NYSE OPEN/CLOSED chip, alerts bell.

## Routes
- `/dashboard` → `Temple.tsx` (full)
- `/journal` `/markets` `/coach` `/settings` `/style` → `StoaPlaceholder.tsx` (under construction)
- `/learn` and `/review` reuse existing TradeIQ pages for now (not yet wrapped in StoaLayout).
- Legacy `/`, `/analysis`, `/charts`, `/tracker`, etc. still render legacy TradeIQ shell.

## Temple (Dashboard)
Reads from new tables: `trades`, `account_snapshots`, `daily_rules`. Seeds 3 example trades + 30 days of equity on first load if empty. Keyboard `L` opens trade drawer. Sections: pediment cap → entablature bar (account/session/clock) → hero P&L + 30-day sparkline → 6-column colonnade (Klotho/Lachesis/Atropos/Nike/Logos/Elpis) → Hermes Ledger table.

## Conventions
- No emoji. No box-shadows except a whisper line under the entablature. No gradients except sparkline fill.
- All interactive elements get `:focus-visible { outline: 2px solid var(--accent); offset: 2px }`.
- Motion only inside `@media (prefers-reduced-motion: no-preference)`.
