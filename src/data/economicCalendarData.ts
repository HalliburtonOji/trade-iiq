export interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  event: string;
  impact: "high" | "medium" | "low";
  currency: string;
  previous?: string;
  forecast?: string;
  category: "central_bank" | "employment" | "inflation" | "gdp" | "earnings" | "other";
}

// Rolling calendar — dates are approximate and should be updated periodically
export const economicEvents: EconomicEvent[] = [
  {
    id: "fomc_1",
    date: "2026-04-01",
    time: "14:00 ET",
    event: "FOMC Meeting Minutes",
    impact: "high",
    currency: "USD",
    category: "central_bank",
  },
  {
    id: "nfp_1",
    date: "2026-04-03",
    time: "08:30 ET",
    event: "Non-Farm Payrolls",
    impact: "high",
    currency: "USD",
    previous: "275K",
    forecast: "200K",
    category: "employment",
  },
  {
    id: "cpi_1",
    date: "2026-04-10",
    time: "08:30 ET",
    event: "CPI (Consumer Price Index)",
    impact: "high",
    currency: "USD",
    previous: "3.1%",
    forecast: "2.9%",
    category: "inflation",
  },
  {
    id: "ecb_1",
    date: "2026-04-11",
    time: "07:45 ET",
    event: "ECB Interest Rate Decision",
    impact: "high",
    currency: "EUR",
    category: "central_bank",
  },
  {
    id: "retail_1",
    date: "2026-04-15",
    time: "08:30 ET",
    event: "US Retail Sales",
    impact: "medium",
    currency: "USD",
    previous: "0.6%",
    forecast: "0.4%",
    category: "other",
  },
  {
    id: "earnings_tech_1",
    date: "2026-04-22",
    time: "After Market",
    event: "TSLA Earnings Report",
    impact: "high",
    currency: "USD",
    category: "earnings",
  },
  {
    id: "earnings_tech_2",
    date: "2026-04-24",
    time: "After Market",
    event: "META Earnings Report",
    impact: "high",
    currency: "USD",
    category: "earnings",
  },
  {
    id: "gdp_1",
    date: "2026-04-25",
    time: "08:30 ET",
    event: "US GDP (Advance Estimate)",
    impact: "high",
    currency: "USD",
    previous: "3.3%",
    forecast: "2.5%",
    category: "gdp",
  },
  {
    id: "pce_1",
    date: "2026-04-26",
    time: "08:30 ET",
    event: "PCE Price Index",
    impact: "high",
    currency: "USD",
    previous: "2.6%",
    forecast: "2.5%",
    category: "inflation",
  },
  {
    id: "fomc_2",
    date: "2026-05-01",
    time: "14:00 ET",
    event: "FOMC Rate Decision",
    impact: "high",
    currency: "USD",
    category: "central_bank",
  },
  {
    id: "earnings_tech_3",
    date: "2026-05-01",
    time: "After Market",
    event: "AAPL Earnings Report",
    impact: "high",
    currency: "USD",
    category: "earnings",
  },
  {
    id: "nfp_2",
    date: "2026-05-02",
    time: "08:30 ET",
    event: "Non-Farm Payrolls (May)",
    impact: "high",
    currency: "USD",
    category: "employment",
  },
  {
    id: "boe_1",
    date: "2026-05-08",
    time: "07:00 ET",
    event: "Bank of England Rate Decision",
    impact: "medium",
    currency: "GBP",
    category: "central_bank",
  },
  {
    id: "cpi_2",
    date: "2026-05-13",
    time: "08:30 ET",
    event: "CPI (May Reading)",
    impact: "high",
    currency: "USD",
    category: "inflation",
  },
];

export function getUpcomingEvents(count = 5): EconomicEvent[] {
  const now = new Date();
  return economicEvents
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, count);
}

export function getImpactColor(impact: string): string {
  if (impact === "high") return "text-verdict-avoid";
  if (impact === "medium") return "text-verdict-wait";
  return "text-muted-foreground";
}

export function getImpactBg(impact: string): string {
  if (impact === "high") return "bg-verdict-avoid/15 border-verdict-avoid/20";
  if (impact === "medium") return "bg-verdict-wait/15 border-verdict-wait/20";
  return "bg-muted/15 border-border/20";
}
