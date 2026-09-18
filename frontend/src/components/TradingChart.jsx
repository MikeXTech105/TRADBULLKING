import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, createChart, ColorType } from "lightweight-charts";
import { intervals } from "../services/stockService";
import { formatINR, hasNumber } from "../utils/format";
export default function TradingChart({ candles, quote, interval }) {
  const container = useRef(null);
  const currentCandle = useRef(null);
  const seriesRef = useRef(null);
  const priceLine = useRef(null);
  const [ohlc, setOhlc] = useState(null);
  useEffect(() => {
    if (!container.current || !candles.length) return;
    const chart = createChart(container.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#FFFFFF" },
        textColor: "#738096",
        fontFamily: "Inter, Segoe UI, sans-serif",
      },
      grid: {
        vertLines: { color: "#EDF0F6" },
        horzLines: { color: "#EDF0F6" },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: "#E5EAF2" },
      timeScale: {
        borderColor: "#E5EAF2",
        timeVisible: true,
        secondsVisible: false,
      },
      height: 380,
      localization: {
        timeFormatter: (time) =>
          new Date(Number(time) * 1000).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#35b48b",
      downColor: "#ed5864",
      borderVisible: false,
      wickUpColor: "#35b48b",
      wickDownColor: "#ed5864",
    });
    series.setData(candles);
    chart.timeScale().fitContent();
    currentCandle.current = candles.at(-1);
    seriesRef.current = series;
    setOhlc(candles.at(-1));
    chart.subscribeCrosshairMove((param) =>
      setOhlc(param.seriesData.get(series) ?? currentCandle.current),
    );
    const observer = new ResizeObserver(([entry]) =>
      chart.applyOptions({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(200, entry.contentRect.height),
      }),
    );
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      chart.remove();
      currentCandle.current = null;
      seriesRef.current = null;
      priceLine.current = null;
    };
  }, [candles]);
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !hasNumber(quote?.ltp)) return;
    const price = Number(quote.ltp);
    if (priceLine.current) priceLine.current.applyOptions({ price });
    else
      priceLine.current = series.createPriceLine({
        price,
        color: "#c6cbd3",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "LTP",
      });
    const last = currentCandle.current ?? candles.at(-1);
    const seconds = intervals.find((i) => i.value === interval)?.seconds;
    const timestamp = Date.parse(quote.timestamp ?? quote.lastUpdated) / 1000;
    // Only update an existing candle when a server timestamp locates the quote
    // within that candle. Never fabricate a new candle from polling samples.
    if (
      last &&
      seconds &&
      seconds < 86400 &&
      Number.isFinite(timestamp) &&
      timestamp >= last.time &&
      timestamp < last.time + seconds
    ) {
      const next = {
        ...last,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      };
      series.update(next);
      currentCandle.current = next;
      setOhlc(next);
    }
  }, [quote, candles, interval]);
  return (
    <div className="chart-wrapper">
      <div className="ohlc-row">
        {["open", "high", "low", "close"].map((key) => (
          <span key={key}>
            <small>{key[0].toUpperCase()}</small>
            {formatINR(ohlc?.[key])}
          </span>
        ))}
      </div>
      <div className="chart-canvas" ref={container} />
      <a
        className="chart-attribution"
        href="https://www.tradingview.com/"
        target="_blank"
        rel="noreferrer"
      >
        TradingView Lightweight Charts™ · © 2025 TradingView, Inc.
      </a>
    </div>
  );
}
