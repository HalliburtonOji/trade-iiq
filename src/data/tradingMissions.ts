export interface TradingMission {
  id: string;
  title: string;
  description: string;
  tier: "beginner" | "intermediate" | "advanced";
  xp: number;
  check: (stats: MissionStats) => boolean;
}

export interface MissionStats {
  totalTrades: number;
  wins: number;
  losses: number;
  tradesWithSL: number;
  tradesWithTP: number;
  shortTrades: number;
  totalPnl: number;
  longestHoldMin: number;
  consecutiveSLTrades: number;
  avgRiskPercent: number;
  winRate: number;
  lessonsCompleted: number;
  walkthroughDone: boolean;
}

export const tradingMissions: TradingMission[] = [
  // Beginner
  { id: "first-buy", title: "First Steps", description: "Place your first BUY order on any symbol", tier: "beginner", xp: 50, check: (s) => s.totalTrades >= 1 },
  { id: "set-sl", title: "Safety Net", description: "Set a stop loss within 2% of entry price", tier: "beginner", xp: 50, check: (s) => s.tradesWithSL >= 1 },
  { id: "first-win", title: "First Blood", description: "Close a trade in profit", tier: "beginner", xp: 75, check: (s) => s.wins >= 1 },
  { id: "rr-ratio", title: "Risk Reward", description: "Place a trade with at least 2:1 reward-to-risk ratio", tier: "beginner", xp: 75, check: (s) => s.tradesWithTP >= 1 && s.tradesWithSL >= 1 },
  { id: "five-trades", title: "Getting Started", description: "Complete 5 total trades", tier: "beginner", xp: 100, check: (s) => s.totalTrades >= 5 },
  { id: "walkthrough", title: "Student", description: "Complete the guided walkthrough", tier: "beginner", xp: 50, check: (s) => s.walkthroughDone },
  { id: "first-lesson", title: "Bookworm", description: "Complete at least 1 lesson in Learn", tier: "beginner", xp: 75, check: (s) => s.lessonsCompleted >= 1 },
  { id: "three-wins", title: "Hat Trick", description: "Win 3 trades", tier: "beginner", xp: 100, check: (s) => s.wins >= 3 },
  { id: "sl-habit", title: "Disciplined", description: "Set a stop loss on at least 5 trades", tier: "beginner", xp: 100, check: (s) => s.tradesWithSL >= 5 },
  { id: "ten-trades", title: "Double Digits", description: "Complete 10 total trades", tier: "beginner", xp: 150, check: (s) => s.totalTrades >= 10 },

  // Intermediate
  { id: "short-trade", title: "Bear Mode", description: "Place a SHORT (sell) trade", tier: "intermediate", xp: 100, check: (s) => s.shortTrades >= 1 },
  { id: "hold-hour", title: "Patient Trader", description: "Hold a position for at least 60 minutes", tier: "intermediate", xp: 100, check: (s) => s.longestHoldMin >= 60 },
  { id: "consec-sl", title: "Always Protected", description: "Close 3 consecutive trades that all had stop losses", tier: "intermediate", xp: 125, check: (s) => s.consecutiveSLTrades >= 3 },
  { id: "win-rate-50", title: "Coin Flipper", description: "Achieve a 50%+ win rate over 10+ trades", tier: "intermediate", xp: 150, check: (s) => s.totalTrades >= 10 && s.winRate >= 50 },
  { id: "twenty-trades", title: "Experienced", description: "Complete 20 total trades", tier: "intermediate", xp: 200, check: (s) => s.totalTrades >= 20 },
  { id: "five-wins-row", title: "Hot Streak", description: "Win 5 trades total with 60%+ win rate", tier: "intermediate", xp: 200, check: (s) => s.wins >= 5 && s.winRate >= 60 },
  { id: "low-risk", title: "Conservative", description: "Keep average risk per trade under 3%", tier: "intermediate", xp: 150, check: (s) => s.totalTrades >= 5 && s.avgRiskPercent < 3 },
  { id: "ten-sl", title: "Iron Discipline", description: "Set stop loss on 10+ trades", tier: "intermediate", xp: 150, check: (s) => s.tradesWithSL >= 10 },
  { id: "five-short", title: "Bear Hunter", description: "Complete 5 SHORT trades", tier: "intermediate", xp: 175, check: (s) => s.shortTrades >= 5 },
  { id: "thirty-trades", title: "Seasoned", description: "Complete 30 total trades", tier: "intermediate", xp: 250, check: (s) => s.totalTrades >= 30 },

  // Advanced
  { id: "positive-pnl", title: "In the Green", description: "Achieve positive total P&L over 20+ trades", tier: "advanced", xp: 300, check: (s) => s.totalTrades >= 20 && s.totalPnl > 0 },
  { id: "risk-under-2", title: "Pro Risk Mgmt", description: "Keep average risk under 2% over 20+ trades", tier: "advanced", xp: 300, check: (s) => s.totalTrades >= 20 && s.avgRiskPercent < 2 },
  { id: "fifty-trades", title: "Veteran", description: "Complete 50 total trades", tier: "advanced", xp: 400, check: (s) => s.totalTrades >= 50 },
  { id: "win-rate-60", title: "Sharpshooter", description: "60%+ win rate over 30+ trades", tier: "advanced", xp: 400, check: (s) => s.totalTrades >= 30 && s.winRate >= 60 },
  { id: "sl-80-pct", title: "Risk Master", description: "Set stop loss on 80%+ of all trades (20+ trades)", tier: "advanced", xp: 350, check: (s) => s.totalTrades >= 20 && (s.tradesWithSL / s.totalTrades) >= 0.8 },
  { id: "hundred-trades", title: "Centurion", description: "Complete 100 total trades", tier: "advanced", xp: 500, check: (s) => s.totalTrades >= 100 },
  { id: "ten-lessons", title: "Scholar", description: "Complete 10 lessons in Learn", tier: "advanced", xp: 300, check: (s) => s.lessonsCompleted >= 10 },
  { id: "profit-1000", title: "Grand Profit", description: "Accumulate £1,000+ in total P&L", tier: "advanced", xp: 500, check: (s) => s.totalPnl >= 1000 },
];

export const LEVEL_CONFIG = [
  { level: 1, name: "Observer", minTrades: 0, unlocks: "Market orders, single positions" },
  { level: 2, name: "Apprentice", minTrades: 5, unlocks: "Multiple positions, limit orders" },
  { level: 3, name: "Trader", minTrades: 20, unlocks: "Short selling, all asset types" },
  { level: 4, name: "Strategist", minTrades: 50, unlocks: "Leverage (2x-5x), advanced orders" },
  { level: 5, name: "Pro", minTrades: 100, unlocks: "Full access, mentorship challenges" },
] as const;

export function computeLevel(totalTrades: number, winRate: number, slPercent: number): number {
  if (totalTrades >= 100 && winRate > 0) return 5;
  if (totalTrades >= 50 && slPercent >= 80) return 4;
  if (totalTrades >= 20 && winRate >= 40) return 3;
  if (totalTrades >= 5) return 2;
  return 1;
}
