'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { CalendarDays, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const setProfile = useStore((state) => state.setProfile);
  const loadDummyData = useStore((state) => state.loadDummyData);

  const [name, setName] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('40');
  const [maxHoursPerDay, setMaxHoursPerDay] = useState('8');
  
  const handleSave = () => {
    if (!name.trim()) return;
    setProfile({
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

  const handleDemo = () => {
    loadDummyData();
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <CalendarDays className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-2">Welcome to TimeSync</h2>
        <p className="text-muted-foreground text-center mb-8">Let's set up your total weekly availability across all your clients.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your Name</label>
            <input 
              type="text" 
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Weekly Hours</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Hrs / Day</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={maxHoursPerDay}
                onChange={(e) => setMaxHoursPerDay(e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full mt-6 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Planning <ArrowRight className="h-4 w-4" />
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
          </div>

          <button 
            onClick={handleDemo}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 font-medium text-foreground hover:bg-muted transition-colors"
          >
            Load Demo Data
          </button>
        </div>
      </div>
    </div>
  );
}
