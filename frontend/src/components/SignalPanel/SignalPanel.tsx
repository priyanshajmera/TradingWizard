import React, { useState } from 'react';
import { Activity, Zap, Loader } from 'lucide-react';
import { marketStore } from '../../store/marketStore';
import { endpoints } from '../../config';

const getSignalStyle = (signal: string) => {
  switch(signal) {
    case 'BUY': return { border: 'border-l-emerald-500 border-emerald-500/10', glow: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'SELL': return { border: 'border-l-rose-500 border-rose-500/10', glow: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    default: return { border: 'border-l-amber-500 border-amber-500/10', glow: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
  }
};

const SignalPanel: React.FC = () => {
  const { activeSymbol } = marketStore();
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generateSignals = async () => {
    setLoading(true);
    setSignals([]);
    try {
      const res = await fetch(endpoints.generateSignals(activeSymbol));
      const data = await res.json();
      setSignals(data.signals || []);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full p-6 lg:p-10 max-w-[1400px] mx-auto box-border">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8 relative z-10 p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl shadow-2xl">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-3 m-0 text-2xl lg:text-3xl font-black tracking-tight text-white">
            <Activity className="text-blue-500" size={32} /> Market Alignment Matrix
          </h1>
          <p className="m-0 text-sm font-medium text-slate-400 max-w-2xl leading-relaxed">
            High-probability grid evaluating single multi-regional trackers. Enforces strict combinations across Break of Structure (BOS), Fair Value Gaps (FVG), and Institutional Order Blocks (OB).
          </p>
        </div>
        <button 
          onClick={generateSignals}
          disabled={loading}
          className={`shrink-0 flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold rounded-xl transition-all duration-300 ${
            loading 
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700' 
              : 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-900/20 ring-1 ring-blue-500/50 hover:ring-blue-400 scale-[0.98] hover:scale-100'
          }`}
        >
          {loading ? <Loader size={18} className="animate-spin" /> : <Zap size={18} className="text-blue-200" />}
          {loading ? 'Analyzing Architecture...' : `Analyze ${activeSymbol}`}
        </button>
      </div>

      {/* Grid Area */}
      <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 align-top auto-rows-max pb-12 relative z-10">
        
        {signals.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center py-32 text-slate-500 border-2 border-slate-800/80 bg-slate-900/30 rounded-3xl border-dashed shadow-inner">
            <Zap size={64} className="mb-6 opacity-20" />
            <h3 className="text-2xl font-bold text-slate-300 mb-3 tracking-tight">No Market Arrays Established</h3>
            <p className="text-sm font-medium text-center max-w-md text-slate-500">Hit Analyze to instantly interrogate {activeSymbol} via the standard matrix.</p>
          </div>
        )}

        {loading && (
          <div className="col-span-full flex flex-col items-center justify-center py-32 text-blue-500">
            <div className="relative mb-8">
               <Loader size={64} className="animate-spin drop-shadow-lg opacity-80" />
               <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-blue-400 mb-2 tracking-tight">Interrogating {activeSymbol} Matrices...</h3>
            <p className="text-sm font-medium text-blue-300/60 max-w-md text-center">Evaluating deep sub-tier architecture.</p>
          </div>
        )}
        
        {signals.map((sig, idx) => {
          const styles = getSignalStyle(sig.signal);
          return (
            <div key={idx} className={`flex flex-col justify-between bg-slate-900/90 backdrop-blur-xl p-6 rounded-2xl border-[1px] border-l-[6px] shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-900/20 relative overflow-hidden group ${styles.border}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full transition-opacity opacity-20 group-hover:opacity-40 pointer-events-none ${styles.glow}`} />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                  <strong className="text-[22px] font-black tracking-tighter text-white/95">
                    {sig.symbol} <span className="text-slate-500 font-bold ml-1 text-lg">({sig.timeframe})</span>
                  </strong>
                  <div className={`px-2.5 py-1 text-[10px] font-black tracking-widest rounded-md border ${styles.badge}`}>
                    {sig.signal}
                  </div>
                  </div>
                  <div className="bg-slate-950/80 text-blue-400/90 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider shadow-inner">
                    {sig.confidence}% CONF.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5 mb-2">
                  {sig.reasons.length > 0 ? sig.reasons.map((r: string) => (
                    <span key={r} className="bg-slate-950/50 border border-slate-700/50 text-slate-300 px-3.5 py-1.5 rounded-md text-[11px] font-bold tracking-wider shadow-inner flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.glow}`} />
                      {r} Match
                    </span>
                  )) : (
                    <span className="text-slate-500 text-xs font-medium italic">Consolidated ranging dynamics.</span>
                  )}
                </div>
                
                {(sig.ema11 != null || sig.ema22 != null || sig.sma50 != null || sig.sma200 != null) && (
                  <div className="flex items-center gap-3 mt-4 px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800/60 shadow-inner">
                    <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">MAs</span>
                    <span className="text-xs font-bold font-mono text-[#10b981] shadow-sm">{sig.ema11 != null ? sig.ema11.toFixed(2) : '---'}</span>
                    <span className="text-xs font-bold font-mono text-[#ef4444] shadow-sm">{sig.ema22 != null ? sig.ema22.toFixed(2) : '---'}</span>
                    <span className="text-xs font-bold font-mono text-[#3b82f6] shadow-sm">{sig.sma50 != null ? sig.sma50.toFixed(2) : '---'}</span>
                    <span className="text-xs font-bold font-mono text-[#f59e0b] shadow-sm">{sig.sma200 != null ? sig.sma200.toFixed(2) : '---'}</span>
                  </div>
                )}

                {sig.signal !== 'NEUTRAL' && sig.entry > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="bg-slate-950/80 px-2.5 py-2 rounded-lg border border-blue-500/20 shadow-inner flex flex-col gap-0.5 justify-center">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Entry</span>
                      <span className="text-[13px] font-bold font-mono text-slate-200">{sig.entry.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-950/80 px-2.5 py-2 rounded-lg border border-rose-500/20 shadow-inner flex flex-col gap-0.5 justify-center">
                      <span className="text-[9px] font-black text-rose-500/80 uppercase tracking-widest">Stop Loss</span>
                      <span className="text-[13px] font-bold font-mono text-rose-400">{sig.stopLoss.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-950/80 px-2.5 py-2 rounded-lg border border-emerald-500/20 shadow-inner flex flex-col gap-0.5 relative justify-center">
                      <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">Take Profit</span>
                      <span className="text-[13px] font-bold font-mono text-emerald-400">{sig.target.toFixed(2)}</span>
                      <div className="absolute top-1.5 right-2 text-[8px] font-black text-emerald-500/40">1:3 R:R</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-5 border-t border-slate-800/60 flex justify-between items-center relative z-10">
                <div className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Formation Delta</div>
                <div className="text-slate-300 font-bold font-mono text-[13px] bg-slate-950/60 px-3 py-1.5 rounded-md shadow-inner border border-slate-800/50">
                  {new Date(sig.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SignalPanel;
