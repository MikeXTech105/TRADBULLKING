import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import { Crown, Check, ArrowUpRight } from "lucide-react";
import { paymentService } from "../../services/paymentService";
import { getProfile } from "../../services/authService";
import { errorMessage } from "../../services/api";
import { store, invalidate } from "../../store/store";
import { formatINR } from "../../utils/format";
import { PageHeader } from "../../components/DataView";
import { SlowNotice } from "../../components/Feedback";
import { BrandLogo } from "../../components/Brand";
export default function Membership() {
  const user = useSelector((s) => s.auth.user);
  const pendingKey = `tbk_pending_payment_${user?.id}`;
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null);
  const [orderId, setOrderId] = useState(
    () => sessionStorage.getItem(pendingKey) || "",
  );
  const [status, setStatus] = useState(() => (orderId ? "PENDING" : ""));
  const [message, setMessage] = useState("");
  const mode = import.meta.env.VITE_CASHFREE_MODE;
  async function verify(id) {
    await paymentService.verify(id);
    const result = await paymentService.get(id);
    const record = result.payment ?? result;
    setStatus(record.status ?? "PENDING");
    if (record.status === "FAILED") sessionStorage.removeItem(pendingKey);
    if (record.status === "SUCCESS") {
      const profile = await getProfile();
      store.dispatch(invalidate());
      setMessage(
        profile.isPremium
          ? "Membership activated. Your balances are up to date."
          : "Payment succeeded. Membership activation is being processed. Refresh your account shortly.",
      );
      sessionStorage.removeItem(pendingKey);
    } else
      setMessage(
        record.status === "FAILED"
          ? "Payment was not completed. You can try again."
          : "Payment is pending. Verify again shortly to check its status.",
      );
  }
  async function begin() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await paymentService.create();
      if (!next.orderId || !next.paymentSessionId)
        throw new Error(
          "The server did not return a valid payment checkout session.",
        );
      setPayment(next);
      setOrderId(next.orderId);
      sessionStorage.setItem(pendingKey, next.orderId);
      setStatus("PENDING");
      const result = await paymentService.checkout(next.paymentSessionId);
      if (result?.error)
        setError(
          result.error.message || "Payment checkout could not be completed.",
        );
      await verify(next.orderId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function verifyExisting() {
    if (lock.current || !orderId) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await verify(orderId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function resumeCheckout() {
    if (lock.current || !payment?.paymentSessionId) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await paymentService.checkout(payment.paymentSessionId);
      if (result?.error)
        throw new Error(
          result.error.message || "Checkout could not be completed.",
        );
      await verify(orderId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const breakdown = payment?.breakdown;
  return (
    <>
      <PageHeader
        title="Membership"
        description="Keep your focus on the market. Keep your journey moving."
      />
      <div className="membership-grid">
        <section className="surface membership-card">
          <BrandLogo className="membership-brand" />
          <span className="membership-badge">
            <Crown size={15} />
            TRADBULLKING PREMIUM
          </span>
          <h2>Membership plan</h2>
          <div className="membership-price">
            <strong>{formatINR(payment?.amount ?? 500, 0)}</strong>
            <span> / activation or recharge</span>
          </div>
          <p className="membership-breakdown">
            ₹99 platform fee + ₹401 fee balance = ₹500 total
          </p>
          <ul>
            {[
              "Continue trading beyond your free trial",
              "₹5 crore dummy trading balance on activation",
              "₹401 credited to your trading fee balance",
              "₹2 fee per trade, confirmed by the server",
            ].map((x) => (
              <li key={x}>
                <Check size={16} />
                {x}
              </li>
            ))}
          </ul>
          <Button
            variant="contained"
            fullWidth
            disabled={
              busy ||
              !["sandbox", "production"].includes(mode) ||
              status === "PENDING"
            }
            onClick={begin}
            endIcon={<ArrowUpRight size={18} />}
          >
            {busy
              ? "Processing…"
              : user?.isPremium
                ? "Recharge fee balance"
                : "Continue Membership"}
          </Button>
          {!["sandbox", "production"].includes(mode) && (
            <p className="subtle-label">
              Checkout is currently unavailable. Contact support.
            </p>
          )}
          <SlowNotice busy={busy} />
        </section>
        <section className="surface">
          <div className="section-heading">
            <h2>A clear breakdown</h2>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Platform fee</dt>
              <dd>{formatINR(breakdown?.platformFee ?? 99, 0)}</dd>
            </div>
            <div>
              <dt>Credit to fee balance</dt>
              <dd>{formatINR(breakdown?.creditToFeeBalance ?? 401, 0)}</dd>
            </div>
            <div className="total-row">
              <dt>Total payment</dt>
              <dd>{formatINR(breakdown?.totalAmount ?? 500, 0)}</dd>
            </div>
          </dl>
          <p className="membership-note">
            Payments are real. Trading funds are virtual and have no withdrawal
            value. Membership activates only after backend payment verification.
          </p>
          <Button component={Link} to="/payments">
            Payment history
          </Button>
          {orderId && (
            <div className="payment-status">
              <span className="status-chip">{status || "CHECK STATUS"}</span>
              <p>Order: {orderId}</p>
              {status === "PENDING" && payment?.paymentSessionId && (
                <Button disabled={busy} onClick={resumeCheckout}>
                  Resume checkout
                </Button>
              )}
              <Button
                variant="outlined"
                disabled={busy}
                onClick={verifyExisting}
              >
                Verify payment status
              </Button>
            </div>
          )}
          {message && (
            <Alert
              severity={
                status === "SUCCESS"
                  ? "success"
                  : status === "FAILED"
                    ? "error"
                    : "info"
              }
              className="form-alert"
            >
              {message}
            </Alert>
          )}
          {error && (
            <Alert severity="error" className="form-alert">
              {error}
            </Alert>
          )}
        </section>
      </div>
    </>
  );
}
