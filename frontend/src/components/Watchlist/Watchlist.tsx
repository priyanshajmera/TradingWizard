import { marketStore } from '../../store/marketStore';

const Watchlist = () => {
  const { symbols, activeSymbol, setActiveSymbol, candles } = marketStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {symbols.map(sym => {
        const symCandles = candles[sym] || [];
        const latest = symCandles[symCandles.length - 1];
        const prev = symCandles[symCandles.length - 2];
        
        let change = 0;
        let isUp = true;
        
        if (latest && prev) {
          change = ((latest.close - prev.close) / prev.close) * 100;
          isUp = change >= 0;
        }

        const isActive = activeSymbol === sym;

        return (
          <div 
            key={sym}
            onClick={() => setActiveSymbol(sym)}
            style={{
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              borderBottom: '1px solid #334155',
              background: isActive ? '#334155' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ fontWeight: 600 }}>{sym}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div>{latest ? latest.close.toFixed(2) : '---'}</div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: isUp ? '#10b981' : '#ef4444' 
              }}>
                {isUp ? '+' : ''}{change.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Watchlist;
