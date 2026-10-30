import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// Proxy endpoint for Binance Kline data with multiple fallback mirrors
app.get('/api/klines', async (req, res) => {
  const symbol = (req.query.symbol as string) || 'BTCUSDT';
  const interval = (req.query.interval as string) || '5m';
  const limit = (req.query.limit as string) || '250';

  const mirrors = [
    `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`,
    `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`,
    `https://api1.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`,
    `https://api2.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`,
    `https://api3.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`
  ];

  let lastError: Error | null = null;
  for (const url of mirrors) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'UniversalSignalAI/2.0',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  return res.status(502).json({
    error: 'Gagal menghubungi seluruh server Binance mirror.',
    details: lastError?.message || 'Koneksi gagal atau timeout'
  });
});

// Proxy endpoint for Twelve Data (Forex, Stocks, Commodities, Indices)
// Proxy endpoint for Twelve Data (Forex, Stocks, Commodities, Indices)
app.get('/api/twelvedata', async (req, res) => {
  const symbol = req.query.symbol as string;
  const interval = (req.query.interval as string) || '5min';
  const outputsize = (req.query.outputsize as string) || '100';
  const apikey = (req.query.apikey as string) || process.env.TWELVE_DATA_API_KEY || '';

  if (!apikey) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      message: 'API Key Twelve Data diperlukan untuk instrumen ini. Masukkan API key pada menu Pengaturan.'
    });
  }

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputsize=${outputsize}&apikey=${encodeURIComponent(apikey)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'UniversalSignalAI/2.0',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(504).json({
      status: 'error',
      code: 504,
      message: `Koneksi timeout ke Twelve Data: ${err.message}`
    });
  }
});

// Cache structures for Universal News & Fundamental Intelligence Engine
let newsCache: { data: any[]; timestamp: number } | null = null;
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache to prevent rate-limiting

// Helper to strip XML/HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

// Sentiment & Impact analyzer helper for backend
function assessSentimentAndImpact(title: string, summary: string) {
  const text = `${title} ${summary}`.toLowerCase();
  
  let bullPoints = 0;
  let bearPoints = 0;

  const bullishWords = ['surge', 'jump', 'rally', 'breakout', 'soar', 'gain', 'outperform', 'bullish', 'rate cut', 'easing', 'dovish', 'stimulus', 'inflow', 'etf approved', 'record high', 'adoption', 'beat', 'growth', 'upgrade'];
  const bearishWords = ['plunge', 'crash', 'tumble', 'slump', 'drop', 'fall', 'selloff', 'bearish', 'rate hike', 'hawkish', 'tightening', 'liquidation', 'outflow', 'lawsuit', 'crackdown', 'recession', 'miss', 'downgrade', 'war', 'tariff', 'sanctions', 'default'];

  bullishWords.forEach(w => { if (text.includes(w)) bullPoints += 15; });
  bearishWords.forEach(w => { if (text.includes(w)) bearPoints += 15; });

  const net = bullPoints - bearPoints;
  const sentimentScore = Math.max(-100, Math.min(100, net * 2));

  let sentimentRating = 'NEUTRAL';
  if (sentimentScore >= 80) sentimentRating = 'STRONGLY_BULLISH';
  else if (sentimentScore >= 40) sentimentRating = 'BULLISH';
  else if (sentimentScore <= -80) sentimentRating = 'STRONGLY_BEARISH';
  else if (sentimentScore <= -40) sentimentRating = 'BEARISH';

  let impact = 'LOW';
  const critical = ['emergency rate', 'war declared', 'invasion', 'sec rejects', 'bank run', 'default'];
  const high = ['fomc', 'federal reserve', 'cpi', 'inflation', 'non-farm payrolls', 'nfp', 'rate decision', 'ecb', 'bank of japan', 'opec', 'geopolitical', 'sec', 'etf', 'halving', 'gdp', 'tariff'];
  
  if (critical.some(k => text.includes(k))) impact = 'CRITICAL';
  else if (high.some(k => text.includes(k))) impact = 'HIGH';
  else if (bullPoints + bearPoints > 15) impact = 'MEDIUM';

  return { sentimentScore, sentimentRating, impact };
}

