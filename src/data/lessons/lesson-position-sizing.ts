import type { Lesson } from "@/data/lessonsData";

export const lessonPositionSizing: Lesson = {
  id: "position-sizing-edge",
  slug: "position-sizing-edge",
  title: "Position Sizing — The Only Edge You Control",
  icon: "⚖️",
  category: "Risk",
  difficulty: "Easy",
  duration_minutes: 8,
  xp_reward: 30,
  summary:
    "Position size is the single variable you control before price moves. Master it and a 50% win rate becomes profit; ignore it and a 60% win rate ruins you.",
  why_it_matters:
    "Most blowups don't come from bad analysis — they come from oversized positions. Sizing is the cheapest, most reliable edge a retail trader can build.",
  content: [
    {
      heading: "Opening Hook",
      body: [
        "You have $50k. You feel bullish on MSFT. How much do you risk? Most traders guess. The best traders calculate.",
        "Position size is the only variable you control *before* price moves. Get this right, and a 50% win rate becomes profit. Get it wrong, and a 60% win rate ruins you.",
      ],
    },
    {
      heading: "Core Math",
      body: [
        "The math is simple: Position Size = (Account Risk in $) / (Distance to Stop in $).",
        "If you risk $500 per trade on a $50k account (the 1% rule), and your stop is $2 away, you size: $500 / $2 = 250 shares.",
        "That's it. One formula. What makes this hard isn't the math — it's the discipline to stick to it when a setup 'looks perfect.'",
      ],
    },
    {
      heading: "Why 1%",
      body: [
        "Risk 1% per trade because if you lose 10 trades in a row — and you will, at some point — you've lost 10% of your account. Recoverable.",
        "Risk 5% per trade and a 5-loss streak drops you 25%. The math to climb back gets exponentially harder: a 25% loss requires a 33% gain just to break even. A 50% loss requires a 100% gain.",
        "1% feels small. That's the point. Perfect setups fail. The market doesn't care about your conviction.",
      ],
    },
    {
      heading: "Expectancy",
      body: [
        "Real traders think in expectancy, not individual wins: Expectancy = (Win Rate × Avg Win) − (Loss Rate × Avg Loss).",
        "Win 55% of the time, win $200, lose $150 → expectancy is +$52.50 per trade. Over 100 trades, that's +$5,250.",
        "But only if you don't blow up on one oversized trade. Oversize once, and you're not playing the 100-trade game anymore — you're back at zero, rebuilding.",
      ],
    },
  ],
  common_mistake:
    "Sizing based on conviction instead of stop distance. 'I really like this one' is not a sizing model — it's an emotion.",
  practical_example:
    "Account: $30k. Risk 1% = $300. Setup has stop $1.50 below entry. Size: $300 / $1.50 = 200 shares. If price hits stop, you lose exactly $300 — no more, regardless of how 'sure' you were.",
  takeaways: [
    "Position Size = Risk $ / Stop Distance $",
    "1% per trade survives 10-loss streaks; 5% per trade does not",
    "Confidence does not change math",
    "Recalculate sizing every time your account size changes",
    "Think in expectancy across 100 trades, not single outcomes",
  ],
  quiz: [
    {
      question: "Why use 1% risk instead of 5%?",
      options: [
        "More room for a losing streak without blowing up",
        "Because 1% is always best",
        "To feel safer",
      ],
      correctAnswer: 0,
      explanation:
        "1% lets you survive long losing streaks. 5 losses at 5% = 25% drawdown, which needs a 33% gain to recover.",
      tags: ["one-size-fits-all", "emotion-sizing"],
    },
    {
      question:
        "Your stop is $2 away. Account $30k. You want to risk $300 (1%). Position size?",
      options: ["150 shares", "300 shares", "600 shares"],
      correctAnswer: 0,
      explanation: "$300 risk / $2 stop distance = 150 shares.",
      tags: ["math-error", "over-sizing"],
    },
    {
      question: "You feel very confident about a setup. Should you size 3%?",
      options: [
        "No — confidence doesn't change math",
        "Yes, confidence = higher odds",
      ],
      correctAnswer: 0,
      explanation:
        "Conviction has zero correlation with outcome. Sizing should be a fixed rule, not an emotion.",
      tags: ["overconfidence", "emotion-sizing"],
    },
    {
      question:
        "After 2 big wins you upsize to 2%. Your account is growing. OK?",
      options: [
        "Only if your stop distance shrinks proportionally",
        "Yes, winners mean you're hot",
      ],
      correctAnswer: 0,
      explanation:
        "Recency bias is the most expensive bias. The market does not reward streaks.",
      tags: ["recency-bias", "hot-hand"],
    },
    {
      question:
        "You scaled from $40k to $60k. Do you auto-recalculate position size?",
      options: ["Yes, based on the new $60k", "No, keep it as it was"],
      correctAnswer: 0,
      explanation:
        "Risk should always reference current account equity, not historical balance.",
      tags: ["no-rebalance"],
    },
  ],
  related_lessons: ["risk-reward-ratio", "stop-loss-strategies"],
  interactive_element: {
    type: "calculator",
    config: { fields: ["account_size", "stop_distance", "risk_percent"] },
  },
  reflection_prompt:
    "Think of a trade you took too big or too small. What would the right size have been? Write 1–2 sentences.",
};
