import React from 'react';
import { MousePointer2, Minus, Square, Trash2, Pencil, Eraser } from 'lucide-react';

export type DrawingTool = 'cursor' | 'trendline' | 'hline' | 'rect' | 'eraser';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  onClear: () => void;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({ activeTool, onSelectTool, onClear }) => {
  return (
    <div className="absolute top-24 left-4 z-50 flex flex-col gap-2 p-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl shadow-lg ring-1 ring-white/5">
      <ToolButton 
        active={activeTool === 'cursor'} 
        onClick={() => onSelectTool('cursor')} 
        icon={<MousePointer2 size={18} />} 
        tooltip="Select / Pan" 
      />
      <div className="w-full h-px bg-slate-800 my-0.5" />
      <ToolButton 
        active={activeTool === 'trendline'} 
        onClick={() => onSelectTool('trendline')} 
        icon={<Pencil size={18} />} 
        tooltip="Trend Line" 
      />
      <ToolButton 
        active={activeTool === 'hline'} 
        onClick={() => onSelectTool('hline')} 
        icon={<Minus size={18} />} 
        tooltip="Horizontal Line" 
      />
      <ToolButton 
        active={activeTool === 'rect'} 
        onClick={() => onSelectTool('rect')} 
        icon={<Square size={18} />} 
        tooltip="Rectangle" 
      />
      <div className="w-full h-px bg-slate-800 my-0.5" />
      <ToolButton 
        active={activeTool === 'eraser'} 
        onClick={() => onSelectTool('eraser')} 
        icon={<Eraser size={18} />} 
        tooltip="Eraser (Click drawing to remove)" 
      />
      <div className="w-full h-px bg-slate-800 my-0.5" />
      <button
        onClick={onClear}
        title="Clear All Drawings"
        className="p-2.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

const ToolButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; tooltip: string }> = ({ active, onClick, icon, tooltip }) => (
  <button
    onClick={onClick}
    title={tooltip}
    className={`p-2.5 rounded-lg transition-all ${
      active 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`}
  >
    {icon}
  </button>
);

export default DrawingToolbar;
