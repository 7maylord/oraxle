import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as oracle from "./oracle.js";

const server = new McpServer({
  name: "oraxle-skill",
  version: "1.0.0",
});

const ASSET_KEYS =
  "BTC/USD, ETH/USD, PROS/USD, LINK/USD, USDT/USD, USDC/USD, SOL/USD, XRP/USD, BNB/USD, WBTC/USD";

server.tool(
  "get_price",
  "Get the current USD price of a single asset from Chainlink Push Engine on Pharos. " +
    "Validates staleness and answer sign before returning. " +
    `Supported keys: ${ASSET_KEYS}.`,
  { assetKey: z.string().describe('e.g. "BTC/USD" or "PROS/USD"') },
  async ({ assetKey }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await oracle.getPrice(assetKey), null, 2),
      },
    ],
  }),
);

server.tool(
  "get_multi_price",
  "Get USD prices for 1–10 assets in one parallel call. " +
    "Returns array in same order as input. " +
    "Each item is either a PriceResult or OracleError — check for 'code' field.",
  {
    assetKeys: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe(`e.g. ["BTC/USD","ETH/USD","PROS/USD"]. Valid keys: ${ASSET_KEYS}`),
  },
  async ({ assetKeys }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await oracle.getMultiPrice(assetKeys), null, 2),
      },
    ],
  }),
);

server.tool(
  "get_staleness_report",
  "Check if a Chainlink price feed is live or stale without fetching the price. " +
    "Call this before any high-value transaction to verify oracle health. " +
    "Returns ageSeconds, maxAgeSeconds, and status: live | stale.",
  { assetKey: z.string().describe('e.g. "ETH/USD"') },
  async ({ assetKey }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await oracle.getStalenessReport(assetKey), null, 2),
      },
    ],
  }),
);

server.tool(
  "list_feeds",
  "List all supported price feeds with descriptions, heartbeats, on-chain addresses, and Chainlink Feed IDs. " +
    "Call this to discover available assets before querying prices.",
  {},
  async () => ({
    content: [
      { type: "text", text: JSON.stringify(oracle.listFeeds(), null, 2) },
    ],
  }),
);

server.tool(
  "get_price_history",
  "Fetch the last N price updates for an asset by scanning AnswerUpdated events on-chain (newest first). " +
    "Use to verify price trend before triggering a liquidation or rebalance. " +
    "Paginates automatically within Atlantic Testnet's 1,000-block eth_getLogs limit.",
  {
    assetKey: z.string().describe('e.g. "ETH/USD"'),
    rounds: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Number of rounds to fetch (1–20, default 5)"),
  },
  async ({ assetKey, rounds }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await oracle.getPriceHistory(assetKey, rounds), null, 2),
      },
    ],
  }),
);

server.tool(
  "get_depeg_alert",
  "Check if a stablecoin has deviated from its expected peg. " +
    "Returns healthy / warning / critical based on configurable basis-point thresholds. " +
    "Use before committing liquidity to any pool that holds USDC or USDT.",
  {
    assetKey: z.string().describe('Stablecoin feed key, e.g. "USDC/USD" or "USDT/USD"'),
    pegTarget: z
      .number()
      .default(1.0)
      .describe("Expected peg price (default 1.0)"),
    warningBps: z
      .number()
      .int()
      .default(50)
      .describe("Basis points off-peg for warning (default 50 = 0.5%)"),
    criticalBps: z
      .number()
      .int()
      .default(100)
      .describe("Basis points off-peg for critical (default 100 = 1%)"),
  },
  async ({ assetKey, pegTarget, warningBps, criticalBps }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          await oracle.getDepegAlert(assetKey, pegTarget, warningBps, criticalBps),
          null,
          2,
        ),
      },
    ],
  }),
);

server.tool(
  "compare_prices",
  "Get the price ratio between two assets using BigInt arithmetic — no floating-point drift. " +
    "Answers cross-asset questions like 'how much ETH is 1 BTC worth?'. " +
    "Returns ratio, human-readable meaning, and both source prices.",
  {
    baseKey:  z.string().describe('Numerator asset, e.g. "BTC/USD"'),
    quoteKey: z.string().describe('Denominator asset, e.g. "ETH/USD"'),
  },
  async ({ baseKey, quoteKey }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await oracle.comparePrices(baseKey, quoteKey), null, 2),
      },
    ],
  }),
);

server.tool(
  "get_feed_id",
  "Get the canonical Chainlink Feed ID (bytes32) for an asset. " +
    "Feed IDs are used for cross-chain price references via Chainlink CCIP and Data Streams. " +
    "Returns the feedId, contract address, and assetKey.",
  { assetKey: z.string().describe('e.g. "BTC/USD"') },
  async ({ assetKey }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(oracle.getFeedId(assetKey), null, 2),
      },
    ],
  }),
);

server.tool(
  "batch_staleness_check",
  "Check staleness for multiple feeds in one call. " +
    "Returns allLive: true only if every feed is live — use as a pre-flight gate before multi-asset transactions. " +
    "Faster than calling get_staleness_report N times.",
  {
    assetKeys: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe(`Assets to check, e.g. ["BTC/USD","ETH/USD"]. Valid keys: ${ASSET_KEYS}`),
  },
  async ({ assetKeys }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await oracle.batchStalenessCheck(assetKeys), null, 2),
      },
    ],
  }),
);

server.tool(
  "get_ccip_config",
  "Get the Chainlink CCIP v1.6.0 configuration for Pharos Atlantic Testnet. " +
    "Returns the Router address, chain selector, OnRamp, LINK token, and all 10 supported outbound lanes. " +
    "Use when planning cross-chain transfers or token bridging from Pharos.",
  {},
  async () => ({
    content: [
      { type: "text", text: JSON.stringify(oracle.getCcipConfig(), null, 2) },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[oraxle-skill] MCP server running");
