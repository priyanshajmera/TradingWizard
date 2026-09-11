import React, { useEffect, useState } from 'react';
import { marketStore } from '../../store/marketStore';
import { Search } from 'lucide-react';
import { endpoints } from '../../config';

const nameMap: Record<string, string> = {
  "GC=F": "GOLD FUTURES",
  "SI=F": "SILVER FUTURES",
  "CL=F": "CRUDE OIL",
  "NG=F": "NATURAL GAS",
  "HG=F": "COPPER",
  "BZ=F": "BRENT CRUDE",
  "^GSPC": "S&P 500",
  "^DJI": "DOW JONES",
  "^IXIC": "NASDAQ",
  "^NSEI": "NIFTY 50",
  "^NSEBANK": "BANK NIFTY",
  "^CNXIT": "NIFTY IT",
  "^CNXFMCG": "NIFTY FMCG",
  "^CNXAUTO": "NIFTY AUTO",
  "^CNXMETAL": "NIFTY METAL",
  "^CNXPHARMA": "NIFTY PHARMA",
  "^BSESN": "BSE SENSEX",
};

const SymbolExplorer: React.FC = () => {
  const { activeSymbol, setActiveSymbol } = marketStore();
  const [symbolsUS, setSymbolsUS] = useState<string[]>([]);
  const [symbolsIndia, setSymbolsIndia] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'US' | 'INDIA'>('US');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch(endpoints.symbols)
      .then(res => res.json())
      .then(data => {
        setSymbolsUS(data.US);
        setSymbolsIndia(data.INDIA);
      })
      .catch(err => console.error(err));
  }, []);

  const baseList = activeTab === 'US' ? symbolsUS : symbolsIndia;
  const activeList = baseList.filter(sym => sym.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      
      {/* Tab Header */}
      <div className="flex p-3 gap-2 bg-slate-950 border-b border-slate-800 shadow-sm z-20">
        <button 
          onClick={() => setActiveTab('US')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'US' ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg text-white ring-1 ring-blue-400/30' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
        >
           Wall Street
        </button>
        <button 
          onClick={() => setActiveTab('INDIA')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'INDIA' ? 'bg-gradient-to-br from-indigo-500 to-violet-700 shadow-lg text-white ring-1 ring-indigo-400/30' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
        >
           NSE India
        </button>
      </div>
      
      {/* Search Input */}
      <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 relative shadow-sm z-10 sticky top-0">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
        <input 
          type="text" 
          placeholder="Search global assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/50 rounded-lg text-sm font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
        />
      </div>
      
      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 bg-slate-900/30 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 to-transparent pointer-events-none h-4 z-10" />
        
        {activeList.slice(0, 100).map(sym => {
          const isActive = activeSymbol === sym;

          return (
            <div 
              key={sym} 
              onClick={() => setActiveSymbol(sym)}
              className={`group flex items-center p-3.5 rounded-xl cursor-pointer transition-all duration-200 border transform origin-left ${isActive ? 'bg-slate-800 border-slate-600 shadow-lg ring-1 ring-slate-500/40 relative z-10 scale-[1.02]' : 'bg-slate-800/20 border-transparent hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-md'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-bold tracking-tight transition-colors text-[15px] ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{sym}</span>
                {nameMap[sym] && (
                  <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded shadow-sm border ${isActive ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-slate-800/80 text-slate-400 border-slate-700/50 group-hover:bg-slate-700/40 group-hover:text-slate-300'}`}>
                    {nameMap[sym]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        
        {activeList.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-4 opacity-60">
            <Search size={32} />
            <span className="text-sm font-semibold tracking-wide">No assets match criteria</span>
          </div>
        )}
        {activeList.length > 100 && (
          <div className="text-center py-4 text-xs font-bold text-slate-500 tracking-wider">
            SHOWING 100 OF {activeList.length} MATCHES<br/>PLEASE NARROW YOUR SEARCH
          </div>
        )}
      </div>
    </div>
  );
};

export default SymbolExplorer;
