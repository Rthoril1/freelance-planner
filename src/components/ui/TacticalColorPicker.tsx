'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Hash, Palette } from 'lucide-react';

interface TacticalColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const DIGITAL_ATELIER_PALETTE = [
  { name: 'Electric Indigo', hex: '#6366f1' },
  { name: 'Emerald Signal', hex: '#10b981' },
  { name: 'Rose Tactical', hex: '#f43f5e' },
  { name: 'Amber Alert', hex: '#f59e0b' },
  { name: 'Sky Operative', hex: '#0ea5e9' },
  { name: 'Violet Creative', hex: '#8b5cf6' },
  { name: 'Slate Deep', hex: '#475569' },
  { name: 'Cyan Highspeed', hex: '#06b6d4' },
  { name: 'Fuchsia Impact', hex: '#d946ef' },
  { name: 'Orange Pressure', hex: '#f97316' },
  { name: 'Lime Fresh', hex: '#84cc16' },
  { name: 'Neutral Static', hex: '#737373' },
];

export function TacticalColorPicker({ 
  value, 
  onChange, 
  label,
  className = "" 
}: TacticalColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) && 
          popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = () => {
       if (isOpen) setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
       document.removeEventListener('mousedown', handleClickOutside);
       window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleOpen = () => {
    updateCoords();
    setIsOpen(true);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  // Portal Content (Modern SaaS Style)
  const PopoverContent = (
    <div 
      ref={popoverRef}
      role="dialog"
      aria-label="Color Palette"
      className="fixed z-[9999] w-[300px] bg-white border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 pointer-events-auto"
      style={{ 
        top: `${coords.top + 8}px`, 
        left: `${Math.min(coords.left, typeof window !== 'undefined' ? window.innerWidth - 320 : coords.left)}px`,
        transform: typeof window !== 'undefined' && coords.top + 400 > window.innerHeight ? 'translateY(-100%) translateY(-80px)' : 'none'
      }}
    >
       <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Color Palette</span>
          <div className="flex gap-1">
             <div className="w-1 h-3 rounded-full bg-primary/20" />
             <div className="w-1 h-3 rounded-full bg-primary/40" />
          </div>
       </div>
       
       <div className="p-5">
          <div className="grid grid-cols-4 gap-2.5">
             {DIGITAL_ATELIER_PALETTE.map((color) => (
               <button
                 key={color.hex}
                 type="button"
                 title={color.name}
                 onClick={() => {
                   onChange(color.hex);
                   setIsOpen(false);
                 }}
                 className={`aspect-square rounded-xl border-2 transition-all hover:scale-105 flex items-center justify-center
                   ${value === color.hex ? 'border-primary ring-2 ring-primary/10' : 'border-transparent'}
                 `}
                 style={{ backgroundColor: color.hex }}
               >
                 {value === color.hex && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
               </button>
             ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
             <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: value }} />
                <div className="flex flex-col">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Brand Accent</span>
                   <span className="font-bold text-[10px] uppercase text-slate-900 tracking-tight italic">Active Protocol</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && <label className="text-[10px] font-black uppercase tracking-[0.3rem] text-slate-400 px-1 block mb-2">{label}</label>}
      
      <div className="flex gap-4 items-center h-[56px] px-4 rounded-xl bg-white border border-slate-200 group transition-all hover:border-primary/30 hover:shadow-md">
        <button
          type="button"
          onClick={handleOpen}
          className="h-8 w-12 rounded-lg border border-slate-100 cursor-pointer transition-transform hover:scale-105 shadow-sm shrink-0"
          style={{ backgroundColor: value }}
        />
        <div className="flex flex-col flex-1">
           <div className="flex items-center gap-2">
              <Hash className="w-3 h-3 text-slate-300" />
              <input 
                type="text" 
                value={(hexInput || '').toUpperCase()}
                onChange={handleHexChange}
                className="bg-transparent border-none p-0 text-sm font-bold font-mono tracking-wider text-slate-900 focus:ring-0 w-full outline-none italic"
                placeholder="#HEXCODE"
              />
           </div>
        </div>
        <button onClick={handleOpen} className="p-2 text-slate-300 hover:text-primary transition-colors">
           <Palette className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
        </button>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(PopoverContent, document.body)}
    </div>
  );
}
