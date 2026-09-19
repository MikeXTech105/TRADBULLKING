import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Drawer } from "@mui/material";
import { ChevronDown, X } from "lucide-react";
import { useQuote } from "../hooks/useQuotes";
import { orderService, orderPayload } from "../services/orderService";
import { getProfile } from "../services/authService";
import { errorMessage } from "../services/api";
import { store, invalidate } from "../store/store";
import { hasNumber } from "../utils/format";
import {
  toastError,
  toastSuccess,
  toastWarning,
} from "../services/toastService";
import { baseName, expiryLabel, lotSizeOf, num } from "./util";

function Body({ stock, onClose }) {
  const user = useSelector((s) => s.auth.user);
  const quote = useQuote(stock.id, stock);
  const lock = useRef(false);
  const lotSize = lotSizeOf(stock);
  const [lot, setLot] = useState("1");
  const [type, setType] = useState("MARKET");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const ltp = quote?.ltp ?? stock.ltp;
  const change = quote?.changePercent ?? stock.changePercent;
  const quantity = hasNumber(lot) ? Math.round(Number(lot) * lotSize) : 0;
  const shown = type === "LIMIT" && hasNumber(price) ? price : ltp;

  async function submit(side) {
    if (lock.current) return;
    const values = {
      stockId: stock.id,
      side,
      quantity,
      priceType: type,
      limitPrice: price,
    };
    try {
      orderPayload(values);
    } catch (err) {
      toastWarning(err.message, { id: "order-validation" });
      return;
    }
    if (user?.canTrade === false) {
      toastWarning("Trading access is unavailable. Continue Membership.", {
        id: "order-validation",
      });
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const result = await orderService.place(values);
      store.dispatch(invalidate());
      const status = result?.order?.status ?? result?.status;
      toastSuccess(
        status === "PENDING"
          ? `Limit ${side} order placed successfully.`
          : `${side} order executed successfully.`,
        { id: "order-submit" },
      );
      getProfile().catch(() =>
        toastWarning("Order submitted. Refresh your account to update balances.", {
          id: "order-balance-refresh",
        }),
      );
      onClose();
    } catch (err) {
      toastError(errorMessage(err, "Order could not be submitted."), {
        id: "order-submit",
      });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <div className="m-sheet-head">
        <span>
          {baseName(stock)} {expiryLabel(stock)}
        </span>
        <button aria-label="Close order sheet" onClick={onClose}>
          <X size={26} />
        </button>
      </div>
      <div className="m-sheet-body">
        <div className="m-sheet-price">
          <strong>{num(ltp)}</strong>
          <small>{hasNumber(change) ? Number(change).toFixed(1) : "0.0"} %</small>
          <ChevronDown size={16} />
        </div>
        <div className="m-sheet-lhl">
          <span>
            Low : <b>{num(quote?.low ?? stock.low)}</b>
          </span>
          <span>
            LTP : <b>{num(ltp)}</b>
          </span>
          <span>
            High : <b>{num(quote?.high ?? stock.high)}</b>
          </span>
        </div>
        <div className="m-sheet-qty">
          <label>
            <span>Lot</span>
            <input
              inputMode="decimal"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              aria-label="Lot"
            />
          </label>
          <label>
            <span>Qty</span>
            <input value={quantity} readOnly aria-label="Qty" />
          </label>
        </div>
        <div className="m-sheet-type">
          <span>Select Order Type</span>
          <button
            className={type === "MARKET" ? "active" : ""}
            onClick={() => setType("MARKET")}
          >
            Market
          </button>
          <button
            className={type === "LIMIT" ? "active" : ""}
            onClick={() => setType("LIMIT")}
          >
            Limit / Stop Loss
          </button>
        </div>
        <label className="m-sheet-price-input">
          <span>Price</span>
          <input
            inputMode="decimal"
            placeholder="Enter Price"
            value={price}
            disabled={type !== "LIMIT"}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Price"
          />
        </label>
        <div className="m-sheet-actions">
          <button
            className="sell"
            disabled={busy}
            onClick={() => submit("SELL")}
          >
            Sell Now @<br />
            {num(shown, 1)}
          </button>
          <button className="buy" disabled={busy} onClick={() => submit("BUY")}>
            Buy Now @<br />
            {num(shown, 1)}
          </button>
        </div>
      </div>
    </>
  );
}

export default function OrderSheet({ stock, onClose }) {
  return (
    <Drawer
      anchor="bottom"
      open={Boolean(stock)}
      onClose={onClose}
      className="m-sheet"
      slotProps={{ paper: { className: "m-sheet-paper" } }}
    >
      {stock && <Body key={stock.id} stock={stock} onClose={onClose} />}
    </Drawer>
  );
}
