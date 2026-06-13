import { describe, it, expect, vi } from "vitest";

// Expose provider instance so individual tests can configure getLogs
const mockProviderInstance = {
  getBlockNumber: vi.fn().mockResolvedValue(10_000),
  getLogs:        vi.fn().mockResolvedValue([]),
};

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  return {
    ...actual,
    JsonRpcProvider: vi.fn().mockImplementation(function() { return mockProviderInstance; }),
    Contract: vi.fn(),
  };
});

import { Contract } from "ethers";
import {
  getPrice, getStalenessReport, getMultiPrice, listFeeds,
  getPriceHistory, getDepegAlert, comparePrices,
  getFeedId, batchStalenessCheck, getCcipConfig,
} from "../scripts/oracle.js";

const NOW  = Math.floor(Date.now() / 1000);
const E18  = 10n ** 18n;

function mockFeed(answer: bigint, updatedAt = NOW) {
  (Contract as unknown as ReturnType<typeof vi.fn>).mockImplementation(function() {
    return {
      latestAnswer:    vi.fn().mockResolvedValue(answer),
      latestTimestamp: vi.fn().mockResolvedValue(BigInt(updatedAt)),
    };
  });
}

// Returns different answers per feed address — used by comparePrices tests
function mockFeedWithAddress(addressToAnswer: Record<string, bigint>, updatedAt = NOW) {
  (Contract as unknown as ReturnType<typeof vi.fn>).mockImplementation(function(addr: string) {
    const answer = addressToAnswer[addr] ?? 1n * E18;
    return {
      latestAnswer:    vi.fn().mockResolvedValue(answer),
      latestTimestamp: vi.fn().mockResolvedValue(BigInt(updatedAt)),
    };
  });
}

describe("getPrice", () => {
  it("returns correct price for BTC/USD", async () => {
    mockFeed(65_000n * E18);
    const r = await getPrice("BTC/USD");
    expect(r).not.toHaveProperty("code");
    if (!("code" in r)) expect(r.price).toBe("65000");
  });

  it("returns FEED_NOT_FOUND for unknown key", async () => {
    expect(await getPrice("FAKE/USD")).toMatchObject({ code: "FEED_NOT_FOUND" });
  });

  it("returns INVALID_ANSWER for zero price", async () => {
    mockFeed(0n);
    expect(await getPrice("BTC/USD")).toMatchObject({ code: "INVALID_ANSWER" });
  });

  it("returns INVALID_ANSWER for negative price", async () => {
    mockFeed(-1n);
    expect(await getPrice("BTC/USD")).toMatchObject({ code: "INVALID_ANSWER" });
  });

  it("returns FEED_STALE when feed is too old", async () => {
    mockFeed(65_000n * E18, NOW - 7200); // 2h old vs 5400s max
    expect(await getPrice("BTC/USD")).toMatchObject({ code: "FEED_STALE" });
  });

  it("includes source chainlink-pharos-atlantic", async () => {
    mockFeed(65_000n * E18);
    const r = await getPrice("BTC/USD");
    if (!("code" in r)) expect(r.source).toBe("chainlink-pharos-atlantic");
  });
});

describe("getStalenessReport", () => {
  it("returns live for fresh feed", async () => {
    mockFeed(65_000n * E18, NOW);
    const r = await getStalenessReport("BTC/USD");
    expect(r).not.toHaveProperty("code");
    if (!("code" in r)) {
      expect(r.status).toBe("live");
      expect(r.isStale).toBe(false);
    }
  });

  it("returns stale for old feed", async () => {
    mockFeed(65_000n * E18, NOW - 7200);
    const r = await getStalenessReport("BTC/USD");
    if (!("code" in r)) expect(r.status).toBe("stale");
  });

  it("returns FEED_NOT_FOUND for unknown key", async () => {
    expect(await getStalenessReport("FAKE/USD")).toMatchObject({ code: "FEED_NOT_FOUND" });
  });
});

describe("getMultiPrice", () => {
  it("returns array in same order as input", async () => {
    mockFeed(65_000n * E18);
    const r = await getMultiPrice(["BTC/USD", "ETH/USD"]);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ assetKey: "BTC/USD" });
    expect(r[1]).toMatchObject({ assetKey: "ETH/USD" });
  });
});

describe("listFeeds", () => {
  it("returns at least 5 feeds", () => {
    expect(listFeeds().length).toBeGreaterThanOrEqual(5);
  });

  it("every feed has required fields", () => {
    listFeeds().forEach(f => {
      expect(f).toHaveProperty("key");
      expect(f).toHaveProperty("description");
      expect(f).toHaveProperty("address");
      expect(f).toHaveProperty("heartbeat");
    });
  });
});

