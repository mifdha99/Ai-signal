import { 
  NewsItem, 
  ImpactLevel, 
  SentimentRating, 
  AssetCategory, 
  EconomicEvent, 
  FundamentalProfile, 
  UnifiedConfluenceBreakdown, 
  SignalResult, 
  TradePlan 
} from '../types';

// Credibility weight table for news sources
export const SOURCE_CREDIBILITY: Record<string, number> = {
  'Bloomberg': 1.0,
  'Reuters': 1.0,
  'Financial Times': 0.95,
  'Wall Street Journal': 0.95,
  'CNBC': 0.85,
  'CoinDesk': 0.85,
  'Cointelegraph': 0.80,
  'The Block': 0.85,
  'Decrypt': 0.80,
  'ForexLive': 0.85,
  'DailyFX': 0.85,
  'Yahoo Finance': 0.80,
  'MarketWatch': 0.80,
  'FXStreet': 0.80,
  'Federal Reserve': 1.0,
  'ECB': 1.0,
  'Bank of Japan': 1.0
};

// Bullish & Bearish keyword lexicons
const BULLISH_KEYWORDS = [
  'surge', 'jump', 'rally', 'breakout', 'soar', 'gain', 'outperform',
  'bullish', 'rate cut', 'easing', 'dovish', 'stimulus', 'inflow', 'etf approved',
  'record high', 'adoption', 'all-time high', 'expansion', 'beat expectations',
  'strong earnings', 'upgrade', 'profit rises', 'inflation cools', 'disinflation',
  'reserve accumulation', 'rate pause', 'institutional buying'
];

const BEARISH_KEYWORDS = [
  'plunge', 'crash', 'tumble', 'slump', 'drop', 'fall', 'selloff',
  'bearish', 'rate hike', 'hawkish', 'tightening', 'liquidation', 'outflow',
  'lawsuit', 'crackdown', 'recession', 'miss expectations', 'downgrade',
  'inflation surges', 'war', 'escalation', 'conflict', 'tariff', 'sanctions',
  'bank failure', 'default', 'sec charges', 'regulatory investigation', 'curb'
];

const CRITICAL_KEYWORDS = [
  'emergency rate', 'war declared', 'invasion', 'sec rejects', 'bank run',
  'default imminent', 'all-out war', 'debt default', 'black swan'
];

const HIGH_IMPACT_KEYWORDS = [
  'fomc', 'federal reserve', 'cpi', 'inflation', 'non-farm payrolls', 'nfp',
  'interest rate', 'rate decision', 'ecb', 'bank of japan', 'opec',
  'geopolitical', 'sec', 'etf', 'halving', 'gdp', 'tariff', 'treasury yield'
];

/**
 * Calculates raw sentiment score (-100 to +100) based on headline, summary, and target instrument
 */
export function analyzeNewsSentiment(
  title: string,
  summary: string = '',
  symbol: string = '',
  category: AssetCategory = 'CRYPTO'
): { score: number; rating: SentimentRating; impact: ImpactLevel } {
  const text = `${title} ${summary}`.toLowerCase();

  let bullPoints = 0;
  let bearPoints = 0;

  BULLISH_KEYWORDS.forEach((kw) => {
    if (text.includes(kw)) bullPoints += 15;
  });

  BEARISH_KEYWORDS.forEach((kw) => {
    if (text.includes(kw)) bearPoints += 15;
  });

  // Context-specific nuances:
  // e.g., "Fed rate hike" or "Strong Dollar" is BEARISH for EUR/USD, GBP/USD, and Gold (XAU/USD)
  if (symbol.includes('USD') || symbol === 'XAU/USD') {
    if (text.includes('strong dollar') || text.includes('dollar surges') || text.includes('yields climb')) {
      if (symbol !== 'USD/JPY' && symbol !== 'USD/CHF' && symbol !== 'USD/CAD') {
        bearPoints += 25; // Bearish for EUR/USD, GBP/USD, XAU/USD
      } else {
        bullPoints += 25; // Bullish for USD/JPY
      }
    }
    if (text.includes('weak dollar') || text.includes('dollar drops') || text.includes('rate cut')) {
      if (symbol !== 'USD/JPY' && symbol !== 'USD/CHF' && symbol !== 'USD/CAD') {
        bullPoints += 25; // Bullish for EUR/USD, XAU/USD
      } else {
        bearPoints += 25;
      }
    }
  }

  // Determine Impact Level
  let impact: ImpactLevel = 'LOW';
  if (CRITICAL_KEYWORDS.some((kw) => text.includes(kw))) {
    impact = 'CRITICAL';
  } else if (HIGH_IMPACT_KEYWORDS.some((kw) => text.includes(kw))) {
    impact = 'HIGH';
  } else if (bullPoints + bearPoints > 20) {
    impact = 'MEDIUM';
  }

  // Calculate Net Score (-100 to +100)
  const net = bullPoints - bearPoints;
  const rawScore = Math.max(-100, Math.min(100, net * 2));

  let rating: SentimentRating = 'NEUTRAL';
  if (rawScore >= 80) rating = 'STRONGLY_BULLISH';
  else if (rawScore >= 40) rating = 'BULLISH';
  else if (rawScore <= -80) rating = 'STRONGLY_BEARISH';
  else if (rawScore <= -40) rating = 'BEARISH';
  else rating = 'NEUTRAL';

  return { score: rawScore, rating, impact };
}

