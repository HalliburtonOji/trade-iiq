export interface Lesson {
  id: string;
  title: string;
  icon: string;
  category: string;
  duration: string;
  xp: number;
  content: string[];
  takeaways: string[];
  quiz: {
    question: string;
    options: string[];
    correctAnswer: number;
  };
}

export const lessonsData: Lesson[] = [
  {
    id: "stock-market",
    title: "What is the Stock Market?",
    icon: "📈",
    category: "Beginner",
    duration: "5 min",
    xp: 25,
    content: [
      "The stock market is a collection of exchanges where shares of publicly traded companies are bought and sold. When you buy a share, you're purchasing a small ownership stake in that company. The price of shares fluctuates based on supply, demand, company performance, and broader economic conditions.",
      "Major stock exchanges include the New York Stock Exchange (NYSE) and NASDAQ. These markets operate during set hours — typically 9:30 AM to 4:00 PM Eastern Time on weekdays. After-hours and pre-market trading exists but with lower liquidity.",
      "Understanding the stock market is fundamental to becoming a successful trader. Whether you're investing for the long term or trading short-term price movements, knowing how markets function gives you the foundation for every decision you'll make.",
    ],
    takeaways: [
      "Stocks represent ownership in a company",
      "Prices are driven by supply, demand, and fundamentals",
      "Major exchanges: NYSE and NASDAQ",
      "Markets have set trading hours with pre/after-hours sessions",
    ],
    quiz: {
      question: "What does buying a stock represent?",
      options: [
        "Lending money to a company",
        "Owning a small part of a company",
        "Betting against a company",
        "Buying company debt",
      ],
      correctAnswer: 1,
    },
  },
  {
    id: "rsi",
    title: "Understanding RSI",
    icon: "📊",
    category: "Technical",
    duration: "6 min",
    xp: 30,
    content: [
      "The Relative Strength Index (RSI) is a momentum oscillator that measures the speed and magnitude of recent price changes. It ranges from 0 to 100 and is typically used to identify overbought or oversold conditions in a security.",
      "An RSI above 70 generally indicates overbought conditions — the price may have risen too fast and could be due for a pullback. An RSI below 30 suggests oversold conditions — the price may have dropped too aggressively and could be due for a bounce.",
      "However, RSI should never be used in isolation. In strong trends, RSI can remain overbought or oversold for extended periods. Combining RSI with other indicators like MACD, support/resistance levels, and volume gives you a much more reliable trading signal.",
    ],
    takeaways: [
      "RSI measures momentum on a 0–100 scale",
      "Above 70 = overbought, below 30 = oversold",
      "RSI can stay extreme during strong trends",
      "Always combine RSI with other indicators",
    ],
    quiz: {
      question: "What does an RSI reading above 70 typically indicate?",
      options: [
        "The stock is undervalued",
        "The stock is overbought",
        "The stock will definitely drop",
        "Volume is increasing",
      ],
      correctAnswer: 1,
    },
  },
  {
    id: "macd",
    title: "What is MACD?",
    icon: "📉",
    category: "Technical",
    duration: "6 min",
    xp: 30,
    content: [
      "MACD (Moving Average Convergence Divergence) is a trend-following momentum indicator that shows the relationship between two moving averages of a security's price. It consists of the MACD line, signal line, and histogram.",
      "The MACD line is calculated by subtracting the 26-period EMA from the 12-period EMA. The signal line is a 9-period EMA of the MACD line. When the MACD crosses above the signal line, it's a bullish signal. When it crosses below, it's bearish.",
      "The histogram visualises the distance between the MACD and signal lines. Growing histogram bars indicate strengthening momentum, while shrinking bars suggest momentum is fading. MACD divergences — when price makes new highs/lows but MACD doesn't — are powerful reversal signals.",
    ],
    takeaways: [
      "MACD shows relationship between two moving averages",
      "Bullish when MACD crosses above signal line",
      "Histogram shows momentum strength",
      "Divergences between price and MACD signal reversals",
    ],
    quiz: {
      question: "A bullish MACD signal occurs when:",
      options: [
        "MACD crosses below the signal line",
        "MACD crosses above the signal line",
        "The histogram turns red",
        "RSI goes above 70",
      ],
      correctAnswer: 1,
    },
  },
  {
    id: "crypto-vs-stocks",
    title: "Crypto vs Stocks",
    icon: "🪙",
    category: "Beginner",
    duration: "5 min",
    xp: 25,
    content: [
      "Cryptocurrency and stock markets share some similarities — both involve buying assets with the expectation of future gains — but they differ significantly in structure, regulation, volatility, and trading hours.",
      "Stocks trade during market hours on regulated exchanges with circuit breakers and oversight. Crypto markets are open 24/7/365 with no circuit breakers, meaning prices can move dramatically at any time. Crypto volatility is typically 3-5x higher than stock markets.",
      "From an analysis perspective, crypto responds more to narrative, on-chain data, and macro liquidity than traditional earnings metrics. Stock analysis benefits from decades of financial reporting, while crypto projects often have limited financial transparency.",
    ],
    takeaways: [
      "Crypto trades 24/7, stocks have set hours",
      "Crypto volatility is 3-5x higher than stocks",
      "Crypto is driven by narrative and liquidity",
      "Stock analysis uses earnings; crypto uses on-chain data",
    ],
    quiz: {
      question: "What is a key difference between crypto and stock markets?",
      options: [
        "Stocks are more volatile",
        "Crypto markets close on weekends",
        "Crypto trades 24/7 with no circuit breakers",
        "Stocks have no regulation",
      ],
      correctAnswer: 2,
    },
  },
  {
    id: "forex-basics",
    title: "Understanding Forex",
    icon: "💱",
    category: "Forex",
    duration: "7 min",
    xp: 35,
    content: [
      "Foreign exchange (Forex or FX) is the largest financial market in the world, with over $7 trillion in daily trading volume. Unlike stocks, forex involves trading currency pairs — you're simultaneously buying one currency and selling another.",
      "Major pairs include EUR/USD, GBP/USD, USD/JPY, and AUD/USD. These pairs have the tightest spreads and most liquidity. Exotic pairs involve emerging market currencies and carry higher spreads and risk.",
      "Forex markets are open 24 hours from Sunday evening to Friday evening, rotating through Asian, European, and American sessions. Key drivers include interest rate differentials, economic data releases (CPI, NFP, GDP), central bank policy, and geopolitical events.",
    ],
    takeaways: [
      "Forex is the world's largest market at $7T daily volume",
      "You trade currency pairs, not individual currencies",
      "Major pairs have tightest spreads and most liquidity",
      "Interest rates and central bank policy are key drivers",
    ],
    quiz: {
      question: "In forex trading, what are you doing when you buy EUR/USD?",
      options: [
        "Buying US dollars",
        "Selling euros",
        "Buying euros and selling US dollars",
        "Buying both euros and US dollars",
      ],
      correctAnswer: 2,
    },
  },
  {
    id: "risk-management",
    title: "Risk Management",
    icon: "🛡️",
    category: "Strategy",
    duration: "7 min",
    xp: 35,
    content: [
      "Risk management is the single most important skill in trading. No analysis, no indicator, and no strategy matters if you don't manage risk properly. Professional traders survive not because they're always right, but because their losses are controlled.",
      "The core principles: never risk more than 1-2% of your portfolio on a single trade, always use stop losses, and ensure your risk-to-reward ratio is at least 1:2. This means for every £1 you risk, you should be targeting at least £2 in profit.",
      "Position sizing ties everything together. Calculate your position size based on your stop loss distance and maximum risk per trade. If your account is £10,000 and you risk 1%, your maximum loss per trade is £100. If your stop loss is £2 away from entry, you can buy 50 shares.",
    ],
    takeaways: [
      "Never risk more than 1-2% per trade",
      "Always use stop losses on every position",
      "Target minimum 1:2 risk-to-reward ratio",
      "Position sizing should be based on stop loss distance",
    ],
    quiz: {
      question: "If your account is £10,000 and you risk 1% per trade, what is your max loss?",
      options: ["£10", "£100", "£1,000", "£500"],
      correctAnswer: 1,
    },
  },
  {
    id: "sentiment",
    title: "Market Sentiment",
    icon: "🧠",
    category: "Analysis",
    duration: "5 min",
    xp: 25,
    content: [
      "Market sentiment measures the overall attitude of investors toward a particular market or asset. It's the collective mood — fear or greed — that drives buying and selling decisions beyond pure fundamentals.",
      "Key sentiment indicators include the Fear & Greed Index, put/call ratio, VIX (volatility index), and social media sentiment. Extreme fear often creates buying opportunities, while extreme greed can signal overextension.",
      "Contrarian traders specifically look for sentiment extremes. When everyone is euphoric, smart money is often selling. When panic sets in, experienced traders look for quality assets at discounted prices. 'Be fearful when others are greedy, and greedy when others are fearful.'",
    ],
    takeaways: [
      "Sentiment measures collective investor mood",
      "Fear & Greed Index and VIX are key indicators",
      "Extreme fear often creates buying opportunities",
      "Contrarian thinking: go against the crowd at extremes",
    ],
    quiz: {
      question: "What does extreme fear in the market typically signal for contrarian traders?",
      options: [
        "Time to sell everything",
        "A potential buying opportunity",
        "Markets will crash further",
        "Sentiment doesn't matter",
      ],
      correctAnswer: 1,
    },
  },
  {
    id: "bull-bear",
    title: "Bull vs Bear Markets",
    icon: "🐂",
    category: "Beginner",
    duration: "5 min",
    xp: 25,
    content: [
      "A bull market is characterised by rising prices, optimism, and strong investor confidence. Officially, a bull market begins when prices rise 20% from a recent low. During bull markets, the prevailing sentiment is 'buy the dip' — every pullback is seen as an opportunity.",
      "A bear market is the opposite: prices fall 20% or more from recent highs, fear dominates, and investors rush to sell. Bear markets test emotional discipline. Many traders make their worst decisions during bear markets — panic selling at lows or refusing to cut losses.",
      "Understanding which regime you're in changes everything about your strategy. Bull markets reward momentum and breakout strategies. Bear markets reward patience, defensive positioning, and counter-trend trades at key support levels.",
    ],
    takeaways: [
      "Bull market: 20%+ rise from lows, driven by optimism",
      "Bear market: 20%+ decline from highs, driven by fear",
      "Your strategy should adapt to market regime",
      "Bear markets test emotional discipline the most",
    ],
    quiz: {
      question: "What officially defines a bear market?",
      options: [
        "Any day the market goes down",
        "A 10% decline from highs",
        "A 20% or more decline from recent highs",
        "When the VIX goes above 30",
      ],
      correctAnswer: 2,
    },
  },
  {
    id: "support-resistance",
    title: "Support & Resistance",
    icon: "📐",
    category: "Technical",
    duration: "6 min",
    xp: 30,
    content: [
      "Support and resistance are price levels where buying or selling pressure historically concentrates. Support is a price floor — a level where demand is strong enough to prevent further decline. Resistance is a ceiling — where selling pressure stops prices from rising further.",
      "These levels form because of psychological anchoring and institutional order flow. Round numbers (£100, £500, £1000) often act as natural support/resistance. Previous highs and lows create horizontal levels that traders watch closely.",
      "The key concept: when support breaks, it often becomes resistance, and vice versa. This 'role reversal' is one of the most reliable patterns in technical analysis. Trading bounces off support and rejections at resistance is a foundational strategy.",
    ],
    takeaways: [
      "Support = price floor, Resistance = price ceiling",
      "Round numbers act as natural S/R levels",
      "Broken support becomes resistance (and vice versa)",
      "Previous highs and lows create key horizontal levels",
    ],
    quiz: {
      question: "What happens when a support level breaks?",
      options: [
        "It disappears completely",
        "It often becomes a new resistance level",
        "It always leads to a crash",
        "Volume always decreases",
      ],
      correctAnswer: 1,
    },
  },
  {
    id: "position-sizing",
    title: "Position Sizing",
    icon: "📏",
    category: "Strategy",
    duration: "6 min",
    xp: 30,
    content: [
      "Position sizing determines how much of your capital to allocate to each trade. It's the bridge between your risk tolerance and your actual trade execution. Get this wrong and even a winning strategy can blow up your account.",
      "The formula is simple: Position Size = Risk Amount ÷ Distance to Stop Loss. If you're willing to risk £200 and your stop loss is £5 below entry, you can buy 40 shares. This ensures your maximum loss is predefined.",
      "Advanced traders adjust position size based on conviction level and setup quality. Higher conviction setups with better risk/reward ratios may warrant larger positions (within your max risk rules), while lower conviction trades should be smaller. Never let a single trade risk more than your predefined maximum.",
    ],
    takeaways: [
      "Position Size = Risk Amount ÷ Stop Loss Distance",
      "Always predetermine maximum loss before entering",
      "Adjust size based on conviction and setup quality",
      "Never exceed your maximum risk per trade rule",
    ],
    quiz: {
      question: "If you risk £200 and your stop loss is £4 away, how many shares can you buy?",
      options: ["25", "40", "50", "100"],
      correctAnswer: 2,
    },
  },
];

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: (completed: string[], lessons: Lesson[]) => boolean;
}

