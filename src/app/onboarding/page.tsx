'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Onboarding() {
  const router = useRouter();
  const setProfile = useStore((state) => state.setProfile);

  const [name, setName] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('40');
  const [maxHoursPerDay, setMaxHoursPerDay] = useState('8');
  
  const handleSave = async () => {
    if (!name.trim()) return;
    await setProfile({
      name,
      type: 'Freelancer',
      weeklyHoursAvailable: parseInt(weeklyHours) || 40,
      workDays: [1, 2, 3, 4, 5],
      dailyAvailability: { start: '09:00', end: '17:00' },
      maxHoursPerDay: parseInt(maxHoursPerDay) || 8,
      preferredBlocks: ['Morning', 'Afternoon']
    });
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-50/50 backdrop-blur-2xl overflow-hidden min-h-screen">
      {/* Background soft shapes */}
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-indigo-200/20 rounded-full blur-[120px] -z-10" />

      <div className="w-full max-w-xl bg-white rounded-[48px] border border-slate-100 p-12 lg:p-16 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -translate-y-12 translate-x-12" />
        
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 rounded-[28px] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30 mb-8 transform transition-transform hover:rotate-6">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-center text-slate-900 mb-3">Stitch: Digital Atelier</h2>
          <p className="text-slate-400 font-medium text-center text-lg max-w-sm">Strategic orchestration for high-performance freelancers.</p>
        </div>
        
        <div className="space-y-10 relative z-10">
          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Identity Node</label>
            <input 
              type="text" 
              className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-5 text-xl font-bold text-slate-900 focus:border-primary/50 focus:bg-white outline-none transition-all"
              placeholder="What is your name?"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Global Weekly Max</label>
              <div className="relative">
                 <input 
                   type="number" 
                   className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-5 text-2xl font-bold text-primary focus:border-primary/50 focus:bg-white outline-none transition-all tracking-tighter"
                   value={weeklyHours}
                   onChange={(e) => setWeeklyHours(e.target.value)}
                 />
                 <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/30 uppercase tracking-widest">Hours</span>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Tactical Daily Cap</label>
              <div className="relative">
                 <input 
                   type="number" 
                   className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-5 text-2xl font-bold text-primary focus:border-primary/50 focus:bg-white outline-none transition-all tracking-tighter"
                   value={maxHoursPerDay}
                   onChange={(e) => setMaxHoursPerDay(e.target.value)}
                 />
                 <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/30 uppercase tracking-widest">Hours</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button 
               onClick={handleSave}
               className="w-full flex items-center justify-center gap-3 rounded-[24px] bg-primary px-8 py-5 text-sm font-bold text-white shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
               Initialize Environment <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