describe("getPriceHistory", () => {
  it("returns FEED_NOT_FOUND for unknown key", async () => {
    expect(await getPriceHistory("FAKE/USD", 5)).toMatchObject({ code: "FEED_NOT_FOUND" });
  });

  it("returns structured result with empty history when no logs found", async () => {
    mockProviderInstance.getLogs.mockResolvedValueOnce([]);
    const r = await getPriceHistory("BTC/USD", 5);
    expect(r).not.toHaveProperty("code");
    if (!("code" in r)) {
      expect(r.assetKey).toBe("BTC/USD");
      expect(r.source).toBe("chainlink-pharos-atlantic");
      expect(Array.isArray(r.history)).toBe(true);
      expect(r.rounds).toBe(r.history.length);
    }
  });
});

describe("getDepegAlert", () => {
  it("returns healthy when on-peg", async () => {
    mockFeed(1n * E18); // $1.00
    const r = await getDepegAlert("USDC/USD");
    expect(r).not.toHaveProperty("code");
    if (!("code" in r)) expect(r.status).toBe("healthy");
  });

  it("returns warning for small depeg (60 bps)", async () => {
    mockFeed(994n * E18 / 1000n); // $0.994 — 60 bps off peg
    const r = await getDepegAlert("USDC/USD", 1.0, 50, 100);
    if (!("code" in r)) expect(r.status).toBe("warning");
  });

  it("returns critical for large depeg (200 bps)", async () => {
    mockFeed(98n * E18 / 100n); // $0.98 — 200 bps off peg
    const r = await getDepegAlert("USDC/USD", 1.0, 50, 100);
    if (!("code" in r)) expect(r.status).toBe("critical");
  });

  it("returns FEED_NOT_FOUND for unknown key", async () => {
    expect(await getDepegAlert("FAKE/USD")).toMatchObject({ code: "FEED_NOT_FOUND" });
  });
});

describe("comparePrices", () => {
  it("returns correct ratio using BigInt arithmetic", async () => {
    // BTC $2000, ETH $800 → ratio = 2.500000
    mockFeedWithAddress({
      "0x82d0e03ea6d94120B92EA4Ea236DcFA273D42994": 2_000n * E18, // BTC/USD
      "0xCd47D1843f3D6313836303fE1434BA26D257d500":   800n * E18, // ETH/USD
    });
    const r = await comparePrices("BTC/USD", "ETH/USD");
    expect(r).not.toHaveProperty("code");
    if (!("code" in r)) {
      expect(r.ratio).toBe("2.500000");
      expect(r.meaning).toBe("1 BTC = 2.5000 ETH");
      expect(r.baseKey).toBe("BTC/USD");
      expect(r.quoteKey).toBe("ETH/USD");
    }
  });

  it("returns error if base feed not found", async () => {
    expect(await comparePrices("FAKE/USD", "ETH/USD")).toMatchObject({ code: "FEED_NOT_FOUND" });
  });

  it("returns error if quote feed not found", async () => {
    expect(await comparePrices("ETH/USD", "FAKE/USD")).toMatchObject({ code: "FEED_NOT_FOUND" });
  });
});

describe("getFeedId", () => {
  it("returns feedId and address for known asset", () => {
    const r = getFeedId("BTC/USD");
    expect(r).not.toHaveProperty("code");
    if (!("code" in r)) {
      expect(r.feedId).toMatch(/^0x[0-9a-f]{64}$/);
      expect(r.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(r.assetKey).toBe("BTC/USD");
    }
  });

  it("returns FEED_NOT_FOUND for unknown key", () => {
    expect(getFeedId("FAKE/USD")).toMatchObject({ code: "FEED_NOT_FOUND" });
  });

  it("WBTC/USD has a feedId", () => {
    const r = getFeedId("WBTC/USD");
    expect(r).not.toHaveProperty("code");
  });
});

describe("batchStalenessCheck", () => {
  it("returns allLive true when all feeds are fresh", async () => {
    mockFeed(65_000n * E18, NOW);
    const r = await batchStalenessCheck(["BTC/USD", "ETH/USD"]);
    expect(r.allLive).toBe(true);
    expect(r.results).toHaveLength(2);
  });

  it("returns allLive false when any feed is stale", async () => {
    mockFeed(65_000n * E18, NOW - 7200);
    const r = await batchStalenessCheck(["BTC/USD", "ETH/USD"]);
    expect(r.allLive).toBe(false);
  });

  it("results array preserves input order", async () => {
    mockFeed(65_000n * E18, NOW);
    const r = await batchStalenessCheck(["ETH/USD", "BTC/USD"]);
    expect(r.results[0]).toMatchObject({ assetKey: "ETH/USD" });
    expect(r.results[1]).toMatchObject({ assetKey: "BTC/USD" });
  });
});

describe("getCcipConfig", () => {
  it("returns Pharos CCIP config with router and chain selector", () => {
    const r = getCcipConfig();
    expect(r.chainId).toBe(688689);
    expect(r.router).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(r.chainSelector).toBe("16098325658947243212");
    expect(r.supportedLanes.length).toBeGreaterThanOrEqual(10);
  });

  it("every lane has name and chainSelector", () => {
    getCcipConfig().supportedLanes.forEach(lane => {
      expect(lane).toHaveProperty("name");
      expect(lane).toHaveProperty("chainSelector");
    });
  });
});
