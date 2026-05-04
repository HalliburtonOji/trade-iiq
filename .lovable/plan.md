
# Sophos — Deep Research & Roadmap

## What Sophos already is (audit)

**Core:** A live, transparent AI swing trader at `/mentor`. Each ~5min tick, an LLM publishes one INTENT (or a SKIP) → real-time triggers fill paper trades → P&L runs against £10k.

**Built layers (27 components, 6 edge functions, 8 mentor_* tables):**
- 7-tab life: NOW / NEXT / PAST / CASES / REPLAY / JOURNAL / EPISTLE
- Personas (Σοφός / Θρασύς / Ἥσυχος), Mirror Mode, Missed Winners, Weekly R-Contest, Case Studies, Public Profile, Letter (Sundays)

**State of the data (right now):**
| Surface     | Rows |
|-------------|-----:|
| Journal     |  122 |
| Skip events |  117 |
| Intents     |    4 |
| Open trades |    1 |
| Closed      |    0 |
| Case studies|    0 |
| Followers   |    0 |
| Mirror copies | 0 |
| Missed reflections | 0 |

## The honest diagnosis

**1. The brain is starved.** `mentor-tick` feeds the LLM ONE current price per symbol. No candles, no RSI, no support/resistance, no volume. Result: ~97% skip rate ("a single price point provides no context"). Every downstream ritual (cases, leaderboard, missed reflections, mirror) is empty because there are almost no closed trades.

**2. Feedback loops aren't closed.** Followers table = 0 because there's no "follow" action; Mirror is on the page but you can mirror nothing if Sophos never opens. Public profile, case studies, and replay all look hollow.

**3. The personas are dressing.** Thrasys & Hesychos exist in DB and switcher, but `mentor-tick` is hardcoded to Sophos only.

**4. Sophos doesn't know what users do.** The mentor never references your trades, your DNA, your rulebook — it's a one-way broadcast.

## Ranked roadmap (impact × leverage)

### Tier 1 — Make Sophos actually trade (existential)
Without this, every other feature stays cold.

1. **Multi-bar context for the brain.** Pass last 30 candles + RSI + 20/50 EMA + ATR + volume regime to the LLM. Reuse `historical-candles` + `analyze-symbol`. Expected effect: skip rate drops from ~97% → ~40%, intents per day go from ~1 → ~5.
2. **Activate Thrasys & Hesychos.** Run `mentor-tick` per persona with persona-specific prompts (scalper: 4–8h windows, 0.3% risk, RSI extremes; long-term: weekly intents, 2% risk, trend + macro). Three living traders ≫ one.
3. **Open-position management.** Today Sophos opens & forgets until SL/TP. Add: trailing stops, partial profit-taking, "Sophos moves stop to breakeven" journal entries. Each becomes a teachable journal moment.

### Tier 2 — Close the feedback loops (engagement)
Turn the broadcast into a relationship.

4. **Sophos Reads You.** A `mentor-coach` function that, on user trade close, posts a journal entry like *"You sold AAPL after 2h. I would have held — my stop sits at $187.20, 1.4R away. Patience."* Uses your trade + Sophos's open positions. Pure retention magic — turns the mentor from broadcaster to coach.
5. **Follow / unfollow buttons.** Add explicit `Follow` CTA on `/mentor` and `/sophos/public`. Followers get push/email/in-app on intents+opens (already plumbed via `notifications`). Without follow, Mirror Mode and notifications can't reach anyone.
6. **Conviction calibration scorecard.** Group closed trades by published conviction (1–5). Show "When Sophos is 5/5, win rate is 71%. When 2/5, 38%. Use this." Adds epistemic honesty + makes the conviction number actually mean something.
7. **Predict-the-outcome polls.** When a new intent publishes, give followers 2 hrs to vote "will it trigger? hit TP? hit SL?" before resolution. Tracks user prediction accuracy. Drives daily check-ins and contrasts user instinct vs Sophos.
8. **"Why did you skip?" expand-on-tap.** SKIP entries dominate the journal. Make them studyable: small chart thumbnail, the rejected setup, and a 1-line takeaway. Skipping IS the lesson — surface it like one.