/**
 * Calculates exponential time decay for news influence
 * News loses ~50% weight after 6 hours
 */
export function calculateTimeDecay(publishedAt: number): number {
  const ageHours = Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60));
  const halfLifeHours = 6.0;
  return Math.exp(-Math.LN2 * (ageHours / halfLifeHours));
}

/**
 * Unified Decision Engine: Fuses Technical, News, Fundamentals, and Market Conditions
 */
export function computeUnifiedDecision(
  baseSignal: SignalResult,
  newsList: NewsItem[],
  economicEvents: EconomicEvent[],
  fundamentalProfile?: FundamentalProfile | null
): {
  finalSide: 'BUY' | 'SELL' | 'WAIT';
  finalConfidence: number;
  unifiedConfluence: UnifiedConfluenceBreakdown;
  unifiedReason: string;
  relevantNews: NewsItem[];
  nearbyEvents: EconomicEvent[];
} {
  const currentSymbol = baseSignal.symbol;
  const now = Date.now();

  // 1. Technical Score (-100 to +100)
  let technicalScore = 0;
  if (baseSignal.side === 'BUY') {
    technicalScore = Math.min(100, Math.max(50, baseSignal.confidenceScore));
  } else if (baseSignal.side === 'SELL') {
    technicalScore = -Math.min(100, Math.max(50, baseSignal.confidenceScore));
  }

  // 2. Filter news relevant to instrument or its asset category
  const relevantNews = newsList.filter((item) => {
    const isDirectMatch = item.affectedInstruments.some((inst) => 
      inst.toLowerCase() === currentSymbol.toLowerCase() || 
      currentSymbol.toLowerCase().includes(inst.toLowerCase())
    );
    const isGeneralMacro = item.category === 'FOREX' && (currentSymbol.includes('/') || currentSymbol === 'XAU/USD');
    const isCryptoMacro = item.category === 'CRYPTO' && currentSymbol.endsWith('USDT');
    return isDirectMatch || isGeneralMacro || isCryptoMacro;
  }).slice(0, 8);

  // Calculate Weighted News Sentiment Score
  let newsWeightedSum = 0;
  let newsWeightTotal = 0;

  relevantNews.forEach((news) => {
    const decay = calculateTimeDecay(news.publishedAt);
    const cred = news.sourceWeight || 0.8;
    const impactMult = news.impact === 'CRITICAL' ? 2.0 : news.impact === 'HIGH' ? 1.5 : news.impact === 'MEDIUM' ? 1.0 : 0.6;
    const w = decay * cred * impactMult;

    newsWeightedSum += news.sentimentScore * w;
    newsWeightTotal += w;
  });

  const newsScore = newsWeightTotal > 0 ? Math.round(newsWeightedSum / newsWeightTotal) : 0;

  // 3. Fundamental Profile Score
  const fundamentalScore = fundamentalProfile ? fundamentalProfile.sentimentScore : 0;

  // 4. Check for High-Impact Economic Event Window (±30 minutes of release)
  let highImpactNewsActive = false;
  let activeEventName: string | undefined = undefined;

  const nearbyEvents = economicEvents.filter((event) => {
    const diffMinutes = (event.scheduledTime - now) / (1000 * 60);
    const isRelevantToSymbol = event.affectedSymbols.length === 0 || 
      event.affectedSymbols.some((s) => currentSymbol.includes(s) || s === currentSymbol);

    const isInWindow = diffMinutes >= -30 && diffMinutes <= 45; // 45m before or 30m after
    if (isInWindow && (event.impact === 'HIGH' || event.impact === 'CRITICAL') && isRelevantToSymbol) {
      highImpactNewsActive = true;
      activeEventName = `${event.currency} ${event.event} (${diffMinutes > 0 ? `dalam ${Math.round(diffMinutes)}m` : `baru saja dirilis`})`;
    }
    return Math.abs(diffMinutes) <= 24 * 60; // within 24 hours
  });

  // 5. Market Condition Score (penalized during high impact release)
  const marketConditionScore = highImpactNewsActive ? -80 : 20;

  // 6. Confluence Weights
  const wTech = 0.40;
  const wNews = 0.30;
  const wFund = 0.20;
  const wCond = 0.10;

  const compositeScore = Math.round(
    technicalScore * wTech +
    newsScore * wNews +
    fundamentalScore * wFund +
    marketConditionScore * wCond
  );

  // 7. Conflict Analysis
  let isConflict = false;
  let conflictReason = '';

  // Case A: High-impact release window active
  if (highImpactNewsActive) {
    isConflict = true;
    conflictReason = `Jendela rilis rilis data ekonomi berdampak tinggi aktif: ${activeEventName}. Pasar rentan terhadap lonjakan spread, slippage, dan fakeout. Wajib WAIT.`;
  }
  // Case B: Technical Bullish but News/Fundamentals Bearish
  else if (baseSignal.side === 'BUY' && (newsScore <= -35 || fundamentalScore <= -40)) {
    isConflict = true;
    conflictReason = `Konflik Makro & Teknikal: Indikator teknikal mengindikasikan BUY, namun sentimen berita/fundamental tertekan (${newsScore < 0 ? `Sentimen Berita: ${newsScore}` : ''} ${fundamentalScore < 0 ? `Macro Fundamental: ${fundamentalScore}` : ''}). Risiko whipsaw tinggi.`;
  }
  // Case C: Technical Bearish but News/Fundamentals Bullish
  else if (baseSignal.side === 'SELL' && (newsScore >= 35 || fundamentalScore >= 40)) {
    isConflict = true;
    conflictReason = `Konflik Makro & Teknikal: Indikator teknikal mengindikasikan SELL, namun dorongan berita/fundamental positif (${newsScore > 0 ? `Sentimen Berita: +${newsScore}` : ''} ${fundamentalScore > 0 ? `Macro Fundamental: +${fundamentalScore}` : ''}). Risiko short squeeze tinggi.`;
  }

  // 8. Final Decision Synthesis
  let finalSide: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let finalConfidence = 0;
  let unifiedReason = '';

  if (isConflict) {
    finalSide = 'WAIT';
    finalConfidence = Math.max(15, 50 - Math.abs(compositeScore) / 4);
    unifiedReason = conflictReason;
  } else if (baseSignal.side === 'BUY' && compositeScore >= 30) {
    finalSide = 'BUY';
    // Boost confidence if news & fundamentals strongly agree
    const agreementBonus = (newsScore > 30 ? 6 : 0) + (fundamentalScore > 20 ? 5 : 0);
    finalConfidence = Math.min(96, Math.max(68, baseSignal.confidenceScore + agreementBonus));
    unifiedReason = `Konfluensi Terpadu Bullish (Skor Komposit: +${compositeScore}): Struktur teknikal terkonfirmasi dengan sentimen berita positif (${newsScore > 0 ? `+${newsScore}` : '0'}) dan kestabilan fundamental.`;
  } else if (baseSignal.side === 'SELL' && compositeScore <= -30) {
    finalSide = 'SELL';
    const agreementBonus = (newsScore < -30 ? 6 : 0) + (fundamentalScore < -20 ? 5 : 0);
    finalConfidence = Math.min(96, Math.max(68, baseSignal.confidenceScore + agreementBonus));
    unifiedReason = `Konfluensi Terpadu Bearish (Skor Komposit: ${compositeScore}): Struktur teknikal terkonfirmasi dengan tekanan berita negatif (${newsScore}) dan resistensi fundamental.`;
  } else {
    finalSide = 'WAIT';
    finalConfidence = Math.min(45, Math.max(20, Math.abs(compositeScore)));
    unifiedReason = baseSignal.reason || 'Kombinasi skor teknikal dan sentimen belum mencapai threshold konfluensi 4-pilar minimum.';
  }

  const unifiedConfluence: UnifiedConfluenceBreakdown = {
    technicalScore,
    technicalWeight: wTech,
    newsScore,
    newsWeight: wNews,
    fundamentalScore,
    fundamentalWeight: wFund,
    marketConditionScore,
    marketConditionWeight: wCond,
    compositeScore,
    isConflictDetected: isConflict,
    conflictReason: isConflict ? conflictReason : undefined,
    highImpactNewsActive,
    activeHighImpactEvent: activeEventName
  };

  return {
    finalSide,
    finalConfidence,
    unifiedConfluence,
    unifiedReason,
    relevantNews,
    nearbyEvents
  };
}
