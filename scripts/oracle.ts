import { Contract, JsonRpcProvider } from "ethers";
import { SEPOLIA_RPC, FEEDS, AGG_ABI } from "./config.js";
import { validateRoundData, toHumanPrice } from "./validate.js";
import type {
  PriceResult, StalenessResult, FeedInfo, OracleError,
  PricePoint, PriceHistoryResult, DepegAlertResult, ComparisonResult,
} from "./types.js";

let _provider: JsonRpcProvider | null = null;
function getProvider(): JsonRpcProvider {
  if (!_provider) _provider = new JsonRpcProvider(SEPOLIA_RPC);
  return _provider;
}

export async function getPrice(
  assetKey: string,
): Promise<PriceResult | OracleError> {
  const cfg = FEEDS[assetKey];
  if (!cfg || !cfg.active) return { code: "FEED_NOT_FOUND", assetKey };

  try {
    const agg = new Contract(cfg.address, AGG_ABI, getProvider());
    const [roundId, answer, , updatedAt, answeredInRound] =
      await agg.latestRoundData();

    const err = validateRoundData(
      assetKey, cfg,
      BigInt(roundId), BigInt(answer), BigInt(updatedAt), BigInt(answeredInRound),
    );
    if (err) return err;

    return {
      assetKey,
      price:        toHumanPrice(BigInt(answer), cfg.decimals),
      updatedAt:    Number(updatedAt),
      updatedAtIso: new Date(Number(updatedAt) * 1000).toISOString(),
      roundId:      roundId.toString(),
      isStale:      false,
      source:       "chainlink-sepolia",
    };
  } catch (e: unknown) {
    return { code: "RPC_ERROR", message: (e as Error).message };
  }
}

export async function getMultiPrice(
  assetKeys: string[],
): Promise<Array<PriceResult | OracleError>> {
  return Promise.all(assetKeys.map(getPrice));
}

export async function getStalenessReport(
  assetKey: string,
): Promise<StalenessResult | OracleError> {
  const cfg = FEEDS[assetKey];
  if (!cfg || !cfg.active) return { code: "FEED_NOT_FOUND", assetKey };

  try {
    const agg = new Contract(cfg.address, AGG_ABI, getProvider());
    const [, , , updatedAt] = await agg.latestRoundData();

    const now     = Math.floor(Date.now() / 1000);
    const age     = now - Number(updatedAt);
    const maxAge  = Math.floor(cfg.heartbeat * 1.5);
    const isStale = age > maxAge;

    return {
      assetKey,
      status:        isStale ? "stale" : "live",
      isStale,
      ageSeconds:    age,
      maxAgeSeconds: maxAge,
      updatedAt:     Number(updatedAt),
      updatedAtIso:  new Date(Number(updatedAt) * 1000).toISOString(),
    };
  } catch (e: unknown) {
    return { code: "RPC_ERROR", message: (e as Error).message };
  }
}

export function listFeeds(): FeedInfo[] {
  return Object.entries(FEEDS).map(([key, cfg]) => ({
    key,
    description: cfg.description,
    heartbeat:   cfg.heartbeat,
    active:      cfg.active,
    address:     cfg.address,
  }));
}

// ── getRawPrice (internal) ────────────────────────────────────────────────────

interface RawPrice {
  raw:          bigint;
  updatedAt:    number;
  updatedAtIso: string;
  roundId:      string;
}

async function getRawPrice(assetKey: string): Promise<RawPrice | OracleError> {
  const cfg = FEEDS[assetKey];
  if (!cfg || !cfg.active) return { code: "FEED_NOT_FOUND", assetKey };

  try {
    const agg = new Contract(cfg.address, AGG_ABI, getProvider());
    const [roundId, answer, , updatedAt, answeredInRound] = await agg.latestRoundData();

    const err = validateRoundData(
      assetKey, cfg,
      BigInt(roundId), BigInt(answer), BigInt(updatedAt), BigInt(answeredInRound),
    );
    if (err) return err;

    return {
      raw:          BigInt(answer),
      updatedAt:    Number(updatedAt),
      updatedAtIso: new Date(Number(updatedAt) * 1000).toISOString(),
      roundId:      roundId.toString(),
    };
  } catch (e: unknown) {
    return { code: "RPC_ERROR", message: (e as Error).message };
  }
}

