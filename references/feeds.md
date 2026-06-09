# Chainlink Feed Reference

All feeds are on Sepolia testnet (chain ID 11155111).

| Asset Key | Address | Heartbeat | Decimals |
|-----------|---------|-----------|----------|
| BTC/USD   | 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43 | 1 hour | 8 |
| ETH/USD   | 0x694AA1769357215DE4FAC081bf1f309aDC325306 | 1 hour | 8 |
| LINK/USD  | 0xc59E3633BAAC79493d908e63626716e204A45EdF | 1 hour | 8 |
| XAU/USD   | 0xC5981F461d74c46eB4b0CF3f4Ec79f025573B0Ea | 24 hrs | 8 |
| DAI/USD   | 0x14866185B1962B63C3Ea9E03Bc1da838bab34C19 | 1 hour | 8 |

## Staleness tolerance

maxAge = heartbeat × 1.5

| Feed    | heartbeat | maxAge  |
|---------|-----------|---------|
| BTC/USD | 3600s     | 5400s   |
| ETH/USD | 3600s     | 5400s   |
| XAU/USD | 86400s    | 129600s |
| DAI/USD | 3600s     | 5400s   |
