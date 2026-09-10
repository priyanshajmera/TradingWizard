import React, { useEffect, useState, useRef } from 'react';
import ChartPanel from './components/ChartPanel/ChartPanel';
import SignalPanel from './components/SignalPanel/SignalPanel';
import NSEScanner from './components/NSEScanner/NSEScanner';
import SymbolExplorer from './components/SymbolExplorer/SymbolExplorer';
import { marketStore } from './store/marketStore';
import { Activity } from 'lucide-react';

const App: React.FC = () => {
  const { activeSymbol } = marketStore();
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'SIGNALS' | 'SCANNER'>('DASHBOARD');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws/stream');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Market Stream');
      if (activeSymbol) {
        ws.send(JSON.stringify({ action: 'subscribe', symbol: activeSymbol }));
      }
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.event === 'candle_update') {
        const symbol = payload.data.symbol;
        marketStore.setState((state) => {
          const existing = state.candles[symbol] || [];
          const newCandles = [...existing];
          if (newCandles.length > 0 && newCandles[newCandles.length - 1].time === payload.data.time) {
            newCandles[newCandles.length - 1] = payload.data;
          } else {
            newCandles.push(payload.data);
            if (newCandles.length > 100) newCandles.shift();
          }
          return { candles: { ...state.candles, [symbol]: newCandles } };
        });
      }
    };

    ws.onclose = () => console.log('Market Stream Disconnected');
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeSymbol) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', symbol: activeSymbol }));
    }
  }, [activeSymbol]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <nav className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shadow-sm relative z-20">
        <div className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tight">
          <Activity size={24} className="text-blue-500" />
          <span>Wizard ICT Engine</span>
        </div>
        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 shadow-inner">
          <button 
            data-view="DASHBOARD"
            onClick={() => setActiveView('DASHBOARD')}
            className={`px-6 py-2 rounded-md font-semibold text-sm transition-all duration-200 ${activeView === 'DASHBOARD' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            Terminal Matrix
          </button>
          <button 
            data-view="SIGNALS"
            onClick={() => setActiveView('SIGNALS')}
            className={`px-6 py-2 rounded-md font-semibold text-sm transition-all duration-200 ${activeView === 'SIGNALS' ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-500/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            Live Signals
          </button>
          <button 
            data-view="SCANNER"
            onClick={() => setActiveView('SCANNER')}
            className={`px-6 py-2 rounded-md font-semibold text-sm transition-all duration-200 ${activeView === 'SCANNER' ? 'bg-cyan-600 text-white shadow-md ring-1 ring-cyan-500/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            NSE Scanner
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {activeView === 'DASHBOARD' ? (
          <>
            <div className="w-80 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col relative z-10 shadow-xl">
              <SymbolExplorer />
            </div>
            
            <div className="flex-1 flex flex-col relative bg-slate-950">
              <ChartPanel />
            </div>
          </>
        ) : activeView === 'SIGNALS' ? (
          <div className="flex-1 overflow-y-auto bg-slate-950 relative">
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none blur-3xl rounded-full scale-150 transform -translate-y-1/2 opacity-50" />
            <SignalPanel />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-950 relative">
            <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none blur-3xl rounded-full scale-150 transform -translate-y-1/2 opacity-50" />
            <NSEScanner />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
