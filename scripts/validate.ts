import { STALENESS_TOLERANCE } from "./config.js";
import type { FeedConfig, OracleError } from "./types.js";

export function validateRoundData(
  assetKey: string,
  cfg: FeedConfig,
  roundId: bigint,
  answer: bigint,
  updatedAt: bigint,
  answeredInRound: bigint,
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

  if (answeredInRound < roundId) {
    return {
      code: "INCOMPLETE_ROUND",
      assetKey,
      roundId:         roundId.toString(),
      answeredInRound: answeredInRound.toString(),
    };
  }

  return null;
}

export function toHumanPrice(raw: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole   = raw / divisor;
  const frac    = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr.length > 0 ? `${whole}.${fracStr}` : `${whole}`;
}