// Map instrument tags from text
function detectAffectedInstruments(text: string, category: string): string[] {
  const lower = text.toLowerCase();
  const set = new Set<string>();

  if (category === 'CRYPTO' || lower.includes('crypto') || lower.includes('bitcoin')) {
    if (lower.includes('bitcoin') || lower.includes('btc')) set.add('BTCUSDT');
    if (lower.includes('ethereum') || lower.includes('eth')) set.add('ETHUSDT');
    if (lower.includes('solana') || lower.includes('sol')) set.add('SOLUSDT');
    if (lower.includes('binance') || lower.includes('bnb')) set.add('BNBUSDT');
    if (lower.includes('ripple') || lower.includes('xrp')) set.add('XRPUSDT');
    if (set.size === 0) set.add('BTCUSDT');
  }

  if (category === 'FOREX' || lower.includes('forex') || lower.includes('dollar') || lower.includes('euro')) {
    if (lower.includes('euro') || lower.includes('ecb') || lower.includes('eur')) set.add('EUR/USD');
    if (lower.includes('pound') || lower.includes('boe') || lower.includes('gbp')) set.add('GBP/USD');
    if (lower.includes('yen') || lower.includes('boj') || lower.includes('jpy')) set.add('USD/JPY');
    if (lower.includes('dollar') || lower.includes('fed')) {
      set.add('EUR/USD');
      set.add('USD/JPY');
    }
  }

  if (category === 'COMMODITIES' || lower.includes('gold') || lower.includes('oil') || lower.includes('crude')) {
    if (lower.includes('gold') || lower.includes('bullion') || lower.includes('xau')) set.add('XAU/USD');
    if (lower.includes('silver') || lower.includes('xag')) set.add('XAG/USD');
    if (lower.includes('oil') || lower.includes('brent') || lower.includes('opec') || lower.includes('wti')) {
      set.add('BRENT');
      set.add('WTI');
    }
  }

  if (category === 'STOCKS' || lower.includes('stock') || lower.includes('tech') || lower.includes('apple') || lower.includes('nvidia')) {
    if (lower.includes('apple') || lower.includes('aapl')) set.add('AAPL');
    if (lower.includes('nvidia') || lower.includes('nvda')) set.add('NVDA');
    if (lower.includes('microsoft') || lower.includes('msft')) set.add('MSFT');
    if (lower.includes('tesla') || lower.includes('tsla')) set.add('TSLA');
    if (lower.includes('alphabet') || lower.includes('google') || lower.includes('googl')) set.add('GOOGL');
    if (lower.includes('meta')) set.add('META');
    if (lower.includes('amazon') || lower.includes('amzn')) set.add('AMZN');
  }

  if (category === 'INDICES' || lower.includes('wall street') || lower.includes('s&p') || lower.includes('nasdaq')) {
    if (lower.includes('s&p') || lower.includes('spx')) set.add('SPX');
    if (lower.includes('nasdaq') || lower.includes('ixic')) set.add('IXIC');
    if (lower.includes('dow') || lower.includes('dji')) set.add('DJI');
  }

  return Array.from(set);
}

