import { test } from "node:test";
import assert from "node:assert/strict";
import { collection, tradingStock } from "../src/services/adapters.js";
import { validStockId } from "../src/services/stockIdentity.js";
import { stockService } from "../src/services/stockService.js";
import { userApi } from "../src/services/api.js";

test("stock identity handles direct and populated watchlist stocks without using provider tokens", () => {
  for (const row of [
    { _id: "stock-1", symbol: "ABC" },
    { stockId: "stock-1", symbol: "ABC" },
    { id: "watchlist-1", stockId: { _id: "stock-1", symbol: "ABC" } },
    { _id: "watchlist-1", stock: { id: "stock-1", symbol: "ABC" } },
  ]) {
    const result = collection({ stocks: [row] }, "stocks").rows[0];
    assert.equal(result.id, "stock-1");
    assert.equal(result.symbol, "ABC");
  }
  assert.equal(
    tradingStock({ token: "provider-token", symbol: "ABC" }).id,
    undefined,
  );
  assert.equal(
    collection([{ id: "order-1", stockId: "stock-1" }], "orders").rows[0].id,
    "order-1",
  );
});

test("invalid stock IDs cannot create detail, quote or candle HTTP requests", async () => {
  const original = userApi.defaults.adapter;
  let requests = 0;
  userApi.defaults.adapter = async () => {
    requests++;
    throw new Error("Unexpected HTTP request");
  };
  try {
    for (const id of [
      undefined,
      null,
      "undefined",
      "null",
      "",
      "  ",
      {},
      "[object Object]",
    ]) {
      assert.equal(validStockId(id), false);
      await assert.rejects(stockService.get(id), /no trading stock ID/);
      await assert.rejects(stockService.ltp(id), /no trading stock ID/);
      await assert.rejects(
        stockService.historical(id, {}),
        /no trading stock ID/,
      );
    }
    assert.equal(requests, 0);
  } finally {
    userApi.defaults.adapter = original;
  }
});
