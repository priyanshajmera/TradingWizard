import { create } from 'zustand';

export interface Candle {
  symbol: string;
  timeframe: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  type: string;
  confidence: number;
  strength: string;
  reasons: string[];
  entry: number;
  stopLoss: number;
  target: number;
  riskReward: number;
  timeframe: string;
  timestamp: string;
  expiry: string;
}

export interface ICTAnalysis {
  symbol: string;
  timeframe: string;
  timestamp: string;
  fvg: any[];
  orderBlocks: any[];
  bos: any;
  mss: any;
  trend: string;
  keyLevels: any;
}

interface MarketState {
  activeSymbol: string;
  setActiveSymbol: (s: string) => void;
  
  candles: Record<string, Candle[]>;
  addCandle: (c: Candle) => void;
  
  signals: Signal[];
  addSignal: (s: Signal) => void;
  
  ictData: Record<string, ICTAnalysis>;
  updateICT: (i: ICTAnalysis) => void;
  
  symbols: string[];
  setSymbols: (s: string[]) => void;
}

export const marketStore = create<MarketState>((set) => ({
  activeSymbol: 'AAPL',
  setActiveSymbol: (s) => set({ activeSymbol: s }),
  
  candles: {},
  addCandle: (c) => set((state) => {
    const sym = c.symbol;
    const existing = state.candles[sym] || [];
    const filtered = existing.filter(ex => ex.time !== c.time);
    const updated = [...filtered, c].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    return { candles: { ...state.candles, [sym]: updated } };
  }),
  
  signals: [],
  addSignal: (s) => set((state) => {
    const existing = state.signals.filter(ex => ex.id !== s.id);
    return { signals: [s, ...existing].slice(0, 50) }; 
  }),
  
  ictData: {},
  updateICT: (i) => set((state) => ({ 
    ictData: { ...state.ictData, [i.symbol]: i } 
  })),
  
  symbols: ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'SPY'],
  setSymbols: (s) => set({ symbols: s })
}));
