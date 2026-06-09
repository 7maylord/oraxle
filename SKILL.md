---
name: oraxle-skill
description: >
  Fetches verified Chainlink price feeds for tokenized real-world assets
  (gold, BTC, ETH, LINK, DAI) with staleness validation. Use when an agent
  needs current asset prices before executing a payment, triggering a
  liquidation, rebalancing a portfolio, or checking collateral value on
  Pharos. Supports single lookups, batch queries, and oracle health checks.
license: MIT
compatibility: Requires Node.js 18+. Network access to Sepolia RPC required.
metadata:
  author: maylord
  version: "1.0.0"
  chain: pharos
  data-source: chainlink-aggregatorv3
---

# Oraxle Skill

Provides Chainlink price feeds for tokenized real-world assets on Pharos.

## Setup (one-time)

```bash
cd ~/.claude/skills/oraxle-skill
pnpm install
echo "SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia" > .env
```

## Tools

### get_price

Fetch the current USD price of a single RWA asset.
Use when: agent needs to value one asset before a transaction.
Input: `assetKey` — one of: `BTC/USD`, `ETH/USD`, `XAU/USD`, `LINK/USD`, `DAI/USD`

### get_multi_price

Fetch USD prices for 1–10 assets in one call.
Use when: agent needs to compare or aggregate multiple asset prices.
Input: `assetKeys` — array of asset keys

### get_staleness_report

Check if a feed is live or stale without fetching the price.
Use when: before any high-value transaction to verify oracle health.
Input: `assetKey`

### list_feeds

List all supported feeds with descriptions and addresses.
Use when: agent needs to discover available assets.
Input: none

## Example workflows

**Before a payment:** call `get_staleness_report` → confirm live → call `get_price` → size the payment.

**Portfolio rebalance:** call `get_multi_price(["BTC/USD","ETH/USD","XAU/USD"])` → compute value → decide action.

## Error codes

| Code             | Meaning                                |
| ---------------- | -------------------------------------- |
| FEED_NOT_FOUND   | Asset key not registered               |
| FEED_STALE       | Feed exceeded heartbeat × 1.5          |
| INVALID_ANSWER   | Oracle returned zero or negative price |
| INCOMPLETE_ROUND | answeredInRound < roundId              |
| RPC_ERROR        | Network failure                        |
