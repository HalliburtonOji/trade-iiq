const CRYPTO_BASES = new Set([
  "BTC","ETH","SOL","ADA","XRP","DOGE","MATIC","AVAX","DOT","LINK","LTC","BCH",
  "SHIB","UNI","ATOM","NEAR","APT","ARB","OP","SUI","TON","ICP","FIL","INJ",
  "RNDR","FTM","AAVE","GRT","SAND","MANA","AXS","CRV","COMP","MKR","SNX",
  "PEPE","WIF","BONK","FLOKI","TRX","HBAR",
]);

const FIAT_CODES = new Set([
  "USD","EUR","GBP","JPY","CHF","CAD","AUD","NZD","CNY","HKD","SGD","SEK",
  "NOK","DKK","MXN","ZAR","TRY","INR","BRL","PLN","CZK",
]);

export function normalizeSymbol(input: string): string {
  const raw = (input || "").trim().toUpperCase();
  if (!raw || raw.includes(":")) return raw;
  const crypto = raw.match(/^([A-Z]{2,6})(USD|USDT|USDC|BTC|ETH)$/);
  if (crypto && CRYPTO_BASES.has(crypto[1])) {
    const quote = crypto[2] === "USD" ? "USDT" : crypto[2];
    return `BINANCE:${crypto[1]}${quote}`;
  }
  if (/^[A-Z]{6}$/.test(raw) && FIAT_CODES.has(raw.slice(0, 3)) && FIAT_CODES.has(raw.slice(3))) {
    return `OANDA:${raw}`;
  }
  return raw;
}

export function detectAssetClass(input: string): "crypto" | "forex" | "equity" {
  const n = normalizeSymbol(input);
  if (n.startsWith("BINANCE:") || n.startsWith("COINBASE:") || n.startsWith("KRAKEN:")) return "crypto";
  if (n.startsWith("OANDA:") || n.startsWith("FX:")) return "forex";
  return "equity";
}
