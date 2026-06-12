# Chainlink Feed Reference

All feeds are on Pharos Atlantic Testnet (chain ID 688689) via the Chainlink Push Engine.

**Important:** Push Engine uses 18 decimals (not the 8 used by Sepolia AggregatorV3Interface).
**Interface:** `latestAnswer() → int256`, `latestTimestamp() → uint256`, `getFeedId() → bytes32`

## Feed Addresses

| Asset Key  | Address                                      | Heartbeat | Decimals |
|------------|----------------------------------------------|-----------|----------|
| BTC/USD    | 0x82d0e03ea6d94120B92EA4Ea236DcFA273D42994   | 1 hour    | 18       |
| ETH/USD    | 0xCd47D1843f3D6313836303fE1434BA26D257d500   | 1 hour    | 18       |
| PROS/USD   | 0x67488Fac9Bc4174a53a485b11F2066498Cd34b3A   | 1 hour    | 18       |
| LINK/USD   | 0xc88944EEF085BCb1214a05C1f591CC05E94B904D   | 1 hour    | 18       |
| USDT/USD   | 0x2f7796B346d01a3f2264Ff0D93dDdFF8680b8B66   | 1 hour    | 18       |
| USDC/USD   | 0xDF6afcf662345Ea29ceACa6DA06141d828c516EA   | 1 hour    | 18       |
| SOL/USD    | 0x87766CFbf906722307F9CF1B3d6E329C87D37189   | 1 hour    | 18       |
| XRP/USD    | 0xbA64753e82cFC24310BBAF16d33A56C9D8DD6ff1   | 1 hour    | 18       |
| BNB/USD    | 0xaf5C639f95C98414E168E5D2F486409Fc35c1743   | 1 hour    | 18       |

Cache contract: `0x5456fD07A1622d33969f833d52aA5AD2c68C3Fa2`

## Staleness tolerance

maxAge = heartbeat × 1.5

All feeds: heartbeat 3600s → maxAge 5400s (90 min)

## Network

| Property    | Value                               |
|-------------|-------------------------------------|
| Network     | Pharos Atlantic Testnet             |
| Chain ID    | 688689                              |
| RPC URL     | https://atlantic.dplabs-internal.com |
| Explorer    | https://atlantic.pharosscan.xyz     |

## Price History

The Push Engine does not expose `getRoundData`. Historical prices are retrieved by
querying `AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt)`
events via `eth_getLogs`. The `get_price_history` tool handles this automatically.
