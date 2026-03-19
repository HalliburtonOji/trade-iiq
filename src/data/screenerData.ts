export interface ScreenerAsset {
  symbol: string;
  name: string;
  type: "stock" | "crypto" | "forex";
  sector: string;
  verdict: "BUY" | "WAIT" | "AVOID";
  change: number;
  rsi: number;
  momentum: "Strong" | "Moderate" | "Flat" | "Weak";
  sentiment: "Bullish" | "Neutral" | "Bearish";
  risk: "Low" | "Medium" | "High";
  reason: string;
}

export const screenerData: ScreenerAsset[] = [
  // Stocks
  { symbol: "AAPL", name: "Apple Inc", type: "stock", sector: "Technology", verdict: "BUY", change: 0.8, rsi: 58, momentum: "Moderate", sentiment: "Bullish", risk: "Low", reason: "Solid earnings momentum with services revenue growth. Clean technical setup above 50-day MA." },
  { symbol: "NVDA", name: "NVIDIA Corp", type: "stock", sector: "Semiconductors", verdict: "BUY", change: 4.2, rsi: 65, momentum: "Strong", sentiment: "Bullish", risk: "Medium", reason: "AI infrastructure leader with 409% datacenter revenue growth. Valuation stretched but momentum dominant." },
  { symbol: "TSLA", name: "Tesla Inc", type: "stock", sector: "Automotive", verdict: "WAIT", change: -1.6, rsi: 44, momentum: "Flat", sentiment: "Neutral", risk: "High", reason: "Margin compression from price cuts. FSD narrative compelling but execution risk high." },
  { symbol: "MSFT", name: "Microsoft Corp", type: "stock", sector: "Technology", verdict: "BUY", change: 1.1, rsi: 56, momentum: "Moderate", sentiment: "Bullish", risk: "Low", reason: "Azure AI driving cloud acceleration. One of the safest large-cap tech positions." },
  { symbol: "META", name: "Meta Platforms", type: "stock", sector: "Communication", verdict: "BUY", change: 3.1, rsi: 62, momentum: "Strong", sentiment: "Bullish", risk: "Low", reason: "Efficiency era paying off with record margins. Reels monetisation gap closing." },
  { symbol: "GOOGL", name: "Alphabet Inc", type: "stock", sector: "Technology", verdict: "BUY", change: 1.0, rsi: 56, momentum: "Moderate", sentiment: "Bullish", risk: "Low", reason: "Search moat intact, Cloud turning profitable. AI Overviews not cannibalising ad revenue." },
  { symbol: "AMD", name: "Advanced Micro Devices", type: "stock", sector: "Semiconductors", verdict: "WAIT", change: 2.5, rsi: 52, momentum: "Flat", sentiment: "Neutral", risk: "Medium", reason: "MI300X winning design wins but CUDA ecosystem moat is hard to crack." },
  { symbol: "AMZN", name: "Amazon.com", type: "stock", sector: "E-Commerce", verdict: "BUY", change: 1.8, rsi: 59, momentum: "Moderate", sentiment: "Bullish", risk: "Low", reason: "AWS growth reaccelerating. Retail margins expanding with automation investments." },
  { symbol: "CRM", name: "Salesforce", type: "stock", sector: "Software", verdict: "WAIT", change: -0.5, rsi: 48, momentum: "Flat", sentiment: "Neutral", risk: "Medium", reason: "AI agent narrative strong but valuation needs earnings confirmation." },
  { symbol: "INTC", name: "Intel Corp", type: "stock", sector: "Semiconductors", verdict: "AVOID", change: -2.3, rsi: 38, momentum: "Weak", sentiment: "Bearish", risk: "High", reason: "Foundry losses mounting, market share eroding to AMD and ARM-based designs." },
  // Crypto
  { symbol: "BTC", name: "Bitcoin", type: "crypto", sector: "Layer 1", verdict: "BUY", change: 2.8, rsi: 62, momentum: "Strong", sentiment: "Bullish", risk: "Medium", reason: "Post-halving accumulation phase with sustained ETF inflows averaging $200M+/day." },
  { symbol: "ETH", name: "Ethereum", type: "crypto", sector: "Layer 1", verdict: "WAIT", change: -0.9, rsi: 48, momentum: "Flat", sentiment: "Neutral", risk: "Medium", reason: "ETH/BTC ratio weak. L2 ecosystem growing but cannibalising L1 fees." },
  { symbol: "SOL", name: "Solana", type: "crypto", sector: "Layer 1", verdict: "BUY", change: 4.1, rsi: 67, momentum: "Strong", sentiment: "Bullish", risk: "High", reason: "DEX volume exceeding Ethereum. Momentum play with high beta risk." },
  { symbol: "BNB", name: "Binance Coin", type: "crypto", sector: "Exchange", verdict: "WAIT", change: 0.3, rsi: 51, momentum: "Flat", sentiment: "Neutral", risk: "Medium", reason: "Regulatory overhang stabilising but limited upside catalyst near-term." },
  { symbol: "ADA", name: "Cardano", type: "crypto", sector: "Layer 1", verdict: "AVOID", change: -1.5, rsi: 41, momentum: "Weak", sentiment: "Bearish", risk: "High", reason: "Developer activity declining relative to competitors. Lacks narrative catalyst." },
  // Forex
  { symbol: "EUR/USD", name: "Euro / US Dollar", type: "forex", sector: "Major", verdict: "WAIT", change: -0.2, rsi: 49, momentum: "Flat", sentiment: "Neutral", risk: "Low", reason: "ECB and Fed policy divergence narrowing. Range-bound until next CPI." },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", type: "forex", sector: "Major", verdict: "BUY", change: 0.4, rsi: 55, momentum: "Moderate", sentiment: "Bullish", risk: "Low", reason: "BoE holding rates longer than expected. GBP strength supported by services inflation." },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", type: "forex", sector: "Major", verdict: "AVOID", change: 0.8, rsi: 72, momentum: "Strong", sentiment: "Bearish", risk: "High", reason: "Approaching intervention zone. BoJ rate hike expectations increasing." },
];