export const badges: Badge[] = [
  {
    id: "first-steps",
    name: "First Steps",
    icon: "👣",
    description: "Complete your first lesson",
    condition: (c) => c.length >= 1,
  },
  {
    id: "bookworm",
    name: "Bookworm",
    icon: "📖",
    description: "Complete 3 lessons",
    condition: (c) => c.length >= 3,
  },
  {
    id: "rising-trader",
    name: "Rising Trader",
    icon: "🚀",
    description: "Complete 5 lessons",
    condition: (c) => c.length >= 5,
  },
  {
    id: "foundations",
    name: "Foundations Set",
    icon: "🏗️",
    description: "Complete all Beginner lessons",
    condition: (c, l) => l.filter((x) => x.category === "Beginner").every((x) => c.includes(x.id)),
  },
  {
    id: "chart-master",
    name: "Chart Master",
    icon: "📊",
    description: "Complete all Technical lessons",
    condition: (c, l) => l.filter((x) => x.category === "Technical").every((x) => c.includes(x.id)),
  },
  {
    id: "strategist",
    name: "Strategist",
    icon: "♟️",
    description: "Complete all Strategy lessons",
    condition: (c, l) => l.filter((x) => x.category === "Strategy").every((x) => c.includes(x.id)),
  },
  {
    id: "forex-expert",
    name: "Forex Expert",
    icon: "💱",
    description: "Complete all Forex lessons",
    condition: (c, l) => l.filter((x) => x.category === "Forex").every((x) => c.includes(x.id)),
  },
  {
    id: "graduate",
    name: "TradeIQ Graduate",
    icon: "🎓",
    description: "Complete all 10 lessons",
    condition: (c) => c.length >= 10,
  },
];
