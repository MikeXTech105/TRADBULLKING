import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Link } from "react-router-dom";
import { paymentService } from "../../services/paymentService";
import { getProfile } from "../../services/authService";
import { useQuery } from "../../hooks/useQuery";
import { store, invalidate } from "../../store/store";
import { errorMessage } from "../../services/api";
import { formatDate, formatINR } from "../../utils/format";
import {
  PageHeader,
  DataTable,
  Pagination,
  StatusBadge,
} from "../../components/DataView";
import { QueryState } from "../../components/Feedback";
import { toastError, toastInfo, toastSuccess } from "../../services/toastService";
function PaymentDetail({ id, onClose }) {
  const query = useQuery(() => paymentService.get(id), [id]);
  const [busy, setBusy] = useState(false);
  const record = query.data?.payment ?? query.data;
  async function verify() {
    if (busy) return;
    setBusy(true);
    try {
      await paymentService.verify(id);
      const refreshed = await paymentService.get(id);
      const refreshedRecord = refreshed.payment ?? refreshed;
      await getProfile();
      store.dispatch(invalidate());
      query.retry();
      if (refreshedRecord?.status === "SUCCESS")
        toastSuccess("Payment successful. Membership activated.", {
          id: `payment-${id}`,
        });
      else if (refreshedRecord?.status === "FAILED")
        toastError("Payment failed. Please try again.", { id: `payment-${id}` });
      else
        toastInfo("Payment verification pending.", { id: `payment-${id}` });
    } catch (err) {
      toastError(errorMessage(err, "Payment verification failed."), {
        id: `payment-${id}`,
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Payment details</DialogTitle>
      <DialogContent>
        <QueryState query={query}>
          <dl className="detail-list">
            {[
              ["cashfreeOrderId", "Order ID"],
              ["status", "Status"],
            ].map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{record?.[key] ?? id}</dd>
              </div>
            ))}
            <div>
              <dt>Amount</dt>
              <dd>{formatINR(record?.amount)}</dd>
            </div>
            <div>
              <dt>Platform fee</dt>
              <dd>{formatINR(record?.platformFee)}</dd>
            </div>
            <div>
              <dt>Fee balance credit</dt>
              <dd>{formatINR(record?.creditAmount)}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(record?.createdAt)}</dd>
            </div>
          </dl>
        </QueryState>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {record?.status === "PENDING" && (
          <Button disabled={busy} onClick={verify}>
            {busy ? "Verifying…" : "Verify status"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
export default function Payments() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const query = useQuery(
    (signal) => paymentService.history({ page, limit: 20 }, signal),
    [page],
  );
  const columns = [
    { key: "cashfreeOrderId", label: "Payment order" },
    { key: "amount", label: "Amount", render: (r) => formatINR(r.amount) },
    {
      key: "platformFee",
      label: "Platform fee",
      render: (r) => formatINR(r.platformFee),
    },
    {
      key: "creditAmount",
      label: "Fee credit",
      render: (r) => formatINR(r.creditAmount),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
    { key: "createdAt", label: "Date", render: (r) => formatDate(r.createdAt) },
    {
      key: "action",
      label: "Details",
      render: (r) => (
        <Button size="small" onClick={() => setSelected(r.cashfreeOrderId)}>
          View
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Payments"
        description="A transparent record of your membership payments."
        action={
          <Button component={Link} to="/membership" variant="outlined">
            Membership
          </Button>
        }
      />
      <section className="surface">
        <QueryState
          query={query}
          empty={!query.data?.rows?.length}
          emptyTitle="No payments yet"
          emptyText="Your membership payments will appear here."
        >
          <DataTable rows={query.data?.rows} columns={columns} />
        </QueryState>
        <Pagination page={page} onChange={setPage} data={query.data} />
      </section>
      {selected && (
        <PaymentDetail id={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
