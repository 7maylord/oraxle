import { STALENESS_TOLERANCE } from "./config.js";
import type { FeedConfig, OracleError } from "./types.js";

export function validatePriceData(
  assetKey: string,
  cfg: FeedConfig,
  answer: bigint,
  updatedAt: bigint,
): OracleError | null {

  if (answer <= 0n) {
    return { code: "INVALID_ANSWER", assetKey, answer: answer.toString() };
  }

  const now    = BigInt(Math.floor(Date.now() / 1000));
  const age    = now - updatedAt;
  const maxAge = BigInt(Math.floor(cfg.heartbeat * STALENESS_TOLERANCE));
  if (age > maxAge) {
    return {
      code: "FEED_STALE",
      assetKey,
      ageSeconds:    Number(age),
      maxAgeSeconds: Number(maxAge),
    };
  }

  return null;
}

// Use 10n**BigInt(decimals) — safe for 18 decimals where 10**18 exceeds Number.MAX_SAFE_INTEGER
export function toHumanPrice(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole   = raw / divisor;
  const frac    = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr.length > 0 ? `${whole}.${fracStr}` : `${whole}`;
}
