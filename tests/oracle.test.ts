import { describe, it, expect, vi } from "vitest";

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  return {
    ...actual,
    JsonRpcProvider: vi.fn().mockImplementation(function() { return {}; }),
    Contract: vi.fn(),
  };
});

import { Contract } from "ethers";
import {
  getPrice, getStalenessReport, getMultiPrice, listFeeds,
  getPriceHistory, getDepegAlert, comparePrices,
} from "../scripts/oracle.js";

const NOW = Math.floor(Date.now() / 1000);

function mockFeed(answer: bigint, updatedAt = NOW) {
  (Contract as unknown as ReturnType<typeof vi.fn>).mockImplementation(function() {
    return {
      latestRoundData: vi.fn().mockResolvedValue([10n, answer, BigInt(NOW), BigInt(updatedAt), 10n]),
      getRoundData:    vi.fn().mockResolvedValue([10n, answer, BigInt(NOW), BigInt(updatedAt), 10n]),
    };
  });
}

// Used by comparePrices tests — returns different answers per feed address
function mockFeedWithAddress(addressToAnswer: Record<string, bigint>, updatedAt = NOW) {
  (Contract as unknown as ReturnType<typeof vi.fn>).mockImplementation(function(addr: string) {
    const answer = addressToAnswer[addr] ?? 1_00000000n;
    return {
      latestRoundData: vi.fn().mockResolvedValue([10n, answer, BigInt(NOW), BigInt(updatedAt), 10n]),
      getRoundData:    vi.fn().mockResolvedValue([10n, answer, BigInt(NOW), BigInt(updatedAt), 10n]),
    };
  });
}

describe("getPrice", () => {
  it("returns correct price for BTC/USD", async () => {
    mockFeed(6_500000000000n);
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
    mockFeed(6_500000000000n, NOW - 7200);
    expect(await getPrice("BTC/USD")).toMatchObject({ code: "FEED_STALE" });
  });

  it("includes source chainlink-sepolia", async () => {
    mockFeed(6_500000000000n);
    const r = await getPrice("BTC/USD");
    if (!("code" in r)) expect(r.source).toBe("chainlink-sepolia");
  });
});

describe("getStalenessReport", () => {
  it("returns live for fresh feed", async () => {
    mockFeed(6_500000000000n, NOW);
    const r = await getStalenessReport("BTC/USD");
    if (!("code" in r)) {
      expect(r.status).toBe("live");
      expect(r.isStale).toBe(false);
    }
  });

  it("returns stale for old feed", async () => {
    mockFeed(6_500000000000n, NOW - 7200);
    const r = await getStalenessReport("BTC/USD");
    if (!("code" in r)) expect(r.status).toBe("stale");
  });

  it("returns FEED_NOT_FOUND for unknown key", async () => {
    expect(await getStalenessReport("FAKE/USD")).toMatchObject({ code: "FEED_NOT_FOUND" });
  });
});

describe("getMultiPrice", () => {
  it("returns array in same order as input", async () => {
    mockFeed(6_500000000000n);
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
  it("returns history array up to requested length", async () => {
    mockFeed(6_500000000000n);
    const r = await getPriceHistory("BTC/USD", 3);
    if (!("code" in r)) {
      expect(r.assetKey).toBe("BTC/USD");
      expect(r.rounds).toBeGreaterThan(0);
      expect(r.history).toHaveLength(r.rounds);
      expect(r.source).toBe("chainlink-sepolia");
    }
  });

  it("every history point has required fields", async () => {
    mockFeed(6_500000000000n);
    const r = await getPriceHistory("BTC/USD", 2);
    if (!("code" in r)) {
      r.history.forEach(p => {
        expect(p).toHaveProperty("roundId");
        expect(p).toHaveProperty("price");
        expect(p).toHaveProperty("updatedAt");
        expect(p).toHaveProperty("updatedAtIso");
      });
    }
  });

  it("returns FEED_NOT_FOUND for unknown key", async () => {
    expect(await getPriceHistory("FAKE/USD", 5)).toMatchObject({ code: "FEED_NOT_FOUND" });
  });
});

describe("getDepegAlert", () => {
  it("returns healthy when on-peg", async () => {
    mockFeed(1_00000000n); // $1.00
    const r = await getDepegAlert("DAI/USD");
    expect(r).not.toHaveProperty("code");
    if (!("code" in r)) expect(r.status).toBe("healthy");
  });

  it("returns warning for small depeg (60 bps)", async () => {
    mockFeed(99400000n); // $0.994 → 60 bps off peg
    const r = await getDepegAlert("DAI/USD", 1.0, 50, 100);
    if (!("code" in r)) expect(r.status).toBe("warning");
  });

  it("returns critical for large depeg (200 bps)", async () => {
    mockFeed(98000000n); // $0.98 → 200 bps off peg
    const r = await getDepegAlert("DAI/USD", 1.0, 50, 100);
    if (!("code" in r)) expect(r.status).toBe("critical");
  });

  it("returns FEED_NOT_FOUND for unknown key", async () => {
    expect(await getDepegAlert("FAKE/USD")).toMatchObject({ code: "FEED_NOT_FOUND" });
  });
});

describe("comparePrices", () => {
  it("returns correct ratio using BigInt arithmetic", async () => {
    // XAU $2000, ETH $800 → ratio = 2.500000
    mockFeedWithAddress({
      "0xC5981F461d74c46eB4b0CF3f4Ec79f025573B0Ea": 2000_00000000n, // XAU/USD
      "0x694AA1769357215DE4FAC081bf1f309aDC325306":  800_00000000n, // ETH/USD
    });
    const r = await comparePrices("XAU/USD", "ETH/USD");
    expect(r).not.toHaveProperty("code");
    if (!("code" in r)) {
      expect(r.ratio).toBe("2.500000");
      expect(r.meaning).toBe("1 XAU = 2.5000 ETH");
      expect(r.baseKey).toBe("XAU/USD");
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
