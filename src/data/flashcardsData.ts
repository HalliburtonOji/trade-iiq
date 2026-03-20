export interface Flashcard {
  id: string;
  prompt: string;
  answer: string;
  concept_tag: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  related_lesson_id: string;
}

export const flashcardsData: Flashcard[] = [
  // RSI (5)
  { id: "fc-rsi-1", prompt: "What does RSI above 70 usually suggest?", answer: "That price may be stretched — not that a reversal is guaranteed. In strong uptrends, RSI stays above 70 for weeks.", concept_tag: "RSI", category: "Technical", difficulty: "Easy", related_lesson_id: "understanding-rsi" },
  { id: "fc-rsi-2", prompt: "What is bearish RSI divergence?", answer: "Price makes a new high but RSI makes a lower high. It signals fading momentum, not an instant reversal.", concept_tag: "RSI", category: "Technical", difficulty: "Medium", related_lesson_id: "understanding-rsi" },
  { id: "fc-rsi-3", prompt: "Should you automatically buy when RSI drops below 30?", answer: "No. In a bear market, RSI can stay oversold for weeks. Oversold ≠ buy. Context and trend matter more than the number.", concept_tag: "RSI", category: "Technical", difficulty: "Medium", related_lesson_id: "understanding-rsi" },
  { id: "fc-rsi-4", prompt: "What is the best use of RSI in an uptrend?", answer: "Use RSI pullbacks to the 40-50 zone as potential buying opportunities, rather than selling at 70.", concept_tag: "RSI", category: "Technical", difficulty: "Medium", related_lesson_id: "understanding-rsi" },
  { id: "fc-rsi-5", prompt: "Is RSI a standalone trading signal?", answer: "No. RSI is a confirmation tool. It works best when combined with trend analysis, support/resistance, and volume.", concept_tag: "RSI", category: "Technical", difficulty: "Easy", related_lesson_id: "understanding-rsi" },

  // MACD (4)
  { id: "fc-macd-1", prompt: "What is a bullish MACD crossover?", answer: "When the MACD line crosses above the signal line. It indicates positive momentum shift, but works best in trending markets.", concept_tag: "MACD", category: "Technical", difficulty: "Easy", related_lesson_id: "understanding-macd" },
  { id: "fc-macd-2", prompt: "Where does MACD perform worst?", answer: "In choppy, sideways markets. Moving averages create false crossovers when there's no clear trend.", concept_tag: "MACD", category: "Technical", difficulty: "Medium", related_lesson_id: "understanding-macd" },
  { id: "fc-macd-3", prompt: "What does a shrinking MACD histogram mean?", answer: "The gap between MACD and signal line is closing. A crossover is approaching — momentum is shifting.", concept_tag: "MACD", category: "Technical", difficulty: "Medium", related_lesson_id: "understanding-macd" },
  { id: "fc-macd-4", prompt: "What is MACD divergence?", answer: "Price makes a new low but MACD makes a higher low. It suggests selling pressure is fading — a potential reversal setup.", concept_tag: "MACD", category: "Technical", difficulty: "Hard", related_lesson_id: "understanding-macd" },

  // Support & Resistance (5)
  { id: "fc-sr-1", prompt: "Why should S&R be treated as zones, not lines?", answer: "Price rarely reverses at a pixel-perfect level. Zones account for natural variation and prevent premature entries/exits.", concept_tag: "support", category: "Technical", difficulty: "Easy", related_lesson_id: "support-resistance" },
  { id: "fc-sr-2", prompt: "What is 'role reversal' in S&R?", answer: "When broken resistance becomes support, or broken support becomes resistance. It's one of the most reliable patterns.", concept_tag: "support", category: "Technical", difficulty: "Medium", related_lesson_id: "support-resistance" },
  { id: "fc-sr-3", prompt: "What happens when support is tested many times?", answer: "It becomes more significant but also more likely to break. Each test depletes the buyer pool at that level.", concept_tag: "support", category: "Technical", difficulty: "Medium", related_lesson_id: "support-resistance" },
  { id: "fc-sr-4", prompt: "How does S&R behave in strong trends?", answer: "Strong trends overwhelm levels that would normally hold. S&R is most reliable in ranging or moderately trending markets.", concept_tag: "resistance", category: "Technical", difficulty: "Medium", related_lesson_id: "support-resistance" },
  { id: "fc-sr-5", prompt: "How do you identify a support zone?", answer: "Look for clusters of price bounces at similar levels. Three or more bounces in a tight area forms a credible support zone.", concept_tag: "support", category: "Technical", difficulty: "Easy", related_lesson_id: "support-resistance" },

  // Trend & Market Structure (4)
  { id: "fc-trend-1", prompt: "What defines an uptrend?", answer: "Higher highs (HH) and higher lows (HL). Each peak is higher than the last, each dip is higher than the last.", concept_tag: "trend", category: "Technical", difficulty: "Easy", related_lesson_id: "trend-market-structure" },
  { id: "fc-trend-2", prompt: "What is a break of structure (BOS)?", answer: "When the HH/HL or LH/LL pattern breaks. In an uptrend, price breaking below the last higher low is a BOS.", concept_tag: "BOS", category: "Technical", difficulty: "Medium", related_lesson_id: "trend-market-structure" },
  { id: "fc-trend-3", prompt: "What should you do when 5-min and daily trends conflict?", answer: "Trust the higher timeframe. The daily chart represents larger flows and longer-term sentiment. The 5-min is noise.", concept_tag: "trend", category: "Technical", difficulty: "Medium", related_lesson_id: "trend-market-structure" },
  { id: "fc-trend-4", prompt: "How do you trade a ranging market?", answer: "Buy near support, sell near resistance. Don't force trend strategies. Ranges break eventually — be patient.", concept_tag: "structure", category: "Technical", difficulty: "Medium", related_lesson_id: "trend-market-structure" },

  // Risk Management (5)
  { id: "fc-risk-1", prompt: "What is the 1% risk rule?", answer: "Never risk more than 1% of your account on a single trade. This means 10 consecutive losses only cost you 10%.", concept_tag: "risk", category: "Risk", difficulty: "Easy", related_lesson_id: "risk-management" },
  { id: "fc-risk-2", prompt: "How do you calculate position size?", answer: "Position Size = Risk Amount ÷ Stop Distance. If risking $250 with a $3 stop, you buy 83 shares.", concept_tag: "position sizing", category: "Risk", difficulty: "Medium", related_lesson_id: "position-sizing" },
  { id: "fc-risk-3", prompt: "Where should a stop loss go?", answer: "Below the level where your trade thesis fails — usually below the support zone that triggered your entry, not at a random level.", concept_tag: "stop loss", category: "Risk", difficulty: "Medium", related_lesson_id: "risk-management" },
  { id: "fc-risk-4", prompt: "What makes a trade 'reckless'?", answer: "Risking more than 3-5% of your account on one trade. One bad trade can undo weeks of discipline.", concept_tag: "risk", category: "Risk", difficulty: "Easy", related_lesson_id: "risk-management" },
  { id: "fc-risk-5", prompt: "Why does risk-reward ratio matter?", answer: "With a 1:2 R:R, you only need to win 34% of trades to be profitable. Without good R:R, even 70% win rates can lose money.", concept_tag: "risk-reward", category: "Risk", difficulty: "Medium", related_lesson_id: "risk-management" },

  // Position Sizing (3)
  { id: "fc-ps-1", prompt: "Why not just buy as many shares as you can afford?", answer: "Because price per share is irrelevant — dollar risk is what matters. Size based on your stop distance and risk tolerance.", concept_tag: "position sizing", category: "Risk", difficulty: "Easy", related_lesson_id: "position-sizing" },
  { id: "fc-ps-2", prompt: "What happens if you oversize after a winning streak?", answer: "When the streak ends (and it will), the oversized loss wipes out multiple small wins. Consistency beats aggression.", concept_tag: "position sizing", category: "Risk", difficulty: "Medium", related_lesson_id: "position-sizing" },
  { id: "fc-ps-3", prompt: "Should position size change based on conviction?", answer: "Slightly — but never beyond your max risk rule. High conviction doesn't change the probability of being wrong.", concept_tag: "position sizing", category: "Risk", difficulty: "Hard", related_lesson_id: "position-sizing" },

  // FOMO and Chasing (4)
  { id: "fc-fomo-1", prompt: "What is FOMO in trading?", answer: "Fear of missing out — the emotional urge to enter a trade because price is moving and you don't want to be left behind.", concept_tag: "FOMO", category: "Psychology", difficulty: "Easy", related_lesson_id: "fomo-and-chasing" },
  { id: "fc-fomo-2", prompt: "What is revenge trading?", answer: "Trying to recoup losses immediately after a bad trade, usually with oversized positions and poor setups. Emotion, not logic.", concept_tag: "revenge trading", category: "Psychology", difficulty: "Easy", related_lesson_id: "fomo-and-chasing" },
  { id: "fc-fomo-3", prompt: "How do you combat FOMO?", answer: "Accept you missed the move. Wait for a pullback or a new setup. There's always another trade — but there's only one account.", concept_tag: "FOMO", category: "Psychology", difficulty: "Medium", related_lesson_id: "fomo-and-chasing" },
  { id: "fc-fomo-4", prompt: "What is analysis paralysis?", answer: "When fear disguises itself as research. Your setup triggers but you can't act because 'what if it reverses?' Trust your checklist.", concept_tag: "hesitation", category: "Psychology", difficulty: "Medium", related_lesson_id: "fomo-and-chasing" },

  // Breakouts vs Fake Breakouts (4)
  { id: "fc-bo-1", prompt: "How do you confirm a real breakout?", answer: "Volume surge + candle body closing above/below the level. A wick through the level that closes back inside is a fakeout.", concept_tag: "breakout", category: "Strategy", difficulty: "Medium", related_lesson_id: "breakouts-vs-fakeouts" },
  { id: "fc-bo-2", prompt: "What is a fakeout?", answer: "Price pushes through S&R but immediately reverses back. Usually on a wick with weak volume. Traps breakout chasers.", concept_tag: "fakeout", category: "Strategy", difficulty: "Easy", related_lesson_id: "breakouts-vs-fakeouts" },
  { id: "fc-bo-3", prompt: "Why is the candle close more important than the wick?", answer: "The close shows where price settled. The wick shows where it visited briefly. Close above = buyers held. Wick above = they tried and failed.", concept_tag: "breakout", category: "Strategy", difficulty: "Medium", related_lesson_id: "breakouts-vs-fakeouts" },
  { id: "fc-bo-4", prompt: "What is a breakout retest?", answer: "After breaking a level, price pulls back to test it from the other side. Broken resistance becomes support. If it holds, the breakout is confirmed.", concept_tag: "retest", category: "Strategy", difficulty: "Medium", related_lesson_id: "breakouts-vs-fakeouts" },

  // Market Sessions (3)
  { id: "fc-ms-1", prompt: "Which session overlap has the deepest liquidity?", answer: "London–New York overlap (8 AM–12 PM EST). It combines the two largest financial centres for maximum activity.", concept_tag: "sessions", category: "Beginner", difficulty: "Easy", related_lesson_id: "market-sessions" },
  { id: "fc-ms-2", prompt: "Why do breakouts fail during Asia session?", answer: "Lower volume and fewer participants. Without liquidity to sustain the move, price fakes out and reverts.", concept_tag: "sessions", category: "Beginner", difficulty: "Medium", related_lesson_id: "market-sessions" },
  { id: "fc-ms-3", prompt: "Which market trades 24/7?", answer: "Cryptocurrency. Stocks have set hours. Forex trades nearly 24h on weekdays but closes weekends.", concept_tag: "sessions", category: "Beginner", difficulty: "Easy", related_lesson_id: "crypto-vs-stocks-forex" },

  // Bull vs Bear Markets (3)
  { id: "fc-bb-1", prompt: "What defines a bear market?", answer: "A 20%+ decline from a recent high. It reflects a shift in sentiment from greed to fear and risk-off behaviour.", concept_tag: "bear market", category: "Beginner", difficulty: "Easy", related_lesson_id: "bull-bear-markets" },
  { id: "fc-bb-2", prompt: "Why is buying every dip in a bear market dangerous?", answer: "Bear markets produce dead-cat bounces — temporary rallies that trap buyers before the next leg down. Each 'dip' can get deeper.", concept_tag: "bear market", category: "Beginner", difficulty: "Medium", related_lesson_id: "bull-bear-markets" },
  { id: "fc-bb-3", prompt: "How do you confirm a trend change from bear to bull?", answer: "Wait for a break of structure — a higher high after a series of lower highs. One bounce is not confirmation.", concept_tag: "bull market", category: "Beginner", difficulty: "Medium", related_lesson_id: "bull-bear-markets" },
];
