import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Candle, IndicatorData, SignalResult } from '../types';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  ShieldCheck, 
  Radio, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Newspaper
} from 'lucide-react';

interface PriceChartProps {
  data: IndicatorData;
  signal: SignalResult | null;
}

export const PriceChart: React.FC<PriceChartProps> = ({ data, signal }) => {
  // Chart view configuration & interaction state
  const [visibleCount, setVisibleCount] = useState<number>(50); // Zoom level: 20 to 120 candles
  const [panOffset, setPanOffset] = useState<number>(0); // 0 = pinned to latest candle
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);

  // Feature toggles
  const [showLevels, setShowLevels] = useState<boolean>(true);
  const [showEma, setShowEma] = useState<boolean>(true);
  const [showOscillators, setShowOscillators] = useState<boolean>(true);
  const [showNews, setShowNews] = useState<boolean>(true);
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(true);

  // Drag pan refs
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const totalCandles = data.candles.length;

  // Zoom handlers
  const handleZoomIn = () => {
    setVisibleCount((prev) => Math.max(20, prev - 10));
  };

  const handleZoomOut = () => {
    setVisibleCount((prev) => Math.min(120, Math.min(totalCandles, prev + 10)));
  };

  const handleResetToLatest = () => {
    setPanOffset(0);
    setVisibleCount(50);
  };

  // Ensure panOffset stays valid if candle count changes
  const maxPanOffset = Math.max(0, totalCandles - visibleCount);
  const effectivePanOffset = Math.min(panOffset, maxPanOffset);

  // Visible window of candles based on panOffset and visibleCount
  // When panOffset = 0, we take the rightmost `visibleCount` candles.
  const visibleCandles = useMemo(() => {
    if (totalCandles === 0) return [];
    const endIndex = totalCandles - effectivePanOffset;
    const startIndex = Math.max(0, endIndex - visibleCount);
    return data.candles.slice(startIndex, endIndex);
  }, [data.candles, totalCandles, effectivePanOffset, visibleCount]);

  const startIndexInAll = Math.max(0, totalCandles - effectivePanOffset - visibleCount);

  // Corresponding indicator series subsets
  const visibleEma9 = useMemo(() => {
    if (!data.ema9Series || data.ema9Series.length === 0) return [];
    const endIndex = totalCandles - effectivePanOffset;
    const startIndex = Math.max(0, endIndex - visibleCount);
    return data.ema9Series.slice(startIndex, endIndex);
  }, [data.ema9Series, totalCandles, effectivePanOffset, visibleCount]);

  const visibleEma21 = useMemo(() => {
    if (!data.ema21Series || data.ema21Series.length === 0) return [];
    const endIndex = totalCandles - effectivePanOffset;
    const startIndex = Math.max(0, endIndex - visibleCount);
    return data.ema21Series.slice(startIndex, endIndex);
  }, [data.ema21Series, totalCandles, effectivePanOffset, visibleCount]);

  const visibleEma50 = useMemo(() => {
    if (!data.ema50Series || data.ema50Series.length === 0) return [];
    const endIndex = totalCandles - effectivePanOffset;
    const startIndex = Math.max(0, endIndex - visibleCount);
    return data.ema50Series.slice(startIndex, endIndex);
  }, [data.ema50Series, totalCandles, effectivePanOffset, visibleCount]);

  const visibleRsi = useMemo(() => {
    if (!data.rsiSeries || data.rsiSeries.length === 0) return [];
    const endIndex = totalCandles - effectivePanOffset;
    const startIndex = Math.max(0, endIndex - visibleCount);
    return data.rsiSeries.slice(startIndex, endIndex);
  }, [data.rsiSeries, totalCandles, effectivePanOffset, visibleCount]);

  const visibleMacd = useMemo(() => {
    if (!data.macdHistSeries || data.macdHistSeries.length === 0) return [];
    const endIndex = totalCandles - effectivePanOffset;
    const startIndex = Math.max(0, endIndex - visibleCount);
    return data.macdHistSeries.slice(startIndex, endIndex);
  }, [data.macdHistSeries, totalCandles, effectivePanOffset, visibleCount]);

  // Price range calculation (incorporate candles + visible TradePlan levels)
  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (visibleCandles.length === 0) {
      return { minPrice: 0, maxPrice: 100, priceRange: 100 };
    }
    let min = Infinity;
    let max = -Infinity;
    visibleCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });

    // If levels are visible and we have a tradePlan, encompass the levels
    if (showLevels && signal?.tradePlan) {
      const tp = signal.tradePlan;
      if (tp.stopLoss > 0) min = Math.min(min, tp.stopLoss);
      if (tp.takeProfit3 > 0) max = Math.max(max, tp.takeProfit3);
      if (tp.takeProfit1 > 0) {
        min = Math.min(min, tp.takeProfit1);
        max = Math.max(max, tp.takeProfit1);
      }
      if (tp.entryPrice > 0) {
        min = Math.min(min, tp.entryPrice);
        max = Math.max(max, tp.entryPrice);
      }
    }

    const pad = (max - min) * 0.08 || max * 0.02 || 1;
    return {
      minPrice: min - pad,
      maxPrice: max + pad,
      priceRange: (max + pad) - (min - pad),
    };
  }, [visibleCandles, showLevels, signal?.tradePlan]);

  // Chart dimensions & layout
  const totalSvgWidth = 860;
  const rightAxisWidth = 72;
  const chartWidth = totalSvgWidth - rightAxisWidth; // 788px for candlestick drawing
  const priceChartHeight = 280;
  const rsiChartHeight = showOscillators ? 74 : 0;
  const macdChartHeight = showOscillators ? 74 : 0;
  const gap = showOscillators ? 14 : 0;
  const timeAxisHeight = 24;
  const totalHeight = priceChartHeight + (showOscillators ? (rsiChartHeight + macdChartHeight + gap * 2) : 0) + timeAxisHeight;

  const count = visibleCandles.length || 1;
  const candleSlotWidth = chartWidth / count;
  const candleBodyWidth = Math.max(2.5, candleSlotWidth * 0.7);

  // Coordinate mappers
  const getYForPrice = (p: number) => {
    if (priceRange === 0) return priceChartHeight / 2;
    return priceChartHeight - ((p - minPrice) / priceRange) * priceChartHeight;
  };

  const getPriceForY = (y: number) => {
    const clampedY = Math.max(0, Math.min(priceChartHeight, y));
    return maxPrice - (clampedY / priceChartHeight) * priceRange;
  };

  const getYForRsi = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    const startY = priceChartHeight + gap;
    return startY + (rsiChartHeight - (clamped / 100) * rsiChartHeight);
  };

  const maxMacdAbs = useMemo(() => {
    let max = 0.0001;
    visibleMacd.forEach((m) => {
      const abs = Math.abs(m);
      if (abs > max) max = abs;
    });
    return max * 1.2;
  }, [visibleMacd]);

  const getYForMacd = (val: number) => {
    const startY = priceChartHeight + gap + rsiChartHeight + gap;
    const midY = startY + macdChartHeight / 2;
    return midY - (val / maxMacdAbs) * (macdChartHeight / 2);
  };

  // EMA Paths
  const makeLinePath = (values: number[], getY: (v: number) => number) => {
    if (values.length === 0) return '';
    return values
      .map((val, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const y = getY(val);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const ema9Path = useMemo(() => makeLinePath(visibleEma9, getYForPrice), [visibleEma9, minPrice, priceRange]);
  const ema21Path = useMemo(() => makeLinePath(visibleEma21, getYForPrice), [visibleEma21, minPrice, priceRange]);
  const ema50Path = useMemo(() => makeLinePath(visibleEma50, getYForPrice), [visibleEma50, minPrice, priceRange]);
  const rsiPath = useMemo(() => makeLinePath(visibleRsi, getYForRsi), [visibleRsi]);

  // Pan Gestures: Mouse Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = effectivePanOffset;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const normalizedX = (mouseX / rect.width) * totalSvgWidth;
    const normalizedY = (mouseY / rect.height) * totalHeight;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      // Convert pixel delta to candle count delta
      const pxPerCandle = (rect.width * (chartWidth / totalSvgWidth)) / visibleCount;
      const candlesMoved = Math.round(deltaX / pxPerCandle);
      const newOffset = Math.max(0, Math.min(maxPanOffset, dragStartOffsetRef.current + candlesMoved));
      setPanOffset(newOffset);
    } else {
      // Hover index & crosshair tracking
      if (normalizedX < chartWidth && normalizedX >= 0) {
        const idx = Math.floor(normalizedX / candleSlotWidth);
        if (idx >= 0 && idx < visibleCandles.length) {
          setHoverIndex(idx);
          setHoverY(normalizedY <= priceChartHeight ? normalizedY : null);
        }
      } else {
        setHoverIndex(null);
        setHoverY(null);
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setVisibleCount((prev) => Math.max(20, prev - 4));
    } else {
      // Zoom out
      setVisibleCount((prev) => Math.min(120, Math.min(totalCandles, prev + 4)));
    }
  };

  // Latest active candle (running price)
  const latestCandle = data.candles[data.candles.length - 1];
  const activeCandle = hoverIndex !== null ? visibleCandles[hoverIndex] : visibleCandles[visibleCandles.length - 1];
  const runningPrice = latestCandle ? latestCandle.close : (signal?.price || 0);

  // Format price helper
  const precision = signal?.tradePlan?.precision ?? (runningPrice > 500 ? 2 : runningPrice > 1 ? 4 : 6);
  const formatPrice = (p: number) => {
    if (isNaN(p) || p === null) return '0.00';
    return p.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision });
  };

  // Format time helper
  const formatTime = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const formatDateLabel = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${h}:${m}`;
  };

  // Find if signal candle is within visible candles
  const signalCandleIndex = useMemo(() => {
    if (!signal || !signal.timestamp) return -1;
    // Look for candle whose time matches or is closest to signal.timestamp
    // Usually signal is generated for the latest closed candle
    return visibleCandles.findIndex((c, idx) => {
      // Check if it's the candle from the same timeframe window
      return Math.abs(c.time - signal.timestamp) < 60000 || idx === visibleCandles.length - 1 - effectivePanOffset;
    });
  }, [visibleCandles, signal, effectivePanOffset]);

  // Trade Plan Level lines data
  const tp = signal?.tradePlan;

  return (
    <div className="w-full bg-[#0B101D] rounded-2xl border border-[#1E293B] shadow-2xl overflow-hidden select-none">
      
      {/* MT5 Top Status & Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#111827] border-b border-[#1E293B]">
        {/* Left: Asset info & MT5 Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/70 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>MT5 LIVE</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-sm font-black text-white tracking-wider font-mono">
              {signal?.symbol || 'ASET'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {signal?.frame || '5m'}
            </span>
          </div>

          {/* Running Price Display */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700/60 font-mono">
            <span className="text-xs text-slate-400">Harga:</span>
            <span className={`text-sm font-black ${latestCandle && latestCandle.close >= latestCandle.open ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {formatPrice(runningPrice)}
            </span>
          </div>

          {/* Data Status Badge (LIVE / DELAYED / STALE) */}
          <div className="flex items-center">
            {signal?.dataStatus === 'DELAYED' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                DELAYED
              </span>
            ) : signal?.dataStatus === 'STALE' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
                STALE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Right: Interactive Chart Controls */}
        <div className="flex items-center gap-2">
          {/* Toggle Levels (SL/TP) */}
          <button
            onClick={() => setShowLevels(!showLevels)}
            title="Toggle Garis Entry, Stop Loss & Take Profit"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
              showLevels 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SL/TP</span>
          </button>

          {/* Toggle EMA */}
          <button
            onClick={() => setShowEma(!showEma)}
            title="Toggle Garis Indikator EMA 9, 21, 50"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
              showEma 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm' 
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>EMA</span>
          </button>

          {/* Toggle RSI/MACD sub-charts */}
          <button
            onClick={() => setShowOscillators(!showOscillators)}
            title="Toggle Sub-Chart RSI & MACD"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
              showOscillators 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' 
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>OSC</span>
          </button>

          {/* Toggle News Markers */}
          <button
            onClick={() => setShowNews(!showNews)}
            title="Toggle Penanda Berita Berdampak (News Markers)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
              showNews 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' 
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>NEWS</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={handleZoomIn}
              title="Zoom In (Perbesar)"
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out (Perkecil)"
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle info panel */}
          <button
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            title="Sembunyikan/Tampilkan Panel Sinyal MT5"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          >
            {showInfoPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* COMPACT SIGNAL INFO PANEL (MT5 HUD) */}
      {showInfoPanel && signal && (
        <div className="bg-[#0F172A] border-b border-[#1E293B] px-4 py-2.5 text-xs font-mono">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 items-center">
            {/* 1. Sinyal Direction */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Arah Sinyal</span>
              <div className="flex items-center gap-1 mt-0.5">
                {signal.side === 'BUY' ? (
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-black bg-emerald-500/20 text-[#22C55E] flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> BUY ({signal.confidenceScore}%)
                  </span>
                ) : signal.side === 'SELL' ? (
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-black bg-rose-500/20 text-[#EF4444] flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> SELL ({signal.confidenceScore}%)
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-black bg-slate-800 text-slate-400">
                    WAIT ({signal.confidenceScore}%)
                  </span>
                )}
              </div>
            </div>

            {/* 2. Harga Berjalan */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Harga Berjalan</span>
              <span className="font-black text-white text-[12px] block mt-0.5">
                {formatPrice(runningPrice)}
              </span>
            </div>

            {/* 3. Entry Price */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-amber-400 block uppercase font-bold">Entry Level</span>
              <span className="font-bold text-amber-300 text-[11px] block mt-0.5">
                {tp ? tp.formattedEntry : formatPrice(runningPrice)}
              </span>
            </div>

            {/* 4. Stop Loss */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-rose-400 block uppercase font-bold">Stop Loss (SL)</span>
              <span className="font-bold text-rose-300 text-[11px] block mt-0.5">
                {tp ? tp.formattedSl : '—'}
              </span>
            </div>

            {/* 5. Take Profit 1 & 2 */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-emerald-400 block uppercase font-bold">TP 1 / TP 2</span>
              <span className="font-bold text-emerald-300 text-[11px] block mt-0.5 truncate" title={`TP1: ${tp?.formattedTp1} | TP2: ${tp?.formattedTp2}`}>
                {tp ? `${tp.formattedTp1}` : '—'}
              </span>
            </div>

            {/* 6. Take Profit 3 */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-cyan-400 block uppercase font-bold">TP 3 / R:R</span>
              <span className="font-bold text-cyan-300 text-[11px] block mt-0.5">
                {tp ? `${tp.riskRewardRatio}` : '—'}
              </span>
            </div>

            {/* 7. Waktu Sinyal */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Waktu Sinyal</span>
              <span className="text-slate-300 text-[10px] block mt-0.5 truncate" title={signal.time}>
                {signal.time.split(' ')[0]}
              </span>
            </div>

            {/* 8. Waktu Data Terakhir */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Data Terakhir</span>
              <span className="text-slate-300 text-[10px] block mt-0.5 truncate">
                {latestCandle ? formatTime(latestCandle.time) : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Active Candle OHLCV Header Strip */}
      {activeCandle && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 px-4 bg-[#0B101D] text-[11px] font-mono text-slate-400 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <span>Waktu: <strong className="text-slate-200">{formatDateLabel(activeCandle.time)}</strong></span>
            <span>O: <strong className="text-white">{formatPrice(activeCandle.open)}</strong></span>
            <span>H: <strong className="text-white">{formatPrice(activeCandle.high)}</strong></span>
            <span>L: <strong className="text-white">{formatPrice(activeCandle.low)}</strong></span>
            <span>C: <strong className={activeCandle.close >= activeCandle.open ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{formatPrice(activeCandle.close)}</strong></span>
            <span>Vol: <strong className="text-slate-300">{activeCandle.volume.toFixed(2)}</strong></span>
          </div>

          {/* Indicator values legend */}
          {showEma && (
            <div className="hidden sm:flex items-center gap-3 text-[10px]">
              <span className="text-[#60A5FA]">EMA9: {visibleEma9[visibleEma9.length - 1]?.toFixed(precision)}</span>
              <span className="text-[#F59E0B]">EMA21: {visibleEma21[visibleEma21.length - 1]?.toFixed(precision)}</span>
              <span className="text-[#C084FC]">EMA50: {visibleEma50[visibleEma50.length - 1]?.toFixed(precision)}</span>
            </div>
          )}
        </div>
      )}

      {/* SVG Canvas Area with MT5 Viewport */}
      <div 
        ref={svgContainerRef}
        className="relative w-full cursor-crosshair overflow-hidden touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoverIndex(null);
          setHoverY(null);
        }}
        onWheel={handleWheel}
      >
        <svg
          viewBox={`0 0 ${totalSvgWidth} ${totalHeight}`}
          className="w-full h-auto block select-none"
        >
          <defs>
            {/* Grid pattern */}
            <pattern id="mt5Grid" width="60" height="40" patternUnits="userSpaceOnUse">
              <line x1="0" y1="40" x2="60" y2="40" stroke="#141E33" strokeWidth="0.8" strokeDasharray="2 2" />
              <line x1="60" y1="0" x2="60" y2="40" stroke="#141E33" strokeWidth="0.8" strokeDasharray="2 2" />
            </pattern>
          </defs>

          {/* Chart Background with Subtle MT5 Grid */}
          <rect x="0" y="0" width={chartWidth} height={priceChartHeight} fill="#090E1A" />
          <rect x="0" y="0" width={chartWidth} height={priceChartHeight} fill="url(#mt5Grid)" />

          {/* Right Price Scale Axis Background */}
          <rect x={chartWidth} y="0" width={rightAxisWidth} height={totalHeight} fill="#0B101D" />
          <line x1={chartWidth} y1="0" x2={chartWidth} y2={totalHeight} stroke="#1E293B" strokeWidth="1" />

          {/* Horizontal Price Grid Lines & Labels on Right Axis */}
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((ratio) => {
            const y = priceChartHeight * ratio;
            const price = maxPrice - ratio * priceRange;
            return (
              <g key={`grid-h-${ratio}`}>
                <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#162238" strokeWidth="0.8" strokeDasharray="3 3" />
                <text
                  x={chartWidth + 6}
                  y={y + 3.5}
                  fill="#64748B"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {formatPrice(price)}
                </text>
              </g>
            );
          })}

          {/* CANDLESTICKS */}
          {visibleCandles.map((c, idx) => {
            const cx = idx * candleSlotWidth + candleSlotWidth / 2;
            const isUp = c.close >= c.open;
            const color = isUp ? '#22C55E' : '#EF4444';

            const yHigh = getYForPrice(c.high);
            const yLow = getYForPrice(c.low);
            const yOpen = getYForPrice(c.open);
            const yClose = getYForPrice(c.close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.8, Math.abs(yClose - yOpen));

            return (
              <g key={`candle-${c.time}-${idx}`}>
                {/* Wick (Sumbu candle akurat) */}
                <line
                  x1={cx}
                  y1={yHigh}
                  x2={cx}
                  y2={yLow}
                  stroke={color}
                  strokeWidth="1.2"
                />
                {/* Body Candle */}
                <rect
                  x={cx - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* INDICATOR EMA OVERLAYS (when enabled) */}
          {showEma && (
            <>
              {ema50Path && <path d={ema50Path} fill="none" stroke="#C084FC" strokeWidth="1.2" strokeOpacity="0.85" />}
              {ema21Path && <path d={ema21Path} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.9" />}
              {ema9Path && <path d={ema9Path} fill="none" stroke="#60A5FA" strokeWidth="1.8" />}
            </>
          )}

          {/* SIGNAL MARKER ON SIGNAL CANDLE */}
          {signal && signal.side !== 'WAIT' && signalCandleIndex >= 0 && (
            (() => {
              const sigCandle = visibleCandles[signalCandleIndex];
              if (!sigCandle) return null;
              const sx = signalCandleIndex * candleSlotWidth + candleSlotWidth / 2;
              const isBuy = signal.side === 'BUY';
              const sy = isBuy ? getYForPrice(sigCandle.low) + 16 : getYForPrice(sigCandle.high) - 16;
              const badgeColor = isBuy ? '#22C55E' : '#EF4444';

              return (
                <g key="signal-marker">
                  {/* Marker Pin */}
                  <polygon
                    points={isBuy ? `${sx},${sy - 8} ${sx - 6},${sy + 2} ${sx + 6},${sy + 2}` : `${sx},${sy + 8} ${sx - 6},${sy - 2} ${sx + 6},${sy - 2}`}
                    fill={badgeColor}
                  />
                  <rect
                    x={sx - 20}
                    y={isBuy ? sy + 3 : sy - 17}
                    width="40"
                    height="14"
                    rx="3"
                    fill={badgeColor}
                  />
                  <text
                    x={sx}
                    y={isBuy ? sy + 13 : sy - 7}
                    textAnchor="middle"
                    fill="#0B101D"
                    fontSize="8.5"
                    fontWeight="900"
                    fontFamily="monospace"
                  >
                    {signal.side}
                  </text>
                </g>
              );
            })()
          )}

          {/* NEWS IMPACT MARKERS (when enabled) */}
          {showNews && data.newsMarkers && data.newsMarkers.length > 0 && (
            data.newsMarkers.map((marker, mIdx) => {
              // Find closest candle index
              const candleIdx = visibleCandles.findIndex(c => Math.abs(c.time - marker.time) < 3600000);
              if (candleIdx < 0) return null;
              const targetCandle = visibleCandles[candleIdx];
              const mx = candleIdx * candleSlotWidth + candleSlotWidth / 2;
              const my = Math.max(15, getYForPrice(targetCandle.high) - 20);
              const isCrit = marker.impact === 'CRITICAL';
              const markerBg = isCrit ? '#A855F7' : marker.impact === 'HIGH' ? '#EF4444' : '#F59E0B';

              return (
                <g key={`news-marker-${mIdx}`} className="cursor-pointer">
                  <title>{`${marker.title} (Sentimen: ${marker.sentimentScore > 0 ? '+' : ''}${marker.sentimentScore})`}</title>
                  <circle cx={mx} cy={my} r="7" fill={markerBg} stroke="#090E1A" strokeWidth="1.5" />
                  <text x={mx} y={my + 2.5} textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="sans-serif">
                    N
                  </text>
                  <line x1={mx} y1={my + 7} x2={mx} y2={getYForPrice(targetCandle.high)} stroke={markerBg} strokeWidth="1" strokeDasharray="1 1" />
                </g>
              );
            })
          )}

          {/* TRADE PLAN HORIZONTAL LEVEL LINES (ENTRY, SL, TP1, TP2, TP3) */}
          {showLevels && tp && signal && signal.side !== 'WAIT' && (
            <>
              {/* ENTRY Level Line (Amber) */}
              {tp.entryPrice > 0 && (() => {
                const y = getYForPrice(tp.entryPrice);
                return (
                  <g key="lvl-entry">
                    <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="5 3" />
                    {/* Badge on Right Axis */}
                    <rect x={chartWidth} y={y - 8} width={rightAxisWidth} height="16" fill="#F59E0B" rx="2" />
                    <text x={chartWidth + 4} y={y + 3.5} fill="#090E1A" fontSize="9" fontWeight="900" fontFamily="monospace">
                      EN {formatPrice(tp.entryPrice)}
                    </text>
                  </g>
                );
              })()}

              {/* STOP LOSS (SL) Level Line (Red) */}
              {tp.stopLoss > 0 && (() => {
                const y = getYForPrice(tp.stopLoss);
                return (
                  <g key="lvl-sl">
                    <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#EF4444" strokeWidth="1.4" strokeDasharray="4 4" />
                    <rect x={chartWidth} y={y - 8} width={rightAxisWidth} height="16" fill="#EF4444" rx="2" />
                    <text x={chartWidth + 4} y={y + 3.5} fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="monospace">
                      SL {formatPrice(tp.stopLoss)}
                    </text>
                  </g>
                );
              })()}

              {/* TAKE PROFIT 1 (TP1) Level Line (Emerald) */}
              {tp.takeProfit1 > 0 && (() => {
                const y = getYForPrice(tp.takeProfit1);
                return (
                  <g key="lvl-tp1">
                    <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#10B981" strokeWidth="1.2" strokeDasharray="3 3" />
                    <rect x={chartWidth} y={y - 8} width={rightAxisWidth} height="16" fill="#10B981" rx="2" />
                    <text x={chartWidth + 4} y={y + 3.5} fill="#090E1A" fontSize="9" fontWeight="900" fontFamily="monospace">
                      TP1 {formatPrice(tp.takeProfit1)}
                    </text>
                  </g>
                );
              })()}

              {/* TAKE PROFIT 2 (TP2) Level Line (Teal) */}
              {tp.takeProfit2 > 0 && (() => {
                const y = getYForPrice(tp.takeProfit2);
                return (
                  <g key="lvl-tp2">
                    <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#14B8A6" strokeWidth="1.2" strokeDasharray="3 3" />
                    <rect x={chartWidth} y={y - 8} width={rightAxisWidth} height="16" fill="#14B8A6" rx="2" />
                    <text x={chartWidth + 4} y={y + 3.5} fill="#090E1A" fontSize="9" fontWeight="900" fontFamily="monospace">
                      TP2 {formatPrice(tp.takeProfit2)}
                    </text>
                  </g>
                );
              })()}

              {/* TAKE PROFIT 3 (TP3) Level Line (Cyan) */}
              {tp.takeProfit3 > 0 && (() => {
                const y = getYForPrice(tp.takeProfit3);
                return (
                  <g key="lvl-tp3">
                    <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#06B6D4" strokeWidth="1.2" strokeDasharray="3 3" />
                    <rect x={chartWidth} y={y - 8} width={rightAxisWidth} height="16" fill="#06B6D4" rx="2" />
                    <text x={chartWidth + 4} y={y + 3.5} fill="#090E1A" fontSize="9" fontWeight="900" fontFamily="monospace">
                      TP3 {formatPrice(tp.takeProfit3)}
                    </text>
                  </g>
                );
              })()}
            </>
          )}

          {/* RUNNING PRICE LINE (MT5 CURRENT PRICE BEACON) */}
          {latestCandle && (() => {
            const currentY = getYForPrice(runningPrice);
            const isUp = latestCandle.close >= latestCandle.open;
            const beaconColor = isUp ? '#22C55E' : '#EF4444';

            return (
              <g key="running-price">
                {/* Horizontal Dashed Price Tracker */}
                <line
                  x1="0"
                  y1={currentY}
                  x2={chartWidth}
                  y2={currentY}
                  stroke={beaconColor}
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                />
                {/* Highlighting Right-Axis Badge */}
                <rect
                  x={chartWidth}
                  y={currentY - 9}
                  width={rightAxisWidth}
                  height="18"
                  fill={beaconColor}
                  rx="3"
                />
                <text
                  x={chartWidth + 4}
                  y={currentY + 3.5}
                  fill="#0B101D"
                  fontSize="9.5"
                  fontWeight="900"
                  fontFamily="monospace"
                >
                  {formatPrice(runningPrice)}
                </text>
              </g>
            );
          })()}

          {/* OSCILLATORS: RSI (14) SUB-CHART */}
          {showOscillators && (() => {
            const startY = priceChartHeight + gap;
            const y70 = getYForRsi(70);
            const y30 = getYForRsi(30);
            const y50 = getYForRsi(50);
            const activeRsiVal = hoverIndex !== null ? visibleRsi[hoverIndex] : visibleRsi[visibleRsi.length - 1];

            return (
              <g key="rsi-subchart">
                <rect x="0" y={startY} width={chartWidth} height={rsiChartHeight} fill="#090E1A" />
                <rect x={chartWidth} y={startY} width={rightAxisWidth} height={rsiChartHeight} fill="#0B101D" />
                <line x1="0" y1={startY} x2={totalSvgWidth} y2={startY} stroke="#1E293B" strokeWidth="1" />
                <line x1={chartWidth} y1={startY} x2={chartWidth} y2={startY + rsiChartHeight} stroke="#1E293B" strokeWidth="1" />

                {/* Threshold lines */}
                <line x1="0" y1={y70} x2={chartWidth} y2={y70} stroke="#EF4444" strokeDasharray="2 2" strokeOpacity="0.4" />
                <line x1="0" y1={y30} x2={chartWidth} y2={y30} stroke="#10B981" strokeDasharray="2 2" strokeOpacity="0.4" />
                <line x1="0" y1={y50} x2={chartWidth} y2={y50} stroke="#475569" strokeDasharray="3 3" strokeOpacity="0.3" />

                <text x="8" y={startY + 13} fill="#94A3B8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  RSI (14): <tspan fill="#34D399">{activeRsiVal ? activeRsiVal.toFixed(1) : '50.0'}</tspan>
                </text>
                <text x={chartWidth + 6} y={y70 + 3} fill="#EF4444" fontSize="8" opacity="0.8" fontFamily="monospace">70</text>
                <text x={chartWidth + 6} y={y30 + 3} fill="#10B981" fontSize="8" opacity="0.8" fontFamily="monospace">30</text>

                {rsiPath && <path d={rsiPath} fill="none" stroke="#10B981" strokeWidth="1.4" />}
              </g>
            );
          })()}

          {/* OSCILLATORS: MACD HISTOGRAM SUB-CHART */}
          {showOscillators && (() => {
            const startY = priceChartHeight + gap + rsiChartHeight + gap;
            const midY = startY + macdChartHeight / 2;
            const activeMacdVal = hoverIndex !== null ? visibleMacd[hoverIndex] : visibleMacd[visibleMacd.length - 1];

            return (
              <g key="macd-subchart">
                <rect x="0" y={startY} width={chartWidth} height={macdChartHeight} fill="#090E1A" />
                <rect x={chartWidth} y={startY} width={rightAxisWidth} height={macdChartHeight} fill="#0B101D" />
                <line x1="0" y1={startY} x2={totalSvgWidth} y2={startY} stroke="#1E293B" strokeWidth="1" />
                <line x1={chartWidth} y1={startY} x2={chartWidth} y2={startY + macdChartHeight} stroke="#1E293B" strokeWidth="1" />
                <line x1="0" y1={midY} x2={chartWidth} y2={midY} stroke="#334155" strokeWidth="0.8" />

                <text x="8" y={startY + 13} fill="#94A3B8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  MACD HIST: <tspan fill={activeMacdVal >= 0 ? '#34D399' : '#F87171'}>{activeMacdVal ? activeMacdVal.toFixed(4) : '0.0000'}</tspan>
                </text>

                {visibleMacd.map((m, idx) => {
                  const cx = idx * candleSlotWidth + candleSlotWidth / 2;
                  const my = getYForMacd(m);
                  const isPos = m >= 0;
                  const barColor = isPos ? '#22C55E' : '#EF4444';
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
                      opacity={0.8}
                    />
                  );
                })}
              </g>
            );
          })()}

          {/* HORIZONTAL TIME SCALE AXIS AT BOTTOM */}
          {(() => {
            const timeAxisY = totalHeight - timeAxisHeight;
            return (
              <g key="time-axis">
                <rect x="0" y={timeAxisY} width={totalSvgWidth} height={timeAxisHeight} fill="#0B101D" />
                <line x1="0" y1={timeAxisY} x2={totalSvgWidth} y2={timeAxisY} stroke="#1E293B" strokeWidth="1" />

                {/* Spaced time marks across visible candles */}
                {visibleCandles.map((c, idx) => {
                  // Only draw every ~8th candle time to prevent clutter
                  const step = Math.max(5, Math.floor(visibleCount / 7));
                  if (idx % step !== 0 && idx !== visibleCandles.length - 1) return null;

                  const cx = idx * candleSlotWidth + candleSlotWidth / 2;
                  return (
                    <g key={`time-${idx}`}>
                      <line x1={cx} y1={timeAxisY} x2={cx} y2={timeAxisY + 4} stroke="#334155" strokeWidth="1" />
                      <text
                        x={cx}
                        y={timeAxisY + 16}
                        textAnchor="middle"
                        fill="#64748B"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {formatTime(c.time)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* INTERACTIVE CROSSHAIR */}
          {hoverIndex !== null && (
            (() => {
              const hx = hoverIndex * candleSlotWidth + candleSlotWidth / 2;
              const hoveredPrice = hoverY !== null ? getPriceForY(hoverY) : null;

              return (
                <g key="crosshair">
                  {/* Vertical Crosshair Line */}
                  <line
                    x1={hx}
                    y1="0"
                    x2={hx}
                    y2={totalHeight - timeAxisHeight}
                    stroke="#94A3B8"
                    strokeWidth="0.8"
                    strokeDasharray="3 3"
                    opacity="0.75"
                  />
                  {/* Horizontal Crosshair Line */}
                  {hoverY !== null && (
                    <>
                      <line
                        x1="0"
                        y1={hoverY}
                        x2={chartWidth}
                        y2={hoverY}
                        stroke="#94A3B8"
                        strokeWidth="0.8"
                        strokeDasharray="3 3"
                        opacity="0.75"
                      />
                      {/* Price badge on hover right axis */}
                      <rect
                        x={chartWidth}
                        y={hoverY - 8}
                        width={rightAxisWidth}
                        height="16"
                        fill="#334155"
                        rx="2"
                      />
                      <text
                        x={chartWidth + 4}
                        y={hoverY + 3.5}
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {formatPrice(hoveredPrice || 0)}
                      </text>
                    </>
                  )}
                </g>
              );
            })()
          )}
        </svg>

        {/* FLOATING "RESET TO LATEST" BUTTON (KEMBALI KE TERBARU) */}
        {effectivePanOffset > 0 && (
          <div className="absolute bottom-10 right-20 z-20">
            <button
              onClick={handleResetToLatest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl text-xs font-mono font-bold transition-all border border-blue-400/40 animate-bounce"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembali ke Terbaru ({effectivePanOffset} candle di belakang)</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Details Bar */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 py-2 px-4 bg-[#0B101D] border-t border-[#1E293B]">
        <div className="flex items-center gap-2">
          <span>Menampilkan <strong>{visibleCandles.length}</strong> candle</span>
          <span>•</span>
          <span>Zoom: <strong>{visibleCount}</strong></span>
          {effectivePanOffset > 0 && (
            <span className="text-amber-400 font-bold">• Menggeser riwayat (-{effectivePanOffset})</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500">Geser mouse/sentuh untuk pan • Scroll untuk zoom</span>
          <span className="text-blue-400 font-semibold">{signal?.provider || 'Engine Realtime'}</span>
        </div>
      </div>
    </div>
  );
};
