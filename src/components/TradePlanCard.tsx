import React, { useState } from 'react';
import { Shield, Copy, Check, Info } from 'lucide-react';
import { SignalResult } from '../types';

interface TradePlanCardProps {
  result: SignalResult;
}

export function TradePlanCard({ result }: TradePlanCardProps) {
  const plan = result.tradePlan;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string, key: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      setToastMessage(`${label} berhasil disalin`);
      setTimeout(() => {
        setCopiedKey(null);
        setToastMessage(null);
      }, 2000);
    } catch {
      setToastMessage('Gagal menyalin ke clipboard');
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  const copyAll = () => {
    if (!plan) return;
    const cleanSymbol = result.symbol.replace('/', '');
    const allText = `${cleanSymbol}\n${result.side}\nEntry: ${plan.formattedEntry}\nSL: ${plan.formattedSl}\nTP1: ${plan.formattedTp1}\nTP2: ${plan.formattedTp2}\nTP3: ${plan.formattedTp3}\nRisk/Reward: ${plan.riskRewardRatio}`;
    copyToClipboard(allText, 'Semua level', 'all');
  };

  return (
    <div className="w-full bg-[#151D30] rounded-2xl border border-slate-800/80 p-5 shadow-xl relative overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-3 right-3 bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in duration-200 z-10">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#69A7FF]" />
          <h3 className="text-xs font-bold tracking-wider uppercase text-white">
            Manajemen Risiko (Stop Loss & Take Profit)
          </h3>
        </div>
        <span className="text-[10px] font-bold text-[#69A7FF] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
          ATR & Volatilitas Pasar
        </span>
      </div>

      {(!plan || (result.side !== 'BUY' && result.side !== 'SELL')) ? (
        <div className="bg-[#0C1322] border border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-400">
              Sinyal WAIT (Menunggu Konfirmasi)
            </h4>
            <p className="text-[11px] text-[#9CAAC2] mt-1 leading-relaxed">
              Level Entry, Stop Loss (SL), dan Take Profit (TP) akan dihitung otomatis saat konfluensi indikator mengonfirmasi sinyal BUY atau SELL yang valid.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Metadata Row */}
          <div className="grid grid-cols-4 gap-2 bg-[#0F172A] border border-slate-800/80 rounded-xl p-3 text-center">
            <div>
              <span className="text-[10px] font-bold text-[#9CAAC2] block uppercase tracking-wider">Arah</span>
              <span className={`text-xs font-black ${result.side === 'BUY' ? 'text-[#27D69B]' : 'text-[#FF5D70]'}`}>
                {result.side}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#9CAAC2] block uppercase tracking-wider">Instrumen</span>
              <span className="text-xs font-bold text-white">{result.symbol}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#9CAAC2] block uppercase tracking-wider">Timeframe</span>
              <span className="text-xs font-bold text-white">{result.frame}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#9CAAC2] block uppercase tracking-wider">Risk / Reward</span>
              <span className="text-xs font-bold text-[#69A7FF]">{plan.riskRewardRatio}</span>
            </div>
          </div>

          {/* Level Rows */}
          <div className="space-y-2 text-xs">
            {/* ENTRY */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0C1322] border border-slate-800/80">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#9CAAC2]">ENTRY</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400">
                    HARGA PASAR
                  </span>
                </div>
                <span className="font-mono font-bold text-white text-sm mt-0.5">
                  {plan.formattedEntry}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(plan.formattedEntry, 'Entry', 'entry')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  copiedKey === 'entry'
                    ? 'bg-blue-500/20 text-[#69A7FF] border-blue-500/40'
                    : 'bg-slate-900 border-slate-800 text-[#9CAAC2] hover:text-white hover:border-slate-700'
                }`}
                title="Salin harga Entry saja"
              >
                {copiedKey === 'entry' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'entry' ? 'Tersalin' : 'Copy'}</span>
              </button>
            </div>

            {/* STOP LOSS */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0C1322] border border-slate-800/80">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#9CAAC2]">STOP LOSS (SL)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-[#FF5D70]">
                    {result.side === 'BUY' ? 'DI BAWAH ENTRY' : 'DI ATAS ENTRY'}
                  </span>
                </div>
                <span className="font-mono font-bold text-[#FF5D70] text-sm mt-0.5">
                  {plan.formattedSl}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(plan.formattedSl, 'SL', 'sl')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  copiedKey === 'sl'
                    ? 'bg-blue-500/20 text-[#69A7FF] border-blue-500/40'
                    : 'bg-slate-900 border-slate-800 text-[#9CAAC2] hover:text-white hover:border-slate-700'
                }`}
                title="Salin harga SL saja"
              >
                {copiedKey === 'sl' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'sl' ? 'Tersalin' : 'Copy'}</span>
              </button>
            </div>

            {/* TAKE PROFIT 1 */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0C1322] border border-slate-800/80">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#9CAAC2]">TAKE PROFIT 1 (TP1)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-[#27D69B]">
                    RR 1:1
                  </span>
                </div>
                <span className="font-mono font-bold text-[#27D69B] text-sm mt-0.5">
                  {plan.formattedTp1}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(plan.formattedTp1, 'TP1', 'tp1')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  copiedKey === 'tp1'
                    ? 'bg-blue-500/20 text-[#69A7FF] border-blue-500/40'
                    : 'bg-slate-900 border-slate-800 text-[#9CAAC2] hover:text-white hover:border-slate-700'
                }`}
                title="Salin harga TP1 saja"
              >
                {copiedKey === 'tp1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'tp1' ? 'Tersalin' : 'Copy'}</span>
              </button>
            </div>

            {/* TAKE PROFIT 2 */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0C1322] border border-slate-800/80">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#9CAAC2]">TAKE PROFIT 2 (TP2)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-[#27D69B]">
                    RR 1:2
                  </span>
                </div>
                <span className="font-mono font-bold text-[#27D69B] text-sm mt-0.5">
                  {plan.formattedTp2}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(plan.formattedTp2, 'TP2', 'tp2')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  copiedKey === 'tp2'
                    ? 'bg-blue-500/20 text-[#69A7FF] border-blue-500/40'
                    : 'bg-slate-900 border-slate-800 text-[#9CAAC2] hover:text-white hover:border-slate-700'
                }`}
                title="Salin harga TP2 saja"
              >
                {copiedKey === 'tp2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'tp2' ? 'Tersalin' : 'Copy'}</span>
              </button>
            </div>

            {/* TAKE PROFIT 3 */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0C1322] border border-slate-800/80">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#9CAAC2]">TAKE PROFIT 3 (TP3)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-[#27D69B]">
                    RR 1:3
                  </span>
                </div>
                <span className="font-mono font-bold text-[#27D69B] text-sm mt-0.5">
                  {plan.formattedTp3}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(plan.formattedTp3, 'TP3', 'tp3')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  copiedKey === 'tp3'
                    ? 'bg-blue-500/20 text-[#69A7FF] border-blue-500/40'
                    : 'bg-slate-900 border-slate-800 text-[#9CAAC2] hover:text-white hover:border-slate-700'
                }`}
                title="Salin harga TP3 saja"
              >
                {copiedKey === 'tp3' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'tp3' ? 'Tersalin' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* COPY ALL Button */}
          <button
            onClick={copyAll}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md"
          >
            {copiedKey === 'all' ? (
              <>
                <Check className="w-4 h-4 text-[#69A7FF]" />
                <span className="text-[#69A7FF]">SEMUA LEVEL BERHASIL DISALIN</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#69A7FF]" />
                <span>COPY ALL (SALIN SEMUA LEVEL)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
