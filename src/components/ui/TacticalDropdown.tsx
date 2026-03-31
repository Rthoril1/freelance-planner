'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, LayoutGrid } from 'lucide-react';

interface DropdownOption {
  id: string;
  name: string;
  subName?: string;
  color?: string;
}

interface TacticalDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export function TacticalDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select Option...", 
  label,
  className = "",
  variant = 'default'
}: TacticalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

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
        top: rect.bottom,   // viewport-relative, no scrollY needed for position:fixed
        left: rect.left,    // viewport-relative, no scrollX needed for position:fixed
        width: rect.width
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) updateCoords();
    setIsOpen(!isOpen);
  };

  // Portal Menu Content (SaaS Modern)
  const DropdownMenu = (
    <div 
      ref={popoverRef}
      role="listbox"
      className="fixed z-[9999] bg-white border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 pointer-events-auto"
      style={{ 
        top: `${coords.top + 8}px`, 
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        minWidth: '260px',
        transform: typeof window !== 'undefined' && coords.top + 350 > window.innerHeight ? 'translateY(-100%) translateY(-80px)' : 'none'
      }}
    >
        {variant === 'default' && (
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <LayoutGrid className="w-3 h-3 text-primary/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Asset</span>
             </div>
             <div className="flex gap-1">
                <div className="w-1 h-3 rounded-full bg-primary/20" />
             </div>
          </div>
        )}
       
       <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5">
          {options.length === 0 ? (
            <div className="p-8 text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest text-slate-400">No entries found.</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all group text-left mb-0.5
                  ${value === opt.id ? 'bg-primary/5 text-primary' : 'hover:bg-slate-50'}
                  ${variant === 'compact' ? 'p-2' : 'p-3.5'}
                `}
              >
                <div className="flex items-center gap-3.5 truncate">
                   <div className={`w-0.5 h-6 rounded-full transition-transform ${value === opt.id ? 'scale-y-100' : 'scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100'} duration-300`} style={{ backgroundColor: opt.color || 'hsl(var(--primary))' }} />
                   <div className="flex flex-col">
                      <span className={`font-bold tracking-tight group-hover:translate-x-0.5 transition-transform italic uppercase ${value === opt.id ? 'text-primary' : 'text-slate-900'} ${variant === 'compact' ? 'text-[10px]' : 'text-[11px]'}`}>
                         {opt.name}
                      </span>
                      {opt.subName && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 transition-colors">
                           {opt.subName}
                        </span>
                      )}
                   </div>
                </div>
                {value === opt.id && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))
          )}
       </div>
    </div>
  );

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && <label className="text-[10px] font-black uppercase tracking-[0.3rem] text-slate-400 px-1 block mb-2">{label}</label>}
      
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl font-bold tracking-widest uppercase outline-none transition-all hover:border-primary/30 hover:shadow-md ${isOpen ? 'ring-2 ring-primary/10 border-primary/40' : ''} ${variant === 'compact' ? 'px-4 py-3 text-[10px]' : 'px-5 py-3.5 text-[11px]'}`}
      >
        <div className="flex items-center gap-3 truncate">
          {selectedOption?.color && (
            <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: selectedOption.color }} />
          )}
          <span className={selectedOption ? 'text-slate-900 italic' : 'text-slate-400/50'}>
            {selectedOption ? `${selectedOption.name}${selectedOption.subName ? ` (${selectedOption.subName})` : ''}` : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-300'}`} />
      </button>

      {/* Render Portal if Open */}
      {isOpen && typeof document !== 'undefined' && createPortal(DropdownMenu, document.body)}
    </div>
  );
}
