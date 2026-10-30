import React from 'react';
import { AlertTriangle, Clock, ShieldAlert, X } from 'lucide-react';
import { UnifiedConfluenceBreakdown } from '../types';

interface NewsAlertBannerProps {
  confluence?: UnifiedConfluenceBreakdown;
  onDismiss?: () => void;
}

export const NewsAlertBanner: React.FC<NewsAlertBannerProps> = ({ confluence, onDismiss }) => {
  if (!confluence || (!confluence.highImpactNewsActive && !confluence.isConflictDetected)) {
    return null;
  }

  const isHighImpactActive = confluence.highImpactNewsActive;
  const isConflict = confluence.isConflictDetected && !isHighImpactActive;

  return (
    <div className={`w-full rounded-2xl p-4 mb-4 border shadow-xl relative transition-all ${
      isHighImpactActive 
        ? 'bg-[#3A141A] border-rose-500/50 text-rose-100'
        : 'bg-[#332211] border-amber-500/50 text-amber-100'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
          isHighImpactActive ? 'bg-rose-950/80 text-rose-400' : 'bg-amber-950/80 text-amber-400'
        }`}>
          {isHighImpactActive ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
        </div>

        <div className="flex-1 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded ${
              isHighImpactActive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {isHighImpactActive ? 'PERINGATAN BERITA BERDAMPAK TINGGI' : 'KONFLIK MAKRO & TEKNIKAL'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Sistem Proteksi Risiko Aktif
            </span>
          </div>

          <p className="text-xs font-semibold leading-relaxed mt-1">
            {confluence.conflictReason || confluence.activeHighImpactEvent || 'Terdeteksi kondisi risiko tinggi yang memicu penangguhan sinyal entri.'}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] font-mono">
            <span className="text-white font-bold">Rekomendasi Mesin:</span>
            <span className={`px-2 py-0.5 rounded font-black ${
              isHighImpactActive ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              HOLD / WAIT — HINDARI ENTRI BARU
            </span>
            <span className="text-slate-400">
              {isHighImpactActive ? 'Tunggu reaksi pasar 15-30m pasca-rilis' : 'Tunggu konfirmasi ulang kedua pilar'}
            </span>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
