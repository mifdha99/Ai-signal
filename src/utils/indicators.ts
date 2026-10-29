import { Candle, SignalResult, IndicatorData, AssetInstrument, DataStatus } from '../types';

export function emaSeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2.0 / (period + 1.0);
  const out: number[] = new Array(values.length);
  let current = values[0];
  out[0] = current;
  for (let i = 1; i < values.length; i++) {
    current = values[i] * k + current * (1.0 - k);
    out[i] = current;
  }
  return out;
}

export function ema(values: number[], period: number): number {
  const series = emaSeries(values, period);
  return series[series.length - 1];
}

export function rsi(values: number[], period: number = 14): number {
  if (values.length <= period) return 50.0;
  let gains = 0.0;
  let losses = 0.0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0.0;
    const loss = diff < 0 ? -diff : 0.0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0.0) return 100.0;
  const rs = avgGain / avgLoss;
  return 100.0 - (100.0 / (1.0 + rs));
}

export function calculateAtr(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (closes.length <= period || highs.length !== closes.length || lows.length !== closes.length) return 0.0;

  const trueRanges: number[] = [];
  trueRanges.push(highs[0] - lows[0]);

  for (let i = 1; i < closes.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const priorClose = closes[i - 1];
    const tr = Math.max(high - low, Math.max(Math.abs(high - priorClose), Math.abs(low - priorClose)));
    trueRanges.push(tr);
  }

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  return atr;
}

export function analyzeCandles(
  candles: Candle[],
  instrument: AssetInstrument,
  frame: string,
  providerName: string
): { signal: SignalResult; indicatorData: IndicatorData } {
  if (candles.length < 60) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;

    return {
      signal: {
        side: 'WAIT',
        price: candles.length > 0 ? candles[candles.length - 1].close : 0.0,
        change24h: 0.0,
        volume: 0.0,
        rsi: 50.0,
        emaFast: 0.0,
        emaMid: 0.0,
        emaSlow: 0.0,
        macd: 0.0,
        macdLine: 0.0,
        signalLine: 0.0,
        atr14: 0.0,
        reason: `Data historis tidak mencukupi (${candles.length} candle didapat, minimal 60 candle diperlukan untuk indikator stabil). Sinyal dinonaktifkan.`,
        confidenceScore: 0,
        dataStatus: 'INCOMPLETE',
        time: timeStr,
        timestamp: Date.now(),
        symbol: instrument.symbol,
        frame,
        provider: providerName
      },
      indicatorData: {
        candles,
        ema9Series: [],
        ema21Series: [],
        ema50Series: [],
        rsiSeries: [],
        macdHistSeries: []
      }
    };
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const ema9Series = emaSeries(closes, 9);
  const ema21Series = emaSeries(closes, 21);
  const ema50Series = emaSeries(closes, 50);

  const ema9 = ema9Series[ema9Series.length - 1];
  const ema21 = ema21Series[ema21Series.length - 1];
  const ema50 = ema50Series[ema50Series.length - 1];

  const rsiVal = rsi(closes, 14);

  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const macdDiffs = ema12.map((val, idx) => val - ema26[idx]);
  const signalLineSeries = emaSeries(macdDiffs, 9);
  const macdHistSeries = macdDiffs.map((val, idx) => val - signalLineSeries[idx]);

  const macdLine = ema(closes, 12) - ema(closes, 26);
  const signalLine = ema(macdDiffs, 9);
  const macdHist = macdLine - signalLine;

  const atr14 = calculateAtr(highs, lows, closes, 14);

  const recent = closes[closes.length - 1];
  const prior = closes[closes.length - 2];
  const momentumUp = recent > prior;

  // Session change (past 24 candles)
  const sessionStartIndex = Math.max(0, closes.length - 24);
  const sessionStartPrice = closes[sessionStartIndex];
  const change24h = sessionStartPrice > 0 ? ((recent - sessionStartPrice) / sessionStartPrice) * 100 : 0.0;
  const totalVolume = candles.slice(-24).reduce((sum, c) => sum + c.volume, 0);

  // Confluence Evaluation
  let bullishScore = 0;
  let bearishScore = 0;

  if (ema9 > ema21 && ema21 > ema50) bullishScore += 3;
  else if (ema9 < ema21 && ema21 < ema50) bearishScore += 3;
  else if (ema9 > ema21) bullishScore += 1;
  else if (ema9 < ema21) bearishScore += 1;

  if (recent > ema9) bullishScore += 1; else bearishScore += 1;

  if (rsiVal >= 52.0 && rsiVal <= 68.0) bullishScore += 2;
  else if (rsiVal >= 32.0 && rsiVal <= 48.0) bearishScore += 2;
  else if (rsiVal > 70.0) bearishScore += 1;
  else if (rsiVal < 30.0) bullishScore += 1;

  if (macdHist > 0) bullishScore += 2; else bearishScore += 2;
  if (momentumUp) bullishScore += 1; else bearishScore += 1;

  const totalPoints = 9;
  const maxPoints = Math.max(bullishScore, bearishScore);

  let side: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let confidence = 0;
  let reason = '';

  if (bullishScore >= 7 && rsiVal <= 72.0) {
    side = 'BUY';
    confidence = Math.min(88, Math.max(65, Math.round((bullishScore / totalPoints) * 100)));
    reason = `Konfluensi Bullish: Struktur EMA bertingkat naik (EMA9 > EMA21 > EMA50), momentum RSI (${rsiVal.toFixed(1)}) sehat, dan histogram MACD positif.`;
  } else if (bearishScore >= 7 && rsiVal >= 28.0) {
    side = 'SELL';
    confidence = Math.min(88, Math.max(65, Math.round((bearishScore / totalPoints) * 100)));
    reason = `Konfluensi Bearish: Struktur EMA bertingkat turun (EMA9 < EMA21 < EMA50), momentum RSI (${rsiVal.toFixed(1)}) melemah, dan histogram MACD negatif.`;
  } else {
    side = 'WAIT';
    confidence = Math.min(50, Math.max(20, Math.round((maxPoints / totalPoints) * 50)));
    if (rsiVal > 72.0) {
      reason = `Kondisi pasar Overbought jenuh beli (RSI ${rsiVal.toFixed(1)}). Menunggu pullback atau pembentukan base baru.`;
    } else if (rsiVal < 28.0) {
      reason = `Kondisi pasar Oversold jenuh jual (RSI ${rsiVal.toFixed(1)}). Menunggu konfirmasi pantulan harga sebelum entri.`;
    } else if (Math.abs(bullishScore - bearishScore) <= 2) {
      reason = 'Indikator saling bertentangan (Tren dan Momentum tidak searah). Pasar dalam kondisi konsolidasi (Chop/Ranging).';
    } else {
      reason = `Konfluensi belum mencapai ambang batas minimum keamanan entri (Skor: ${maxPoints}/${totalPoints}). Disarankan menunggu konfirmasi candle berikutnya.`;
    }
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;

  const rsiSeries: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < 14) rsiSeries.push(50);
    else rsiSeries.push(rsi(closes.slice(0, i + 1), 14));
  }

  const dataStatus: DataStatus = instrument.isDelayed ? 'DELAYED' : 'VALID';

  return {
    signal: {
      side,
      price: recent,
      change24h,
      volume: totalVolume,
      rsi: rsiVal,
      emaFast: ema9,
      emaMid: ema21,
      emaSlow: ema50,
      macd: macdHist,
      macdLine,
      signalLine,
      atr14,
      reason,
      confidenceScore: confidence,
      dataStatus,
      time: timeStr,
      timestamp: Date.now(),
      symbol: instrument.symbol,
      frame,
      provider: providerName
    },
    indicatorData: {
      candles,
      ema9Series,
      ema21Series,
      ema50Series,
      rsiSeries,
      macdHistSeries
    }
  };
}

