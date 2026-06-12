import type { FeedConfig } from "./types.js";

export const PHAROS_RPC = "https://atlantic.dplabs-internal.com";

export const STALENESS_TOLERANCE = 1.5;

// Pharos Atlantic Testnet — Chainlink Push Engine feeds
// Decimals: 18 (Push Engine standard, differs from Sepolia's 8)
export const FEEDS: Record<string, FeedConfig> = {
  "BTC/USD": {
    address:     "0x82d0e03ea6d94120B92EA4Ea236DcFA273D42994",
    heartbeat:   3600,
    decimals:    18,
    description: "Bitcoin / US Dollar",
    active:      true,
  },
  "ETH/USD": {
    address:     "0xCd47D1843f3D6313836303fE1434BA26D257d500",
    heartbeat:   3600,
    decimals:    18,
    description: "Ether / US Dollar",
    active:      true,
  },
  "PROS/USD": {
    address:     "0x67488Fac9Bc4174a53a485b11F2066498Cd34b3A",
    heartbeat:   3600,
    decimals:    18,
    description: "Pharos Token / US Dollar",
    active:      true,
  },
  "LINK/USD": {
    address:     "0xc88944EEF085BCb1214a05C1f591CC05E94B904D",
    heartbeat:   3600,
    decimals:    18,
    description: "Chainlink / US Dollar",
    active:      true,
  },
  "USDT/USD": {
    address:     "0x2f7796B346d01a3f2264Ff0D93dDdFF8680b8B66",
    heartbeat:   3600,
    decimals:    18,
    description: "Tether / US Dollar",
    active:      true,
  },
  "USDC/USD": {
    address:     "0xDF6afcf662345Ea29ceACa6DA06141d828c516EA",
    heartbeat:   3600,
    decimals:    18,
    description: "USD Coin / US Dollar",
    active:      true,
  },
  "SOL/USD": {
    address:     "0x87766CFbf906722307F9CF1B3d6E329C87D37189",
    heartbeat:   3600,
    decimals:    18,
    description: "Solana / US Dollar",
    active:      true,
  },
  "XRP/USD": {
    address:     "0xbA64753e82cFC24310BBAF16d33A56C9D8DD6ff1",
    heartbeat:   3600,
    decimals:    18,
    description: "XRP / US Dollar",
    active:      true,
  },
  "BNB/USD": {
    address:     "0xaf5C639f95C98414E168E5D2F486409Fc35c1743",
    heartbeat:   3600,
    decimals:    18,
    description: "BNB / US Dollar",
    active:      true,
  },
};

// Chainlink Push Engine interface (not AggregatorV3Interface)
export const AGG_ABI = [
  "function latestAnswer() external view returns (int256)",
  "function latestTimestamp() external view returns (uint256)",
  "function getFeedId() external view returns (bytes32)",
];
