# Oraxle

Verified Chainlink price feeds for Pharos agents. Seven MCP tools covering the full oracle lifecycle — discover, health check, price, batch, history, depeg monitor, ratio.

Built for the [Pharos Hackathon](https://dorahacks.io) on Atlantic Testnet (chain ID 688689).

---

## What it does

Agents operating on Pharos — sizing payments, triggering liquidations, rebalancing portfolios — need current asset prices. Oraxle exposes Chainlink's Push Engine as a set of typed MCP tools any agent can call directly, with staleness validation built in.

| Tool | What it answers |
|---|---|
| `get_price` | Current USD price for one asset |
| `get_multi_price` | Prices for up to 10 assets in one parallel call |
| `get_staleness_report` | Is this oracle safe to act on right now? |
| `batch_staleness_check` | Are ALL of these feeds live? (`allLive` boolean) |
| `list_feeds` | What assets are available? (includes Feed IDs) |
| `get_price_history` | Has the price been trending up or down? |
| `get_depeg_alert` | Is this stablecoin still pegged? |
| `compare_prices` | How many ETH is 1 BTC worth? |
| `get_feed_id` | What is the Chainlink bytes32 Feed ID for this asset? |
| `get_ccip_config` | What are the Chainlink CCIP contracts and lanes on Pharos? |

Supported assets: BTC, ETH, PROS, LINK, USDT, USDC, SOL, XRP, BNB, WBTC.

---

## Install

**Step 1 — Install the skill**

```bash
npx skills add https://github.com/7maylord/oraxle -g
```

**Step 2 — Install dependencies**

```bash
cd ~/.claude/skills/oraxle
pnpm install
```

**Step 3 — Register the MCP server**

Add to `~/.claude/settings.json`:

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

Verify in Claude Code: run `/mcp` — you should see `oraxle` with 10 tools.

---

## Usage examples

```
Get me the current BTC price
```
```
Is the ETH/USD oracle fresh enough to use before I liquidate?
```
```
Check if USDC is depegged before I add liquidity
```
```
I need prices for BTC, ETH, and PROS to rebalance my portfolio
```
```
Show me the last 5 ETH price rounds — is it trending down?
```
```
How much ETH is 1 BTC worth right now?
```

---

## Network

| | |
|---|---|
| Network | Pharos Atlantic Testnet |
| Chain ID | 688689 |
| RPC | https://atlantic.dplabs-internal.com |
| Explorer | https://atlantic.pharosscan.xyz |
| Oracle | Chainlink Push Engine |
| Decimals | 18 (all feeds) |
| Heartbeat | 3600s (all feeds) |

No API key or wallet required. All calls are read-only.

---

## Development

```bash
pnpm install
pnpm test        # 21 unit tests, mocked
pnpm start       # start the MCP server
```

### Tech stack

- TypeScript + tsx (no build step)
- MCP SDK (`@modelcontextprotocol/sdk`)
- Ethers v6
- Zod for input validation
- Vitest for tests

---

## Feed addresses

Full list with on-chain addresses: [references/feeds.md](references/feeds.md)