export async function fetchMarketCandles(
  instrument: AssetInstrument,
  interval: string,
  twelveDataKey: string = ''
): Promise<{ candles: Candle[]; providerName: string }> {
  if (instrument.category === 'CRYPTO') {
    const encodedSymbol = encodeURIComponent(instrument.symbol);
    const encodedInterval = encodeURIComponent(interval);

    const mirrors = [
      `/api/klines?symbol=${encodedSymbol}&interval=${encodedInterval}&limit=250`,
      `https://api.binance.com/api/v3/klines?symbol=${encodedSymbol}&interval=${encodedInterval}&limit=250`,
      `https://data-api.binance.vision/api/v3/klines?symbol=${encodedSymbol}&interval=${encodedInterval}&limit=250`,
      `https://api1.binance.com/api/v3/klines?symbol=${encodedSymbol}&interval=${encodedInterval}&limit=250`
    ];

    let lastErr: any = null;
    for (const url of mirrors) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const rawData = await res.json();
          if (Array.isArray(rawData) && rawData.length >= 60) {
            const candles: Candle[] = rawData.map((row: any[]) => ({
              time: Number(row[0]),
              open: parseFloat(row[1]),
              high: parseFloat(row[2]),
              low: parseFloat(row[3]),
              close: parseFloat(row[4]),
              volume: parseFloat(row[5])
            }));
            // Drop forming candle per Binance spec
            return { candles: candles.slice(0, -1), providerName: 'Binance Spot Engine' };
          }
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(lastErr?.message || 'Gagal memuat data dari Binance. Periksa koneksi internet atau gunakan mirror.');
  }

  // Non-crypto (Forex, Stocks, Commodities, Indices via Twelve Data)
  if (!twelveDataKey) {
    throw new Error(`Diperlukan API key Twelve Data untuk mengakses ${instrument.name} (${instrument.symbol}). Masukkan di menu Pengaturan.`);
  }

  const tdInterval = interval === '1d' ? '1day' : interval.endsWith('m') ? `${interval.replace('m', '')}min` : interval;
  const proxyUrl = `/api/twelvedata?symbol=${encodeURIComponent(instrument.symbol)}&interval=${tdInterval}&outputsize=150&apikey=${encodeURIComponent(twelveDataKey)}`;
  const directUrl = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(instrument.symbol)}&interval=${tdInterval}&outputsize=150&apikey=${encodeURIComponent(twelveDataKey)}`;

  let json: any = null;
  let lastErr: any = null;

  for (const url of [proxyUrl, directUrl]) {
    try {
      const res = await fetch(url);
      json = await res.json();
      if (json.status === 'error') {
        throw new Error(json.message || 'Twelve Data error');
      }
      if (json.values && Array.isArray(json.values)) {
        break;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  if (!json || !json.values || json.values.length < 30) {
    throw new Error(lastErr?.message || 'Data pasar tidak ditemukan atau kuota API terlampaui.');
  }

  const candles: Candle[] = json.values.map((v: any) => ({
    time: new Date(v.datetime).getTime() || Date.now(),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: parseFloat(v.volume || '0')
  }));

  // Reverse so oldest is first
  candles.reverse();
  return { candles: candles.slice(0, -1), providerName: 'Twelve Data' };
}
