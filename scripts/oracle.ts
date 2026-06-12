import { Contract, JsonRpcProvider, id as ethersId, Interface } from "ethers";
import { PHAROS_RPC, FEEDS, AGG_ABI, STALENESS_TOLERANCE } from "./config.js";
import { validatePriceData, toHumanPrice } from "./validate.js";
import type {
  PriceResult, StalenessResult, FeedInfo, OracleError,
  PricePoint, PriceHistoryResult, DepegAlertResult, ComparisonResult,
} from "./types.js";

let _provider: JsonRpcProvider | null = null;
function getProvider(): JsonRpcProvider {
  if (!_provider) _provider = new JsonRpcProvider(PHAROS_RPC);
  return _provider;
}

// ── get_price ─────────────────────────────────────────────────────────────────

export async function getPrice(
  assetKey: string,
): Promise<PriceResult | OracleError> {
  const cfg = FEEDS[assetKey];
  if (!cfg || !cfg.active) return { code: "FEED_NOT_FOUND", assetKey };

  try {
    const agg = new Contract(cfg.address, AGG_ABI, getProvider());
    const [answer, updatedAt] = await Promise.all([
      agg.latestAnswer(),
      agg.latestTimestamp(),
    ]);

    const err = validatePriceData(assetKey, cfg, BigInt(answer), BigInt(updatedAt));
    if (err) return err;

    return {
      assetKey,
      price:        toHumanPrice(BigInt(answer), cfg.decimals),
      updatedAt:    Number(updatedAt),
      updatedAtIso: new Date(Number(updatedAt) * 1000).toISOString(),
      isStale:      false,
      source:       "chainlink-pharos-atlantic",
    };
  } catch (e: unknown) {
    return { code: "RPC_ERROR", message: (e as Error).message };
  }
}

// ── get_multi_price ───────────────────────────────────────────────────────────

export async function getMultiPrice(
  assetKeys: string[],
): Promise<Array<PriceResult | OracleError>> {
  return Promise.all(assetKeys.map(getPrice));
}

// ── get_staleness_report ──────────────────────────────────────────────────────

export async function getStalenessReport(
  assetKey: string,
): Promise<StalenessResult | OracleError> {
  const cfg = FEEDS[assetKey];
  if (!cfg || !cfg.active) return { code: "FEED_NOT_FOUND", assetKey };

  try {
    const agg       = new Contract(cfg.address, AGG_ABI, getProvider());
    const updatedAt = BigInt(await agg.latestTimestamp());

    const now     = BigInt(Math.floor(Date.now() / 1000));
    const age     = now - updatedAt;
    const maxAge  = BigInt(Math.floor(cfg.heartbeat * STALENESS_TOLERANCE));
    const isStale = age > maxAge;

    return {
      assetKey,
      status:        isStale ? "stale" : "live",
      isStale,
      ageSeconds:    Number(age),
      maxAgeSeconds: Number(maxAge),
      updatedAt:     Number(updatedAt),
      updatedAtIso:  new Date(Number(updatedAt) * 1000).toISOString(),
    };
  } catch (e: unknown) {
    return { code: "RPC_ERROR", message: (e as Error).message };
  }
}

// ── list_feeds ────────────────────────────────────────────────────────────────

export function listFeeds(): FeedInfo[] {
  return Object.entries(FEEDS).map(([key, cfg]) => ({
    key,
    description: cfg.description,
    heartbeat:   cfg.heartbeat,
    active:      cfg.active,
    address:     cfg.address,
  }));
}

// ── get_price_history — via AnswerUpdated events ──────────────────────────────

const ANSWER_UPDATED_TOPIC = ethersId("AnswerUpdated(int256,uint256,uint256)");
const ANSWER_UPDATED_IFACE = new Interface([
  "event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt)",
]);

export async function getPriceHistory(
  assetKey: string,
  rounds = 5,
): Promise<PriceHistoryResult | OracleError> {
  const cfg = FEEDS[assetKey];
  if (!cfg || !cfg.active) return { code: "FEED_NOT_FOUND", assetKey };

  const limit = Math.min(Math.max(1, rounds), 20);

  try {
    const provider = getProvider();
    const latest   = await provider.getBlockNumber();

    // Atlantic Testnet caps eth_getLogs at 1000 blocks per query — paginate backwards
    const MAX_CHUNK    = 900;
    const MAX_QUERIES  = limit * 4; // enough chunks to find `limit` rounds

    const points: PricePoint[] = [];
    let toBlock     = latest;
    let queriesDone = 0;

    while (points.length < limit && queriesDone < MAX_QUERIES && toBlock > 0) {
      const fromBlock = Math.max(0, toBlock - MAX_CHUNK);

      const logs = await provider.getLogs({
        address: cfg.address,
        topics:  [ANSWER_UPDATED_TOPIC],
        fromBlock,
        toBlock,
      });

      for (const log of [...logs].reverse()) {
        if (points.length >= limit) break;
        try {
          const decoded = ANSWER_UPDATED_IFACE.parseLog(log);
          if (!decoded) continue;
          const answer    = BigInt(decoded.args.current);
          const updatedAt = BigInt(decoded.args.updatedAt);
          if (answer <= 0n) continue;
          points.push({
            roundId:      decoded.args.roundId.toString(),
            price:        toHumanPrice(answer, cfg.decimals),
            updatedAt:    Number(updatedAt),
            updatedAtIso: new Date(Number(updatedAt) * 1000).toISOString(),
          });
        } catch {
          // skip malformed log
        }
      }

      toBlock = fromBlock - 1;
      queriesDone++;
    }

    return { assetKey, rounds: points.length, history: points, source: "chainlink-pharos-atlantic" };
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

  const p           = parseFloat(price.price);
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

interface RawPrice {
  raw:          bigint;
  updatedAt:    number;
  updatedAtIso: string;
}

async function getRawPrice(assetKey: string): Promise<RawPrice | OracleError> {
  const cfg = FEEDS[assetKey];
  if (!cfg || !cfg.active) return { code: "FEED_NOT_FOUND", assetKey };

  try {
    const agg = new Contract(cfg.address, AGG_ABI, getProvider());
    const [answer, updatedAt] = await Promise.all([
      agg.latestAnswer(),
      agg.latestTimestamp(),
    ]);

    const err = validatePriceData(assetKey, cfg, BigInt(answer), BigInt(updatedAt));
    if (err) return err;

    return {
      raw:          BigInt(answer),
      updatedAt:    Number(updatedAt),
      updatedAtIso: new Date(Number(updatedAt) * 1000).toISOString(),
    };
  } catch (e: unknown) {
    return { code: "RPC_ERROR", message: (e as Error).message };
  }
}

const RATIO_DECIMALS = 6;

export async function comparePrices(
  baseKey: string,
  quoteKey: string,
): Promise<ComparisonResult | OracleError> {
  const [base, quote] = await Promise.all([getRawPrice(baseKey), getRawPrice(quoteKey)]);
  if ("code" in base)  return base;
  if ("code" in quote) return quote;

  // Both feeds use the same decimals — they cancel, leaving a pure ratio
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