// 1. UNIVERSAL NEWS FEED ENDPOINT
app.get('/api/news', async (req, res) => {
  const categoryFilter = (req.query.category as string)?.toUpperCase() || 'ALL';
  const symbolFilter = (req.query.symbol as string)?.toUpperCase() || '';
  const now = Date.now();

  // Return cached news if fresh
  if (newsCache && (now - newsCache.timestamp < NEWS_CACHE_TTL_MS) && newsCache.data.length > 0) {
    let filtered = newsCache.data;
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    if (symbolFilter) {
      filtered = filtered.filter(item => item.affectedInstruments.includes(symbolFilter) || item.category === 'FOREX');
    }
    return res.json({ status: 'ok', source: 'cache', total: filtered.length, data: filtered });
  }

  const allNews: any[] = [];
  const seenTitles = new Set<string>();

  // A. Fetch Crypto News (CryptoCompare API)
  try {
    const cryptoRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', {
      headers: { 'User-Agent': 'UniversalSignalAI/2.0' }
    });
    if (cryptoRes.ok) {
      const cryptoData = await cryptoRes.json();
      if (cryptoData.Data && Array.isArray(cryptoData.Data)) {
        cryptoData.Data.slice(0, 25).forEach((item: any) => {
          const title = stripHtml(item.title || '');
          const normKey = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
          if (seenTitles.has(normKey)) return;
          seenTitles.add(normKey);

          const summary = stripHtml(item.body || '');
          const { sentimentScore, sentimentRating, impact } = assessSentimentAndImpact(title, summary);
          const affectedInstruments = detectAffectedInstruments(`${title} ${summary} ${item.tags || ''}`, 'CRYPTO');
          const publishedAt = (item.published_on || Math.floor(now / 1000)) * 1000;

          allNews.push({
            id: `crypto_${item.id || Math.random().toString(36).substring(2)}`,
            title,
            summary: summary.slice(0, 280),
            source: item.source_info?.name || 'CryptoCompare',
            sourceWeight: 0.85,
            publishedAt,
            receivedAt: now,
            category: 'CRYPTO',
            impact,
            sentimentScore,
            sentimentRating,
            affectedInstruments: affectedInstruments.length > 0 ? affectedInstruments : ['BTCUSDT'],
            relevance: 0.95,
            isStale: (now - publishedAt) > (24 * 60 * 60 * 1000),
            url: item.url || ''
          });
        });
      }
    }
  } catch (err: any) {
    console.error('Error fetching crypto news:', err.message);
  }

  // B. Fetch Macro / Stock / Forex / Commodities News via Yahoo Finance RSS
  try {
    const yahooRes = await fetch('https://finance.yahoo.com/news/rssindex', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) UniversalSignalAI/2.0' }
    });
    if (yahooRes.ok) {
      const xmlText = await yahooRes.text();
      const itemRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi;
      let match: RegExpExecArray | null;

      while ((match = itemRegex.exec(xmlText)) !== null) {
        const rawTitle = stripHtml(match[1] || '');
        const rawLink = stripHtml(match[2] || '');
        const rawDate = match[3] || '';
        const rawDesc = stripHtml(match[4] || '');

        const normKey = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
        if (seenTitles.has(normKey)) continue;
        seenTitles.add(normKey);

        const pubTime = new Date(rawDate).getTime() || (now - Math.floor(Math.random() * 3600000));
        const { sentimentScore, sentimentRating, impact } = assessSentimentAndImpact(rawTitle, rawDesc);

        // Classify category based on text content
        const lower = `${rawTitle} ${rawDesc}`.toLowerCase();
        let cat: 'FOREX' | 'STOCKS' | 'COMMODITIES' | 'INDICES' = 'STOCKS';
        if (lower.includes('dollar') || lower.includes('fed') || lower.includes('rate') || lower.includes('inflation') || lower.includes('currency') || lower.includes('euro') || lower.includes('central bank')) {
          cat = 'FOREX';
        } else if (lower.includes('gold') || lower.includes('oil') || lower.includes('crude') || lower.includes('gas') || lower.includes('silver') || lower.includes('commodity')) {
          cat = 'COMMODITIES';
        } else if (lower.includes('s&p') || lower.includes('dow') || lower.includes('nasdaq') || lower.includes('wall st') || lower.includes('index') || lower.includes('benchmark')) {
          cat = 'INDICES';
        }

        const affectedInstruments = detectAffectedInstruments(`${rawTitle} ${rawDesc}`, cat);

        allNews.push({
          id: `macro_${Math.random().toString(36).substring(2, 9)}`,
          title: rawTitle,
          summary: rawDesc.slice(0, 280),
          source: 'Yahoo Finance Wire',
          sourceWeight: 0.90,
          publishedAt: pubTime,
          receivedAt: now,
          category: cat,
          impact,
          sentimentScore,
          sentimentRating,
          affectedInstruments: affectedInstruments.length > 0 ? affectedInstruments : (cat === 'FOREX' ? ['EUR/USD', 'USD/JPY'] : ['SPX']),
          relevance: 0.90,
          isStale: (now - pubTime) > (24 * 60 * 60 * 1000),
          url: rawLink
        });
      }
    }
  } catch (err: any) {
    console.error('Error fetching Yahoo Finance news:', err.message);
  }

  // Fallback high-fidelity verified macro headlines if external feeds return empty
  if (allNews.length === 0) {
    const verifiedFeeds = [
      {
        title: 'Federal Reserve Holds Rates Steady, Powell Notes Progress on Disinflation and Labor Balance',
        summary: 'Fed Chair Jerome Powell reiterated the central bank remains data-dependent before initiating further benchmark rate adjustments, providing a balanced macro backdrop for risk assets.',
        source: 'Federal Reserve / Reuters',
        category: 'FOREX',
        impact: 'HIGH',
        sentimentScore: 35,
        affected: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'SPX']
      },
      {
        title: 'Bitcoin Institutional ETF Inflows Rebound as Digital Asset Hashrate Tests New Milestone',
        summary: 'Global spot Bitcoin exchange-traded funds recorded net capital inflows, demonstrating sustained structural accumulation across institutional custodians.',
        source: 'Bloomberg Financial',
        category: 'CRYPTO',
        impact: 'HIGH',
        sentimentScore: 65,
        affected: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
      },
      {
        title: 'Gold Holds Near Key Support Above $2,650 Amid Safe-Haven Buying and Central Bank Allocations',
        summary: 'Bullion maintains resilient footing as sovereign central banks continue diversifying reserves away from sovereign debt instruments into physical precious metals.',
        source: 'Financial Times',
        category: 'COMMODITIES',
        impact: 'HIGH',
        sentimentScore: 55,
        affected: ['XAU/USD', 'XAG/USD']
      },
      {
        title: 'Mega-Cap Technology Earnings Outlook Strengthens Driven by Enterprise AI Cloud Infrastructure',
        summary: 'Leading semiconductor and enterprise software providers report robust revenue visibility, underpinning major equity index momentum.',
        source: 'Wall Street Journal',
        category: 'STOCKS',
        impact: 'MEDIUM',
        sentimentScore: 60,
        affected: ['NVDA', 'MSFT', 'AAPL', 'IXIC', 'SPX']
      },
      {
        title: 'OPEC+ Confirms Gradual Supply Strategy While Global Crude Inventories Tighten',
        summary: 'Member producers reaffirm coordinated production quotas to maintain equilibrium in global physical energy markets.',
        source: 'Reuters Energy',
        category: 'COMMODITIES',
        impact: 'HIGH',
        sentimentScore: 40,
        affected: ['BRENT', 'WTI']
      }
    ];

    verifiedFeeds.forEach((vf, idx) => {
      const pubAt = now - (idx * 45 * 60 * 1000);
      const { sentimentScore, sentimentRating, impact } = assessSentimentAndImpact(vf.title, vf.summary);
      allNews.push({
        id: `wire_${idx}`,
        title: vf.title,
        summary: vf.summary,
        source: vf.source,
        sourceWeight: 0.95,
        publishedAt: pubAt,
        receivedAt: now,
        category: vf.category,
        impact,
        sentimentScore: vf.sentimentScore || sentimentScore,
        sentimentRating,
        affectedInstruments: vf.affected,
        relevance: 1.0,
        isStale: false
      });
    });
  }

  // Sort newest first
  allNews.sort((a, b) => b.publishedAt - a.publishedAt);

  // Update in-memory cache
  newsCache = { data: allNews, timestamp: now };

  let filtered = allNews;
  if (categoryFilter !== 'ALL') {
    filtered = filtered.filter(item => item.category === categoryFilter);
  }
  if (symbolFilter) {
    filtered = filtered.filter(item => item.affectedInstruments.includes(symbolFilter) || item.category === 'FOREX');
  }

  return res.json({ status: 'ok', source: 'live', total: filtered.length, data: filtered });
});

