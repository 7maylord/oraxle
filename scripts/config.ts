import type { FeedConfig } from "./types.js";

export const PHAROS_RPC = "https://atlantic.dplabs-internal.com";

export const STALENESS_TOLERANCE = 1.5;

// SelfManagedFeedsCache — central batch cache contract the Push Engine writes to
export const CACHE_ADDRESS = "0x5456fD07A1622d33969f833d52aA5AD2c68C3Fa2";

// Pharos Atlantic Testnet — Chainlink Push Engine feeds (10 feeds)
// Source: https://docs.pharos.xyz/tooling-and-infrastructure/oracles/chainlink-pe.md
// Decimals: 18, Deviation: 0.5%, Heartbeat: 3600s
export const FEEDS: Record<string, FeedConfig> = {
  "BTC/USD": {
    address:     "0x82d0e03ea6d94120B92EA4Ea236DcFA273D42994",
    feedId:      "0x00037da06d56d083fe599397a4769a042d63aa73dc4ef57709d31e9971a5b439",
    heartbeat:   3600,
    decimals:    18,
    description: "Bitcoin / US Dollar",
    active:      true,
  },
  "ETH/USD": {
    address:     "0xCd47D1843f3D6313836303fE1434BA26D257d500",
    feedId:      "0x000359843a543ee2fe414dc14c7e7920ef10f4372990b79d6361cdc0dd1ba782",
    heartbeat:   3600,
    decimals:    18,
    description: "Ether / US Dollar",
    active:      true,
  },
  "PROS/USD": {
    address:     "0x67488Fac9Bc4174a53a485b11F2066498Cd34b3A",
    feedId:      "0x00037de4af3cb4fd0d82eed58a43ec144809f7fa7b4c6508eb628ad6d4d8b363",
    heartbeat:   3600,
    decimals:    18,
    description: "Pharos Token / US Dollar",
    active:      true,
  },
  "LINK/USD": {
    address:     "0xc88944EEF085BCb1214a05C1f591CC05E94B904D",
    feedId:      "0x00036fe43f87884450b4c7e093cd5ed99cac6640d8c2000e6afc02c8838d0265",
    heartbeat:   3600,
    decimals:    18,
    description: "Chainlink / US Dollar",
    active:      true,
  },
  "USDT/USD": {
    address:     "0x2f7796B346d01a3f2264Ff0D93dDdFF8680b8B66",
    feedId:      "0x00032874077216155926e26c159c1c20a572921371d9de605fe9633e48d136f9",
    heartbeat:   3600,
    decimals:    18,
    description: "Tether / US Dollar",
    active:      true,
  },
  "USDC/USD": {
    address:     "0xDF6afcf662345Ea29ceACa6DA06141d828c516EA",
    feedId:      "0x0003dc85e8b01946bf9dfd8b0db860129181eb6105a8c8981d9f28e00b6f60d9",
    heartbeat:   3600,
    decimals:    18,
    description: "USD Coin / US Dollar",
    active:      true,
  },
  "SOL/USD": {
    address:     "0x87766CFbf906722307F9CF1B3d6E329C87D37189",
    feedId:      "0x0003d338ea2ac3be9e026033b1aa601673c37bab5e13851c59966f9f820754d6",
    heartbeat:   3600,
    decimals:    18,
    description: "Solana / US Dollar",
    active:      true,
  },
  "XRP/USD": {
    address:     "0xbA64753e82cFC24310BBAF16d33A56C9D8DD6ff1",
    feedId:      "0x00035e3ddda6345c3c8ce45639d4449451f1d5828d7a70845e446f04905937cd",
    heartbeat:   3600,
    decimals:    18,
    description: "XRP / US Dollar",
    active:      true,
  },
  "BNB/USD": {
    address:     "0xaf5C639f95C98414E168E5D2F486409Fc35c1743",
    feedId:      "0x000387d7c042a9d5c97c15354b531bd01bf6d3a351e190f2394403cf2f79bde9",
    heartbeat:   3600,
    decimals:    18,
    description: "BNB / US Dollar",
    active:      true,
  },
  "WBTC/USD": {
    address:     "0x6F24f8bDeF2870aCa886fb3Fbc04919B0B46F993",
    feedId:      "0x0003986bae710e410e6a6ec824db9ac91f97f6dd47fc5b28d028c14e825c5891",
    heartbeat:   3600,
    decimals:    18,
    description: "Wrapped Bitcoin / US Dollar",
    active:      true,
  },
};

// Chainlink Push Engine interface (not AggregatorV3Interface)
export const AGG_ABI = [
  "function latestAnswer() external view returns (int256)",
  "function latestTimestamp() external view returns (uint256)",
  "function getFeedId() external view returns (bytes32)",
];

// Chainlink CCIP v1.6.0 — Atlantic Testnet
// Source: https://docs.chain.link/ccip/directory/testnet/chain/pharos-atlantic-testnet
export const CCIP = {
  router:              "0x1E202D00714bFBcD7a5b4CF782791C38DA8BdC99",
  chainSelector:       "16098325658947243212",
  onRamp:              "0x22af2fDb6Ec9E5AF82585Ee0efb65b5E46086841",
  rmnProxy:            "0xB45B9eb94F25683B47e5AFb0f74A05a58be86311",
  tokenAdminRegistry:  "0xAd1652471967E7FBf524245782A7f4430F6a4243",
  linkToken:           "0x2f79e049f552E600D5d8118923278Aa0fCD67179",
  supportedLanes: [
    { name: "Arbitrum Sepolia",   chainSelector: "3478487238524512106"  },
    { name: "Avalanche Fuji",     chainSelector: "14767482510784806043" },
    { name: "Base Sepolia",       chainSelector: "10344971235874465080" },
    { name: "BNB Chain Testnet",  chainSelector: "13264668187771770619" },
    { name: "Ethereum Sepolia",   chainSelector: "16015286601757825753" },
    { name: "HyperEVM Testnet",   chainSelector: "5961408967931553495"  },
    { name: "Jovay Sepolia",      chainSelector: "4322589739249584938"  },
    { name: "Monad Testnet",      chainSelector: "1905955986089494514"  },
    { name: "OP Sepolia",         chainSelector: "5224473277236331295"  },
    { name: "Plume Testnet",      chainSelector: "9627307649453928791"  },
  ],
} as const;
