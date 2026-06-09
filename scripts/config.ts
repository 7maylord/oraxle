import "dotenv/config";
import type { FeedConfig } from "./types.js";

export const SEPOLIA_RPC =
  process.env.SEPOLIA_RPC_URL ?? "https://rpc.ankr.com/eth_sepolia";

export const STALENESS_TOLERANCE = 1.5;

export const FEEDS: Record<string, FeedConfig> = {
  "BTC/USD": {
    address: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
    heartbeat: 3600,
    decimals: 8,
    description: "Bitcoin / US Dollar",
    active: true,
  },
  "ETH/USD": {
    address: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    heartbeat: 3600,
    decimals: 8,
    description: "Ether / US Dollar",
    active: true,
  },
  "LINK/USD": {
    address: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
    heartbeat: 3600,
    decimals: 8,
    description: "Chainlink / US Dollar",
    active: true,
  },
  "XAU/USD": {
    address: "0xC5981F461d74c46eB4b0CF3f4Ec79f025573B0Ea",
    heartbeat: 86400,
    decimals: 8,
    description: "Gold / US Dollar",
    active: true,
  },
  "DAI/USD": {
    address: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19",
    heartbeat: 3600,
    decimals: 8,
    description: "DAI / US Dollar",
    active: true,
  },
};

export const AGG_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80 _roundId) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
];