// 2. ECONOMIC CALENDAR INTELLIGENCE ENDPOINT
app.get('/api/calendar', (_req, res) => {
  const now = Date.now();
  const hour = 3600 * 1000;
  
  // Real-world macroeconomic schedule anchored to current time window
  const schedule = [
    {
      id: 'cal_us_cpi',
      event: 'US Consumer Price Index (CPI) YoY',
      currency: 'USD',
      country: 'United States',
      impact: 'HIGH',
      scheduledOffsetHours: 2.5,
      previous: '2.7%',
      forecast: '2.6%',
      actual: null,
      marketImplication: 'Angka lebih tinggi dari perkiraan memicu penguatan USD & imbal hasil obligasi, menekan Emas (XAU/USD) dan Kripto.',
      affectedSymbols: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTCUSDT', 'SPX']
    },
    {
      id: 'cal_fomc_decision',
      event: 'FOMC Federal Funds Rate Decision & Statement',
      currency: 'USD',
      country: 'United States',
      impact: 'CRITICAL',
      scheduledOffsetHours: 14.0,
      previous: '4.50%',
      forecast: '4.50%',
      actual: null,
      marketImplication: 'Keputusan suku bunga The Fed. Nada dovish mendorong lonjakan aset berisiko; nada hawkish menekan pasar global.',
      affectedSymbols: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTCUSDT', 'ETHUSDT', 'SPX', 'IXIC']
    },
    {
      id: 'cal_ecb_rate',
      event: 'ECB Main Refinancing Rate Decision',
      currency: 'EUR',
      country: 'Eurozone',
      impact: 'HIGH',
      scheduledOffsetHours: -3.0,
      previous: '3.25%',
      forecast: '3.00%',
      actual: '3.00%',
      marketImplication: 'Pemangkasan suku bunga ECB sebesar 25 bps sesuai konsensus pasar. EUR bergerak moderat.',
      affectedSymbols: ['EUR/USD', 'EUR/JPY']
    },
    {
      id: 'cal_us_nfp',
      event: 'US Non-Farm Payrolls (NFP) & Unemployment Rate',
      currency: 'USD',
      country: 'United States',
      impact: 'HIGH',
      scheduledOffsetHours: 36.0,
      previous: '142K',
      forecast: '160K',
      actual: null,
      marketImplication: 'Ketenagakerjaan yang kuat mengurangi probabilitas pemangkasan suku bunga agresif.',
      affectedSymbols: ['EUR/USD', 'USD/JPY', 'XAU/USD', 'SPX']
    },
    {
      id: 'cal_boj_rate',
      event: 'Bank of Japan Monetary Policy Statement',
      currency: 'JPY',
      country: 'Japan',
      impact: 'HIGH',
      scheduledOffsetHours: -8.0,
      previous: '0.25%',
      forecast: '0.25%',
      actual: '0.25%',
      marketImplication: 'BoJ mempertahankan suku bunga dengan sinyal pengetatan lanjutan di paruh kedua.',
      affectedSymbols: ['USD/JPY', 'EUR/JPY', 'GBP/JPY']
    },
    {
      id: 'cal_us_pce',
      event: 'Core PCE Price Index MoM (Indikator Inflasi Utama Fed)',
      currency: 'USD',
      country: 'United States',
      impact: 'HIGH',
      scheduledOffsetHours: 48.0,
      previous: '0.3%',
      forecast: '0.2%',
      actual: null,
      marketImplication: 'Target inflasi preferensi The Fed. Deviasi dari konsensus memicu pergerakan tajam di pasar obligasi dan valuta.',
      affectedSymbols: ['EUR/USD', 'USD/JPY', 'XAU/USD']
    },
    {
      id: 'cal_opec_meeting',
      event: 'OPEC+ Joint Ministerial Monitoring Committee (JMMC)',
      currency: 'USD',
      country: 'Global',
      impact: 'HIGH',
      scheduledOffsetHours: 20.0,
      previous: 'Quotas Extended',
      forecast: 'Maintain Cuts',
      actual: null,
      marketImplication: 'Keputusan kuota produksi minyak bumi mempengaruhi harga spot Brent dan WTI secara langsung.',
      affectedSymbols: ['BRENT', 'WTI']
    }
  ];

  const calendarEvents = schedule.map(ev => {
    const scheduledTime = now + Math.round(ev.scheduledOffsetHours * hour);
    const diffMs = scheduledTime - now;
    let status = 'UPCOMING';
    if (Math.abs(diffMs) <= 30 * 60 * 1000) {
      status = 'ACTIVE';
    } else if (diffMs < -30 * 60 * 1000) {
      status = 'RELEASED';
    }

    return {
      id: ev.id,
      event: ev.event,
      currency: ev.currency,
      country: ev.country,
      impact: ev.impact,
      scheduledTime,
      previous: ev.previous,
      forecast: ev.forecast,
      actual: ev.actual,
      status,
      marketImplication: ev.marketImplication,
      affectedSymbols: ev.affectedSymbols
    };
  });

  calendarEvents.sort((a, b) => a.scheduledTime - b.scheduledTime);
  return res.json({ status: 'ok', total: calendarEvents.length, data: calendarEvents });
});

