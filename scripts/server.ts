import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as oracle from "./oracle.js";

const server = new McpServer({
  name: "oraxle-skill",
  version: "1.0.0",
});

server.tool(
  "get_price",
  "Get the current USD price of a single RWA asset from Chainlink. " +
    "Validates staleness and answer sign before returning. " +
    "Supported keys: BTC/USD, ETH/USD, XAU/USD, LINK/USD, DAI/USD.",
  { assetKey: z.string().describe('e.g. "BTC/USD" or "XAU/USD"') },
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
  "Get USD prices for 1–10 RWA assets in one call. " +
    "Returns array in same order as input. " +
    "Each item is either a PriceResult or OracleError — check for 'code' field.",
  {
    assetKeys: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe('e.g. ["BTC/USD","XAU/USD"]'),
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
    "Call this before any high-value transaction to verify oracle health.",
  { assetKey: z.string().describe('e.g. "ETH/USD"') },
  async ({ assetKey }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          await oracle.getStalenessReport(assetKey),
          null,
          2,
        ),
      },
    ],
  }),
);

server.tool(
  "list_feeds",
  "List all supported RWA price feeds with descriptions, heartbeats, and addresses. " +
    "Call this first to discover available assets.",
  {},
  async () => ({
    content: [
      { type: "text", text: JSON.stringify(oracle.listFeeds(), null, 2) },
    ],
  }),
);

server.tool(
  "get_price_history",
  "Fetch the last N rounds of price data for an asset (most recent first). " +
    "Use to assess price trend before triggering a liquidation or rebalance. " +
    "Skips incomplete or phase-boundary rounds automatically.",
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
  "Check if a stablecoin or pegged asset has deviated from its expected peg. " +
    "Returns healthy / warning / critical based on configurable basis-point thresholds. " +
    "Use before committing liquidity to a pool that depends on a stablecoin.",
  {
    assetKey: z.string().describe('Stablecoin feed key, e.g. "DAI/USD"'),
    pegTarget: z
      .number()
      .default(1.0)
      .describe("Expected peg price (default 1.0 for stablecoins)"),
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
  "Get the price ratio between two assets using BigInt arithmetic (no floating-point drift). " +
    "Use to answer cross-asset questions like 'how much ETH does 1 oz of gold cost?'. " +
    "Returns ratio, human-readable meaning, and both source prices.",
  {
    baseKey: z.string().describe('Numerator asset, e.g. "XAU/USD"'),
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

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[rwa-oracle-skill] MCP server running");
