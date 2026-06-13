---
name: oraxle
description: >
  Provides verified Chainlink price feeds for tokenized real-world assets on Pharos.
  Fetches live prices from Pharos Atlantic Testnet via the Chainlink Push Engine with
  staleness validation. Use when an agent needs current asset prices before executing
  a payment, triggering a liquidation, rebalancing a portfolio, or checking stablecoin
  peg health on Pharos. Supports single lookups, batch queries, price history,
  depeg alerts, and cross-asset ratio computation.
license: MIT
compatibility: Requires Node.js 18+. Network access to Pharos Atlantic Testnet required.
metadata:
  author: 7maylord
  version: "1.0.0"
  chain: pharos
  network: atlantic-testnet
  chain-id: "688689"
  data-source: chainlink-push-engine
---

# Oraxle Skill

Verified Chainlink price feeds for Pharos agents. Ten tools covering the full oracle
lifecycle: discover → health check → price → batch price → history → depeg → ratio → feed ID → batch health → CCIP config.

## Setup (one-time)

### Step 1 — Install the skill

```bash
npx skills add https://github.com/7maylord/oraxle -g
```

This installs the skill context to `~/.claude/skills/oraxle`.

Alternatively, clone manually:

```bash
git clone https://github.com/7maylord/oraxle ~/.claude/skills/oraxle
```

### Step 2 — Install dependencies

```bash
cd ~/.claude/skills/oraxle
pnpm install        # or: npm install
```

### Step 3 — Register the MCP server

Oraxle exposes 10 tools via MCP. Add to your agent's config:

