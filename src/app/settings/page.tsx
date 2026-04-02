'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isWeekend, 
  isSameDay, 
  parseISO 
} from 'date-fns';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Settings2, 
  Activity, 
  Zap, 
  Clock, 
  LayoutPanelLeft,
  Monitor,
  Coffee,
  Eye,
  EyeOff,
  Calendar
} from 'lucide-react';
import { generateId, cn } from '@/lib/utils';
import { CustomPlatform, CustomAction, TaskType, Priority, EnergyLevel, UserProfile } from '@/types';
import { TASK_TYPES } from '@/lib/constants';
import { ProfilePhotoUploader } from '@/components/ui/ProfilePhotoUploader';
import { TacticalDropdown } from '@/components/ui/TacticalDropdown';
import { TacticalColorPicker } from '@/components/ui/TacticalColorPicker';
import { TacticalIconPicker } from '@/components/ui/TacticalIconPicker';

export default function SettingsPage() {
  const { 
    companies, 
    projects, 
    profile, 
    addCompany, 
    deleteCompany, 
    updateProfile,
    addCustomPlatform,
    updateCustomPlatform,
    deleteCustomPlatform,
    setProfile
  } = useStore();

  const [activeTab, setActiveTab] = useState<'general' | 'companies' | 'platforms'>('platforms');
  const [editingPlatform, setEditingPlatform] = useState<CustomPlatform | null>(null);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (profile && !localProfile) {
      setLocalProfile(profile);
    }
  }, [profile, localProfile]);

  // Helper: Calculate hours
  const getHoursBetween = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    return (eH + eM/60) - (sH + sM/60);
  };

  const calculateCapacity = (p: UserProfile) => {
    if (!p.dailyAvailability) return 0;
    const dailyShift = getHoursBetween(p.dailyAvailability.start, p.dailyAvailability.end);
    const lunchHours = (p.lunchTime?.durationMinutes || 0) / 60;
    const breakHours = (p.customBreaks || []).reduce((acc, b) => acc + (b.durationMinutes / 60), 0);
    const netDaily = dailyShift - lunchHours - breakHours;
    const weekly = netDaily * (p.workDays?.length || 0);
    return Math.round(weekly * 10) / 10;
  };

  const handleUpdateLocalProfile = (updates: Partial<UserProfile>) => {
    if (!localProfile) return;
    const newProfile = { ...localProfile, ...updates };
    const newWeekly = calculateCapacity(newProfile);
    setLocalProfile({ ...newProfile, ...updates, weeklyHoursAvailable: newWeekly });
  };

  const handleSaveProfile = () => {
    if (localProfile) {
      setProfile(localProfile);
    }
  };

  const toggleVacationDay = (day: Date) => {
    if (!localProfile) return;
    const iso = day.toISOString();
    const isExistent = localProfile.vacationDays?.some(v => isSameDay(parseISO(v), day));
    const nextDays = isExistent
      ? localProfile.vacationDays?.filter(v => !isSameDay(parseISO(v), day))
      : [...(localProfile.vacationDays || []), iso];
    handleUpdateLocalProfile({ vacationDays: nextDays });
  };

  // Stats
  const totalCompanies = companies.length;
  const totalProjects = projects.length;
  const activePlatforms = (profile?.customPlatforms || []).filter(p => !p.isHidden).length;

  const handleTogglePreset = (presetId: string) => {
    // Legacy support logic
    const currentHidden = profile?.hiddenPresetIds || [];
    const newHidden = currentHidden.includes(presetId)
      ? currentHidden.filter(id => id !== presetId)
      : [...currentHidden, presetId];
    updateProfile({ hiddenPresetIds: newHidden });
  };

  const handleToggleCustomPlatform = (id: string, currentHidden: boolean | undefined) => {
    updateCustomPlatform(id, { isHidden: !currentHidden });
  };

  const handleSavePlatform = () => {
    if (!editingPlatform) return;
    
    const isExisting = profile?.customPlatforms?.some(p => p.id === editingPlatform.id);
    if (isExisting) {
      updateCustomPlatform(editingPlatform.id, editingPlatform);
    } else {
      addCustomPlatform(editingPlatform);
    }
    
    setEditingPlatform(null);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Settings2 className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Console Config</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 leading-none">Settings</h1>
          <p className="text-slate-400 font-medium text-lg">Engineer your workspace and operational protocols</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex -space-x-3">
             <ProfilePhotoUploader />
          </div>
          <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-1">System Health</span>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-600">Operational</span>
             </div>
          </div>
        </div>
      </div>

      {/* Control Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-3xl w-fit border border-slate-100/50 backdrop-blur-sm">
        <button 
          onClick={() => setActiveTab('platforms')}
          className={cn(
            "px-8 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-3",
            activeTab === 'platforms' ? "bg-white text-primary shadow-xl shadow-primary/10 scale-[1.02]" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Zap className="w-4 h-4" />
          Protocol Architect
        </button>
        <button 
          onClick={() => setActiveTab('companies')}
          className={cn(
            "px-8 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-3",
            activeTab === 'companies' ? "bg-white text-primary shadow-xl shadow-primary/10 scale-[1.02]" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Building2 className="w-4 h-4" />
          Company Vault
        </button>
        <button 
          onClick={() => setActiveTab('general')}
          className={cn(
            "px-8 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-3",
            activeTab === 'general' ? "bg-white text-primary shadow-xl shadow-primary/10 scale-[1.02]" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <LayoutPanelLeft className="w-4 h-4" />
          Global Config
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Main Content (Left/Center) */}
        <div className="lg:col-span-8 space-y-10">
          
          {activeTab === 'platforms' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Protocols</h2>
                     <p className="text-sm text-slate-400 font-medium">Manage automation signals and task matrices</p>
                  </div>
                  <button 
                    onClick={() => {
                        setEditingPlatform({
                          id: `custom-${generateId()}`,
                          name: '',
                          icon: '⚡',
                          color: '#818CF8',
                          actions: []
                        });
                    }}
                    className="group bg-primary text-white px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    Custom Protocol
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile?.customPlatforms?.map(p => {
                    const isImage = typeof p.icon === 'string' && (p.icon.startsWith('data:image/') || p.icon.startsWith('http'));
                    return (
                    <div key={p.id} className={cn(
                      "group bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm relative transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50",
                      p.isHidden && "opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
                    )}>
                       <div className="flex items-start justify-between mb-8">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-3xl overflow-hidden flex items-center justify-center text-3xl shadow-inner border border-slate-50 relative" style={{ backgroundColor: `${p.color}10`, color: p.color }}>
                                 {isImage ? <img src={p.icon} alt={p.name} className="w-full h-full object-cover" /> : p.icon}
                              </div>
                              <div>
                                 <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                                 <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Protocol Map</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <button 
                                onClick={() => handleToggleCustomPlatform(p.id, p.isHidden)}
                                className={cn(
                                  "p-2 rounded-xl transition-all border shrink-0",
                                  p.isHidden ? "bg-slate-50 text-slate-300 border-slate-100 hover:text-slate-500" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                )}
                                title={p.isHidden ? "Show in Task Ledger" : "Hide from Task Ledger"}
                              >
                                {!p.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => deleteCustomPlatform(p.id)}
                                className="p-2 rounded-xl bg-slate-50 text-slate-300 border border-slate-100 hover:text-rose-500 hover:border-rose-100 transition-all shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </div>

                        <div className="space-y-3 mb-10">
                           <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              <span>Signal Distribution</span>
                              <span>{p.actions.length} Signals</span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(p.actions.length * 20, 100)}%`, backgroundColor: p.color }} />
                           </div>
                        </div>

                        <button 
                          onClick={() => setEditingPlatform(p)}
                          className="w-full py-4 rounded-2xl bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all transform group-hover:translate-y-[-4px]"
                        >
                          Calibrate Protocol
                        </button>
                    </div>
                  )})}
               </div>
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm animate-in zoom-in-95 duration-500">
              <div className="p-10 border-b border-slate-50">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Profile</h2>
                <p className="text-sm text-slate-400 font-medium">Manage companies and business entities</p>
              </div>
              <div className="p-10 space-y-12">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-8 bg-slate-50/50 rounded-[32px] border border-slate-50 group hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{ backgroundColor: company.color }}>
                        {company.name[0]}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{company.name}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-1">
                          {projects.filter(p => p.companyId === company.id).length} Active Projects
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteCompany(company.id)}
                      className="p-4 text-slate-300 hover:text-rose-500 hover:bg-white rounded-2xl transition-all shadow-none hover:shadow-sm"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                <button 
                  onClick={() => addCompany({ 
                    id: generateId(), 
                    name: 'New Company', 
                    color: '#818CF8', 
                    description: 'New business entity', 
                    status: 'Active' 
                  })}
                  className="w-full py-8 border-2 border-dashed border-slate-100 rounded-[32px] text-slate-300 hover:text-primary hover:border-primary/30 transition-all font-bold uppercase tracking-[0.2em] text-[10px] flex flex-col items-center gap-4"
                >
                  <Plus className="w-6 h-6" />
                  Register Entity
                </button>
              </div>
            </div>
          )}

          {activeTab === 'general' && localProfile && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
               <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                  
                  <div className="relative z-10 space-y-10">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <Clock className="w-6 h-6 text-primary" />
                           </div>
                           <div>
                              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Shift Calculator</h2>
                              <p className="text-sm text-slate-400 font-medium">Engineer your operational bandwidth</p>
                           </div>
                        </div>
                        <button 
                           onClick={handleSaveProfile}
                           className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                        >
                           <Save className="w-4 h-4" />
                           Update Logic
                        </button>
                     </div>
                     
                     <div className="space-y-10">
                        {/* Work Days */}
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Operational Days</label>
                           <div className="flex gap-2">
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                                 const dayVal = i === 6 ? 0 : i + 1; // Adjust for 0=Sunday
                                 const isActive = localProfile.workDays.includes(dayVal);
                                 return (
                                    <button 
                                       key={day}
                                       onClick={() => {
                                          const current = localProfile.workDays;
                                          const next = isActive ? current.filter(d => d !== dayVal) : [...current, dayVal];
                                          handleUpdateLocalProfile({ workDays: next });
                                       }}
                                       className={cn(
                                          "flex-1 py-4 rounded-2xl font-bold text-xs transition-all border",
                                          isActive ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50/50 border-slate-50 text-slate-400 hover:border-primary/20"
                                       )}
                                    >
                                       {day}
                                    </button>
                                 );
                              })}
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           {/* Daily Period */}
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Daily Shift Period</label>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-slate-300 uppercase block">Start</span>
                                    <input 
                                       type="time" 
                                       className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none"
                                       value={localProfile.dailyAvailability.start}
                                       onChange={(e) => handleUpdateLocalProfile({ dailyAvailability: { ...localProfile.dailyAvailability, start: e.target.value } })}
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-slate-300 uppercase block">End</span>
                                    <input 
                                       type="time" 
                                       className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none"
                                       value={localProfile.dailyAvailability.end}
                                       onChange={(e) => handleUpdateLocalProfile({ dailyAvailability: { ...localProfile.dailyAvailability, end: e.target.value } })}
                                    />
                                 </div>
                              </div>
                           </div>

                           {/* Lunch */}
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                                 Lunch Window
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-slate-300 uppercase block">Duration</span>
                                    <select 
                                       className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none"
                                       value={localProfile.lunchTime?.durationMinutes}
                                       onChange={(e) => handleUpdateLocalProfile({ lunchTime: { ...localProfile.lunchTime!, durationMinutes: parseInt(e.target.value) } })}
                                    >
                                       <option value={30}>30 Min</option>
                                       <option value={45}>45 Min</option>
                                       <option value={60}>1 Hour</option>
                                       <option value={90}>1.5 Hours</option>
                                    </select>
                                 </div>
                                 <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-slate-300 uppercase block">Starts At</span>
                                    <input 
                                       type="time" 
                                       className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none"
                                       value={localProfile.lunchTime?.start}
                                       onChange={(e) => handleUpdateLocalProfile({ lunchTime: { ...localProfile.lunchTime!, start: e.target.value } })}
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Breaks */}
                        <div className="space-y-6">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Micro-Breaks & Rest</label>
                              <button 
                                 onClick={() => handleUpdateLocalProfile({ customBreaks: [...(localProfile.customBreaks || []), { id: generateId(), start: '10:30', durationMinutes: 15 }] })}
                                 className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2"
                              >
                                 <Plus className="w-3 h-3" /> Add Rest
                              </button>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(localProfile.customBreaks || []).map((brk, idx) => (
                                 <div key={brk.id} className="flex items-center gap-4 bg-slate-50/30 border border-slate-100 rounded-2xl p-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300">
                                       <Coffee className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                       <input 
                                          type="time"
                                          className="bg-transparent font-bold text-xs text-slate-600 outline-none"
                                          value={brk.start}
                                          onChange={(e) => {
                                             const next = [...localProfile.customBreaks!];
                                             next[idx].start = e.target.value;
                                             handleUpdateLocalProfile({ customBreaks: next });
                                          }}
                                       />
                                       <select 
                                          className="bg-transparent font-bold text-xs text-slate-400 outline-none"
                                          value={brk.durationMinutes}
                                          onChange={(e) => {
                                             const next = [...localProfile.customBreaks!];
                                             next[idx].durationMinutes = parseInt(e.target.value);
                                             handleUpdateLocalProfile({ customBreaks: next });
                                          }}
                                       >
                                          <option value={15}>15m</option>
                                          <option value={20}>20m</option>
                                          <option value={30}>30m</option>
                                       </select>
                                    </div>
                                    <button 
                                       onClick={() => handleUpdateLocalProfile({ customBreaks: localProfile.customBreaks!.filter(b => b.id !== brk.id) })}
                                       className="w-8 h-8 rounded-lg bg-rose-50 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        </div>

                         {/* WORK AVAILABILITY CALENDAR - REMOVED AS PER USER REQUEST */}
                     </div>
                  </div>
               </div>

               <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                     <div className="flex items-center gap-8">
                        <div className="w-20 h-20 rounded-[32px] bg-white/10 flex items-center justify-center border border-white/10">
                           <Activity className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-bold tracking-tight mb-2">Capacity Derivation</h3>
                           <p className="text-slate-400 font-medium max-w-lg">Your weekly availability is automatically derived from your operational shift structure, accounting for breaks and rest windows.</p>
                        </div>
                     </div>
                     
                     <div className="flex flex-col sm:flex-row gap-6 items-center">
                        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 flex flex-col items-center justify-center min-w-[160px]">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Daily Net Bandwidth</span>
                           <div className="flex items-baseline gap-1">
                              <h4 className="text-4xl font-black text-white tracking-tighter leading-none">
                                 {localProfile.workDays.length > 0 ? (Math.round((localProfile.weeklyHoursAvailable / localProfile.workDays.length) * 10) / 10) : 0}
                              </h4>
                              <span className="text-sm font-bold text-slate-500">H/D</span>
                           </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 flex flex-col items-center justify-center min-w-[220px]">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Weekly Operational Target</span>
                           <div className="flex items-baseline gap-2">
                              <h4 className="text-6xl font-black text-primary tracking-tighter leading-none">{localProfile.weeklyHoursAvailable}</h4>
                              <span className="text-2xl font-bold text-slate-700">HRS</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Sidebar / Stats (Right) */}
        <div className="lg:col-span-4 space-y-10">
           <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm space-y-8">
              <h3 className="text-lg font-bold text-slate-900 px-2">Console Insights</h3>
              
              <div className="space-y-4">
                 {[
                    { label: 'Registered Entities', value: totalCompanies, icon: Building2, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                    { label: 'Active Matrices', value: totalProjects, icon: LayoutPanelLeft, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Protocols Online', value: activePlatforms, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' }
                 ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-3xl border border-slate-50 hover:border-primary/10 transition-all">
                       <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                          <stat.icon className={cn("w-6 h-6", stat.color)} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{stat.label}</p>
                          <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none mt-1">{stat.value}</p>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="pt-6 border-t border-slate-50">
                 <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-3">Sync Status</p>
                    <div className="flex items-center gap-3">
                       <div className="flex-1 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                          <div className="w-[100%] h-full bg-primary rounded-full" />
                       </div>
                       <span className="text-xs font-bold text-primary">Connected</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Protocol Architect Modal (Signals) */}
      {editingPlatform && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-[900px] max-h-[85vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
              <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-[28px] flex items-center justify-center text-3xl shadow-inner border border-slate-50" style={{ backgroundColor: `${editingPlatform.color}10`, color: editingPlatform.color }}>
                        {(typeof editingPlatform.icon === 'string' && (editingPlatform.icon.startsWith('http') || editingPlatform.icon.startsWith('data:image/')))
                          ? <img src={editingPlatform.icon} alt={editingPlatform.name} className="w-full h-full object-cover rounded-[22px]" />
                          : <span>{editingPlatform.icon || '?'}</span>
                        }
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingPlatform.id.startsWith('custom-') ? editingPlatform.name : editingPlatform.name + ' Protocol'}</h3>
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Configure Tactical Signals</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setEditingPlatform(null)}
                  className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all border border-slate-100"
                 >
                   <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                 <div className="space-y-12 max-w-[750px] mx-auto">
                    {/* Platform Base Config */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-slate-50/50 rounded-[40px] p-8 border border-slate-100">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Protocol Identity</label>
                          <div className="flex gap-4">
                             <TacticalIconPicker 
                               value={typeof editingPlatform.icon === 'string' ? editingPlatform.icon : '❓'}
                               onChange={(icon) => setEditingPlatform({...editingPlatform, icon})}
                             />
                             <input 
                               className="flex-1 bg-white border border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-primary/30 transition-all shadow-sm"
                               value={editingPlatform.name}
                               onChange={(e) => setEditingPlatform({...editingPlatform, name: e.target.value})}
                               placeholder="Platform Name"
                             />
                          </div>
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Tactical Color Signature</label>
                          <TacticalColorPicker 
                            value={editingPlatform.color}
                            onChange={(color) => setEditingPlatform({...editingPlatform, color})}
                          />
                       </div>
                    </div>

                    {/* Matrix Configuration */}
                    <div className="space-y-8">
                       <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-3">
                             <Zap className="w-5 h-5 text-primary" />
                             <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">Signal Matrix</h4>
                          </div>
                          <button 
                            onClick={() => {
                               setEditingPlatform({
                                 ...editingPlatform,
                                 actions: [
                                   { name: 'New Signal', type: 'Deep Work', priority: 'Medium', energyLevel: 'Medium', duration: 1, daysPerWeek: 5, timesPerDay: 1 },
                                   ...editingPlatform.actions
                                 ]
                               });
                            }}
                            className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                             Add Signal
                          </button>
                       </div>
                       
                       <div className="space-y-6">
                         {editingPlatform.actions.map((act: CustomAction, i: number) => (
                            <div key={i} className="bg-slate-100/30 border border-slate-100 rounded-[32px] p-8 space-y-8 relative group/signal animate-in slide-in-from-top-4 duration-500">
                               <button 
                                 onClick={() => {
                                    const newActs = [...editingPlatform.actions];
                                    newActs.splice(i, 1);
                                    setEditingPlatform({...editingPlatform, actions: newActs});
                                 }}
                                 className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-rose-400 flex items-center justify-center border border-rose-100 opacity-0 group-hover/signal:opacity-100 transition-opacity z-10 shadow-sm"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                               
                               {/* Tier 1: Primary Definition */}
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Signal Name</label>
                                     <input 
                                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-primary/30 transition-all shadow-sm"
                                        value={act.name}
                                        onChange={(e) => {
                                           const newActs = [...editingPlatform.actions];
                                           newActs[i].name = e.target.value;
                                           setEditingPlatform({...editingPlatform, actions: newActs});
                                        }}
                                     />
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Mode</label>
                                     <TacticalDropdown 
                                       variant="compact"
                                       value={act.type}
                                       onChange={(val) => {
                                          const newActs = [...editingPlatform.actions];
                                          newActs[i].type = val as TaskType;
                                          setEditingPlatform({...editingPlatform, actions: newActs});
                                       }}
                                       options={TASK_TYPES.map(t => ({ id: t, name: t }))}
                                     />
                                  </div>
                               </div>

                               {/* Tier 2: Intensity Metrics */}
                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Hours</label>
                                     <input 
                                        type="number"
                                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 text-center outline-none focus:border-primary/30 transition-all shadow-sm"
                                        value={act.duration}
                                        onChange={(e) => {
                                           const newActs = [...editingPlatform.actions];
                                           newActs[i].duration = parseFloat(e.target.value) || 0;
                                           setEditingPlatform({...editingPlatform, actions: newActs});
                                        }}
                                     />
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Priority</label>
                                     <TacticalDropdown 
                                       variant="compact"
                                       value={act.priority}
                                       onChange={(val) => {
                                          const newActs = [...editingPlatform.actions];
                                          newActs[i].priority = val as Priority;
                                          setEditingPlatform({...editingPlatform, actions: newActs});
                                       }}
                                       options={['Low', 'Medium', 'High'].map(p => ({ id: p, name: p }))}
                                     />
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Energy</label>
                                     <TacticalDropdown 
                                       variant="compact"
                                       value={act.energyLevel}
                                       onChange={(val) => {
                                          const newActs = [...editingPlatform.actions];
                                          newActs[i].energyLevel = val as EnergyLevel;
                                          setEditingPlatform({...editingPlatform, actions: newActs});
                                       }}
                                       options={['Low', 'Medium', 'High'].map(e => ({ id: e, name: e }))}
                                     />
                                  </div>
                               </div>

                               {/* Tier 3: Deployment Logic */}
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100/50">
                                  <div className="space-y-3">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Deployment: Days/Week</label>
                                     <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-slate-100">
                                        {[1, 2, 3, 4, 5, 6, 7].map(v => (
                                           <button 
                                              key={v}
                                              onClick={() => {
                                                 const newActs = [...editingPlatform.actions];
                                                 newActs[i].daysPerWeek = v;
                                                 setEditingPlatform({...editingPlatform, actions: newActs});
                                              }}
                                              className={cn(
                                                 "flex-1 h-10 rounded-lg text-xs font-bold transition-all",
                                                 act.daysPerWeek === v 
                                                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105 z-10" 
                                                    : "text-slate-400 hover:bg-slate-50"
                                              )}
                                           >
                                              {v}
                                           </button>
                                        ))}
                                     </div>
                                  </div>
                                  <div className="space-y-3">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Deployment: Times/Day</label>
                                     <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-slate-100">
                                        {[1, 2, 3, 4, 5].map(v => (
                                           <button 
                                              key={v}
                                              onClick={() => {
                                                 const newActs = [...editingPlatform.actions];
                                                 newActs[i].timesPerDay = v;
                                                 setEditingPlatform({...editingPlatform, actions: newActs});
                                              }}
                                              className={cn(
                                                 "flex-1 h-10 rounded-lg text-xs font-bold transition-all",
                                                 act.timesPerDay === v 
                                                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105 z-10" 
                                                    : "text-slate-400 hover:bg-slate-50"
                                              )}
                                           >
                                              {v}x
                                           </button>
                                        ))}
                                     </div>
                                  </div>
                                </div>
                            </div>
                         ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="px-10 py-8 border-t border-slate-50 shrink-0 flex gap-4 bg-slate-50/30">
                 <button 
                   onClick={() => setEditingPlatform(null)}
                   className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all font-bold"
                 >
                   Discard Changes
                 </button>
                 <button 
                   onClick={handleSavePlatform}
                   className="flex-[2] py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                   <Save className="w-5 h-5" />
                   Commit Protocol
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
