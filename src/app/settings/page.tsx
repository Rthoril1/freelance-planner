'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { 
  Plus, 
  Trash2, 
  Save, 
  ChevronRight, 
  Clock,
  Layers, 
  Briefcase,
  History,
  Timer,
  X,
  ShieldCheck,
  Settings as SettingsIcon,
  Zap,
  Utensils,
  Coffee,
  Moon,
  Info
} from 'lucide-react';
import { generateId } from '@/lib/utils';
import { CustomPlatform, TaskType, Priority, EnergyLevel, UserProfile } from '@/types';
import { PRESET_PLATFORMS } from '@/lib/constants';
import { TacticalColorPicker } from '@/components/ui/TacticalColorPicker';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { profile, setProfile } = useStore();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<'platforms' | 'profile' | 'hours'>('platforms');
  const [editingPlatform, setEditingPlatform] = useState<CustomPlatform | null>(null);

  // Profile Details State (initially from store)
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  
  useEffect(() => {
    if (profile && !localProfile) {
      setLocalProfile(profile);
    }
  }, [profile, localProfile]);

  const calculateDecimalHours = useCallback((timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  }, []);

  const syncCapacity = useCallback(() => {
    if (!localProfile) return;
    const startDec = calculateDecimalHours(localProfile.dailyAvailability.start);
    let endDec = calculateDecimalHours(localProfile.dailyAvailability.end);
    if (endDec < startDec) endDec += 24;
    const rawShift = endDec - startDec;
    const lunchHours = (localProfile.lunchTime?.durationMinutes || 0) / 60;
    const breaksHours = (localProfile.customBreaks?.reduce((acc, b) => acc + b.durationMinutes, 0) || 0) / 60;
    const dailyMax = Math.max(0, rawShift - lunchHours - breaksHours);
    const weeklyGoal = dailyMax * localProfile.workDays.length;
    const roundedDaily = Math.round(dailyMax * 10) / 10;
    const roundedWeekly = Math.round(weeklyGoal * 10) / 10;

    if (localProfile.maxHoursPerDay !== roundedDaily || localProfile.weeklyHoursAvailable !== roundedWeekly) {
      setLocalProfile(prev => prev ? { 
        ...prev, 
        maxHoursPerDay: roundedDaily,
        weeklyHoursAvailable: roundedWeekly
      } : null);
    }
  }, [localProfile, calculateDecimalHours]);

  useEffect(() => {
    if (localProfile) {
      syncCapacity();
    }
  }, [
    localProfile?.dailyAvailability.start, 
    localProfile?.dailyAvailability.end, 
    localProfile?.workDays.length, 
    localProfile?.lunchTime, 
    localProfile?.customBreaks,
    syncCapacity
  ]);

  if (!profile || !localProfile) return null;

  const handleSaveProfile = async () => {
    if (!localProfile) return;
    await setProfile(localProfile);
    addNotification('Settings updated successfully', 'success');
  };

  const toggleWorkDay = (day: number) => {
    if (!localProfile) return;
    const currentDays = [...localProfile.workDays];
    const index = currentDays.indexOf(day);
    if (index >= 0) {
      if (currentDays.length > 1) currentDays.splice(index, 1);
    } else {
      currentDays.push(day);
    }
    setLocalProfile({ ...localProfile, workDays: currentDays.sort() });
  };

  const addCustomBreak = () => {
    if (!localProfile) return;
    const newBreak = { id: generateId(), start: '10:00', durationMinutes: 15 };
    setLocalProfile({
      ...localProfile,
      customBreaks: [...(localProfile.customBreaks || []), newBreak]
    });
  };

  const removeCustomBreak = (id: string) => {
    if (!localProfile) return;
    setLocalProfile({
      ...localProfile,
      customBreaks: (localProfile.customBreaks || []).filter(b => b.id !== id)
    });
  };

  const updateCustomBreak = (id: string, updates: Partial<{ start: string; durationMinutes: number }>) => {
    if (!localProfile) return;
    setLocalProfile({
      ...localProfile,
      customBreaks: (localProfile.customBreaks || []).map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const displayedPlatforms = [
    ...PRESET_PLATFORMS.filter(p => !localProfile.hiddenPresetIds?.includes(p.id)),
    ...(localProfile.customPlatforms || [])
  ];

  const handleEditPlatform = (platform: any) => {
    const isPreset = PRESET_PLATFORMS.some(p => p.id === platform.id);
    if (isPreset) {
      setEditingPlatform({
        ...platform,
        id: `override-${platform.id}-${generateId()}`,
        isOverride: true,
        originalPresetId: platform.id
      } as any);
    } else {
      setEditingPlatform({ ...platform });
    }
  };

  const handleSavePlatform = () => {
    if (!editingPlatform || !localProfile) return;
    let updatedCustom = [...(localProfile.customPlatforms || [])];
    const index = updatedCustom.findIndex(p => p.id === editingPlatform.id);
    
    if (index >= 0) {
      updatedCustom[index] = editingPlatform;
    } else {
      updatedCustom.push(editingPlatform);
    }

    setLocalProfile({ ...localProfile, customPlatforms: updatedCustom });
    setEditingPlatform(null);
    addNotification('Protocol blueprint cached', 'info');
  };

  const TASK_TYPES: TaskType[] = ['Deep Work', 'Operative', 'Administrative', 'Meetings', 'Creative', 'Research', 'QA/Testing'];

  return (
    <div className="flex flex-col space-y-12 animate-in fade-in duration-700 min-h-[calc(100vh-120px)] overflow-hidden">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 shrink-0">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Control Interface</h2>
          <p className="text-slate-400 font-medium text-sm">Fine-tune your tactical environment and blueprint matrices</p>
        </div>
        <button 
          onClick={handleSaveProfile}
          className="flex items-center gap-2 rounded-[24px] bg-primary px-10 py-4 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 whitespace-nowrap"
        >
          <Save className="h-4 w-4" /> Persist State
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-10 overflow-hidden min-h-0 relative">
        <div className="w-full lg:w-72 flex flex-col space-y-2 shrink-0">
           {(['platforms', 'profile', 'hours'] as const).map(tab => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center justify-between p-5 rounded-[24px] transition-all group",
                  activeTab === tab ? "bg-white border border-slate-100 shadow-sm" : "hover:bg-slate-50"
                )}
             >
                <div className="flex items-center gap-4">
                   <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm", activeTab === tab ? "bg-primary text-white" : "bg-white text-slate-300 group-hover:text-slate-900 border border-slate-50")}>
                      {tab === 'platforms' && <Layers className="w-5 h-5" />}
                      {tab === 'profile' && <Briefcase className="w-5 h-5" />}
                      {tab === 'hours' && <Clock className="w-5 h-5" />}
                   </div>
                   <span className={cn("text-sm font-bold capitalize", activeTab === tab ? "text-slate-900" : "text-slate-400 group-hover:text-slate-900")}>{tab}</span>
                </div>
                {activeTab === tab && <ChevronRight className="w-4 h-4 text-primary" />}
             </button>
           ))}
        </div>

        <div className="flex-1 bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
           <div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-16">
              {activeTab === 'platforms' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-slate-900">Protocol Architect</h3>
                        <p className="text-slate-400 text-sm font-medium">Define your task matrices and blueprint associations.</p>
                     </div>
                     <button 
                        onClick={() => setEditingPlatform({ id: generateId(), name: 'New Protocol', icon: '⚡', color: '#818CF8', actions: [] })}
                        className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                     >
                        <Plus className="w-6 h-6" />
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {displayedPlatforms.map(platform => (
                       <div key={platform.id} className="group bg-slate-50/50 rounded-[32px] border border-slate-100 p-8 hover:bg-white hover:shadow-xl transition-all duration-300">
                          <div className="flex items-center justify-between mb-6">
                             <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl border border-slate-50">
                                {platform.icon}
                             </div>
                             <button
                                onClick={() => handleEditPlatform(platform)}
                                className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-primary hover:border-primary/20 transition-all opacity-0 group-hover:opacity-100"
                             >
                                <ChevronRight className="w-5 h-5" />
                             </button>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 mb-1">{platform.name}</h4>
                          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{platform.actions.length} Signals</p>
                       </div>
                     ))}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-12 animate-in fade-in duration-500 max-w-2xl">
                   <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-slate-900">Environment Node</h3>
                      <p className="text-slate-400 text-sm font-medium">Manage your operational identity.</p>
                   </div>
                   <div className="grid gap-10">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 px-1">Operator</label>
                         <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 text-xl font-bold text-slate-900 focus:bg-white focus:border-primary/50 outline-none transition-all"
                            value={localProfile.name}
                            onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                         />
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 px-1">Tactical Role</label>
                         <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 text-xl font-bold text-slate-900 focus:bg-white focus:border-primary/50 outline-none transition-all"
                            value={localProfile.type}
                            onChange={(e) => setLocalProfile({ ...localProfile, type: e.target.value })}
                         />
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'hours' && (
                <div className="space-y-12 animate-in fade-in duration-500 max-w-4xl">
                   <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-slate-900">Capacity Matrix</h3>
                      <p className="text-slate-400 text-sm font-medium">Fine-tune your tactical bandwidth and recharge windows.</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="bg-slate-50/50 rounded-[32px] border border-slate-100 p-8 space-y-6">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                            <History className="w-4 h-4" /> Operational Days
                         </label>
                         <div className="flex flex-wrap gap-2">
                             {[1, 2, 3, 4, 5, 6, 7].map(day => (
                               <button 
                                 key={day}
                                 onClick={() => toggleWorkDay(day)}
                                 className={cn(
                                   "w-12 h-12 rounded-2xl font-bold text-sm transition-all",
                                   localProfile.workDays.includes(day) ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white border border-slate-100 text-slate-300 hover:text-slate-900"
                                 )}
                               >
                                 {['M', 'T', 'W', 'T', 'F', 'S', 'S'][day-1]}
                               </button>
                             ))}
                         </div>
                      </div>
                      <div className="bg-slate-50/50 rounded-[32px] border border-slate-100 p-8 space-y-6">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Operation Window
                         </label>
                         <div className="grid grid-cols-2 gap-4">
                            <input 
                              type="time" 
                              className="w-full bg-white border border-slate-100 rounded-2xl px-4 py-3 text-center text-lg font-bold text-slate-900 outline-none"
                              value={localProfile.dailyAvailability.start}
                              onChange={(e) => setLocalProfile({ ...localProfile, dailyAvailability: { ...localProfile.dailyAvailability, start: e.target.value } })}
                            />
                            <input 
                              type="time" 
                              className="w-full bg-white border border-slate-100 rounded-2xl px-4 py-3 text-center text-lg font-bold text-slate-900 outline-none"
                              value={localProfile.dailyAvailability.end}
                              onChange={(e) => setLocalProfile({ ...localProfile, dailyAvailability: { ...localProfile.dailyAvailability, end: e.target.value } })}
                            />
                         </div>
                      </div>

                      <div className="bg-slate-50/50 rounded-[32px] border border-slate-100 p-8 space-y-6">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                            <Utensils className="w-4 h-4" /> Lunch Schedule
                         </label>
                         <div className="grid grid-cols-2 gap-4">
                            <input 
                              type="time" 
                              className="w-full bg-white border border-slate-100 rounded-2xl px-4 py-3 text-center text-lg font-bold text-slate-900 outline-none"
                              value={localProfile.lunchTime?.start}
                              onChange={(e) => setLocalProfile({ ...localProfile, lunchTime: { ...localProfile.lunchTime, start: e.target.value } })}
                            />
                            <div className="relative group">
                               <input 
                                 type="number" 
                                 className="w-full bg-white border border-slate-100 rounded-2xl px-4 py-3 text-center text-lg font-bold text-slate-900 outline-none pr-10"
                                 value={localProfile.lunchTime?.durationMinutes}
                                 onChange={(e) => setLocalProfile({ ...localProfile, lunchTime: { ...localProfile.lunchTime, durationMinutes: parseInt(e.target.value) || 0 } })}
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-slate-300">Min</span>
                            </div>
                         </div>
                      </div>

                      <div className="bg-slate-50/50 rounded-[32px] border border-slate-100 p-8 space-y-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                          <Coffee className="w-4 h-4" /> Custom Recharge Windows
                        </label>
                        <div className="flex items-center justify-between gap-4">
                           <p className="text-[10px] font-bold text-slate-400">Add dynamic break nodes to your shift.</p>
                           <button 
                             onClick={addCustomBreak}
                             className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                           >
                             <Plus className="w-5 h-5" />
                           </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {localProfile.customBreaks?.map(b => (
                             <div key={b.id} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-sm relative group/break">
                                <button 
                                  onClick={() => removeCustomBreak(b.id)}
                                  className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center border border-rose-100 opacity-0 group-hover/break:opacity-100 transition-opacity z-10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-2 gap-3">
                                   <input 
                                     type="time" 
                                     className="w-full bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-center text-sm font-bold text-slate-900 outline-none"
                                     value={b.start}
                                     onChange={(e) => updateCustomBreak(b.id, { start: e.target.value })}
                                   />
                                   <div className="relative">
                                      <input 
                                        type="number" 
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-center text-sm font-bold text-slate-900 outline-none pr-6"
                                        value={b.durationMinutes}
                                        onChange={(e) => updateCustomBreak(b.id, { durationMinutes: parseInt(e.target.value) || 0 })}
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-slate-300 italic">M</span>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>

                      <div className="md:col-span-2 p-10 bg-primary/5 border border-primary/10 rounded-[40px] flex items-center justify-between shadow-inner">
                         <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center">
                               <Timer className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                               <p className="text-4xl font-bold tracking-tighter text-slate-900">{Math.round(localProfile.weeklyHoursAvailable * 10) / 10}H</p>
                               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Global Weekly Bandwidth</p>
                            </div>
                         </div>
                         <div className="text-right">
                             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{localProfile.maxHoursPerDay}H Theoretical Daily Cap</p>
                         </div>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>

      {editingPlatform && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="shrink-0 p-10 lg:px-12 border-b border-slate-50 flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <TacticalColorPicker color={editingPlatform.color} onChange={(c) => setEditingPlatform({...editingPlatform, color: c})} />
                    <div>
                       <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Protocol</h3>
                       <p className="text-slate-400 text-sm font-medium">Fine-tune blueprint matrices.</p>
                    </div>
                 </div>
                 <button onClick={() => setEditingPlatform(null)} className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all">
                    <X className="w-6 h-6" />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 lg:p-12">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                     <div className="lg:col-span-4 space-y-10">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Title</label>
                           <input 
                              type="text" 
                              className="w-full bg-slate-50 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white border border-transparent focus:border-primary/50 outline-none transition-all"
                              value={editingPlatform.name}
                              onChange={(e) => setEditingPlatform({...editingPlatform, name: e.target.value})}
                           />
                        </div>
                     </div>
                     <div className="lg:col-span-8 space-y-8">
                        <div className="flex items-center justify-between">
                           <h4 className="text-2xl font-bold text-slate-900 tracking-tight">Matrices</h4>
                           <button 
                              onClick={() => setEditingPlatform({...editingPlatform, actions: [...editingPlatform.actions, { name: 'New Matrix', duration: 1, type: 'Shallow Work' as any, priority: 'Medium', energyLevel: 'Medium' }]})}
                              className="px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                           >
                              Add Signal
                           </button>
                        </div>
                        {editingPlatform.actions.map((act, i) => (
                           <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-[32px] p-8 space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                 <input 
                                    className="bg-white border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800"
                                    value={act.name}
                                    onChange={(e) => {
                                       const newActs = [...editingProfile.actions];
                                       newActs[i].name = e.target.value;
                                       setEditingPlatform({...editingPlatform, actions: newActs});
                                    }}
                                 />
                                 <select 
                                   value={act.type}
                                   onChange={(e) => {
                                      const newActs = [...editingPlatform.actions];
                                      newActs[i].type = e.target.value as TaskType;
                                      setEditingPlatform({...editingPlatform, actions: newActs});
                                   }}
                                   className="bg-white border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-400 outline-none"
                                 >
                                   {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                 </select>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
              </div>
              <div className="shrink-0 p-10 lg:px-12 bg-slate-50/50 flex gap-6">
                 <button onClick={() => setEditingPlatform(null)} className="flex-1 py-5 rounded-[24px] text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-100 transition-all">
                    Discard
                 </button>
                 <button onClick={handleSavePlatform} className="flex-[2] py-5 rounded-[24px] text-xs font-bold uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                    Persist Blueprint
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
