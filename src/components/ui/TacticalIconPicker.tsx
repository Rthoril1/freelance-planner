'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TacticalIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const TACTICAL_ICONS = [
  '⚡', '🚀', '🎯', '🔥', '💡', '✨', '💻', '📱', 
  '📊', '📈', '🛠️', '🎨', '📝', '✉️', '📅', '🔍', 
  '🌐', '🛡️', '🏆', '⭐', '🎧', '📸', 'video', '💼'
];

export function TacticalIconPicker({ 
  value, 
  onChange, 
  className = "" 
}: TacticalIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const PopoverContent = (
    <div 
      ref={popoverRef}
      role="dialog"
      aria-label="Icon Palette"
      className="fixed z-[9999] w-[320px] bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
      style={{ 
        top: `${coords.top + 12}px`, 
        left: `${Math.min(coords.left, typeof window !== 'undefined' ? window.innerWidth - 340 : coords.left)}px`,
      }}
    >
       <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tactical Glyphs</span>
       </div>
       
       <div className="p-5 overflow-y-auto max-h-[300px] custom-scrollbar">
          <div className="grid grid-cols-6 gap-2">
             {TACTICAL_ICONS.map((icon) => (
               <button
                 key={icon}
                 type="button"
                 title="Select Icon"
                 onClick={() => {
                   onChange(icon === 'video' ? '📹' : icon);
                   setIsOpen(false);
                 }}
                 className={`h-10 text-xl border rounded-xl flex items-center justify-center transition-all hover:-translate-y-1 hover:shadow-md
                   ${value === icon || (value === '📹' && icon === 'video') ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-300'}
                 `}
               >
                 {icon === 'video' ? '📹' : icon}
               </button>
             ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 px-1">Or Type Custom Emoji</span>
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center text-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
              value={value}
              onChange={(e) => {
                 onChange(e.target.value);
              }}
              placeholder="✨"
              maxLength={2}
            />
          </div>
       </div>
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="w-16 h-16 bg-white border border-slate-200 rounded-2xl text-2xl text-center shadow-sm flex items-center justify-center hover:border-primary/50 transition-colors group relative hover:shadow-md cursor-pointer"
        title="Choose Icon"
      >
        <span>{value || '❓'}</span>
        <div className="absolute inset-x-0 bottom-[-10px] opacity-0 group-hover:opacity-100 group-hover:bottom-[-20px] transition-all duration-300 pointer-events-none">
          <span className="inline-block bg-slate-800 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-xl tracking-wider select-none whitespace-nowrap">Change Icon</span>
        </div>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(PopoverContent, document.body)}
    </div>
  );
}
