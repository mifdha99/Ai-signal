import React from 'react';
import { EconomicEvent, ImpactLevel } from '../types';
import { Calendar, Clock, AlertCircle, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

interface EconomicCalendarWidgetProps {
  events: EconomicEvent[];
  selectedSymbol?: string;
}

export const EconomicCalendarWidget: React.FC<EconomicCalendarWidgetProps> = ({ events, selectedSymbol }) => {
  const now = Date.now();

  const getImpactBadge = (impact: ImpactLevel) => {
    switch (impact) {
      case 'CRITICAL':
        return 'bg-purple-950/70 text-purple-300 border border-purple-500/40';
      case 'HIGH':
        return 'bg-rose-950/70 text-rose-300 border border-rose-500/40';
      case 'MEDIUM':
        return 'bg-amber-950/70 text-amber-300 border border-amber-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const formatCountdown = (scheduledTime: number) => {
    const diffMs = scheduledTime - now;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < -60) {
      const hoursAgo = Math.round(-diffMins / 60);
      return `${hoursAgo}j lalu`;
    } else if (diffMins < 0) {
      return `${-diffMins}m lalu (Dirilis)`;
    } else if (diffMins === 0) {
      return 'Sedang Dirilis';
    } else if (diffMins < 60) {
      return `dalam ${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `dalam ${hours}j ${mins}m`;
    }
  };

  return (
    <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Kalender Ekonomi & Rilis Makro Utama
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#9CAAC2]">
          Jadwal Data Pasar Global
        </span>
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-slate-400 py-3 text-center">
          Tidak ada data kalender ekonomi dalam 24 jam ke depan.
        </p>
      ) : (
        <div className="space-y-2.5">
          {events.slice(0, 6).map((ev) => {
            const isRelevant = selectedSymbol && (ev.affectedSymbols.length === 0 || ev.affectedSymbols.includes(selectedSymbol));
            const isReleased = ev.status === 'RELEASED';
            const isActive = ev.status === 'ACTIVE';

            return (
              <div
                key={ev.id}
                className={`p-3 rounded-xl border transition-all text-xs ${
                  isActive
                    ? 'bg-rose-950/40 border-rose-500/40'
                    : isRelevant
                    ? 'bg-slate-900/80 border-blue-500/30'
                    : 'bg-slate-900/40 border-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-800 text-white">
                      {ev.currency}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getImpactBadge(ev.impact)}`}>
                      {ev.impact}
                    </span>
                    <span className="font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-xs" title={ev.event}>
                      {ev.event}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                    {isActive ? (
                      <span className="text-rose-400 font-black animate-pulse flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        AKTIF
                      </span>
                    ) : isReleased ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {formatCountdown(ev.scheduledTime)}
                      </span>
                    ) : (
                      <span className="text-blue-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        {formatCountdown(ev.scheduledTime)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics: Previous, Forecast, Actual */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-4">
                    <span>Sebelumnya: <strong className="text-slate-300">{ev.previous}</strong></span>
                    <span>Prakiraan: <strong className="text-slate-300">{ev.forecast}</strong></span>
                    {ev.actual && (
                      <span>Aktual: <strong className="text-emerald-300">{ev.actual}</strong></span>
                    )}
                  </div>
                  {isRelevant && (
                    <span className="text-[10px] text-blue-300 font-sans font-semibold">
                      Mempengaruhi {selectedSymbol}
                    </span>
                  )}
                </div>

                {ev.marketImplication && (
                  <p className="text-[10px] text-slate-400 mt-1.5 italic leading-relaxed">
                    Implikasi: {ev.marketImplication}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
