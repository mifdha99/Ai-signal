import React, { useState, useMemo } from 'react';
import { Candle, IndicatorData, SignalResult } from '../types';

interface PriceChartProps {
  data: IndicatorData;
  signal: SignalResult | null;
}

export const PriceChart: React.FC<PriceChartProps> = ({ data, signal }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Take the most recent 60 candles for crisp visualization
  const displayCount = 60;
  const recentCandles = useMemo(() => {
    return data.candles.slice(-displayCount);
  }, [data.candles]);

  const offset = data.candles.length - recentCandles.length;

  const ema9Subset = useMemo(() => data.ema9Series.slice(-displayCount), [data.ema9Series]);
  const ema21Subset = useMemo(() => data.ema21Series.slice(-displayCount), [data.ema21Series]);
  const ema50Subset = useMemo(() => data.ema50Series.slice(-displayCount), [data.ema50Series]);
  const rsiSubset = useMemo(() => data.rsiSeries.slice(-displayCount), [data.rsiSeries]);
  const macdSubset = useMemo(() => data.macdHistSeries.slice(-displayCount), [data.macdHistSeries]);

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    recentCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });
    // Add 5% padding
    const pad = (max - min) * 0.05 || max * 0.01;
    return {
      minPrice: min - pad,
      maxPrice: max + pad,
      priceRange: (max + pad) - (min - pad),
    };
  }, [recentCandles]);

  // Chart dimensions
  const svgWidth = 800;
  const priceChartHeight = 240;
  const rsiChartHeight = 80;
  const macdChartHeight = 80;
  const gap = 16;
  const totalHeight = priceChartHeight + rsiChartHeight + macdChartHeight + gap * 2;

  const candleSlotWidth = svgWidth / recentCandles.length;
  const candleBodyWidth = Math.max(2, candleSlotWidth * 0.65);

  const getYForPrice = (p: number) => {
    if (priceRange === 0) return priceChartHeight / 2;
    return priceChartHeight - ((p - minPrice) / priceRange) * priceChartHeight;
  };

  const getYForRsi = (val: number) => {
    // RSI is 0 to 100
    const clamped = Math.max(0, Math.min(100, val));
    const startY = priceChartHeight + gap;
    return startY + (rsiChartHeight - (clamped / 100) * rsiChartHeight);
  };

  const { maxMacdAbs } = useMemo(() => {
    let max = 0.0001;
    macdSubset.forEach((m) => {
      const abs = Math.abs(m);
      if (abs > max) max = abs;
    });
    return { maxMacdAbs: max * 1.15 };
  }, [macdSubset]);

  const getYForMacd = (val: number) => {
    const startY = priceChartHeight + gap + rsiChartHeight + gap;
    const midY = startY + macdChartHeight / 2;
    return midY - (val / maxMacdAbs) * (macdChartHeight / 2);
  };

  // Generate SVG path points
  const makeLinePath = (values: number[], getY: (v: number) => number) => {
    return values
      .map((val, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const y = getY(val);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const ema9Path = useMemo(() => makeLinePath(ema9Subset, getYForPrice), [ema9Subset, minPrice, priceRange]);
  const ema21Path = useMemo(() => makeLinePath(ema21Subset, getYForPrice), [ema21Subset, minPrice, priceRange]);
  const ema50Path = useMemo(() => makeLinePath(ema50Subset, getYForPrice), [ema50Subset, minPrice, priceRange]);
  const rsiPath = useMemo(() => makeLinePath(rsiSubset, getYForRsi), [rsiSubset]);

  const activeCandle = hoverIndex !== null ? recentCandles[hoverIndex] : recentCandles[recentCandles.length - 1];
  const activeEma9 = hoverIndex !== null ? ema9Subset[hoverIndex] : ema9Subset[ema9Subset.length - 1];
  const activeEma21 = hoverIndex !== null ? ema21Subset[hoverIndex] : ema21Subset[ema21Subset.length - 1];
  const activeRsi = hoverIndex !== null ? rsiSubset[hoverIndex] : rsiSubset[rsiSubset.length - 1];
  const activeMacd = hoverIndex !== null ? macdSubset[hoverIndex] : macdSubset[macdSubset.length - 1];

  return (
    <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-4 shadow-xl select-none">
      {/* Header bar of chart */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#9CAAC2]">Grafik Pasar</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-blue-400">
            {signal?.symbol || 'ASET'} • {signal?.frame || '5m'}
          </span>
        </div>

        {/* Legend Indicators */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#69A7FF]"></span>
            <span className="text-slate-300">EMA(9):</span>
            <span className="text-[#69A7FF] font-semibold">{activeEma9?.toFixed(4) || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
            <span className="text-slate-300">EMA(21):</span>
            <span className="text-[#F59E0B] font-semibold">{activeEma21?.toFixed(4) || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]"></span>
            <span className="text-slate-300">EMA(50)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#27D69B]"></span>
            <span className="text-slate-300">RSI(14):</span>
            <span className="text-[#27D69B] font-semibold">{activeRsi?.toFixed(2) || '—'}</span>
          </div>
        </div>
      </div>

      {/* Hover values ribbon */}
      {activeCandle && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-[11px] font-mono text-slate-400 bg-slate-900/40 px-3 rounded-lg mt-2">
          <span>O: <strong className="text-white">{activeCandle.open.toFixed(4)}</strong></span>
          <span>H: <strong className="text-white">{activeCandle.high.toFixed(4)}</strong></span>
          <span>L: <strong className="text-white">{activeCandle.low.toFixed(4)}</strong></span>
          <span>C: <strong className={activeCandle.close >= activeCandle.open ? 'text-[#27D69B]' : 'text-[#FF5D70]'}>{activeCandle.close.toFixed(4)}</strong></span>
          <span>Vol: <strong className="text-slate-300">{activeCandle.volume.toFixed(1)}</strong></span>
          <span>MACD: <strong className={activeMacd >= 0 ? 'text-[#27D69B]' : 'text-[#FF5D70]'}>{activeMacd?.toFixed(4) || '0.0000'}</strong></span>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="relative mt-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalHeight}`}
          className="w-full h-auto block"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const normalizedX = (mouseX / rect.width) * svgWidth;
            const idx = Math.floor(normalizedX / candleSlotWidth);
            if (idx >= 0 && idx < recentCandles.length) {
              setHoverIndex(idx);
            }
          }}
        >
          <defs>
            <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#27D69B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#27D69B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines for Price Chart */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
            const y = priceChartHeight * ratio;
            const price = maxPrice - ratio * priceRange;
            return (
              <g key={`grid-price-${ratio}`}>
                <line x1="0" y1={y} x2={svgWidth} y2={y} stroke="#1E293B" strokeDasharray="3 3" />
                <text x={svgWidth - 6} y={y - 4} textAnchor="end" fill="#64748B" fontSize="10" fontFamily="monospace">
                  {price.toFixed(price > 100 ? 2 : 4)}
                </text>
              </g>
            );
          })}

          {/* Candlesticks */}
          {recentCandles.map((c, idx) => {
            const cx = idx * candleSlotWidth + candleSlotWidth / 2;
            const isUp = c.close >= c.open;
            const color = isUp ? '#27D69B' : '#FF5D70';

            const yHigh = getYForPrice(c.high);
            const yLow = getYForPrice(c.low);
            const yOpen = getYForPrice(c.open);
            const yClose = getYForPrice(c.close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

            return (
              <g key={`candle-${idx}`}>
                {/* Wick */}
                <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth="1.2" />
                {/* Body */}
                <rect
                  x={cx - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                />
              </g>
            );
          })}

          {/* EMA Overlay Lines */}
          <path d={ema50Path} fill="none" stroke="#A855F7" strokeWidth="1.5" strokeOpacity="0.8" />
          <path d={ema21Path} fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeOpacity="0.9" />
          <path d={ema9Path} fill="none" stroke="#69A7FF" strokeWidth="2.0" />

          {/* Signal Indicator Flag on the latest candle */}
          {signal && (
            (() => {
              const lastIdx = recentCandles.length - 1;
              const lastCandle = recentCandles[lastIdx];
              const lx = lastIdx * candleSlotWidth + candleSlotWidth / 2;
              const isBuy = signal.side === 'BUY';
              const flagY = isBuy ? getYForPrice(lastCandle.low) + 20 : getYForPrice(lastCandle.high) - 20;

              return (
                <g>
                  <circle cx={lx} cy={flagY} r="9" fill={isBuy ? '#27D69B' : '#FF5D70'} className="animate-pulse" />
                  <text
                    x={lx}
                    y={flagY + 3.5}
                    textAnchor="middle"
                    fill="#0B1020"
                    fontSize="9"
                    fontWeight="900"
                  >
                    {isBuy ? 'B' : 'S'}
                  </text>
                </g>
              );
            })()
          )}

          {/* RSI Chart Section */}
          {(() => {
            const startY = priceChartHeight + gap;
            const y70 = getYForRsi(70);
            const y30 = getYForRsi(30);
            const y50 = getYForRsi(50);

            return (
              <g>
                {/* RSI Background and Thresholds */}
                <rect x="0" y={startY} width={svgWidth} height={rsiChartHeight} fill="#0E1626" rx="4" />
                <line x1="0" y1={y70} x2={svgWidth} y2={y70} stroke="#EF4444" strokeDasharray="2 2" strokeOpacity="0.4" />
                <line x1="0" y1={y30} x2={svgWidth} y2={y30} stroke="#10B981" strokeDasharray="2 2" strokeOpacity="0.4" />
                <line x1="0" y1={y50} x2={svgWidth} y2={y50} stroke="#475569" strokeDasharray="3 3" strokeOpacity="0.4" />
                <text x="8" y={startY + 14} fill="#9CAAC2" fontSize="10" fontWeight="bold">RSI (14)</text>
                <text x={svgWidth - 6} y={y70 - 2} textAnchor="end" fill="#EF4444" fontSize="9" opacity="0.7">70 Overbought</text>
                <text x={svgWidth - 6} y={y30 + 10} textAnchor="end" fill="#10B981" fontSize="9" opacity="0.7">30 Oversold</text>

                {/* RSI Line */}
                <path d={rsiPath} fill="none" stroke="#27D69B" strokeWidth="1.8" />
              </g>
            );
          })()}

          {/* MACD Histogram Section */}
          {(() => {
            const startY = priceChartHeight + gap + rsiChartHeight + gap;
            const midY = startY + macdChartHeight / 2;

            return (
              <g>
                <rect x="0" y={startY} width={svgWidth} height={macdChartHeight} fill="#0E1626" rx="4" />
                <line x1="0" y1={midY} x2={svgWidth} y2={midY} stroke="#334155" strokeWidth="1" />
                <text x="8" y={startY + 14} fill="#9CAAC2" fontSize="10" fontWeight="bold">MACD HISTOGRAM</text>

                {macdSubset.map((m, idx) => {
                  const cx = idx * candleSlotWidth + candleSlotWidth / 2;
                  const my = getYForMacd(m);
                  const isPos = m >= 0;
                  const barColor = isPos ? '#27D69B' : '#FF5D70';
                  const top = isPos ? my : midY;
                  const h = Math.max(1, Math.abs(my - midY));

                  return (
                    <rect
                      key={`macd-${idx}`}
                      x={cx - candleBodyWidth / 2}
                      y={top}
                      width={candleBodyWidth}
                      height={h}
                      fill={barColor}
                      opacity={isPos ? 0.8 : 0.8}
                      rx="1"
                    />
                  );
                })}
              </g>
            );
          })()}

          {/* Hover Crosshair */}
          {hoverIndex !== null && (
            (() => {
              const hx = hoverIndex * candleSlotWidth + candleSlotWidth / 2;
              return (
                <g>
                  <line x1={hx} y1="0" x2={hx} y2={totalHeight} stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                </g>
              );
            })()
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#9CAAC2] pt-2 px-1">
        <span>Menampilkan {recentCandles.length} candle terakhir</span>
        <span>Data Binance Spot Realtime</span>
      </div>
    </div>
  );
};
