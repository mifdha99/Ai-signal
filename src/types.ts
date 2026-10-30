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

export type DataStatus = 'LIVE' | 'VALID' | 'DELAYED' | 'STALE' | 'INCOMPLETE' | 'FAILED';

export interface TradePlan {
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: string;
  riskDistance: number;
  precision: number;
  formattedEntry: string;
  formattedSl: string;
  formattedTp1: string;
  formattedTp2: string;
  formattedTp3: string;
}

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
  tradePlan?: TradePlan | null;
}

export interface IndicatorData {
  candles: Candle[];
  ema9Series: number[];
  ema21Series: number[];
  ema50Series: number[];
  rsiSeries: number[];
  macdHistSeries: number[];
}