// ── get_price_history ─────────────────────────────────────────────────────────

export async function getPriceHistory(
  assetKey: string,
  rounds = 5,
): Promise<PriceHistoryResult | OracleError> {
  const cfg = FEEDS[assetKey];
  if (!cfg || !cfg.active) return { code: "FEED_NOT_FOUND", assetKey };

  const limit = Math.min(Math.max(1, rounds), 20);

  try {
    const agg = new Contract(cfg.address, AGG_ABI, getProvider());
    const [latestId] = await agg.latestRoundData();

    const points: PricePoint[] = [];
    let roundId = BigInt(latestId);

    // iterate up to 2× limit to skip any invalid/incomplete rounds at phase boundaries
    for (let i = 0; i < limit * 2 && points.length < limit && roundId > 0n; i++) {
      try {
        const [rid, answer, , updatedAt, answeredInRound] = await agg.getRoundData(roundId);
        const ans = BigInt(answer);
        if (ans > 0n && BigInt(answeredInRound) >= BigInt(rid)) {
          points.push({
            roundId:      roundId.toString(),
            price:        toHumanPrice(ans, cfg.decimals),
            updatedAt:    Number(updatedAt),
            updatedAtIso: new Date(Number(updatedAt) * 1000).toISOString(),
          });
        }
      } catch {
        // skip phase boundary or incomplete round
      }
      roundId -= 1n;
    }

    return { assetKey, rounds: points.length, history: points, source: "chainlink-sepolia" };
  } catch (e: unknown) {
    return { code: "RPC_ERROR", message: (e as Error).message };
  }
}

// ── get_depeg_alert ───────────────────────────────────────────────────────────

export async function getDepegAlert(
  assetKey: string,
  pegTarget = 1.0,
  warningBps = 50,
  criticalBps = 100,
): Promise<DepegAlertResult | OracleError> {
  const price = await getPrice(assetKey);
  if ("code" in price) return price;

  const p = parseFloat(price.price);
  const deviationBps = Math.round(Math.abs(p - pegTarget) / pegTarget * 10_000);
  const deviationPct = (Math.abs(p - pegTarget) / pegTarget * 100).toFixed(4) + "%";

  const status: "healthy" | "warning" | "critical" =
    deviationBps >= criticalBps ? "critical" :
    deviationBps >= warningBps  ? "warning"  :
                                  "healthy";

  return {
    assetKey,
    status,
    price:        price.price,
    pegTarget:    pegTarget.toString(),
    deviationBps,
    deviationPct,
    updatedAt:    price.updatedAt,
    updatedAtIso: price.updatedAtIso,
  };
}

// ── compare_prices ────────────────────────────────────────────────────────────

const RATIO_DECIMALS = 6;

export async function comparePrices(
  baseKey: string,
  quoteKey: string,
): Promise<ComparisonResult | OracleError> {
  const [base, quote] = await Promise.all([getRawPrice(baseKey), getRawPrice(quoteKey)]);
  if ("code" in base)  return base;
  if ("code" in quote) return quote;

  // Both feeds use 8 decimals — they cancel, leaving a pure ratio
  const scaledRatio = (base.raw * BigInt(10 ** RATIO_DECIMALS)) / quote.raw;
  const whole = scaledRatio / BigInt(10 ** RATIO_DECIMALS);
  const frac  = scaledRatio % BigInt(10 ** RATIO_DECIMALS);
  const ratio = `${whole}.${frac.toString().padStart(RATIO_DECIMALS, "0")}`;

  const [baseAsset]  = baseKey.split("/");
  const [quoteAsset] = quoteKey.split("/");

  return {
    baseKey,
    quoteKey,
    ratio,
    meaning:    `1 ${baseAsset} = ${parseFloat(ratio).toFixed(4)} ${quoteAsset}`,
    basePrice:  toHumanPrice(base.raw,  FEEDS[baseKey].decimals),
    quotePrice: toHumanPrice(quote.raw, FEEDS[quoteKey].decimals),
    updatedAt:    Math.min(base.updatedAt, quote.updatedAt),
    updatedAtIso: new Date(Math.min(base.updatedAt, quote.updatedAt) * 1000).toISOString(),
  };
}
