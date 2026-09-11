import React, { useState, useRef, useCallback } from 'react';
import { Radar, Loader, TrendingUp, Shield, AlertTriangle, Zap, BarChart3, ArrowRight } from 'lucide-react';
import { marketStore } from '../../store/marketStore';
import { endpoints } from '../../config';

interface ScanSignal {
  symbol: string;
  signal: string;
  confidence: number;
  strength: string;
  reasons: string[];
  entry: number;
  stopLoss: number;
  target: number;
  riskReward: number;
  bull_score: number;
  bear_score: number;
  timeframe: string;
  timestamp: string;
  ema11?: number;
  ema22?: number;
  sma50?: number;
  sma200?: number;
}

interface ScanProgress {
  scanned: number;
  total: number;
  batch: number;
  total_batches: number;
  buys_found: number;
  errors: number;
  batch_duration: number;
  new_candidate?: ScanSignal;
}

interface ScanComplete {
  top10: ScanSignal[];
  total_scanned: number;
  total_buys: number;
  duration_seconds: number;
  errors: number;
}

const NSEScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [results, setResults] = useState<ScanSignal[]>([]);
  const [completionData, setCompletionData] = useState<ScanComplete | null>(null);
  const [liveCandidates, setLiveCandidates] = useState<ScanSignal[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const { setActiveSymbol } = marketStore();

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setProgress(null);
    setResults([]);
    setCompletionData(null);
    setLiveCandidates([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(endpoints.scanNSE, {
        signal: controller.signal,
      });

      if (!response.body) {
        setIsScanning(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                setProgress(data);
                if (data.new_candidate) {
                  setLiveCandidates(prev => {
                    const exists = prev.some(c => c.symbol === data.new_candidate.symbol);
                    if (exists) return prev;
                    const updated = [...prev, data.new_candidate]
                      .sort((a: ScanSignal, b: ScanSignal) => (b.bull_score - a.bull_score) || (b.confidence - a.confidence));
                    return updated;
                  });
                }
              } else if (data.type === 'complete') {
                setResults(data.top10 || []);
                setCompletionData(data);
                setIsScanning(false);
              } else if (data.type === 'error') {
                console.error('Scan error:', data.message);
                setIsScanning(false);
              }
            } catch (e) {
              // Ignore parse errors (keepalive, etc.)
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Scan failed:', err);
      }
      setIsScanning(false);
    }
  }, []);

  const stopScan = () => {
    abortRef.current?.abort();
    setIsScanning(false);
  };

  const pct = progress ? Math.round((progress.scanned / progress.total) * 100) : 0;
  const displayResults = results.length > 0 ? results : liveCandidates;

  const getStrengthStyle = (strength: string) => {
    switch (strength) {
      case 'HIGH': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'MODERATE': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full p-6 lg:p-10 max-w-[1600px] mx-auto box-border">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8 relative z-10 p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl shadow-2xl">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-3 m-0 text-2xl lg:text-3xl font-black tracking-tight text-white">
            <Radar className="text-cyan-500" size={32} /> NSE Full-Market Scanner
          </h1>
          <p className="m-0 text-sm font-medium text-slate-400 max-w-2xl leading-relaxed">
            Scans all 2,254 NSE India stocks through the ICT strategy engine and surfaces the top 10 strongest BUY candidates with actionable entry, stop loss, and target levels.
          </p>
        </div>
        {!isScanning ? (
          <button
            onClick={startScan}
            className="shrink-0 flex items-center justify-center gap-2.5 px-8 py-4 text-sm font-bold rounded-xl transition-all duration-300 bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-xl shadow-cyan-900/30 ring-1 ring-cyan-500/50 hover:ring-cyan-400 scale-[0.98] hover:scale-100"
          >
            <Radar size={20} className="text-cyan-200" />
            Start Full Market Scan
          </button>
        ) : (
          <button
            onClick={stopScan}
            className="shrink-0 flex items-center justify-center gap-2.5 px-8 py-4 text-sm font-bold rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 transition-all"
          >
            <AlertTriangle size={18} />
            Abort Scan
          </button>
        )}
      </div>

      {/* Progress Section */}
      {isScanning && progress && (
        <div className="mb-8 p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader size={24} className="animate-spin text-cyan-400" />
                  <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-30 rounded-full animate-pulse" />
                </div>
                <span className="text-lg font-bold text-white">Scanning NSE Market...</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-slate-400" />
                  <span className="text-slate-400">Batch</span>
                  <span className="font-bold text-white font-mono">{progress.batch}/{progress.total_batches}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-slate-400">Buys Found</span>
                  <span className="font-bold text-emerald-400 font-mono">{progress.buys_found}</span>
                </div>
                {progress.errors > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <span className="text-amber-400 font-mono">{progress.errors} errs</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 bg-slate-800/80 rounded-full overflow-hidden mb-3 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${pct}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-500">
              <span>{progress.scanned.toLocaleString()} / {progress.total.toLocaleString()} stocks</span>
              <span className="text-cyan-400 font-bold">{pct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Completion Summary */}
      {completionData && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Stocks Scanned', value: completionData.total_scanned.toLocaleString(), icon: BarChart3, color: 'text-blue-400' },
            { label: 'BUY Signals Found', value: completionData.total_buys.toString(), icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Scan Duration', value: `${completionData.duration_seconds}s`, icon: Zap, color: 'text-amber-400' },
            { label: 'Errors', value: completionData.errors.toString(), icon: AlertTriangle, color: completionData.errors > 0 ? 'text-rose-400' : 'text-slate-500' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} className={stat.color} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
              </div>
              <span className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Results Table */}
      {displayResults.length > 0 && (
        <div className="flex-1 flex flex-col min-h-[500px] overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl shadow-2xl">
          <div className="p-4 border-b border-slate-800/60 flex items-center gap-3">
            <TrendingUp size={18} className="text-emerald-400" />
            <span className="text-sm font-bold text-white">
              {results.length > 0 ? `All BUY Candidates (${results.length})` : 'Live Candidates (updating...)'}
            </span>
            {isScanning && <Loader size={14} className="animate-spin text-cyan-400 ml-2" />}
          </div>
          <div className="overflow-auto flex-1 min-h-[450px] max-h-[calc(100vh-280px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/80">
                  <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">#</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Symbol</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Confidence</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Strength</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entry</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Stop Loss</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Target</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">R:R</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Score</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reasons</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((sig, idx) => (
                  <tr
                    key={sig.symbol + idx}
                    className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors duration-200 group cursor-pointer"
                    onClick={() => {
                      setActiveSymbol(sig.symbol);
                      // Navigate to dashboard view
                      const dashBtn = document.querySelector('[data-view="DASHBOARD"]') as HTMLButtonElement;
                      dashBtn?.click();
                    }}
                  >
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        idx === 1 ? 'bg-slate-400/15 text-slate-300 border border-slate-500/30' :
                        idx === 2 ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' :
                        'bg-slate-800/50 text-slate-500 border border-slate-700/50'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-black text-white tracking-tight">{sig.symbol.replace('.NS', '')}</span>
                        <span className="px-2 py-0.5 text-[9px] font-black tracking-widest rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          BUY
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-black font-mono ${
                          sig.confidence >= 75 ? 'text-emerald-400' :
                          sig.confidence >= 50 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {sig.confidence}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sig.confidence >= 75 ? 'bg-emerald-500' :
                              sig.confidence >= 50 ? 'bg-amber-500' : 'bg-slate-500'
                            }`}
                            style={{ width: `${sig.confidence}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-black tracking-wider rounded-md border ${getStrengthStyle(sig.strength)}`}>
                        {sig.strength}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-bold font-mono text-blue-300">₹{sig.entry.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-bold font-mono text-rose-400">₹{sig.stopLoss.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-bold font-mono text-emerald-400">₹{sig.target.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs font-bold font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                        1:{sig.riskReward.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs font-bold font-mono text-emerald-400">{sig.bull_score}</span>
                        <span className="text-[10px] text-slate-600">/</span>
                        <span className="text-xs font-bold font-mono text-rose-400">{sig.bear_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                        {sig.reasons.slice(0, 4).map((r) => (
                          <span key={r} className="bg-slate-950/60 border border-slate-700/50 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider whitespace-nowrap">
                            {r}
                          </span>
                        ))}
                        {sig.reasons.length > 4 && (
                          <span className="text-slate-600 text-[10px] font-bold">+{sig.reasons.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <ArrowRight size={16} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isScanning && displayResults.length === 0 && !completionData && (
        <div className="flex-1 flex flex-col items-center justify-center py-32 text-slate-500 border-2 border-slate-800/80 bg-slate-900/30 rounded-3xl border-dashed shadow-inner">
          <div className="relative mb-8">
            <Radar size={80} className="opacity-15" />
            <div className="absolute inset-0 bg-cyan-500 blur-3xl opacity-10 rounded-full" />
          </div>
          <h3 className="text-2xl font-bold text-slate-300 mb-3 tracking-tight">NSE Scanner Ready</h3>
          <p className="text-sm font-medium text-center max-w-md text-slate-500 mb-1">
            Click "Start Full Market Scan" to analyze all 2,254 NSE India stocks.
          </p>
          <p className="text-xs text-slate-600">
            Estimated time: 3–5 minutes depending on network speed.
          </p>
        </div>
      )}

      {/* No Results State */}
      {!isScanning && completionData && displayResults.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-32 text-slate-500 border-2 border-slate-800/80 bg-slate-900/30 rounded-3xl border-dashed shadow-inner">
          <Shield size={64} className="mb-6 opacity-20" />
          <h3 className="text-2xl font-bold text-slate-300 mb-3 tracking-tight">No Strong BUY Signals</h3>
          <p className="text-sm font-medium text-center max-w-md text-slate-500">
            The scanner completed but found no stocks meeting the minimum conviction threshold. Markets may be in a ranging or uncertain state.
          </p>
        </div>
      )}
    </div>
  );
};

export default NSEScanner;