**Claude Code** — add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "oraxle": {
      "command": "pnpm",
      "args": ["start"],
      "cwd": "~/.claude/skills/oraxle"
    }
  }
}
```

**Cursor / Windsurf / VS Code MCP extension** — add the same block to your agent's
MCP config file (check its docs for `mcpServers`).

**Codex CLI** — add to `~/.codex/config.json` under `mcpServers` (same shape).

**Verify it loaded** — in Claude Code terminal:

```
/mcp
```

You should see `oraxle` listed with 10 tools.

## Capability Index

| When the user says…                                                        | Use this tool            |
| -------------------------------------------------------------------------- | ------------------------ |
| "get BTC price", "what is ETH trading at", "price of PROS"                 | `get_price`              |
| "prices for BTC and ETH", "batch price check", "get multi prices"          | `get_multi_price`        |
| "is the BTC feed fresh", "check oracle health before liquidation"          | `get_staleness_report`   |
| "are all my feeds live", "multi-feed health check before rebalance"        | `batch_staleness_check`  |
| "what assets can I price", "list supported feeds"                          | `list_feeds`             |
| "ETH price trend", "last 5 BTC rounds", "is price falling"                 | `get_price_history`      |
| "is USDC depegged", "stablecoin health check", "USDT peg status"           | `get_depeg_alert`        |
| "how much ETH is 1 BTC", "BTC/ETH ratio", "PROS value in ETH"              | `compare_prices`         |
| "what is the Chainlink Feed ID for BTC", "bytes32 feed ID"                 | `get_feed_id`            |
| "CCIP config", "cross-chain lanes from Pharos", "Chainlink CCIP router"    | `get_ccip_config`        |

---

## Tools

### `get_price`

Fetch the current USD price for a single asset from Chainlink on Pharos.
Validates staleness and answer sign before returning.

**When to use:** before any single-asset transaction — payment sizing, collateral
check, liquidation trigger.

**Input:** `assetKey` — one of: `BTC/USD` `ETH/USD` `PROS/USD` `LINK/USD`
`USDT/USD` `USDC/USD` `SOL/USD` `XRP/USD` `BNB/USD`

**Output:**

```json
{
  "assetKey": "BTC/USD",
  "price": "63473.092066009445",
  "updatedAt": 1781212955,
  "updatedAtIso": "2026-06-11T21:22:35.000Z",
  "isStale": false,
  "source": "chainlink-pharos-atlantic"
}
```

---

### `get_multi_price`

Fetch USD prices for 1–10 assets in one parallel call.

**When to use:** portfolio rebalancing, multi-collateral checks, any time more than
one asset price is needed.

**Input:** `assetKeys` — array, e.g. `["BTC/USD", "ETH/USD", "PROS/USD"]`

**Output:** Array of PriceResult objects in input order. Each item is either a valid
result or an OracleError — check for `"code"` field.

---

### `get_staleness_report`

Check whether a feed is live or stale without fetching the price.

**When to use:** pre-flight check before any high-value transaction. Call this first,
then call `get_price` only if the feed is live.

**Input:** `assetKey`

**Output:**

```json
{
  "assetKey": "ETH/USD",
  "status": "live",
  "isStale": false,
  "ageSeconds": 111,
  "maxAgeSeconds": 5400,
  "updatedAt": 1781216015,
  "updatedAtIso": "2026-06-11T22:13:35.000Z"
}
```

---

### `list_feeds`

List all supported feeds with descriptions, heartbeats, and on-chain addresses.

**When to use:** at session start to discover available assets, or when building a
dynamic feed-selection flow.

**Input:** none

**Output:** Array of FeedInfo objects with `key`, `description`, `heartbeat`,
`active`, `address`.

---

### `get_price_history`

Fetch the last N price updates for an asset by scanning `AnswerUpdated` events
on-chain. Results are newest-first. Paginates automatically within Atlantic
Testnet's 1,000-block `eth_getLogs` limit.

**When to use:** before a liquidation or rebalance — verify the price has been
trending in the expected direction over multiple rounds, not just the latest tick.

**Input:**

- `assetKey` — asset to query
- `rounds` — rounds to fetch (1–20, default 5)

**Output:**

```json
{
  "assetKey": "BTC/USD",
  "rounds": 3,
  "history": [
    {
      "roundId": "24062638",
      "price": "63473.092066009445",
      "updatedAt": 1781212955,
      "updatedAtIso": "2026-06-11T21:22:35.000Z"
    }
  ],
  "source": "chainlink-pharos-atlantic"
}
```

---

### `get_depeg_alert`

Monitor a stablecoin against its expected peg. Returns `healthy`, `warning`, or
`critical` based on configurable basis-point thresholds.

**When to use:** before committing liquidity to any pool that holds USDC or USDT.
A depegged stablecoin can silently drain a pool.

**Input:**

- `assetKey` — e.g. `"USDC/USD"` or `"USDT/USD"`
- `pegTarget` — expected peg (default `1.0`)
- `warningBps` — basis points for warning (default `50` = 0.5%)
- `criticalBps` — basis points for critical (default `100` = 1%)

**Output:**

```json
{
  "assetKey": "USDC/USD",
  "status": "healthy",
  "price": "0.99975",
  "pegTarget": "1",
  "deviationBps": 2,
  "deviationPct": "0.0250%",
  "updatedAt": 1781213127,
  "updatedAtIso": "2026-06-11T21:25:27.000Z"
}
```

---

### `compare_prices`

Compute the price ratio between two assets using BigInt arithmetic — no
floating-point drift. Answers cross-asset questions like "how much ETH does 1 BTC cost?"

**When to use:** cross-asset payment sizing, relative value checks, expressing one
asset's value in terms of another before executing a swap or transfer.

**Input:**

- `baseKey` — numerator asset, e.g. `"BTC/USD"`
- `quoteKey` — denominator asset, e.g. `"ETH/USD"`

**Output:**

```json
{
  "baseKey": "BTC/USD",
  "quoteKey": "ETH/USD",
  "ratio": "37.812123",
  "meaning": "1 BTC = 37.8121 ETH",
  "basePrice": "63473.092066009445",
  "quotePrice": "1678.643925",
  "updatedAt": 1781212955,
  "updatedAtIso": "2026-06-11T21:22:35.000Z"
}
```

### `get_feed_id`

Get the canonical Chainlink Feed ID (bytes32) for any supported asset. Feed IDs are
the stable cross-chain identifier used by Chainlink CCIP and Data Streams to reference
a price feed regardless of which chain it lives on.

**When to use:** when building cross-chain workflows via CCIP that need to reference
a Pharos price feed on another chain, or when integrating with Chainlink Data Streams.

**Input:** `assetKey` — e.g. `"BTC/USD"`

**Output:**
```json
{
  "assetKey": "BTC/USD",
  "feedId": "0x00037da06d56d083fe599397a4769a042d63aa73dc4ef57709d31e9971a5b439",
  "address": "0x82d0e03ea6d94120B92EA4Ea236DcFA273D42994"
}
```

---

### `batch_staleness_check`

Check staleness for multiple feeds in one call. Returns `allLive: true` only when
every requested feed is fresh — use as a single boolean gate before any multi-asset
transaction instead of calling `get_staleness_report` N times.

**When to use:** pre-flight check before portfolio rebalances, multi-collateral
liquidations, or any operation where a stale feed on any asset would invalidate
the whole transaction.

**Input:** `assetKeys` — array, e.g. `["BTC/USD", "ETH/USD", "PROS/USD"]`

**Output:**
```json
{
  "allLive": true,
  "results": [
    { "assetKey": "BTC/USD", "status": "live", "ageSeconds": 87,  "maxAgeSeconds": 5400 },
    { "assetKey": "ETH/USD", "status": "live", "ageSeconds": 111, "maxAgeSeconds": 5400 },
    { "assetKey": "PROS/USD","status": "live", "ageSeconds": 203, "maxAgeSeconds": 5400 }
  ]
}
```

---

### `get_ccip_config`

Return the full Chainlink CCIP v1.6.0 configuration for Pharos Atlantic Testnet —
Router, OnRamp, chain selector, LINK token address, and all 10 supported outbound
lanes (Arbitrum, Base, Ethereum Sepolia, Avalanche, BNB, Monad, OP, Plume, HyperEVM,
Jovay).

**When to use:** when an agent needs to initiate or verify a cross-chain transfer from
Pharos, look up the correct Router or chain selector, or discover which chains Pharos
can bridge to via CCIP.

**Input:** none

**Output:**
```json
{
  "network": "Pharos Atlantic Testnet",
  "chainId": 688689,
  "chainSelector": "16098325658947243212",
  "router": "0x1E202D00714bFBcD7a5b4CF782791C38DA8BdC99",
  "onRamp": "0x22af2fDb6Ec9E5AF82585Ee0efb65b5E46086841",
  "linkToken": "0x2f79e049f552E600D5d8118923278Aa0fCD67179",
  "tokenAdminRegistry": "0xAd1652471967E7FBf524245782A7f4430F6a4243",
  "supportedLanes": [
    { "name": "Ethereum Sepolia",  "chainSelector": "16015286601757825753" },
    { "name": "Base Sepolia",      "chainSelector": "10344971235874465080" },
    { "name": "Arbitrum Sepolia",  "chainSelector": "3478487238524512106"  }
  ]
}
```

---

## Example agent workflows

**Liquidation trigger**

1. `get_staleness_report("ETH/USD")` — confirm oracle is live
2. `get_price("ETH/USD")` — get current price
3. Compare against collateral threshold — execute liquidation if below

**Portfolio rebalance**

1. `get_multi_price(["BTC/USD", "ETH/USD", "PROS/USD"])` — get all prices at once
2. Compute current portfolio value
3. If above target × 1.05 — trigger rebalance transaction on Pharos

**Stablecoin-gated liquidity deposit**

1. `get_depeg_alert("USDC/USD")` — check stablecoin health
2. If `status !== "healthy"` — abort, surface reason to user
3. If healthy — proceed with deposit

**Cross-asset payment sizing**

1. `compare_prices("BTC/USD", "PROS/USD")` — how many PROS per BTC
2. Multiply by transfer amount to get exact PROS quantity
3. Execute Pharos payment with correct amount

---

## Error codes

| Code           | Meaning                                      |
| -------------- | -------------------------------------------- |
| FEED_NOT_FOUND | Asset key not in registry                    |
| FEED_STALE     | Feed exceeded heartbeat × 1.5 without update |
| INVALID_ANSWER | Oracle returned zero or negative price       |
| RPC_ERROR      | Network or contract call failure             |

---

## Network

| Property  | Value                                |
| --------- | ------------------------------------ |
| Network   | Pharos Atlantic Testnet              |
| Chain ID  | 688689                               |
| RPC       | https://atlantic.dplabs-internal.com |
| Explorer  | https://atlantic.pharosscan.xyz      |
| Oracle    | Chainlink Push Engine                |
| Decimals  | 18 (all feeds)                       |
| Heartbeat | 3600s (all feeds)                    |
