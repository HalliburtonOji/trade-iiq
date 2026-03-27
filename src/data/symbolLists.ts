export interface SymbolInfo {
  symbol: string;
  name: string;
  category?: string;
}

export const stockSymbols: SymbolInfo[] = [
  { symbol: "AAPL", name: "Apple Inc.", category: "Tech" },
  { symbol: "NVDA", name: "NVIDIA Corp.", category: "Tech" },
  { symbol: "TSLA", name: "Tesla Inc.", category: "EV/Auto" },
  { symbol: "MSFT", name: "Microsoft Corp.", category: "Tech" },
  { symbol: "META", name: "Meta Platforms", category: "Tech" },
  { symbol: "GOOGL", name: "Alphabet Inc.", category: "Tech" },
  { symbol: "AMZN", name: "Amazon.com", category: "E-commerce" },
  { symbol: "AMD", name: "AMD Inc.", category: "Semiconductors" },
  { symbol: "NFLX", name: "Netflix Inc.", category: "Streaming" },
  { symbol: "DIS", name: "Walt Disney", category: "Entertainment" },
  { symbol: "BA", name: "Boeing Co.", category: "Aerospace" },
  { symbol: "JPM", name: "JPMorgan Chase", category: "Banking" },
  { symbol: "V", name: "Visa Inc.", category: "Payments" },
  { symbol: "MA", name: "Mastercard", category: "Payments" },
  { symbol: "JNJ", name: "Johnson & Johnson", category: "Healthcare" },
  { symbol: "PFE", name: "Pfizer Inc.", category: "Pharma" },
  { symbol: "KO", name: "Coca-Cola Co.", category: "Consumer" },
  { symbol: "WMT", name: "Walmart Inc.", category: "Retail" },
  { symbol: "INTC", name: "Intel Corp.", category: "Semiconductors" },
  { symbol: "CRM", name: "Salesforce Inc.", category: "SaaS" },
  { symbol: "PYPL", name: "PayPal Holdings", category: "Fintech" },
  { symbol: "UBER", name: "Uber Technologies", category: "Transport" },
  { symbol: "SQ", name: "Block Inc.", category: "Fintech" },
  { symbol: "COIN", name: "Coinbase Global", category: "Crypto/Finance" },
  { symbol: "PLTR", name: "Palantir Tech.", category: "AI/Data" },
  { symbol: "SNOW", name: "Snowflake Inc.", category: "Cloud" },
  { symbol: "NIO", name: "NIO Inc.", category: "EV/Auto" },
  { symbol: "RIVN", name: "Rivian Automotive", category: "EV/Auto" },
  { symbol: "SOFI", name: "SoFi Technologies", category: "Fintech" },
  { symbol: "GME", name: "GameStop Corp.", category: "Retail" },
];

export const cryptoSymbols: SymbolInfo[] = [
  { symbol: "BTC", name: "Bitcoin", category: "Layer 1" },
  { symbol: "ETH", name: "Ethereum", category: "Layer 1" },
  { symbol: "SOL", name: "Solana", category: "Layer 1" },
  { symbol: "XRP", name: "Ripple", category: "Payments" },
  { symbol: "DOGE", name: "Dogecoin", category: "Meme" },
  { symbol: "ADA", name: "Cardano", category: "Layer 1" },
  { symbol: "AVAX", name: "Avalanche", category: "Layer 1" },
  { symbol: "DOT", name: "Polkadot", category: "Infrastructure" },
  { symbol: "LINK", name: "Chainlink", category: "Oracle" },
  { symbol: "MATIC", name: "Polygon", category: "Layer 2" },
  { symbol: "UNI", name: "Uniswap", category: "DeFi" },
  { symbol: "AAVE", name: "Aave", category: "DeFi" },
  { symbol: "LTC", name: "Litecoin", category: "Payments" },
  { symbol: "ATOM", name: "Cosmos", category: "Infrastructure" },
  { symbol: "ARB", name: "Arbitrum", category: "Layer 2" },
];

export const forexSymbols: SymbolInfo[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", category: "Major" },
  { symbol: "GBP/USD", name: "British Pound / Dollar", category: "Major" },
  { symbol: "USD/JPY", name: "Dollar / Japanese Yen", category: "Major" },
  { symbol: "AUD/USD", name: "Australian Dollar / USD", category: "Major" },
  { symbol: "USD/CAD", name: "Dollar / Canadian Dollar", category: "Major" },
  { symbol: "USD/CHF", name: "Dollar / Swiss Franc", category: "Major" },
  { symbol: "NZD/USD", name: "New Zealand Dollar / USD", category: "Minor" },
  { symbol: "EUR/GBP", name: "Euro / British Pound", category: "Cross" },
  { symbol: "EUR/JPY", name: "Euro / Japanese Yen", category: "Cross" },
  { symbol: "GBP/JPY", name: "Pound / Japanese Yen", category: "Cross" },
];

export const allSymbols: Record<string, SymbolInfo[]> = {
  stock: stockSymbols,
  crypto: cryptoSymbols,
  forex: forexSymbols,
};

export function searchSymbols(query: string, type: string): SymbolInfo[] {
  const list = allSymbols[type] || stockSymbols;
  if (!query) return list;
  const q = query.toLowerCase();
  return list.filter(
    s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  );
}
