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

export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SentimentRating = 
  | 'STRONGLY_BULLISH' 
  | 'BULLISH' 
  | 'NEUTRAL' 
  | 'BEARISH' 
  | 'STRONGLY_BEARISH';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceWeight: number; // 0.0 to 1.0 (credibility)
  publishedAt: number; // timestamp ms
  receivedAt: number; // timestamp ms
  category: AssetCategory;
  impact: ImpactLevel;
  sentimentScore: number; // -100 to +100
  sentimentRating: SentimentRating;
  affectedInstruments: string[];
  relevance: number; // 0.0 to 1.0
  isStale: boolean;
  url?: string;
  tags?: string[];
}

export interface EconomicEvent {
  id: string;
  event: string;
  currency: string;
  country: string;
  impact: ImpactLevel;
  scheduledTime: number; // timestamp ms
  previous: string;
  forecast: string;
  actual: string | null;
  status: 'UPCOMING' | 'ACTIVE' | 'RELEASED';
  marketImplication: string;
  affectedSymbols: string[];
}

export interface FundamentalProfile {
  symbol: string;
  category: AssetCategory;
  sentimentScore: number; // -100 to +100
  macroRegime: string; // e.g. "Fed Restrictive / ECB Easing"
  keyDrivers: string[];
  riskFactors: string[];
  upcomingCatalysts: string[];
  updatedAt: number;
}

export interface UnifiedConfluenceBreakdown {
  technicalScore: number; // -100 to +100 (-100 bearish, +100 bullish)
  technicalWeight: number; // e.g. 0.40
  newsScore: number; // -100 to +100
  newsWeight: number; // e.g. 0.30
  fundamentalScore: number; // -100 to +100
  fundamentalWeight: number; // e.g. 0.20
  marketConditionScore: number; // -100 to +100
  marketConditionWeight: number; // e.g. 0.10
  compositeScore: number; // -100 to +100
  isConflictDetected: boolean;
  conflictReason?: string;
  highImpactNewsActive: boolean;
  activeHighImpactEvent?: string;
}

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
  // Universal News & Fundamental Intelligence Engine Integration
  unifiedConfluence?: UnifiedConfluenceBreakdown;
  sentimentScore?: number; // -100 to +100
  sentimentRating?: SentimentRating;
  relevantNews?: NewsItem[];
  nearbyEconomicEvents?: EconomicEvent[];
}

export interface IndicatorData {
  candles: Candle[];
  ema9Series: number[];
  ema21Series: number[];
  ema50Series: number[];
  rsiSeries: number[];
  macdHistSeries: number[];
  newsMarkers?: Array<{
    time: number;
    title: string;
    impact: ImpactLevel;
    sentimentScore: number;
  }>;
}

export interface BacktestEvaluation {
  period: string;
  totalSignals: number;
  withNewsFilter: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    expectancyR: number;
    avoidedWhipsaws: number;
  };
  withoutNewsFilter: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    expectancyR: number;
  };
  keyTakeaway: string;
}
