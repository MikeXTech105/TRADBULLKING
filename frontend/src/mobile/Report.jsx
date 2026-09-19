import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Printer } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { orderService } from "../services/orderService";
import { hasNumber } from "../utils/format";
import { formatUserName } from "../utils/identity";
import { MobileEmpty, MobileHeader } from "./Parts";
import { baseName, expiryLabel, grouped, lotSizeOf, stockOf } from "./util";

const pad = (n) => String(n).padStart(2, "0");
const day = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
const stampOf = (d) => `${day(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const money = (n) => (Number.isFinite(n) ? grouped(n, 2) : "0.00");

// Turns executed orders into script-wise bill lines. Gross = sell value - buy value,
// brokerage = fees the backend deducted, net = gross - brokerage.
function buildBill(orders) {
  const scripts = new Map();
  let buyTurnover = 0;
  let sellTurnover = 0;
  for (const o of orders) {
    const stock = stockOf(o);
    const qty = Number(o.quantity);
    const rate = Number(o.price ?? o.limitPrice);
    if (!Number.isFinite(qty) || !Number.isFinite(rate)) continue;
    const fee = hasNumber(o.feesDeducted) ? Number(o.feesDeducted) : 0;
    const buy = o.orderType === "BUY";
    const netRate = buy ? rate + fee / qty : rate - fee / qty;
    const value = qty * rate;
    const key = `${baseName({ ...stock, symbol: o.symbol ?? stock?.symbol })} ${expiryLabel(stock)}`.trim();
    const script =
      scripts.get(key) ??
      { key, lines: [], buyQty: 0, sellQty: 0, gross: 0, brokerage: 0 };
    script.lines.push({
      at: new Date(o.executedAt ?? o.createdAt),
      buy,
      lot: qty / lotSizeOf({ ...stock, lotSize: o.lotSize ?? stock?.lotSize }),
      qty,
      rate,
      netRate,
      amount: buy ? qty * netRate : -qty * netRate,
    });
    script.buyQty += buy ? qty : 0;
    script.sellQty += buy ? 0 : qty;
    script.gross += buy ? -value : value;
    script.brokerage += fee;
    if (buy) buyTurnover += value;
    else sellTurnover += value;
    scripts.set(key, script);
  }
  const list = [...scripts.values()].map((s) => ({
    ...s,
    lines: s.lines.sort((a, b) => a.at - b.at),
    net: s.gross - s.brokerage,
  }));
  return {
    list: list.sort((a, b) => a.key.localeCompare(b.key)),
    gross: list.reduce((sum, s) => sum + s.gross, 0),
    net: list.reduce((sum, s) => sum + s.net, 0),
    buyTurnover,
    sellTurnover,
  };
}

export default function MobileReport() {
  const user = useSelector((s) => s.auth.user);
  const query = useQuery((signal) =>
    orderService.list({ status: "EXECUTED", limit: 200 }, signal),
  );
  const orders = query.data?.rows ?? [];
  const bill = useMemo(() => buildBill(orders), [orders]);
  const dates = orders
    .map((o) => new Date(o.executedAt ?? o.createdAt))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);
  const first = dates[0];
  const last = dates[dates.length - 1];
  return (
    <div className="m-screen-body m-report-page">
      <MobileHeader title="Valan" back>
        <button
          className="m-icon-btn"
          aria-label="Print"
          onClick={() => window.print()}
        >
          <Printer size={26} />
        </button>
      </MobileHeader>
      <div className="m-report">
        <h2 className="m-report-title">TRADEBULLKING</h2>
        <div className="m-report-meta">
          <span>Script Wise Bill (with brokerage)</span>
          <span>{last ? `${MON[last.getMonth()]}${pad(last.getDate())}` : ""}</span>
          <span>
            {first ? `From ${day(first)} To ${day(last)}` : ""}
          </span>
        </div>
        <div className="m-report-user">
          ({user?.id ? String(user.id).slice(-6) : ""}) {user?.name ?? "User"}
          {formatUserName(user?.userName)
            ? ` · ${formatUserName(user.userName)}`
            : ""}
        </div>
        <MobileEmpty
          query={query}
          empty={!bill.list.length}
          text="No executed trades to bill yet."
        >
          {bill.list.map((s) => (
            <table key={s.key}>
              <colgroup>
                {[29, 6, 9, 8, 8, 13, 13, 14].map((w, i) => (
                  <col key={i} style={{ width: `${w}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr className="band">
                  <th colSpan={8}>{s.key}</th>
                </tr>
                <tr className="cols">
                  <th className="l">Date Time</th>
                  <th>Type</th>
                  <th>Lot</th>
                  <th>Buy Qty</th>
                  <th>Sell Qty</th>
                  <th className="r">Rate</th>
                  <th className="r">Net Rate</th>
                  <th className="r">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {s.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="l">{stampOf(l.at)}</td>
                    <td>NRM</td>
                    <td>{l.lot.toFixed(4)}</td>
                    <td className="blue">{l.buy ? l.qty : "-"}</td>
                    <td className="red">{l.buy ? "-" : l.qty}</td>
                    <td className="r">{grouped(l.rate, 4)}</td>
                    <td className="r">{grouped(l.netRate, 4)}</td>
                    <td className={`r ${l.buy ? "blue" : "red"}`}>
                      {money(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th className="l" colSpan={3}>
                    Script Wise total:
                  </th>
                  <th>{s.buyQty}</th>
                  <th>{s.sellQty}</th>
                  <th className="r">{money(s.gross)}</th>
                  <th className="r">{money(s.brokerage)}</th>
                  <th className="r">{money(s.net)}</th>
                </tr>
              </tfoot>
            </table>
          ))}
          <div className="m-report-total">
            <span>Total Gross: {money(bill.gross)}</span>
            <span>
              Final Bill Amt : <b>{money(bill.net)}</b>
            </span>
          </div>
          <div className="m-report-turnover">
            <span>Buy Turnover: {money(bill.buyTurnover)}</span>
            <span>Sell Turnover: {money(bill.sellTurnover)}</span>
          </div>
        </MobileEmpty>
      </div>
    </div>
  );
}
