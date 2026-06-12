import "dotenv/config";
import {
  getPrice, getMultiPrice, getStalenessReport, listFeeds,
  getPriceHistory, getDepegAlert, comparePrices,
} from "./oracle.js";

const sep = (label: string) => console.log(`\n${"─".repeat(50)}\n${label}`);

sep("list_feeds");
console.log(listFeeds().map(f => `${f.key} → ${f.address}`).join("\n"));

sep("get_price  BTC/USD");
console.log(JSON.stringify(await getPrice("BTC/USD"), null, 2));

sep("get_staleness_report  ETH/USD");
console.log(JSON.stringify(await getStalenessReport("ETH/USD"), null, 2));

sep("get_multi_price  [PROS/USD, ETH/USD, USDC/USD]");
console.log(JSON.stringify(await getMultiPrice(["PROS/USD", "ETH/USD", "USDC/USD"]), null, 2));

sep("get_depeg_alert  USDC/USD");
console.log(JSON.stringify(await getDepegAlert("USDC/USD"), null, 2));

sep("compare_prices  BTC/USD ÷ ETH/USD");
console.log(JSON.stringify(await comparePrices("BTC/USD", "ETH/USD"), null, 2));

sep("get_price_history  BTC/USD  (3 rounds)");
console.log(JSON.stringify(await getPriceHistory("BTC/USD", 3), null, 2));
