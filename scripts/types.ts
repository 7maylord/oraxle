export interface FeedConfig {
  address:     string;
  heartbeat:   number;
  decimals:    number;
  description: string;
  active:      boolean;
}

export interface PriceResult {
  assetKey:     string;
  price:        string;
  updatedAt:    number;
  updatedAtIso: string;
  roundId:      string;
  isStale:      boolean;
  source:       string;
}

export interface StalenessResult {
  assetKey:      string;
  status:        "live" | "stale";
  isStale:       boolean;
  ageSeconds:    number;
  maxAgeSeconds: number;
  updatedAt:     number;
  updatedAtIso:  string;
}

export interface FeedInfo {
  key:         string;
  description: string;
  heartbeat:   number;
  active:      boolean;
  address:     string;
}

export interface PricePoint {
  roundId:      string;
  price:        string;
  updatedAt:    number;
  updatedAtIso: string;
}

export interface PriceHistoryResult {
  assetKey: string;
  rounds:   number;
  history:  PricePoint[];
  source:   string;
}

export interface DepegAlertResult {
  assetKey:     string;
  status:       "healthy" | "warning" | "critical";
  price:        string;
  pegTarget:    string;
  deviationBps: number;
  deviationPct: string;
  updatedAt:    number;
  updatedAtIso: string;
}

export interface ComparisonResult {
  baseKey:      string;
  quoteKey:     string;
  ratio:        string;
  meaning:      string;
  basePrice:    string;
  quotePrice:   string;
  updatedAt:    number;
  updatedAtIso: string;
}

export type OracleError =
  | { code: "FEED_NOT_FOUND";   assetKey: string }
  | { code: "FEED_STALE";       assetKey: string; ageSeconds: number; maxAgeSeconds: number }
  | { code: "INVALID_ANSWER";   assetKey: string; answer: string }
  | { code: "INCOMPLETE_ROUND"; assetKey: string; roundId: string; answeredInRound: string }
  | { code: "RPC_ERROR";        message: string };
