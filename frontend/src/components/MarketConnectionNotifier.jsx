import { useEffect, useRef } from "react";
import { onStatusChange } from "../services/socketClient";
import { toastSuccess, toastWarning } from "../services/toastService";

export default function MarketConnectionNotifier() {
  const interrupted = useRef(false);

  useEffect(
    () =>
      onStatusChange((status) => {
        if (status === "connected") {
          if (!interrupted.current) return;
          interrupted.current = false;
          toastSuccess("Live market connection restored.", {
            id: "market-connection",
            duration: 2500,
          });
          return;
        }
        interrupted.current = true;
        // toastWarning("Live market connection interrupted. Reconnecting…", {
        //   id: "market-connection",
        //   persist: true,
        // });
      }),
    [],
  );

  return null;
}
