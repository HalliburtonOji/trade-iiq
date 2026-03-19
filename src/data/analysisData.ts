export interface AnalysisResult {
  symbol: string;
  price: number;
  change: number;
  verdict: "BUY" | "WAIT" | "AVOID";
  setupScore: number;
  riskScore: number;
  summary: string;
  macroPoints: string[];
  technicals: Record<string, string>;
  macroFactors: { icon: string; label: string; detail: string }[];
  targets: { bear: number; base: number; bull: number };
}

export const analysisData: Record<string, AnalysisResult> = {
  AAPL: {
    symbol: "AAPL",
    price: 198.11,
    change: 0.82,
    verdict: "BUY",
    setupScore: 78,
    riskScore: 4,
    summary: "Apple continues to show strength with solid earnings and services revenue growth. Technical setup is clean above the 50-day MA with improving momentum.",
    macroPoints: [
      "Services revenue hit all-time high last quarter",
      "iPhone 16 cycle showing stronger-than-expected demand",
      "Fed rate path supportive for growth equities",
    ],
    technicals: { RSI: "58.3", MACD: "Bullish", Bollinger: "Mid-band", Trend: "Uptrend" },
    macroFactors: [
      { icon: "💵", label: "Interest Rates", detail: "Dovish Fed stance supportive for tech valuations" },
      { icon: "📱", label: "Product Cycle", detail: "iPhone 16 demand exceeding Wall Street estimates" },
      { icon: "🌍", label: "Global Demand", detail: "China sales recovering with new product launches" },
    ],
    targets: { bear: 165, base: 210, bull: 240 },
  },
  NVDA: {
    symbol: "NVDA",
    price: 875.28,
    change: 4.21,
    verdict: "BUY",
    setupScore: 85,
    riskScore: 5,
    summary: "NVIDIA remains the AI infrastructure kingpin with datacenter revenue surging. Momentum is strong but valuation is stretched — setup score reflects high conviction with moderate risk.",
    macroPoints: [
      "Datacenter revenue grew 409% YoY",
      "Blackwell GPU architecture ramping production",
      "AI capex cycle still in early innings",
    ],
    technicals: { RSI: "64.7", MACD: "Bullish", Bollinger: "Upper band", Trend: "Strong uptrend" },
    macroFactors: [
      { icon: "🤖", label: "AI Spending", detail: "Hyperscalers increasing AI capex budgets by 40%+" },
      { icon: "🏭", label: "Supply Chain", detail: "TSMC capacity secured through 2026" },
      { icon: "📊", label: "Competition", detail: "AMD and custom chips gaining but NVIDIA holds 80%+ share" },
    ],
    targets: { bear: 700, base: 950, bull: 1200 },
  },
  TSLA: {
    symbol: "TSLA",
    price: 248.42,
    change: -1.58,
    verdict: "WAIT",
    setupScore: 42,
    riskScore: 7,
    summary: "Tesla faces margin compression and increasing competition. Autonomy narrative is compelling but execution risks are high. Wait for a cleaner entry near support.",
    macroPoints: [
      "Auto margins declining as price cuts continue",
      "FSD progress is real but regulatory timeline uncertain",
      "Energy storage business is the underappreciated growth driver",
    ],
    technicals: { RSI: "44.2", MACD: "Neutral", Bollinger: "Lower band", Trend: "Sideways" },
    macroFactors: [
      { icon: "🚗", label: "EV Market", detail: "Global EV growth slowing from 60% to 20% YoY" },
      { icon: "🏛️", label: "Regulation", detail: "FSD approval timeline remains unclear across markets" },
      { icon: "⚡", label: "Energy", detail: "Megapack orders backlogged through 2025" },
    ],
    targets: { bear: 180, base: 260, bull: 340 },
  },
  MSFT: {
    symbol: "MSFT",
    price: 415.56,
    change: 1.12,
    verdict: "BUY",
    setupScore: 82,
    riskScore: 3,
    summary: "Microsoft is firing on all cylinders with Azure AI driving cloud acceleration. One of the safest large-cap tech plays with a clean technical setup.",
    macroPoints: [
      "Azure revenue growing 29% with AI contribution accelerating",
      "Copilot monetization starting to show in enterprise seats",
      "Strong free cash flow supports continued buybacks",
    ],
    technicals: { RSI: "56.1", MACD: "Bullish", Bollinger: "Mid-band", Trend: "Uptrend" },
    macroFactors: [
      { icon: "☁️", label: "Cloud", detail: "Azure AI services driving incremental cloud revenue" },
      { icon: "💼", label: "Enterprise", detail: "Copilot adoption exceeding internal targets" },
      { icon: "💰", label: "Capital Return", detail: "$10B+ annual buyback program ongoing" },
    ],
    targets: { bear: 360, base: 440, bull: 500 },
  },
  META: {
    symbol: "META",
    price: 502.30,
    change: 3.14,
    verdict: "BUY",
    setupScore: 76,
    riskScore: 4,
    summary: "Meta's efficiency era is paying off with record margins and Reels monetization improving. AI investments are heavy but revenue growth justifies the spend.",
    macroPoints: [
      "Ad revenue rebounding strongly across all surfaces",
      "Reels monetisation gap closing rapidly vs Stories",
      "Reality Labs losses stabilising around $4B/quarter",
    ],
    technicals: { RSI: "61.5", MACD: "Bullish", Bollinger: "Upper-mid", Trend: "Uptrend" },
    macroFactors: [
      { icon: "📱", label: "Social", detail: "Instagram and WhatsApp user engagement at all-time highs" },
      { icon: "🎯", label: "Advertising", detail: "AI-powered ad targeting improving ROAS for advertisers" },
      { icon: "🥽", label: "Metaverse", detail: "Quest 3 sales solid but VR remains a long-term bet" },
    ],
    targets: { bear: 420, base: 540, bull: 620 },
  },
  GOOGL: {
    symbol: "GOOGL",
    price: 155.72,
    change: 0.95,
    verdict: "BUY",
    setupScore: 74,
    riskScore: 4,
    summary: "Google's search moat remains strong and Cloud is turning profitable. AI Overviews haven't cannibalised ad revenue as feared. Solid setup with reasonable valuation.",
    macroPoints: [
      "Search revenue resilient despite AI disruption fears",
      "Google Cloud turned profitable for first time",
      "YouTube Shorts monetisation accelerating",
    ],
    technicals: { RSI: "55.8", MACD: "Bullish", Bollinger: "Mid-band", Trend: "Uptrend" },
    macroFactors: [
      { icon: "🔍", label: "Search", detail: "AI Overviews increasing engagement, not reducing ad clicks" },
      { icon: "☁️", label: "Cloud", detail: "GCP reaching profitability inflection point" },
      { icon: "📺", label: "YouTube", detail: "Shorts ads revenue growing 100%+ YoY" },
    ],
    targets: { bear: 130, base: 170, bull: 195 },
  },
  AMD: {
    symbol: "AMD",
    price: 162.33,
    change: 2.47,
    verdict: "WAIT",
    setupScore: 55,
    riskScore: 6,
    summary: "AMD is well-positioned in AI with MI300X but faces an uphill battle against NVIDIA's ecosystem. Valuation needs earnings to catch up. Wait for a pullback to $145-150.",
    macroPoints: [
      "MI300X winning some hyperscaler design wins",
      "Server CPU market share continuing to grow vs Intel",
      "AI GPU revenue target of $4B may be conservative",
    ],
    technicals: { RSI: "52.4", MACD: "Neutral", Bollinger: "Mid-band", Trend: "Sideways" },
    macroFactors: [
      { icon: "🤖", label: "AI GPUs", detail: "MI300X competitive but CUDA ecosystem is a moat" },
      { icon: "💻", label: "CPUs", detail: "EPYC server share gains continuing at Intel's expense" },
      { icon: "🎮", label: "Gaming", detail: "Console cycle maturation limiting gaming revenue growth" },
    ],
    targets: { bear: 130, base: 175, bull: 210 },
  },
  BTC: {
    symbol: "BTC",
    price: 67842.50,
    change: 2.83,
    verdict: "BUY",
    setupScore: 72,
    riskScore: 6,
    summary: "Bitcoin is in a post-halving accumulation phase with ETF inflows providing sustained demand. Macro backdrop is supportive but volatility remains elevated.",
    macroPoints: [
      "Spot ETF inflows averaging $200M+/day",
      "Post-halving supply shock beginning to materialise",
      "Institutional adoption accelerating globally",
    ],
    technicals: { RSI: "62.1", MACD: "Bullish", Bollinger: "Upper-mid", Trend: "Uptrend" },
    macroFactors: [
      { icon: "🏦", label: "ETF Flows", detail: "Spot Bitcoin ETFs driving unprecedented institutional demand" },
      { icon: "⛏️", label: "Supply", detail: "Halving reduced new supply by 50%, miner selling declining" },
      { icon: "🌐", label: "Regulation", detail: "US regulatory clarity improving post-ETF approval" },
    ],
    targets: { bear: 52000, base: 78000, bull: 100000 },
  },
  ETH: {
    symbol: "ETH",
    price: 3456.80,
    change: -0.92,
    verdict: "WAIT",
    setupScore: 58,
    riskScore: 5,
    summary: "Ethereum faces execution risk with scaling roadmap but remains the dominant smart contract platform. ETH/BTC ratio weak — wait for relative strength to improve.",
    macroPoints: [
      "Layer 2 ecosystem growing but cannibalising L1 fees",
      "ETH ETF flows disappointing compared to BTC",
      "Staking yield provides ~4% annual return floor",
    ],
    technicals: { RSI: "48.3", MACD: "Neutral", Bollinger: "Lower-mid", Trend: "Sideways" },
    macroFactors: [
      { icon: "🔗", label: "DeFi", detail: "TVL recovering but L2 migration fragmenting liquidity" },
      { icon: "📊", label: "ETF", detail: "Spot ETH ETF flows underwhelming vs expectations" },
      { icon: "🔧", label: "Upgrades", detail: "Dencun upgrade reduced L2 costs by 90%+" },
    ],
    targets: { bear: 2800, base: 3800, bull: 5000 },
  },
  SOL: {
    symbol: "SOL",
    price: 178.45,
    change: 4.12,
    verdict: "BUY",
    setupScore: 70,
    riskScore: 7,
    summary: "Solana is the momentum play in crypto with strong developer activity and DeFi growth. High beta means bigger swings both ways. Risk is elevated but trend is your friend.",
    macroPoints: [
      "DEX volume frequently exceeding Ethereum L1",
      "Developer ecosystem growing fastest among alt-L1s",
      "Firedancer validator client improving network resilience",
    ],
    technicals: { RSI: "66.8", MACD: "Bullish", Bollinger: "Upper band", Trend: "Strong uptrend" },
    macroFactors: [
      { icon: "⚡", label: "Performance", detail: "400ms block times and low fees driving user adoption" },
      { icon: "🏗️", label: "Development", detail: "Firedancer second validator client reducing single-point-of-failure risk" },
      { icon: "💱", label: "DeFi", detail: "Solana DeFi TVL growing 300%+ from cycle lows" },
    ],
    targets: { bear: 120, base: 200, bull: 280 },
  },
  DEFAULT: {
    symbol: "UNKNOWN",
    price: 0,
    change: 0,
    verdict: "WAIT",
    setupScore: 50,
    riskScore: 5,
    summary: "No specific analysis data available for this symbol. Showing default analysis framework. Use the popular ticker chips above for detailed AI analysis.",
    macroPoints: [
      "No specific data available — consider using a featured ticker",
      "General market conditions are mixed",
      "Always verify with multiple sources before trading",
    ],
    technicals: { RSI: "50.0", MACD: "Neutral", Bollinger: "Mid-band", Trend: "Unclear" },
    macroFactors: [
      { icon: "📊", label: "Data", detail: "Limited analysis available for this symbol" },
      { icon: "⚠️", label: "Caution", detail: "Verify with additional research sources" },
      { icon: "📚", label: "Learning", detail: "Complete lessons in Learn tab to improve analysis skills" },
    ],
    targets: { bear: 0, base: 0, bull: 0 },
  },
};