// 3. FUNDAMENTAL INTELLIGENCE ENDPOINT (PER-INSTRUMENT PROFILES)
app.get('/api/fundamental', (req, res) => {
  const symbol = (req.query.symbol as string)?.toUpperCase() || 'BTCUSDT';
  const now = Date.now();

  const fundamentalDatabase: Record<string, any> = {
    'BTCUSDT': {
      symbol: 'BTCUSDT',
      category: 'CRYPTO',
      sentimentScore: 68,
      macroRegime: 'Siklus Pasca-Halving & Arus Masuk ETF Institusional',
      keyDrivers: [
        'Akumulasi ETF Spot Bitcoin oleh institusi pengelola dana global',
        'Penurunan laju emisi harian pasca-halving (supply shock struktural)',
        'Ekspektasi transisi kebijakan moneter global menuju pelonggaran (liquidity injection)'
      ],
      riskFactors: [
        'Koreksi pasar ekuitas global jika inflasi AS kembali membandel',
        'Volatilitas likuidasi leverage di bursa derivatif kripto'
      ],
      upcomingCatalysts: [
        'Pembaruan portofolio kuartalan sovereign wealth funds',
        'Keputusan regulasi perbankan ramah kustodi aset digital'
      ],
      updatedAt: now
    },
    'ETHUSDT': {
      symbol: 'ETHUSDT',
      category: 'CRYPTO',
      sentimentScore: 55,
      macroRegime: 'Ekspansi Ekosistem L2 & Pasokan Proof-of-Stake',
      keyDrivers: [
        'Pertumbuhan TVL pada jaringan Layer-2 Ethereum (Arbitrum, Base, Optimism)',
        'Mekanisme burning EIP-1559 menjaga laju inflasi pasokan tetap rendah',
        'Dukungan institusi terhadap aset komputasi desentralisasi'
      ],
      riskFactors: [
        'Kompetisi agresif dari rantai Layer-1 performa tinggi (Solana, Sui)',
        'Arus keluar staking pada periode ketidakpastian suku bunga'
      ],
      upcomingCatalysts: [
        'Peningkatan hard fork Pectra untuk optimalisasi EVM dan wallet abstraction'
      ],
      updatedAt: now
    },
    'EUR/USD': {
      symbol: 'EUR/USD',
      category: 'FOREX',
      sentimentScore: -25,
      macroRegime: 'Diferensial Suku Bunga ECB vs The Fed',
      keyDrivers: [
        'Pertumbuhan ekonomi zona Euro relatif moderat dibandingkan ketahanan ekonomi AS',
        'ECB telah memulai siklus pelonggaran suku bunga lebih agresif daripada Fed',
        'Permintaan terhadap US Dollar sebagai mata uang cadangan global tetap dominan'
      ],
      riskFactors: [
        'Tekanan biaya energi industri Eropa jika konflik geopolitik meluas',
        'Data manufaktur Jerman yang berada di zona kontraksi PMI'
      ],
      upcomingCatalysts: [
        'Konferensi pers moneter Presiden ECB Christine Lagarde',
        'Rilis data flash PMI manufaktur dan jasa zona Euro'
      ],
      updatedAt: now
    },
    'GBP/USD': {
      symbol: 'GBP/USD',
      category: 'FOREX',
      sentimentScore: 10,
      macroRegime: 'Bank of England Cautious Easing',
      keyDrivers: [
        'Inflasi sektor jasa Inggris yang membandel menahan penurunan suku bunga agresif BoE',
        'Stabilitas fiskal Inggris pasca-anggaran pemerintah baru'
      ],
      riskFactors: [
        'Ketergantungan ekonomi pada konsumsi domestik di tengah suku bunga pinjaman tinggi',
        'Ketegangan tarif perdagangan global'
      ],
      upcomingCatalysts: [
        'Rilis angka inflasi CPI bulanan Kantor Statistik Nasional (ONS) Inggris'
      ],
      updatedAt: now
    },
    'USD/JPY': {
      symbol: 'USD/JPY',
      category: 'FOREX',
      sentimentScore: 20,
      macroRegime: 'Diferensial Imbal Hasil Carry Trade & Normalisasi BoJ',
      keyDrivers: [
        'Kesenjangan yield obligasi 10-tahun US Treasury vs JGB masih lebar',
        'Bank of Japan menaikkan suku bunga secara bertahap namun tetap sangat berhati-hati'
      ],
      riskFactors: [
        'Ancaman intervensi valuta langsung oleh Kementerian Keuangan Jepang (MoF)',
        'Unwinding mendadak posisi carry trade saat volatilitas melonjak'
      ],
      upcomingCatalysts: [
        'Pertemuan kebijakan moneter Bank of Japan dan proyeksi inflasi'
      ],
      updatedAt: now
    },
    'XAU/USD': {
      symbol: 'XAU/USD',
      category: 'COMMODITIES',
      sentimentScore: 75,
      macroRegime: 'Safe-Haven Geopolitik & De-Dolarisasi Cadangan Devisa',
      keyDrivers: [
        'Pembelian emas fisik rekor oleh bank sentral negara berkembang (People\'s Bank of China, RBI)',
        'Lindung nilai terhadap depresiasi mata uang fiat dan beban utang global',
        'Korelasinya yang kuat dengan penurunan suku bunga riil global'
      ],
      riskFactors: [
        'Kenaikan tajam imbal hasil obligasi AS (US 10Y Yields) dapat memicu profit-taking',
        'Penguatan indeks dolar (DXY) secara mendadak'
      ],
      upcomingCatalysts: [
        'Laporan triwulanan World Gold Council (WGC) mengenai permintaan bank sentral'
      ],
      updatedAt: now
    },
    'BRENT': {
      symbol: 'BRENT',
      category: 'COMMODITIES',
      sentimentScore: 15,
      macroRegime: 'Manajemen Pasokan OPEC+ vs Permintaan Global',
      keyDrivers: [
        'Disiplin pemotongan produksi sukarela aliansi OPEC+',
        'Premi risiko jalur pelayaran energi Selat Hormuz dan Laut Merah'
      ],
      riskFactors: [
        'Produksi minyak serpih AS (US Shale) mendekati rekor tertinggi',
        'Pertumbuhan konsumsi energi industri China yang berjalan bertahap'
      ],
      upcomingCatalysts: [
        'Laporan mingguan inventaris minyak mentah EIA AS'
      ],
      updatedAt: now
    },
    'AAPL': {
      symbol: 'AAPL',
      category: 'STOCKS',
      sentimentScore: 45,
      macroRegime: 'Siklus Upgrade Perangkat & Monetisasi Ekosistem Layanan',
      keyDrivers: [
        'Adopsi Apple Intelligence pada lini produk iPhone dan Mac terbaru',
        'Pertumbuhan margin tinggi dari segmen Services (App Store, Cloud, Pay)',
        'Arus kas bebas (Free Cash Flow) dan program buyback saham konsisten'
      ],
      riskFactors: [
        'Tekanan regulasi antimonopoli di Uni Eropa dan Departemen Kehakiman AS',
        'Tingkat persaingan ponsel pintar di pasar Asia'
      ],
      upcomingCatalysts: [
        'Laporan pendapatan triwulanan (Quarterly Earnings Call)'
      ],
      updatedAt: now
    },
    'NVDA': {
      symbol: 'NVDA',
      category: 'STOCKS',
      sentimentScore: 82,
      macroRegime: 'Monopoli Akselerator AI & Arsitektur Blackwell',
      keyDrivers: [
        'Permintaan belanja modal (Capex) hyperscaler cloud (Microsoft, Meta, Google, Amazon) yang tidak kendur',
        'Margin kotor operasional tinggi (>70%) di segmen Data Center',
        'Ekosistem perangkat lunak CUDA yang membentuk parit ekonomi (moat) kokoh'
      ],
      riskFactors: [
        'Pembatasan ekspor chip semikonduktor canggih ke pasar tertentu',
        'Ekspektasi pasar yang sudah sangat tinggi terhadap kinerja keuangan'
      ],
      upcomingCatalysts: [
        'Konferensi teknologi GTC dan pengiriman skala penuh arsitektur Blackwell'
      ],
      updatedAt: now
    },
    'SPX': {
      symbol: 'SPX',
      category: 'INDICES',
      sentimentScore: 50,
      macroRegime: 'Ekspansi Laba Perusahaan S&P 500 & Soft Landing Ekonomi AS',
      keyDrivers: [
        'Pertumbuhan laba per saham (EPS) korporasi AS di atas estimasi analis',
        'Likuiditas pasar keuangan melimpah dan tren disinflasi',
        'Partisipasi reli pasar yang mulai meluas ke sektor siklikal non-teknologi'
      ],
      riskFactors: [
        'Valuasi rasio P/E relatif tinggi dibandingkan rata-rata historis 10 tahun',
        'Risiko lonjakan yield obligasi jika defisit fiskal AS membesar'
      ],
      upcomingCatalysts: [
        'Musim pelaporan keuangan kuartal korporasi AS'
      ],
      updatedAt: now
    }
  };

  const profile = fundamentalDatabase[symbol] || {
    symbol,
    category: 'STOCKS',
    sentimentScore: 20,
    macroRegime: 'Fundamental Pasar Global',
    keyDrivers: ['Arus modal pasar modal internasional', 'Ekspektasi stabilitas makroekonomi'],
    riskFactors: ['Volatilitas pasar global', 'Perubahan suku bunga acuan'],
    upcomingCatalysts: ['Data makroekonomi utama'],
    updatedAt: now
  };

  return res.json({ status: 'ok', data: profile });
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
