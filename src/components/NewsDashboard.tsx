import React, { useState, useMemo } from 'react';
import { 
  NewsItem, 
  AssetCategory, 
  ImpactLevel, 
  SentimentRating, 
  FundamentalProfile 
} from '../types';
import { 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ExternalLink, 
  Filter, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  Activity,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface NewsDashboardProps {
  news: NewsItem[];
  selectedSymbol: string;
  fundamentalProfile?: FundamentalProfile | null;
  onSelectInstrument?: (symbol: string) => void;
}

export const NewsDashboard: React.FC<NewsDashboardProps> = ({
  news,
  selectedSymbol,
  fundamentalProfile,
  onSelectInstrument
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highImpactOnly, setHighImpactOnly] = useState<boolean>(false);
  const [showFundamental, setShowFundamental] = useState<boolean>(true);
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'Semua Berita' },
    { id: 'CRYPTO', label: 'Kripto' },
    { id: 'FOREX', label: 'Forex' },
    { id: 'STOCKS', label: 'Saham' },
    { id: 'COMMODITIES', label: 'Komoditas' },
    { id: 'INDICES', label: 'Indeks' }
  ];

  // Filtered news items
  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      const matchCat = activeCategory === 'ALL' || item.category === activeCategory;
      const matchImpact = !highImpactOnly || item.impact === 'HIGH' || item.impact === 'CRITICAL';
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = q === '' || 
        item.title.toLowerCase().includes(q) || 
        item.summary.toLowerCase().includes(q) || 
        item.source.toLowerCase().includes(q) ||
        item.affectedInstruments.some((sym) => sym.toLowerCase().includes(q));

      return matchCat && matchImpact && matchSearch;
    });
  }, [news, activeCategory, highImpactOnly, searchQuery]);

  // Overall aggregate sentiment calculation
  const { avgSentiment, bullishCount, bearishCount, neutralCount } = useMemo(() => {
    if (filteredNews.length === 0) {
      return { avgSentiment: 0, bullishCount: 0, bearishCount: 0, neutralCount: 0 };
    }
    let totalScore = 0;
    let bull = 0;
    let bear = 0;
    let neut = 0;

    filteredNews.forEach((n) => {
      totalScore += n.sentimentScore;
      if (n.sentimentScore >= 20) bull++;
      else if (n.sentimentScore <= -20) bear++;
      else neut++;
    });

    return {
      avgSentiment: Math.round(totalScore / filteredNews.length),
      bullishCount: bull,
      bearishCount: bear,
      neutralCount: neut
    };
  }, [filteredNews]);

  const getSentimentColor = (score: number) => {
    if (score >= 40) return 'text-[#27D69B]';
    if (score <= -40) return 'text-[#FF5D70]';
    return 'text-amber-400';
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 80) return 'STRONGLY BULLISH (+80..+100)';
    if (score >= 40) return 'BULLISH (+40..+79)';
    if (score <= -80) return 'STRONGLY BEARISH (-80..-100)';
    if (score <= -40) return 'BEARISH (-40..-79)';
    return 'NEUTRAL (-39..+39)';
  };

  const formatTimeAgo = (ts: number) => {
    const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
  };

  return (
    <div className="w-full space-y-4">
      {/* 1. AGGREGATE SENTIMENT SCORING GAUGE CARD */}
      <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Sentimeter Sentimen Pasar Global
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#9CAAC2]">
            Skala Multi-Sumber: -100 s/d +100
          </span>
        </div>

        <div className="my-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Main Score Display */}
          <div className="flex items-center gap-3">
            <div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${getSentimentColor(avgSentiment)}`}>
              {avgSentiment > 0 ? `+${avgSentiment}` : avgSentiment}
            </div>
            <div>
              <span className={`text-xs font-black tracking-wide block ${getSentimentColor(avgSentiment)}`}>
                {getSentimentLabel(avgSentiment)}
              </span>
              <span className="text-[11px] text-[#9CAAC2] mt-0.5 block">
                Berdasarkan agregasi {filteredNews.length} berita terkini terverifikasi
              </span>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              <span className="font-bold">{bullishCount}</span> Bullish
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              <span className="font-bold">{neutralCount}</span> Netral
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300">
              <span className="font-bold">{bearishCount}</span> Bearish
            </div>
          </div>
        </div>

        {/* Visual Bar (-100 to +100) */}
        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden relative border border-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.max(5, Math.min(100, (avgSentiment + 100) / 2))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
          <span>-100 (Sangat Bearish)</span>
          <span>0 (Netral)</span>
          <span>+100 (Sangat Bullish)</span>
        </div>
      </div>

      {/* 2. FUNDAMENTAL PROFILE FOR ACTIVE INSTRUMENT */}
      {fundamentalProfile && (
        <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Profil Fundamental Makro: {fundamentalProfile.symbol}
              </h3>
            </div>
            <button
              onClick={() => setShowFundamental(!showFundamental)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>{showFundamental ? 'Ciutkan' : 'Perluas'}</span>
              {showFundamental ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showFundamental && (
            <div className="mt-3.5 space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">
                  Rejim Siklus Pasar / Kebijakan Moneter:
                </span>
                <span className="font-bold text-white text-sm mt-0.5 block">
                  {fundamentalProfile.macroRegime}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-400 block mb-1">
                    Katalis & Pendorong Utama (Key Drivers):
                  </span>
                  <ul className="space-y-1 text-slate-300 list-disc list-inside">
                    {fundamentalProfile.keyDrivers.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl">
                  <span className="text-[11px] font-bold text-rose-400 block mb-1">
                    Faktor Risiko Makro (Risk Factors):
                  </span>
                  <ul className="space-y-1 text-slate-300 list-disc list-inside">
                    {fundamentalProfile.riskFactors.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. NEWS FEED CONTROLS & CARDS */}
      <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Feed Berita Finansial & Geopolitik Terkini
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHighImpactOnly(!highImpactOnly)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                highImpactOnly
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              High/Critical Saja
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar border-b border-slate-800/60">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeCategory === c.id
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative my-3">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari berita berdasarkan judul, topik, atau simbol instrumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white text-xs pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* News Items List */}
        {filteredNews.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            Tidak ada berita yang cocok dengan kriteria pencarian Anda.
          </p>
        ) : (
          <div className="space-y-3 mt-3">
            {filteredNews.map((item) => {
              const isExpanded = expandedNewsId === item.id;
              const isBull = item.sentimentScore >= 20;
              const isBear = item.sentimentScore <= -20;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
                >
                  {/* Unboxed Metadata Line (anti-pill zero-box rule) */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9CAAC2] mb-1.5 font-mono">
                    <span className="font-bold text-white">{item.source}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatTimeAgo(item.publishedAt)}
                    </span>
                    <span>·</span>
                    <span className={`font-black ${
                      item.impact === 'CRITICAL' ? 'text-purple-400' :
                      item.impact === 'HIGH' ? 'text-rose-400' :
                      item.impact === 'MEDIUM' ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      Dampak: {item.impact}
                    </span>
                    <span>·</span>
                    <span className={`font-black ${
                      isBull ? 'text-[#27D69B]' : isBear ? 'text-[#FF5D70]' : 'text-slate-400'
                    }`}>
                      Sentimen: {item.sentimentScore > 0 ? `+${item.sentimentScore}` : item.sentimentScore}
                    </span>
                  </div>

                  {/* Headline */}
                  <h4 
                    onClick={() => setExpandedNewsId(isExpanded ? null : item.id)}
                    className="font-bold text-white text-sm leading-snug cursor-pointer hover:text-blue-300 transition-colors"
                  >
                    {item.title}
                  </h4>

                  {/* Summary Snippet */}
                  <p className="text-xs text-[#9CAAC2] leading-relaxed mt-1.5">
                    {isExpanded ? item.summary : `${item.summary.slice(0, 150)}${item.summary.length > 150 ? '...' : ''}`}
                  </p>

                  {/* Footer with Affected Symbols & Link */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-800/50">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Aset Terkait:</span>
                      {item.affectedInstruments.map((sym) => (
                        <button
                          key={sym}
                          onClick={() => onSelectInstrument && onSelectInstrument(sym)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono font-bold transition-colors"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                      >
                        <span>Baca Sumber</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
