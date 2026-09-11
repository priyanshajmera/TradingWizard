import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, BaselineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Logical } from 'lightweight-charts';
import { marketStore } from '../../store/marketStore';
import { endpoints } from '../../config';
import DrawingToolbar from './DrawingToolbar';
import type { DrawingTool } from './DrawingToolbar';

export type Point = { logical: number; price: number };
export type Drawing = {
  id: string;
  type: DrawingTool;
  p1: Point;
  p2?: Point;
  completed: boolean;
};

const ChartPanel: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema11Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema22Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma200Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const fvgLinesRef = useRef<any[]>([]);
  const boxSeriesRef = useRef<ISeriesApi<"Baseline">[]>([]);

  const [timeframe, setTimeframe] = useState('1D');
  const timeframes = ['1m', '2m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];
  
  const [showEMA11, setShowEMA11] = useState(true);
  const [showEMA22, setShowEMA22] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showSMA200, setShowSMA200] = useState(true);
  
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const drawingsRef = useRef<Drawing[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const { activeSymbol, ictData } = marketStore();

  const renderDrawings = useCallback(() => {
    if (!svgRef.current || !chartRef.current || !seriesRef.current) return;
    
    let svgContent = '';
    const width = chartContainerRef.current?.clientWidth || 2000;
    
    drawingsRef.current.forEach(d => {
      if (!chartRef.current || !seriesRef.current) return;
      const x1 = chartRef.current.timeScale().logicalToCoordinate(d.p1.logical as Logical);
      const y1 = seriesRef.current.priceToCoordinate(d.p1.price);
      
      if (x1 === null || y1 === null) return;
      
      const p2Logical = d.p2 ? d.p2.logical : d.p1.logical;
      const p2Price = d.p2 ? d.p2.price : d.p1.price;
      
      const x2 = chartRef.current.timeScale().logicalToCoordinate(p2Logical as Logical);
      const y2 = seriesRef.current.priceToCoordinate(p2Price);
      
      if (x2 === null || y2 === null) return;

      if (d.type === 'trendline') {
        svgContent += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3b82f6" stroke-width="2" />`;
      } else if (d.type === 'hline') {
        svgContent += `<line x1="0" y1="${y1}" x2="${width}" y2="${y1}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4" />`;
      } else if (d.type === 'rect') {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);
        if (rw > 0 && rh > 0) {
          svgContent += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" stroke-width="1" />`;
        }
      }
    });
    
    svgRef.current.innerHTML = svgContent;
  }, []);

  useEffect(() => {
    ema11Ref.current?.applyOptions({ visible: showEMA11 });
  }, [showEMA11]);

  useEffect(() => {
    ema22Ref.current?.applyOptions({ visible: showEMA22 });
  }, [showEMA22]);

  useEffect(() => {
    sma50Ref.current?.applyOptions({ visible: showSMA50 });
  }, [showSMA50]);

  useEffect(() => {
    sma200Ref.current?.applyOptions({ visible: showSMA200 });
  }, [showSMA200]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth || 800,
        height: chartContainerRef.current?.clientHeight || 400,
      });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1e293b' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: { type: 'volume' },
      priceScaleId: '', 
    });
    
    chart.priceScale('').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 }
    });

    const ema11Series = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1, title: 'EMA 11', crosshairMarkerVisible: false });
    const ema22Series = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, title: 'EMA 22', crosshairMarkerVisible: false });
    const sma50Series = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, title: 'SMA 50', crosshairMarkerVisible: false });
    const sma200Series = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, title: 'SMA 200', crosshairMarkerVisible: false });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    volumeRef.current = volumeSeries;
    ema11Ref.current = ema11Series;
    ema22Ref.current = ema22Series;
    sma50Ref.current = sma50Series;
    sma200Ref.current = sma200Series;

    window.addEventListener('resize', handleResize);
    
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => renderDrawings());
    chart.subscribeCrosshairMove(() => renderDrawings());

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current) return;
    
    let isMounted = true;

    // Fetch localized data with specific timeframe
    fetch(endpoints.analyze(activeSymbol, timeframe))
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        
        if (data.data && data.data.length > 0) {
          const formatted = data.data.map((c: any) => ({
            time: (new Date(c.time).getTime() / 1000) as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
          
          const vdata = data.data.map((c: any) => ({
            time: (new Date(c.time).getTime() / 1000) as any,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          }));

          const ema11Data = data.data.filter((c: any) => c.ema11 !== null).map((c: any) => ({
            time: (new Date(c.time).getTime() / 1000) as any,
            value: c.ema11,
          }));
          const ema22Data = data.data.filter((c: any) => c.ema22 !== null).map((c: any) => ({
            time: (new Date(c.time).getTime() / 1000) as any,
            value: c.ema22,
          }));
          const sma50Data = data.data.filter((c: any) => c.sma50 !== null).map((c: any) => ({
            time: (new Date(c.time).getTime() / 1000) as any,
            value: c.sma50,
          }));
          const sma200Data = data.data.filter((c: any) => c.sma200 !== null).map((c: any) => ({
            time: (new Date(c.time).getTime() / 1000) as any,
            value: c.sma200,
          }));

          try {
            seriesRef.current?.setData(formatted);
            volumeRef.current?.setData(vdata);
            ema11Ref.current?.setData(ema11Data);
            ema22Ref.current?.setData(ema22Data);
            sma50Ref.current?.setData(sma50Data);
            sma200Ref.current?.setData(sma200Data);

            // Cleanup old lines
            fvgLinesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
            fvgLinesRef.current = [];
            boxSeriesRef.current.forEach(series => chartRef.current?.removeSeries(series));
            boxSeriesRef.current = [];

            // Pattern Drawings (Classical Structures) - Removed Per Architecture Pivot

            // Draw Institutional Support & Resistance Levels
            if (data.analysis && data.analysis.keyLevels) {
              data.analysis.keyLevels.resistance.forEach((price: number) => {
                const l = seriesRef.current?.createPriceLine({
                  price, color: 'rgba(239, 68, 68, 0.95)', lineWidth: 2, lineStyle: 0, 
                  axisLabelVisible: true, title: "RESISTANCE"
                });
                if (l) fvgLinesRef.current.push(l);
              });
              data.analysis.keyLevels.support.forEach((price: number) => {
                const l = seriesRef.current?.createPriceLine({
                  price, color: 'rgba(16, 185, 129, 0.95)', lineWidth: 2, lineStyle: 0, 
                  axisLabelVisible: true, title: "SUPPORT"
                });
                if (l) fvgLinesRef.current.push(l);
              });
            }

            const currentTime = formatted.length > 0 ? formatted[formatted.length - 1].time : (new Date().getTime() / 1000);

            // Imprint FVG bounds as rectangles (Greyish) - Limit to 3 max
            if (data.analysis && data.analysis.fvg) {
              const recentFvgs = data.analysis.fvg.slice(-3);
              recentFvgs.forEach((fvg: any) => {
                if (!fvg.filled) {
                  const formedTime = (new Date(fvg.formed_at).getTime() / 1000);
                  const color = 'rgba(156, 163, 175, 0.2)'; // Greyish area
                  const lineColor = 'rgba(156, 163, 175, 0.4)'; // Greyish borders
                  
                  const fvgSeries = chartRef.current?.addSeries(BaselineSeries, {
                    topLineColor: lineColor,
                    bottomLineColor: lineColor,
                    topFillColor1: color,
                    topFillColor2: color,
                    bottomFillColor1: color,
                    bottomFillColor2: color,
                    lineWidth: 1,
                    lineStyle: 0,
                    baseValue: { type: 'price', price: fvg.bottom },
                    crosshairMarkerVisible: false,
                    priceLineVisible: false,
                    lastValueVisible: false,
                  });
                  
                  if (fvgSeries) {
                    fvgSeries.setData([
                      { time: formedTime as any, value: fvg.top },
                      { time: currentTime as any, value: fvg.top }
                    ]);
                    boxSeriesRef.current.push(fvgSeries);
                  }
                }
              });
            }

            // Imprint OB bounds as rectangles (Yellow) - Limit to 3 max
            if (data.analysis && data.analysis.orderBlocks) {
              const recentObs = data.analysis.orderBlocks.slice(-3);
              recentObs.forEach((ob: any) => {
                if (!ob.mitigated) {
                  const formedTime = (new Date(ob.formed_at).getTime() / 1000);
                  const color = 'rgba(234, 179, 8, 0.2)'; // Yellow area
                  const lineColor = 'rgba(234, 179, 8, 0.4)'; // Yellow borders
                  
                  const obSeries = chartRef.current?.addSeries(BaselineSeries, {
                    topLineColor: lineColor,
                    bottomLineColor: lineColor,
                    topFillColor1: color,
                    topFillColor2: color,
                    bottomFillColor1: color,
                    bottomFillColor2: color,
                    lineWidth: 1,
                    lineStyle: 0,
                    baseValue: { type: 'price', price: ob.low },
                    crosshairMarkerVisible: false,
                    priceLineVisible: false,
                    lastValueVisible: false,
                  });
                  
                  if (obSeries) {
                    obSeries.setData([
                      { time: formedTime as any, value: ob.high },
                      { time: currentTime as any, value: ob.high }
                    ]);
                    boxSeriesRef.current.push(obSeries);
                  }
                }
              });
            }
          } catch (err) {
            console.error("Error setting chart data", err);
          }
        } else {
          seriesRef.current?.setData([]);
          volumeRef.current?.setData([]);
        }
      })
      .catch(err => console.error("Error fetching analysis", err));

      return () => { isMounted = false; };
  }, [activeSymbol, timeframe, ictData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'cursor') return;
    const clientRect = e.currentTarget.getBoundingClientRect();
    if (!chartRef.current || !seriesRef.current) return;
    
    const x = e.clientX - clientRect.left;
    const y = e.clientY - clientRect.top;
    
    if (activeTool === 'eraser') {
      const HIT_TEST_RADIUS = 20;
      let hitIndex = -1;
      let minDistance = HIT_TEST_RADIUS;
      
      for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
        const d = drawingsRef.current[i];
        if (!d.completed || !d.p2) continue;
        
        const x1 = chartRef.current.timeScale().logicalToCoordinate(d.p1.logical as Logical);
        const y1 = seriesRef.current.priceToCoordinate(d.p1.price);
        const x2 = chartRef.current.timeScale().logicalToCoordinate(d.p2.logical as Logical);
        const y2 = seriesRef.current.priceToCoordinate(d.p2.price);
        
        if (x1 === null || y1 === null || x2 === null || y2 === null) continue;
        
        if (d.type === 'rect') {
           const rx = Math.min(x1, x2);
           const ry = Math.min(y1, y2);
           const rw = Math.abs(x2 - x1);
           const rh = Math.abs(y2 - y1);
           if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
             hitIndex = i; break;
           }
        } else if (d.type === 'trendline' || d.type === 'hline') {
           const lX1 = d.type === 'hline' ? 0 : x1;
           const lX2 = d.type === 'hline' ? clientRect.width : x2;
           
           const l2 = (lX1 - lX2) ** 2 + (y1 - y2) ** 2;
           let dist = 0;
           if (l2 === 0) {
             dist = Math.sqrt((x - lX1) ** 2 + (y - y1) ** 2);
           } else {
             let t = ((x - lX1) * (lX2 - lX1) + (y - y1) * (y2 - y1)) / l2;
             t = Math.max(0, Math.min(1, t));
             const projX = lX1 + t * (lX2 - lX1);
             const projY = y1 + t * (y2 - y1);
             dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
           }
           if (dist < minDistance) {
             minDistance = dist;
             hitIndex = i;
           }
        }
      }
      
      if (hitIndex !== -1) {
        drawingsRef.current.splice(hitIndex, 1);
        renderDrawings();
      }
      return;
    }

    const logical = chartRef.current.timeScale().coordinateToLogical(x);
    const price = seriesRef.current.coordinateToPrice(y);
    if (logical === null || price === null) return;
    
    const newDrawing: Drawing = {
      id: Math.random().toString(),
      type: activeTool,
      p1: { logical, price },
      completed: false
    };
    drawingsRef.current.push(newDrawing);
    renderDrawings();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'cursor' || activeTool === 'eraser' || drawingsRef.current.length === 0) return;
    const last = drawingsRef.current[drawingsRef.current.length - 1];
    if (last && !last.completed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const logical = chartRef.current?.timeScale().coordinateToLogical(x);
      const price = seriesRef.current?.coordinateToPrice(y);
      if (logical !== null && logical !== undefined && price !== null && price !== undefined) {
        last.p2 = { logical, price };
        renderDrawings();
      }
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'cursor' || activeTool === 'eraser' || drawingsRef.current.length === 0) return;
    const last = drawingsRef.current[drawingsRef.current.length - 1];
    if (last && !last.completed) {
      last.completed = true;
      setActiveTool('cursor');
    }
  };

  const clearDrawings = () => {
    drawingsRef.current = [];
    renderDrawings();
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 relative">
      <div className="flex justify-between items-center px-6 py-3 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md z-20 shadow-sm relative">
        <div className="flex items-center gap-3">
          <h2 className="text-[17px] tracking-tight font-black text-slate-100 m-0">{activeSymbol}</h2>
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md uppercase">LIVE Ticker</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-1.5 p-1 bg-slate-950 rounded-lg shadow-inner border border-slate-800/80 mr-2">
            <button onClick={() => setShowEMA11(!showEMA11)} className={`px-2.5 py-1 text-[10px] font-black tracking-widest rounded-md uppercase border transition-all ${showEMA11 ? 'bg-emerald-500/10 text-[#10b981] border-emerald-500/30' : 'text-slate-500 border-transparent hover:bg-slate-800/60'}`}>EMA 11</button>
            <button onClick={() => setShowEMA22(!showEMA22)} className={`px-2.5 py-1 text-[10px] font-black tracking-widest rounded-md uppercase border transition-all ${showEMA22 ? 'bg-red-500/10 text-[#ef4444] border-red-500/30' : 'text-slate-500 border-transparent hover:bg-slate-800/60'}`}>EMA 22</button>
            <button onClick={() => setShowSMA50(!showSMA50)} className={`px-2.5 py-1 text-[10px] font-black tracking-widest rounded-md uppercase border transition-all ${showSMA50 ? 'bg-blue-500/10 text-[#3b82f6] border-blue-500/30' : 'text-slate-500 border-transparent hover:bg-slate-800/60'}`}>SMA 50</button>
            <button onClick={() => setShowSMA200(!showSMA200)} className={`px-2.5 py-1 text-[10px] font-black tracking-widest rounded-md uppercase border transition-all ${showSMA200 ? 'bg-red-500/10 text-[#ef4444] border-red-500/30' : 'text-slate-500 border-transparent hover:bg-slate-800/60'}`}>SMA 200</button>
          </div>
          
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-950 text-slate-200 border border-slate-800/80 shadow-inner outline-none cursor-pointer appearance-none hover:border-blue-500/40 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px' }}
          >
            {timeframes.map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>
      </div>
      <DrawingToolbar activeTool={activeTool} onSelectTool={setActiveTool} onClear={clearDrawings} />
      <div className="flex-1 relative w-full h-full z-10">
        <div ref={chartContainerRef} className="absolute inset-0 top-0 left-0" />
        <div 
          className="absolute inset-0 z-40 touch-none"
          style={{ pointerEvents: activeTool === 'cursor' ? 'none' : 'auto' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg ref={svgRef} className="w-full h-full pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default ChartPanel;
