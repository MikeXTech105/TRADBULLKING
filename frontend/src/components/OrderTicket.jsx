import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { orderService, orderPayload } from "../services/orderService";
import { getProfile } from "../services/authService";
import { errorMessage } from "../services/api";
import { formatINR, hasNumber } from "../utils/format";
import { store, invalidate } from "../store/store";
import { SlowNotice } from "./Feedback";
import { toastError, toastSuccess, toastWarning } from "../services/toastService";
export default function OrderTicket({
  stock,
  quote,
  initialSide = "BUY",
  onSuccess,
}) {
  const user = useSelector((s) => s.auth.user);
  const lock = useRef(false);
  const [side, setSide] = useState(initialSide);
  const [quantity, setQuantity] = useState("1");
  const [priceType, setPriceType] = useState("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const price = priceType === "LIMIT" ? limitPrice : (quote?.ltp ?? stock?.ltp);
  const value =
    hasNumber(price) && hasNumber(quantity)
      ? Number(price) * Number(quantity)
      : undefined;
  async function submit(e) {
    e.preventDefault();
    if (lock.current) return;
    const next = {};
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1)
      next.quantity = "Enter a positive whole quantity.";
    if (
      priceType === "LIMIT" &&
      (!hasNumber(limitPrice) || Number(limitPrice) <= 0)
    )
      next.limitPrice = "Enter a valid limit price.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const values = { stockId: stock.id, side, quantity, priceType, limitPrice };
    try {
      orderPayload(values);
    } catch (err) {
      setError(err.message);
      toastWarning(err.message, { id: "order-validation" });
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await orderService.place(values);
      store.dispatch(invalidate());
      const status = result?.order?.status ?? result?.status;
      const message =
        status === "PENDING"
          ? `Limit ${side} order placed successfully.`
          : ["EXECUTED", "COMPLETED", "FILLED"].includes(status)
            ? `${side} order executed successfully.`
            : `${side} order submitted successfully.`;
      toastSuccess(message, { id: "order-submit" });
      try {
        await getProfile();
      } catch {
        toastWarning("Order submitted. Refresh your account to update balances.", {
          id: "order-balance-refresh",
        });
      }
      onSuccess?.(result);
    } catch (err) {
      const message = errorMessage(err, "Market order could not be submitted.");
      setError(message);
      toastError(message, { id: "order-submit" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="order-ticket">
      <div className="section-heading">
        <h2>Order ticket</h2>
        <span>PAPER</span>
      </div>
      <div className="side-toggle">
        <button
          className={side === "BUY" ? "active buy" : ""}
          type="button"
          onClick={() => {
            setSide("BUY");
          }}
        >
          BUY
        </button>
        <button
          className={side === "SELL" ? "active sell" : ""}
          type="button"
          onClick={() => {
            setSide("SELL");
          }}
        >
          SELL
        </button>
      </div>
      <div className="ticket-instrument">
        <strong>{stock.symbol}</strong>
        <span>{formatINR(quote?.ltp ?? stock.ltp)}</span>
      </div>
      <form onSubmit={submit} noValidate>
        <div className="fields">
          <TextField
            label="Quantity"
            type="number"
            inputProps={{ min: 1, step: 1, inputMode: "numeric" }}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setErrors({ ...errors, quantity: "" });
            }}
            error={Boolean(errors.quantity)}
            helperText={errors.quantity}
          />
          <TextField
            select
            label="Price type"
            value={priceType}
            onChange={(e) => setPriceType(e.target.value)}
          >
            <MenuItem value="MARKET">Market</MenuItem>
            <MenuItem value="LIMIT">Limit</MenuItem>
          </TextField>
          {priceType === "LIMIT" && (
            <TextField
              label="Limit price"
              type="number"
              inputProps={{ min: 0.01, step: 0.01, inputMode: "decimal" }}
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              error={Boolean(errors.limitPrice)}
              helperText={errors.limitPrice}
            />
          )}
        </div>
        <dl className="ticket-summary">
          <div>
            <dt>Approx. order value</dt>
            <dd>{formatINR(value)}</dd>
          </div>
          <div>
            <dt>Dummy balance</dt>
            <dd>{formatINR(user?.dummyBalance)}</dd>
          </div>
          <div>
            <dt>Fee balance</dt>
            <dd>{formatINR(user?.feeBalance)}</dd>
          </div>
        </dl>
        <p className="ticket-disclaimer">
          ₹2 trade fee applies according to backend eligibility. Final execution
          price and balances are confirmed by the server.
        </p>
        {user?.canTrade === false && (
          <Alert severity="warning">
            Trading access is unavailable.{" "}
            <Link to="/membership">Continue Membership</Link>
          </Alert>
        )}
        {error && (
          <Alert severity="error" className="form-alert">
            {error} <Link to="/membership">View membership</Link>
          </Alert>
        )}
        <SlowNotice busy={busy} />
        <Button
          className={`order-submit ${side.toLowerCase()}`}
          type="submit"
          fullWidth
          variant="contained"
          disabled={busy || user?.canTrade === false}
        >
          {busy
            ? "Submitting…"
            : `${side === "BUY" ? "Buy" : "Sell"} ${stock.symbol}`}
        </Button>
      </form>
    </div>
  );
}