### Tier 3 — Expand the product surface (depth)
9. **Sophos Live Stream room.** During US session, a sticky drawer at `/dashboard` with Sophos's last 6 thoughts (skip/plan/open/close), heart-rate dot, and a "Watch live" link. Social-proof feeling without any social.
10. **Voice mode.** TTS-narrated daily brief and weekly Letter (browser SpeechSynthesis or ElevenLabs). 60-sec "morning thought from Sophos." Massive perceived intelligence with little code.
11. **Sophos vs Sophos: persona arena.** A leaderboard tab comparing the three mentors over 7/30/90d (P&L, R-multiple, win rate, max DD). Lets users *choose their voice* with evidence.
12. **Lesson Threads.** Cluster case studies by tag ("FOMO", "Trailing stops", "News-driven exits") into mini-series in `/learn`. Turns one-off cases into structured curriculum.
13. **Sophos Cards (shareable).** OG-image generator for closed trades & case studies. `/api/og/case/:id` returns a beautiful Stoa-styled PNG. One-click share to X/Discord. Free distribution loop.
14. **Sophos Daily Brief notification at 09:30 ET.** Single push with: "Open: 2. Watching: 4. Conviction today: high. Read his journal →". Reliable retention beat.
15. **Personal Sophos Verdict on YOUR trades.** Hook into your `paper_trades`/`trades` lifecycle: when you open a trade, fetch Sophos's stance on the symbol (open? watching? skipped today and why?) and surface as a calm second opinion — *not* a block. Ties Sophos directly to user behavior.

### Tier 4 — Polish & mechanics
16. **Sophos Greek-numeral day counter** ("Day ΞΓʹ alive"), age compounding shown on hero.
17. **Replay → "Make this a teaching moment"** button that converts any past day into a saved scenario in `/learn/scenario`.
18. **Public profile SEO** — server-rendered OG meta + JSON-LD for /sophos/public. Free top-of-funnel.
19. **Audit Mode on Letter** — on each Sunday letter, show diff vs predictions made the previous week (kept promises / broke promises). Builds trust.
20. **Multi-month Skill Map for Sophos himself** — surface his own evolving Trading DNA so users can see him become a different trader over time.

## Implementation slices (suggested order)

```text
SPRINT 1 — Brain & Body            (existential)
  ├─ 1  Multi-bar context for mentor-tick prompt
  ├─ 2  Persona-specific tick runners (3 mentors live)
  └─ 3  Position management (trailing/breakeven/partials)

SPRINT 2 — The Loop                (engagement)
  ├─ 4  Follow/unfollow CTA + persistence
  ├─ 5  Sophos-reads-your-trade coach function
  ├─ 6  Conviction calibration scorecard (NOW tab)
  └─ 7  Predict-the-outcome polls

SPRINT 3 — Reach & Retention       (growth)
  ├─ 8  Daily brief push + voice mode
  ├─ 9  Shareable OG cards for case studies
  ├─ 10 Persona arena leaderboard
  └─ 11 Lesson threads in /learn
```

## Technical notes (for the engineer)

- `mentor-tick` candidate enrichment: call `historical-candles` for top-3 candidates → derive RSI(14), EMA20/50, ATR(14), vol-vs-20MA before the LLM call. This is the single highest-leverage code change in the project.
- Persona variation: store persona-specific prompts on `mentor_profile.persona_prompt` (jsonb). Run one tick per persona with its own pool, MAX_OPEN, MAX_INTENTS, RISK_PCT.
- `mentor-coach` (new fn): trigger on `paper_trades` close, compare to mentor's stance, write a `mentor_journal` entry with `kind='coach_note'` and `payload.user_trade_id`.
- Daily brief: extend existing `daily-brief` with a Sophos block. Use service-role to read mentor_* tables.
- OG images: edge fn returning `image/png` via `npm:satori` + `npm:resvg`.
- All new LLM calls should keep using the Lovable AI Gateway (Gemini 2.5 Flash for cheap, 2.5 Pro only for Letter/Cases).

## Open questions for you
- Do you want all three personas live now, or keep Thrasys/Hesychos as "coming soon" until Sophos is healthy?
- Mirror Mode — keep paper-only, or eventually surface deep-links to brokers (`/broker-launcher`) for Sophos's plans?
- Voice mode: free Web SpeechSynthesis (good enough), or ElevenLabs (premium feel, ~£5/mo per active user)?
- Do you want me to start with SPRINT 1 in full, or just the single highest-leverage item (multi-bar context) so you can see the skip-rate fall before committing to the rest?

Approve to start; tell me which item or sprint to pick up first.
