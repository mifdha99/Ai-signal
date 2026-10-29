export type AssetCategory = 'CRYPTO' | 'FOREX' | 'STOCKS' | 'COMMODITIES' | 'INDICES';

export interface AssetInstrument {
  symbol: string;
  name: string;
  category: AssetCategory;
  primaryProvider: string;
  requiresApiKey: boolean;
  isDelayed: boolean;
  description: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type DataStatus = 'VALID' | 'DELAYED' | 'INCOMPLETE' | 'FAILED';

export interface SignalResult {
  side: 'BUY' | 'SELL' | 'WAIT';
  price: number;
  change24h: number;
  volume: number;
  rsi: number;
  emaFast: number; // EMA 9
  emaMid: number;  // EMA 21
  emaSlow: number; // EMA 50
  macd: number;
  macdLine: number;
  signalLine: number;
  atr14: number;
  reason: string;
  confidenceScore: number; // 0 - 100%
  dataStatus: DataStatus;
  time: string;
  timestamp: number;
  symbol: string;
  frame: string;
  provider: string;
}

export interface IndicatorData {
  candles: Candle[];
  ema9Series: number[];
  ema21Series: number[];
  ema50Series: number[];
  rsiSeries: number[];
  macdHistSeries: number[];
}
