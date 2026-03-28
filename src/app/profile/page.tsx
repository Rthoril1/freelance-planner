'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { User, Clock, CalendarDays, Settings, Save, CheckCircle, Coffee, Plus, Trash2, AlertCircle } from 'lucide-react';
import { UserProfile } from '@/types';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Day 1' },
  { id: 2, label: 'Day 2' },
  { id: 3, label: 'Day 3' },
  { id: 4, label: 'Day 4' },
  { id: 5, label: 'Day 5' },
  { id: 6, label: 'Day 6' },
  { id: 7, label: 'Day 7' },
];

export default function ProfilePage() {
  const profile = useStore((state) => state.profile);
  const setProfile = useStore((state) => state.setProfile);

  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile && !formData) {
      setFormData(profile);
    }
  }, [profile, formData]);

  // Sync Maximum Daily Hours when Start/End times change
  useEffect(() => {
    if (!formData) return;
    
    const [startH, startM] = formData.dailyAvailability.start.split(':').map(Number);
    const [endH, endM] = formData.dailyAvailability.end.split(':').map(Number);
    
    const diffMins = (endH * 60 + endM) - (startH * 60 + startM);
    const grossHours = Math.max(0, diffMins / 60);
    
    // Only update if it's actually different to avoid infinite loops or jitter
    if (grossHours > 0 && formData.maxHoursPerDay !== grossHours) {
      setFormData(prev => prev ? ({ ...prev, maxHoursPerDay: grossHours }) : null);
    }
  }, [formData?.dailyAvailability.start, formData?.dailyAvailability.end, formData?.maxHoursPerDay]);

  if (!mounted || !formData) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const toggleDay = (dayId: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const isSelected = prev.workDays.includes(dayId);
      const newWorkDays = isSelected
        ? prev.workDays.filter((d) => d !== dayId)
        : [...prev.workDays, dayId];
      return { ...prev, workDays: newWorkDays };
    });
  };

  const addBreak = () => {
    setFormData((prev) => {
      if (!prev) return prev;
      const customBreaks = prev.customBreaks || [];
      return {
        ...prev,
        customBreaks: [...customBreaks, { id: Math.random().toString(36).substring(2, 9), start: '10:00', durationMinutes: 15 }]
      };
    });
  };

  const removeBreak = (id: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customBreaks: (prev.customBreaks || []).filter(b => b.id !== id)
      };
    });
  };

  const updateBreak = (id: string, field: 'start' | 'durationMinutes', value: string | number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customBreaks: (prev.customBreaks || []).map(b => b.id === id ? { ...b, [field]: value } : b)
      };
    });
  };

  const calculateCapacityWarning = () => {
    if (!formData) return null;
    const daysWorking = formData.workDays.length;
    if (daysWorking === 0) return 'You have no working days selected.';
    
    const [startH, startM] = (formData.dailyAvailability?.start || '09:00').split(':').map(Number);
    const [endH, endM] = (formData.dailyAvailability?.end || '17:00').split(':').map(Number);
    
    let rawMins = (endH * 60 + endM) - (startH * 60 + startM);
    if (rawMins <= 0) rawMins = 0;
    
    const lunchMins = formData.lunchTime?.durationMinutes || 0;
    const breakMins = (formData.customBreaks || []).reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    const totalBreaksHours = (lunchMins + breakMins) / 60;
    
    const netDailyMins = Math.max(0, rawMins - lunchMins - breakMins);
    const netDailyHours = netDailyMins / 60;
    const maxAllowedDaily = formData.maxHoursPerDay || 24;
    
    const actualDailyHours = Math.min(netDailyHours, maxAllowedDaily);
    const netWeeklyCapacity = actualDailyHours * daysWorking;
    
    if (netWeeklyCapacity < formData.weeklyHoursAvailable) {
      const requiredNetDailyHours = formData.weeklyHoursAvailable / daysWorking;
      
      if (requiredNetDailyHours > maxAllowedDaily) {
        return `Unreachable Goal: Your schedule caps at ${netWeeklyCapacity.toFixed(1)}h/week. To reach ${formData.weeklyHoursAvailable}h, you must either add more working days or increase your Maximum Daily Hours (currently ${maxAllowedDaily}h/day).`;
      } else {
        const requiredGrossDailyHours = requiredNetDailyHours + totalBreaksHours;
        let newStartH = startH;
        let newStartM = startM;
        let newEndMins = (startH * 60 + startM) + (requiredGrossDailyHours * 60);
        
        if (newEndMins > 24 * 60) {
           newEndMins = 24 * 60;
           const newStartMins = newEndMins - (requiredGrossDailyHours * 60);
           newStartH = Math.max(0, Math.floor(newStartMins / 60));
           newStartM = Math.round(Math.max(0, newStartMins % 60));
        }
        
        const endHCalc = Math.floor(newEndMins / 60);
        const endMCalc = Math.round(newEndMins % 60);

        const formatTime = (h: number, m: number) => {
          if (h >= 24) h = 23; 
          if (h < 0) h = 0;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const displayH = h % 12 || 12;
          return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        const suggestedStart = formatTime(newStartH, newStartM);
        const suggestedEnd = formatTime(endHCalc === 24 ? 23 : endHCalc, endHCalc === 24 ? 59 : endMCalc);

        return `Capacity Warning: You can only reach ${netWeeklyCapacity.toFixed(1)}h/week with these settings. To hit ${formData.weeklyHoursAvailable}h in ${daysWorking} days (including breaks), try working from ${suggestedStart} to ${suggestedEnd}.`;
      }
    }
    
    return null;
  };

  const warningMessage = calculateCapacityWarning();

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <Settings className="w-8 h-8 mr-3 text-primary" />
            Profile Settings
          </h2>
          <p className="text-muted-foreground">
            Manage your personal information and adjust your working schedule.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Personal Info Section */}
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center space-x-2 text-primary">
              <User className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-white">Personal Information</h3>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-slate-300">
                  Professional Title
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </div>

          {/* Schedule Breakdown Summary */}
          {formData.workDays.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 shadow-inner">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Schedule Reality</p>
                    <h4 className="text-xl font-bold text-white">
                      {((() => {
                        const [sH, sM] = (formData.dailyAvailability?.start || '09:00').split(':').map(Number);
                        const [eH, eM] = (formData.dailyAvailability?.end || '17:00').split(':').map(Number);
                        const raw = (eH * 60 + eM) - (sH * 60 + sM);
                        const l = formData.lunchTime?.durationMinutes || 0;
                        const b = (formData.customBreaks || []).reduce((acc, br) => acc + (br.durationMinutes || 0), 0);
                        const netDaily = Math.max(0, (raw - l - b) / 60);
                        const capDaily = Math.min(netDaily, formData.maxHoursPerDay || 24);
                        return capDaily * formData.workDays.length;
                      })()).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">hours / week</span>
                    </h4>
                  </div>
                </div>
                
                <div className="h-px md:h-8 md:w-px bg-border/50" />
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Daily Net</p>
                    <p className="text-sm font-medium text-slate-200">
                      {((() => {
                        const [sH, sM] = (formData.dailyAvailability?.start || '09:00').split(':').map(Number);
                        const [eH, eM] = (formData.dailyAvailability?.end || '17:00').split(':').map(Number);
                        const raw = (eH * 60 + eM) - (sH * 60 + sM);
                        const l = formData.lunchTime?.durationMinutes || 0;
                        const b = (formData.customBreaks || []).reduce((acc, br) => acc + (br.durationMinutes || 0), 0);
                        return Math.max(0, (raw - l - b) / 60);
                      })()).toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Days</p>
                    <p className="text-sm font-medium text-slate-200">{formData.workDays.length} days</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Rest Time</p>
                    <p className="text-sm font-medium text-slate-200">
                      {((formData.lunchTime?.durationMinutes || 0) + (formData.customBreaks || []).reduce((acc, br) => acc + (br.durationMinutes || 0), 0))} min
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Section */}
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center space-x-2 text-primary">
              <Clock className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-white">Working Schedule</h3>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-slate-300">
                    Weekly Capacity (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={formData.weeklyHoursAvailable}
                    onChange={(e) => setFormData({ ...formData, weeklyHoursAvailable: parseInt(e.target.value) || 0 })}
                    className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                  <p className="text-[13px] text-muted-foreground">
                    Total hours you plan to work per week across all clients.
                  </p>
                  {warningMessage && (
                    <div className="flex items-start mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md animate-in fade-in">
                      <AlertCircle className="w-5 h-5 text-amber-500 mr-2 shrink-0 mt-0.5" />
                      <p className="text-[13px] font-medium text-amber-500 leading-snug">{warningMessage}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-slate-300 flex items-center mb-3">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Working Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = formData.workDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' 
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-slate-300">
                    Core Working Hours
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={formData.dailyAvailability.start}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          dailyAvailability: { ...formData.dailyAvailability, start: e.target.value } 
                        })}
                        className="flex h-10 w-full rounded-md border-0 bg-muted/30 px-3 py-2 text-sm text-foreground ring-1 ring-border/50 focus-visible:ring-primary focus-visible:ring-offset-2"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">End Time</label>
                      <input
                        type="time"
                        value={formData.dailyAvailability.end}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          dailyAvailability: { ...formData.dailyAvailability, end: e.target.value } 
                        })}
                        className="flex h-10 w-full rounded-md border-0 bg-muted/30 px-3 py-2 text-sm text-foreground ring-1 ring-border/50 focus-visible:ring-primary focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-slate-300">
                    Maximum Daily Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={formData.maxHoursPerDay}
                    onChange={(e) => setFormData({ ...formData, maxHoursPerDay: parseInt(e.target.value) || 0 })}
                    className="flex h-10 w-full rounded-md border-0 bg-muted/30 px-3 py-2 text-sm text-foreground ring-1 ring-border/50 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                  <p className="text-[13px] text-muted-foreground">
                    To prevent burnout, limit the max hours scheduled per day.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-primary">
                <Coffee className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-white">Rest & Break Schedule</h3>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-slate-300">
                    Lunch Time
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={formData.lunchTime?.start || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          lunchTime: { ...(formData.lunchTime || { durationMinutes: 60 }), start: e.target.value } 
                        })}
                        className="flex h-10 w-full rounded-md border-0 bg-muted/30 px-3 py-2 text-sm text-foreground ring-1 ring-border/50 focus-visible:ring-primary focus-visible:ring-offset-2"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Duration (mins)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.lunchTime?.durationMinutes || 0}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          lunchTime: { ...(formData.lunchTime || { start: '12:00' }), durationMinutes: parseInt(e.target.value) || 0 } 
                        })}
                        className="flex h-10 w-full rounded-md border-0 bg-muted/30 px-3 py-2 text-sm text-foreground ring-1 ring-border/50 focus-visible:ring-primary focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium leading-none text-slate-300">
                    Custom Breaks
                  </label>
                  <button type="button" onClick={addBreak} className="text-xs flex items-center py-1 px-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Plus className="w-3 h-3 mr-1" /> Add Break
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(formData.customBreaks || []).map((b) => (
                    <div key={b.id} className="flex items-center space-x-3 bg-background/50 p-3 rounded-lg border border-border/50">
                      <div className="flex-1">
                        <input
                          type="time"
                          value={b.start}
                          onChange={(e) => updateBreak(b.id, 'start', e.target.value)}
                          className="flex h-8 w-full rounded-md border-0 bg-muted/30 px-2 py-1 text-xs text-foreground ring-1 ring-border/50 focus-visible:ring-primary focus-visible:ring-offset-2"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="1"
                            value={b.durationMinutes}
                            onChange={(e) => updateBreak(b.id, 'durationMinutes', parseInt(e.target.value) || 0)}
                            className="flex h-8 w-full rounded-md border-0 bg-muted/30 px-2 py-1 text-xs text-foreground ring-1 ring-border/50 focus-visible:ring-primary focus-visible:ring-offset-2"
                          />
                          <span className="text-xs text-muted-foreground ml-2">min</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeBreak(b.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!formData.customBreaks || formData.customBreaks.length === 0) && (
                    <p className="text-sm text-muted-foreground italic text-center py-4 bg-background/30 rounded-lg border border-dashed border-border/30">
                      No custom breaks added yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4">
            {isSaved && (
              <span className="flex items-center text-sm font-medium text-emerald-500 animate-in fade-in slide-in-from-right-4">
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Settings saved successfully
              </span>
            )}
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-indigo-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
