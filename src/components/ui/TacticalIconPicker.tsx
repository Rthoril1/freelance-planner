'use client';
import { useRef, useState, useEffect } from 'react';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadToStorage, supabase } from '@/lib/supabase';
import { generateId } from '@/lib/utils';
import { createPortal } from 'react-dom';

const DEFAULT_ICONS = [
  '⚡', '🚀', '💻', '📱', '🌐', '🎨', '🖌️', '📊', 
  '📈', '🗄️', '⚙️', '🛠️', '🔗', '📝', '📅', '💬', 
  '📧', '💸', '🛒', '🏢', '🔥', '✨', '🎯', '🧩'
];

interface TacticalIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TacticalIconPicker({ 
  value, 
  onChange, 
  className = "" 
}: TacticalIconPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
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

  const handleToggle = () => {
    if (!isOpen) updateCoords();
    setIsOpen(!isOpen);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setIsOpen(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const path = `icons/${user.id}/${generateId()}-${file.name}`;
      const url = await uploadToStorage('profile_assets', path, file);
      
      onChange(url);
    } catch (error) {
      console.error('Failed to upload icon', error);
      alert('Failed to upload image. Ensure the storage bucket exists.');
    } finally {
      setIsUploading(false);
    }
  };

  const isImage = typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image/'));

  const PopoverMenu = (
    <div 
      ref={popoverRef}
      className="fixed z-[9999] bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 fade-in duration-200 pointer-events-auto p-5 flex flex-col gap-4"
      style={{ 
        top: `${coords.top + 8}px`, 
        left: `${coords.left}px`,
        width: '320px',
      }}
    >
      <div className="grid grid-cols-6 gap-2">
        {DEFAULT_ICONS.map(icon => (
           <button
             key={icon}
             type="button"
             onClick={() => {
                onChange(icon);
                setIsOpen(false);
             }}
             className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all hover:bg-slate-50 hover:scale-110 active:scale-95 ${value === icon ? 'bg-primary/10 border border-primary/20' : 'border border-transparent'}`}
           >
              {icon}
           </button>
        ))}
      </div>
      
      <div className="border-t border-slate-100 mt-2 pt-5 flex flex-col gap-3">
         <p className="text-[10px] font-bold text-slate-400 capitalize text-center mb-1">Don't see your desired icon?</p>
         <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-50 hover:bg-primary hover:text-white text-slate-500 transition-colors rounded-2xl py-3.5 flex items-center justify-center gap-2 group border border-slate-100"
         >
            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Upload Custom Image</span>
         </button>
         <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest">Supports 100x100px PNG/JPG</p>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/jpg" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      
      <button
        type="button"
        disabled={isUploading}
        onClick={handleToggle}
        className="shrink-0 w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center group relative hover:border-primary/50 transition-colors shadow-sm cursor-pointer overflow-hidden p-1"
        title="Select Protocol Icon"
      >
        {isUploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        ) : isImage ? (
          <img src={value} alt="Platform Icon" className="w-full h-full object-cover rounded-xl shadow-sm" />
        ) : (
          <div className="text-3xl group-hover:scale-110 transition-transform flex items-center justify-center w-full h-full">
             {value || '⚡'}
          </div>
        )}
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(PopoverMenu, document.body)}
    </div>
  );
}
