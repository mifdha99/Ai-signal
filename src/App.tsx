import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  PauseCircle,
  Activity, 
  RefreshCw, 
  Clock, 
  BarChart2, 
  AlertTriangle, 
  Search,
  Star,
  Settings,
  Volume2, 
  VolumeX, 
  History, 
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
  Key,
  Info,
  Newspaper,
  Calendar,
  BarChart3,
  Layers,
  Radio
} from 'lucide-react';
import { 
  Candle, 
  SignalResult, 
  IndicatorData, 
  AssetInstrument, 
  AssetCategory,
  NewsItem,
  EconomicEvent,
  FundamentalProfile,
  UnifiedConfluenceBreakdown
} from './types';
import { fetchMarketCandles, analyzeCandles, calculateTradePlan } from './utils/indicators';
import { computeUnifiedDecision } from './utils/newsEngine';
import { PriceChart } from './components/PriceChart';
import { TradePlanCard } from './components/TradePlanCard';
import { NewsDashboard } from './components/NewsDashboard';
import { EconomicCalendarWidget } from './components/EconomicCalendarWidget';
import { NewsAlertBanner } from './components/NewsAlertBanner';
import { EvaluationBacktestPanel } from './components/EvaluationBacktestPanel';

const INSTRUMENTS: AssetInstrument[] = [
  // CRYPTO (Binance)
  { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'ETHUSDT', name: 'Ethereum', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'BNBUSDT', name: 'BNB', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'SOLUSDT', name: 'Solana', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'XRPUSDT', name: 'XRP', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'ADAUSDT', name: 'Cardano', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'TRXUSDT', name: 'TRON', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'LINKUSDT', name: 'Chainlink', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'DOTUSDT', name: 'Polkadot', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'LTCUSDT', name: 'Litecoin', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'BCHUSDT', name: 'Bitcoin Cash', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'SUIUSDT', name: 'Sui', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },
  { symbol: 'TONUSDT', name: 'Toncoin', category: 'CRYPTO', primaryProvider: 'Binance', requiresApiKey: false, isDelayed: false, description: 'Spot Market' },

  // FOREX (Twelve Data)
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'FOREX', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Forex Spot' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'FOREX', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Forex Spot' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'FOREX', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Forex Spot' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', category: 'FOREX', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Forex Spot' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', category: 'FOREX', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Forex Spot' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', category: 'FOREX', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Forex Spot' },
  { symbol: 'NZD/USD', name: 'NZ Dollar / US Dollar', category: 'FOREX', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Forex Spot' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', category: 'FOREX', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Forex Spot' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', category: 'FOREX', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Forex Spot' },

  // STOCKS (Twelve Data)
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'STOCKS', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'NASDAQ (15m Delayed)' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'STOCKS', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'NASDAQ (15m Delayed)' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'STOCKS', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'NASDAQ (15m Delayed)' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'STOCKS', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'NASDAQ (15m Delayed)' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'STOCKS', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'NASDAQ (15m Delayed)' },
  { symbol: 'META', name: 'Meta Platforms Inc.', category: 'STOCKS', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'NASDAQ (15m Delayed)' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'STOCKS', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'NASDAQ (15m Delayed)' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'STOCKS', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'NASDAQ (15m Delayed)' },

  // COMMODITIES (Twelve Data)
  { symbol: 'XAU/USD', name: 'Gold Spot (Emas)', category: 'COMMODITIES', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Logam Mulia' },
  { symbol: 'XAG/USD', name: 'Silver Spot (Perak)', category: 'COMMODITIES', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Logam Mulia' },
  { symbol: 'BRENT', name: 'Brent Crude Oil', category: 'COMMODITIES', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Komoditas Energi' },
  { symbol: 'WTI', name: 'WTI Crude Oil', category: 'COMMODITIES', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Komoditas Energi' },

  // INDICES (Twelve Data)
  { symbol: 'SPX', name: 'S&P 500 Index', category: 'INDICES', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Indeks Pasar AS' },
  { symbol: 'DJI', name: 'Dow Jones Industrial', category: 'INDICES', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Indeks Pasar AS' },
  { symbol: 'IXIC', name: 'Nasdaq Composite', category: 'INDICES', primaryProvider: 'Twelve Data', requiresApiKey: true, isDelayed: true, description: 'Indeks Pasar AS' }
];

const CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: 'CRYPTO', label: 'Kripto' },
  { id: 'FOREX', label: 'Forex' },
  { id: 'STOCKS', label: 'Saham' },
  { id: 'COMMODITIES', label: 'Komoditas' },
  { id: 'INDICES', label: 'Indeks' }
];

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'];

export default function App() {
  const [category, setCategory] = useState<AssetCategory>('CRYPTO');
  const [instrument, setInstrument] = useState<AssetInstrument>(INSTRUMENTS[0]);
  const [frame, setFrame] = useState<string>('5m');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('universal_signal_favorites');
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'EUR/USD', 'AAPL', 'XAU/USD'];
    } catch {
      return ['BTCUSDT', 'ETHUSDT'];
    }
  });

  const [twelveDataKey, setTwelveDataKey] = useState<string>(() => {
    try {
      return localStorage.getItem('twelve_data_api_key') || '';
    } catch {
      return '';
    }
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SignalResult | null>(null);
  const [indicatorData, setIndicatorData] = useState<IndicatorData | null>(null);
  const [error, setError] = useState<string>('');
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string>('');

  // Universal News & Fundamental Intelligence Engine State
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<EconomicEvent[]>([]);
  const [fundamentalProfile, setFundamentalProfile] = useState<FundamentalProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'SIGNAL' | 'NEWS' | 'CALENDAR' | 'EVALUATION'>('SIGNAL');
  const [newsAlertDismissed, setNewsAlertDismissed] = useState<boolean>(false);
  
  const [showChart, setShowChart] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true); // Rule 1: Aktif secara default
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15); // Rule 2: 15 detik
  const [backoffSeconds, setBackoffSeconds] = useState<number>(0);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);

  const [history, setHistory] = useState<SignalResult[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>(twelveDataKey);

  // Tab visibility listener (Rule 13: jeda saat background, lanjutkan saat aktif)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch News, Economic Calendar, and Instrument Fundamental Profile
  const fetchMacroData = useCallback(async (sym: string) => {
    try {
      // 1. Fetch News
      const newsPromise = fetch(`/api/news?symbol=${encodeURIComponent(sym)}`)
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json && json.data) setNewsList(json.data);
        })
        .catch(() => {});

      // 2. Fetch Calendar
      const calPromise = fetch('/api/calendar')
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json && json.data) setCalendarEvents(json.data);
        })
        .catch(() => {});

      // 3. Fetch Fundamental Profile
      const fundPromise = fetch(`/api/fundamental?symbol=${encodeURIComponent(sym)}`)
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json && json.data) setFundamentalProfile(json.data);
        })
        .catch(() => {});

      await Promise.all([newsPromise, calPromise, fundPromise]);
    } catch {}
  }, []);

  // Initial and instrument switch macro data fetch
  useEffect(() => {
    fetchMacroData(instrument.symbol);
    setNewsAlertDismissed(false);
  }, [instrument.symbol, fetchMacroData]);

  // Periodic background refresh for news & calendar (every 3 minutes, separate from 15s price refresh)
  useEffect(() => {
    const macroInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMacroData(instrument.symbol);
      }
    }, 180000);
    return () => clearInterval(macroInterval);
  }, [instrument.symbol, fetchMacroData]);

  const filteredInstruments = useMemo(() => {
    return INSTRUMENTS.filter((item) => {
      const matchesCategory = item.category === category;
      const matchesSearch = searchQuery.trim() === '' || 
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, searchQuery]);

  const toggleFavorite = (sym: string) => {
    setFavorites((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym];
      try {
        localStorage.setItem('universal_signal_favorites', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const playSignalSound = useCallback((side: 'BUY' | 'SELL' | 'WAIT') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const freq = side === 'BUY' ? 587.33 : side === 'SELL' ? 369.99 : 440.0;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(side === 'BUY' ? 880 : side === 'SELL' ? 261.63 : 440.0, ctx.currentTime + 0.28);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {}
  }, [soundEnabled]);

  const handleAnalyze = useCallback(async (isAuto: boolean = false) => {
    if (loading) return; // Rule 10: Jangan jalankan permintaan baru jika sebelumnya belum selesai
    setLoading(true);
    if (!isAuto) {
      setError('');
      setWarningMessage('');
    }

    try {
      const { candles, providerName } = await fetchMarketCandles(instrument, frame, twelveDataKey);
      const { signal: baseSignal, indicatorData: indData } = analyzeCandles(candles, instrument, frame, providerName);
      
      // UNIVERSAL NEWS & FUNDAMENTAL INTELLIGENCE SYNTHESIS
      const unified = computeUnifiedDecision(baseSignal, newsList, calendarEvents, fundamentalProfile);

      // Overwrite / enrich signal with unified confluence
      const finalSignal: SignalResult = {
        ...baseSignal,
        side: unified.finalSide,
        confidenceScore: unified.finalConfidence,
        reason: unified.unifiedReason,
        unifiedConfluence: unified.unifiedConfluence,
        sentimentScore: unified.unifiedConfluence.newsScore,
        relevantNews: unified.relevantNews,
        nearbyEconomicEvents: unified.nearbyEvents,
        tradePlan: (unified.finalSide === 'BUY' || unified.finalSide === 'SELL') 
          ? calculateTradePlan(unified.finalSide, baseSignal.price, baseSignal.atr14, candles, instrument.symbol)
          : null
      };

      // Populate news markers for MT5 Candlestick Chart
      indData.newsMarkers = newsList.map(n => ({
        time: n.publishedAt,
        title: n.title,
        impact: n.impact,
        sentimentScore: n.sentimentScore
      }));

      setResult(finalSignal);
      setIndicatorData(indData);
      setUpdatedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setHistory((prev) => [finalSignal, ...prev.slice(0, 19)]);
      setError('');
      setWarningMessage('');
      setBackoffSeconds(0);
      setSecondsRemaining(15);
      playSignalSound(finalSignal.side);
    } catch (e: any) {
      const errMsg = e?.message || 'Data tidak berhasil diambil. Periksa koneksi internet atau coba lagi.';
      const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit');
      if (isRateLimit) {
        setBackoffSeconds(30);
      }

      // Rule 9: Pertahankan hasil terakhir jika API gagal
      if (result) {
        setWarningMessage(isRateLimit 
          ? 'Rate limit provider terlampaui. Auto-refresh dijeda 30 detik. Menampilkan analisis terakhir.'
          : `Pembaruan otomatis gagal: ${errMsg}. Menampilkan data analisis sebelumnya.`
        );
      } else {
        setError(errMsg);
      }
      setSecondsRemaining(15);
    } finally {
      setLoading(false);
    }
  }, [instrument, frame, twelveDataKey, loading, result, playSignalSound, newsList, calendarEvents, fundamentalProfile]);

  useEffect(() => {
    setSecondsRemaining(15);
    setBackoffSeconds(0);
    handleAnalyze(false);
  }, [instrument, frame]);

  // 15-second Auto-refresh countdown loop
  useEffect(() => {
    if (!autoRefresh || !isTabVisible) return;

    const interval = setInterval(() => {
      setBackoffSeconds((b) => {
        if (b > 0) return b - 1;
        setSecondsRemaining((sec) => {
          if (sec <= 1) {
            handleAnalyze(true);
            return 15;
          }
          return sec - 1;
        });
        return 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, isTabVisible, handleAnalyze]);

  const isBuy = result?.side === 'BUY';
  const isSell = result?.side === 'SELL';
  const isWait = result?.side === 'WAIT';

  return (
    <div className="min-h-screen bg-[#0B1020] text-slate-100 flex flex-col items-center py-6 px-4 selection:bg-blue-600 selection:text-white">
      {/* Top Bar with quick controls */}
      <div className="w-full max-w-xl flex items-center justify-between text-xs text-[#9CAAC2] mb-3 px-1">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#27D69B] animate-pulse"></span>
          <span>{instrument.category === 'CRYPTO' ? 'Binance Spot Engine' : 'Twelve Data Multi-Asset Engine'}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${
              autoRefresh 
                ? 'bg-blue-500/20 text-[#69A7FF] border-blue-500/40' 
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Auto refresh setiap 15 detik"
          >
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>15s: {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Pengaturan API Key"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {history.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1 hover:text-white transition-colors"
              title="Lihat riwayat sinyal sesi ini"
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat ({history.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <main className="w-full max-w-xl flex flex-col items-center">
        {/* Title */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#69A7FF] text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Universal News, Fundamental & Technical Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            Universal Signal AI
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-[#9CAAC2] uppercase mt-1">
            Konfluensi 4 Pilar • Sinyal Teknikal, Berita & Fundamental Makro
          </p>
        </div>

        {/* Top Feature Navigation Tabs */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-[#151D30] rounded-2xl border border-slate-800/80 mb-3 text-xs font-bold shadow-lg">
          <button
            onClick={() => setActiveTab('SIGNAL')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'SIGNAL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Sinyal & MT5</span>
          </button>

          <button
            onClick={() => setActiveTab('NEWS')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'NEWS'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>News & Sentimen</span>
            {newsList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-900 text-blue-200">
                {newsList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'CALENDAR'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalender</span>
          </button>

          <button
            onClick={() => setActiveTab('EVALUATION')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'EVALUATION'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Backtest</span>
          </button>
        </div>

        {/* Real-Time News & Conflict Alert Banner */}
        {!newsAlertDismissed && result?.unifiedConfluence && (
          <NewsAlertBanner
            confluence={result.unifiedConfluence}
            onDismiss={() => setNewsAlertDismissed(true)}
          />
        )}

        {/* TAB 1: SIGNAL & MT5 CHART VIEW */}
        {activeTab === 'SIGNAL' && (
          <>
            {/* Auto-Refresh Status & Control Bar */}
            <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-3.5 mb-3 shadow-lg flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  !isTabVisible
                    ? 'bg-amber-400'
                    : backoffSeconds > 0
                    ? 'bg-amber-500 animate-pulse'
                    : autoRefresh
                    ? 'bg-[#27D69B] animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              <span className={`text-xs font-bold tracking-wide ${autoRefresh && isTabVisible ? 'text-white' : 'text-[#9CAAC2]'}`}>
                {!isTabVisible
                  ? 'AUTO-REFRESH DIJEDA (TAB BACKGROUND)'
                  : backoffSeconds > 0
                  ? `RATE LIMIT BACKOFF (${backoffSeconds}s)`
                  : autoRefresh
                  ? 'AUTO-REFRESH AKTIF (15s)'
                  : 'AUTO-REFRESH NONAKTIF'}
              </span>
            </div>
            {updatedAt && (
              <span className="text-[10px] text-[#9CAAC2] mt-0.5 ml-4.5">
                Pembaruan terakhir: {updatedAt}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {autoRefresh && isTabVisible && backoffSeconds === 0 && (
              <span className="text-xs font-mono font-black text-[#69A7FF] bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-lg">
                {secondsRemaining}s
              </span>
            )}
            <button
              onClick={() => {
                const nextState = !autoRefresh;
                setAutoRefresh(nextState);
                if (nextState) {
                  setSecondsRemaining(15);
                  setBackoffSeconds(0);
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                autoRefresh ? 'bg-[#27D69B]' : 'bg-slate-700'
              }`}
              title={autoRefresh ? 'Nonaktifkan Auto-Refresh' : 'Aktifkan Auto-Refresh (15s)'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[#07101F] transition-transform ${
                  autoRefresh ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Retained Data Warning (When auto-refresh fails but last analysis is kept) */}
        {warningMessage && (
          <div className="w-full bg-[#332612] border border-amber-500/30 rounded-2xl p-3.5 mb-3 text-xs text-amber-200 shadow-lg flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-amber-200/90">{warningMessage}</p>
          </div>
        )}

        {/* Category Tabs */}
        <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                const first = INSTRUMENTS.find((i) => i.category === cat.id);
                if (first) setInstrument(first);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                category === cat.id
                  ? 'bg-[#69A7FF] text-[#07101F] border-[#69A7FF] shadow-md shadow-blue-500/20'
                  : 'bg-[#151D30] text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Configuration Card */}
        <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-5 shadow-2xl mb-4">
          {/* Search bar & quick select */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#9CAAC2]">
                Pilih Instrumen {CATEGORIES.find((c) => c.id === category)?.label}
              </label>
              <span className="text-[11px] text-slate-500">
                {instrument.isDelayed ? 'Delayed 15m' : 'Real-time'}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari simbol atau nama instrumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 text-white text-xs pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar mb-2">
              {filteredInstruments.map((item) => {
                const isSelected = item.symbol === instrument.symbol;
                const isFav = favorites.includes(item.symbol);
                return (
                  <div
                    key={item.symbol}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 text-[#69A7FF] border-[#69A7FF]/50 shadow-sm'
                        : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                    onClick={() => {
                      setInstrument(item);
                      setResult(null);
                      setError('');
                    }}
                  >
                    <span>{item.symbol}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.symbol);
                      }}
                      className="text-slate-500 hover:text-amber-400 transition-colors"
                    >
                      <Star className={`w-3 h-3 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeframe Chips */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#9CAAC2]">
                Timeframe
              </label>
              <span className="text-[11px] text-slate-500">Interval Candle</span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
              {TIMEFRAMES.map((tf) => {
                const isSupported = category === 'CRYPTO' || tf !== '3m';
                return (
                  <button
                    key={tf}
                    disabled={!isSupported}
                    onClick={() => {
                      setFrame(tf);
                      setResult(null);
                      setError('');
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                      !isSupported
                        ? 'opacity-30 cursor-not-allowed bg-slate-900 text-slate-600 border-slate-800'
                        : frame === tf
                          ? 'bg-blue-500 text-[#07101F] font-bold border-blue-400 shadow-md'
                          : 'bg-slate-900/50 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                    title={!isSupported ? 'Timeframe 3m tidak didukung oleh Twelve Data free' : ''}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => handleAnalyze(false)}
            disabled={loading}
            className={`w-full h-13 rounded-xl font-extrabold text-sm tracking-wide uppercase transition-all shadow-lg flex items-center justify-center gap-2 ${
              loading
                ? 'bg-[#69A7FF]/70 text-[#07101F] cursor-wait'
                : 'bg-[#69A7FF] hover:bg-blue-400 text-[#07101F] active:scale-[0.99] shadow-blue-500/20'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#07101F]" />
                <span>MENGANALISIS DATA PASAR...</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                <span>ANALISIS SEKARANG</span>
              </>
            )}
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="w-full bg-[#151D30]/80 border border-slate-800 rounded-2xl p-6 text-center mb-4">
            <div className="w-9 h-9 border-3 border-blue-500/20 border-t-[#69A7FF] rounded-full animate-spin mx-auto mb-2.5"></div>
            <p className="text-xs font-medium text-[#9CAAC2]">
              Mengambil candle historis dari {instrument.primaryProvider} dan menghitung konfluensi teknikal…
            </p>
          </div>
        )}

        {/* Error Notification with Granular Explanation */}
        {error && (
          <div className="w-full bg-[#3A1B2A] border border-rose-900/60 rounded-2xl p-4 mb-4 text-xs text-rose-200 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-white block mb-1">Pemberitahuan Provider / Jaringan:</span>
                <p className="leading-relaxed text-rose-200/90">{error}</p>
                {error.includes('Twelve Data') && (
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="mt-2.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5 text-rose-300" />
                    <span>Buka Pengaturan API Key</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analysis Result */}
        {result && (
          <div className="w-full space-y-4 mb-4">
            {/* Big Signal Card */}
            <div
              className={`w-full rounded-2xl p-5 border transition-all shadow-2xl relative overflow-hidden ${
                isBuy
                  ? 'bg-gradient-to-b from-[#103B35] to-[#0A2622] border-emerald-500/40'
                  : isSell
                    ? 'bg-gradient-to-b from-[#421F2B] to-[#2B141C] border-rose-500/40'
                    : 'bg-gradient-to-b from-[#2D2615] to-[#1C170B] border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                <span className="font-bold uppercase tracking-wider text-[#9CAAC2]">
                  HASIL EVALUASI KONFLUENSI
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  result.dataStatus === 'VALID' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                }`}>
                  {result.dataStatus === 'VALID' ? 'REALTIME' : 'DELAYED 15M'}
                </span>
              </div>

              <div className="flex flex-col items-center text-center my-3">
                <div className="flex items-center gap-3">
                  {isBuy && <TrendingUp className="w-10 h-10 text-[#27D69B]" />}
                  {isSell && <TrendingDown className="w-10 h-10 text-[#FF5D70]" />}
                  {isWait && <PauseCircle className="w-10 h-10 text-[#F59E0B]" />}
                  <span
                    className={`text-5xl font-black tracking-tight ${
                      isBuy ? 'text-[#27D69B]' : isSell ? 'text-[#FF5D70]' : 'text-[#F59E0B]'
                    }`}
                  >
                    {result.side}
                  </span>
                </div>

                <div className="mt-1 text-sm font-bold text-white">
                  {result.symbol} • {result.frame} ({instrument.name})
                </div>

                <div className="mt-2 text-base font-mono font-bold text-slate-100">
                  ${result.price >= 100 ? result.price.toFixed(2) : result.price >= 1 ? result.price.toFixed(4) : result.price.toFixed(6)}
                  {result.change24h !== 0 && (
                    <span className={`text-xs ml-2 ${result.change24h >= 0 ? 'text-[#27D69B]' : 'text-[#FF5D70]'}`}>
                      {result.change24h >= 0 ? '+' : ''}{result.change24h.toFixed(2)}%
                    </span>
                  )}
                </div>

                {result.confidenceScore > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-[#9CAAC2]">Tingkat Keyakinan Konfluensi:</span>
                    <span className={`font-black ${isBuy ? 'text-[#27D69B]' : isSell ? 'text-[#FF5D70]' : 'text-[#F59E0B]'}`}>
                      {result.confidenceScore}%
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 text-[11px] text-[#9CAAC2] flex items-center justify-between">
                <span>Sumber: {result.provider}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {result.time}
                </span>
              </div>
            </div>

            {/* 4-PILLAR UNIFIED CONFLUENCE BREAKDOWN CARD */}
            {result.unifiedConfluence && (
              <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Konfluensi 4 Pilar: Teknikal, Berita & Makro
                    </h3>
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                    result.unifiedConfluence.isConflictDetected 
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/40' 
                      : result.unifiedConfluence.compositeScore >= 30 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                      : result.unifiedConfluence.compositeScore <= -30 
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/40' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    Skor Komposit: {result.unifiedConfluence.compositeScore > 0 ? `+${result.unifiedConfluence.compositeScore}` : result.unifiedConfluence.compositeScore}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  {/* Pilar 1: Teknikal */}
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">1. Teknikal (40%)</span>
                    <strong className={`text-sm block mt-0.5 ${
                      result.unifiedConfluence.technicalScore > 0 ? 'text-[#27D69B]' : result.unifiedConfluence.technicalScore < 0 ? 'text-[#FF5D70]' : 'text-slate-400'
                    }`}>
                      {result.unifiedConfluence.technicalScore > 0 ? `+${result.unifiedConfluence.technicalScore}` : result.unifiedConfluence.technicalScore}
                    </strong>
                    <span className="text-[10px] text-slate-500">EMA, RSI, MACD</span>
                  </div>

                  {/* Pilar 2: Berita */}
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">2. Berita (30%)</span>
                    <strong className={`text-sm block mt-0.5 ${
                      result.unifiedConfluence.newsScore > 0 ? 'text-[#27D69B]' : result.unifiedConfluence.newsScore < 0 ? 'text-[#FF5D70]' : 'text-slate-400'
                    }`}>
                      {result.unifiedConfluence.newsScore > 0 ? `+${result.unifiedConfluence.newsScore}` : result.unifiedConfluence.newsScore}
                    </strong>
                    <span className="text-[10px] text-slate-500">Sentimen Berita</span>
                  </div>

                  {/* Pilar 3: Fundamental */}
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">3. Makro (20%)</span>
                    <strong className={`text-sm block mt-0.5 ${
                      result.unifiedConfluence.fundamentalScore > 0 ? 'text-[#27D69B]' : result.unifiedConfluence.fundamentalScore < 0 ? 'text-[#FF5D70]' : 'text-slate-400'
                    }`}>
                      {result.unifiedConfluence.fundamentalScore > 0 ? `+${result.unifiedConfluence.fundamentalScore}` : result.unifiedConfluence.fundamentalScore}
                    </strong>
                    <span className="text-[10px] text-slate-500">Kebijakan Moneter</span>
                  </div>

                  {/* Pilar 4: Jendela Risiko */}
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">4. Risiko (10%)</span>
                    <strong className={`text-sm block mt-0.5 ${
                      result.unifiedConfluence.highImpactNewsActive ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {result.unifiedConfluence.highImpactNewsActive ? 'HIGH IMPACT' : 'STABIL'}
                    </strong>
                    <span className="text-[10px] text-slate-500">Jendela Kalender</span>
                  </div>
                </div>

                {result.unifiedConfluence.conflictReason && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
                    <strong>Catatan Konflik:</strong> {result.unifiedConfluence.conflictReason}
                  </div>
                )}
              </div>
            )}

            {/* Stop Loss & Take Profit Risk Management Card */}
            <TradePlanCard result={result} />

            {/* Indicator Summary Card */}
            <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Metrik & Indikator Kuantitatif</span>
                </h3>
                <span className="text-[11px] font-mono text-[#9CAAC2]">Formula Standar Bursa</span>
              </div>

              <div className="space-y-2 text-xs">
                <MetricRow
                  label="RSI (14 Period)"
                  value={result.rsi.toFixed(2)}
                  badge={result.rsi >= 70 ? 'Overbought' : result.rsi <= 30 ? 'Oversold' : 'Netral'}
                  badgeColor={result.rsi >= 70 ? 'text-rose-400 bg-rose-950/60' : result.rsi <= 30 ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-800/60'}
                />
                <MetricRow label="EMA (9 Period - Cepat)" value={result.emaFast.toFixed(result.emaFast > 10 ? 2 : 4)} />
                <MetricRow label="EMA (21 Period - Menengah)" value={result.emaMid.toFixed(result.emaMid > 10 ? 2 : 4)} />
                <MetricRow label="EMA (50 Period - Tren Lambat)" value={result.emaSlow.toFixed(result.emaSlow > 10 ? 2 : 4)} />
                <MetricRow
                  label="MACD Histogram (12, 26, 9)"
                  value={result.macd.toFixed(result.macd > 10 ? 2 : 5)}
                  highlightColor={result.macd >= 0 ? 'text-[#27D69B]' : 'text-[#FF5D70]'}
                />
                <MetricRow
                  label="ATR (14 Period - Volatilitas Rata-rata)"
                  value={result.atr14.toFixed(result.atr14 > 10 ? 2 : 4)}
                />
              </div>

              {/* Confluence Reason Explanation */}
              <div className="mt-3.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-300 block mb-1">
                  Alasan Analisis Terpadu:
                </span>
                <p className="text-xs text-[#9CAAC2] leading-relaxed">
                  {result.reason}
                </p>
              </div>

              <div className="mt-2.5 text-right text-[11px] text-[#9CAAC2]">
                Diperbarui: {updatedAt || result.time}
              </div>
            </div>

            {/* Price Chart */}
            {indicatorData && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9CAAC2]">
                    Visualisasi Candlestick & EMA (MT5 Live)
                  </span>
                  <button
                    onClick={() => setShowChart(!showChart)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{showChart ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}</span>
                  </button>
                </div>
                {showChart && <PriceChart data={indicatorData} signal={result} />}
              </div>
            )}
          </div>
        )}
        </>
        )}

        {/* TAB 2: NEWS & SENTIMENT DASHBOARD */}
        {activeTab === 'NEWS' && (
          <NewsDashboard
            news={newsList}
            selectedSymbol={instrument.symbol}
            fundamentalProfile={fundamentalProfile}
            onSelectInstrument={(sym) => {
              const target = INSTRUMENTS.find(i => i.symbol === sym);
              if (target) {
                setInstrument(target);
                setActiveTab('SIGNAL');
              }
            }}
          />
        )}

        {/* TAB 3: ECONOMIC CALENDAR */}
        {activeTab === 'CALENDAR' && (
          <EconomicCalendarWidget
            events={calendarEvents}
            selectedSymbol={instrument.symbol}
          />
        )}

        {/* TAB 4: BACKTEST & EVALUATION */}
        {activeTab === 'EVALUATION' && (
          <EvaluationBacktestPanel />
        )}

        {/* Disclaimer Card */}
        <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-4 shadow-xl mb-4">
          <div className="flex items-center gap-2 mb-2 text-white font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h4 className="uppercase tracking-wider">Penting & Keterbukaan Risiko</h4>
          </div>
          <p className="text-xs text-[#9CAAC2] leading-relaxed">
            Data kripto diambil langsung dari feed Binance Spot. Data Forex, Saham, Komoditas, dan Indeks didukung melalui adapter Twelve Data. Sinyal BUY/SELL/WAIT adalah hasil kalkulasi konfluensi teknikal murni, bukan jaminan profit dan bukan ajakan investasi tanpa risiko.
          </p>
        </div>

        <p className="text-xs text-[#9CAAC2] text-center mb-6">
          Universal Signal AI • Gunakan dengan analisis dan risiko yang terukur.
        </p>
      </main>

      {/* Settings Modal for Twelve Data API Key */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#151D30] border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <span>Pengaturan Data Provider</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-blue-950/40 border border-blue-900/50 rounded-xl text-blue-200">
                <span className="font-bold block mb-1">Kripto (Binance):</span>
                <span>Menggunakan API publik tanpa memerlukan API key.</span>
              </div>

              <div>
                <label className="font-bold text-white block mb-1.5">
                  Twelve Data API Key (Forex, Saham, Komoditas, Indeks):
                </label>
                <input
                  type="text"
                  placeholder="Masukkan API key Twelve Data Anda"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2.5 rounded-xl font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-[#9CAAC2] mt-1.5">
                  Daftar gratis di <a href="https://twelvedata.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">twelvedata.com</a> (Paket gratis: 8 request/menit, 800/hari).
                </p>
              </div>

              <div className="flex items-start gap-2 p-2.5 bg-slate-900/60 rounded-xl text-[11px] text-slate-400">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>Keamanan: API key disimpan secara lokal di browser/perangkat Anda, tidak dikirim atau dibagikan ke server publik manapun.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-2 text-slate-400 hover:text-white font-bold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setTwelveDataKey(keyInput.trim());
                  try {
                    localStorage.setItem('twelve_data_api_key', keyInput.trim());
                  } catch {}
                  setShowSettingsModal(false);
                  handleAnalyze();
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-[#07101F] font-bold rounded-xl"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#151D30] border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <span>Riwayat Sinyal Sesi Ini</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-2 flex-1 pr-1">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.symbol}</span>
                      <span className="text-slate-400">({item.frame})</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{item.time}</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-black text-xs px-2.5 py-0.5 rounded-full inline-block ${
                        item.side === 'BUY'
                          ? 'bg-emerald-500/20 text-[#27D69B] border border-emerald-500/40'
                          : item.side === 'SELL'
                            ? 'bg-rose-500/20 text-[#FF5D70] border border-rose-500/40'
                            : 'bg-amber-500/20 text-[#F59E0B] border border-amber-500/40'
                      }`}
                    >
                      {item.side}
                    </span>
                    <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                      ${item.price >= 100 ? item.price.toFixed(2) : item.price.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlightColor,
  badge,
  badgeColor,
}: {
  label: string;
  value: string;
  highlightColor?: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-b-0">
      <span className="text-[#9CAAC2] font-medium">{label}</span>
      <div className="flex items-center gap-2 font-mono">
        {badge && (
          <span className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
            {badge}
          </span>
        )}
        <span className={`font-semibold ${highlightColor || 'text-white'}`}>{value}</span>
      </div>
    </div>
  );
}
