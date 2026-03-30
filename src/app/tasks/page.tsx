'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2, CheckCircle2, Zap, LayoutGrid, Timer, Gauge, ShieldCheck, X, MoreVertical, Search, ArrowRight, Activity } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { TaskType, Priority, EnergyLevel } from '@/types';
import { PRESET_PLATFORMS, TASK_TYPES } from '@/lib/constants';
import { TacticalDropdown } from '@/components/ui/TacticalDropdown';
import { cn } from '@/lib/utils';

export default function TasksPage() {
  const { tasks, projects, companies, addTask, deleteTask, profile, updateTask } = useStore();
  const [newTask, setNewTask] = useState({
    name: '',
    projectId: '',
    type: 'Deep Work' as TaskType,
    priority: 'Medium' as Priority,
    estimatedDuration: 1,
    energyLevel: 'Medium' as EnergyLevel,
    notes: '',
    frequency: { timesPerDay: 1, daysPerWeek: 5 }
  });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const presetPlatforms = PRESET_PLATFORMS.map(p => {
    const override = profile?.customPlatforms?.find(cp => cp.id === `override-${p.id}`);
    return override || p;
  }).filter(p => {
    const baseId = p.id.replace('override-', '');
    return !profile?.hiddenPresetIds?.includes(baseId);
  });

  const purelyCustomPlatforms = (profile?.customPlatforms || []).filter(p => !p.id.startsWith('override-') && !p.isHidden);

  const displayedPlatforms = [...presetPlatforms, ...purelyCustomPlatforms];

  const currentPlatform = displayedPlatforms.find(p => p.id === selectedPlatform);

  const applyPreset = (platformName: string, action: any) => {
    setNewTask(prev => ({
      ...prev,
      name: action.name,
      type: action.type,
      priority: action.priority,
      energyLevel: action.energyLevel,
      estimatedDuration: action.duration,
      frequency: {
        timesPerDay: action.timesPerDay || prev.frequency?.timesPerDay || 1,
        daysPerWeek: action.daysPerWeek || prev.frequency?.daysPerWeek || 5
      }
    }));
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 10);
  };

  useEffect(() => {
    if (projects.length > 0 && !newTask.projectId) {
      setNewTask(prev => ({ ...prev, projectId: projects[0].id }));
    }
  }, [projects, newTask.projectId]);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTask.name || !newTask.projectId) return;
    addTask({
      id: generateId(),
      ...newTask,
      platformId: selectedPlatform || undefined,
      status: 'Todo'
    });
    setNewTask({...newTask, name: '', notes: ''});
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 10);
  };

  const totalLoad = tasks.filter(t => !t.parentTaskId).reduce((acc, t) => acc + (t.estimatedDuration * (t.frequency?.daysPerWeek || 1) * (t.frequency?.timesPerDay || 1)), 0);

  return (
    <div className="flex flex-col space-y-12 animate-in fade-in duration-700 min-h-[calc(100vh-120px)] overflow-hidden">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 shrink-0">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Task Ledger</h2>
          <p className="text-slate-400 font-medium text-sm">Strategic backlog and template architecture</p>
        </div>
        
        {profile?.weeklyHoursAvailable && (
          <div className="flex items-center gap-8 bg-white px-8 py-3.5 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Total Load</span>
                <span className={cn("text-2xl font-bold leading-none tracking-tighter", totalLoad > profile.weeklyHoursAvailable ? 'text-rose-500' : 'text-primary')}>{totalLoad}H</span>
             </div>
             <div className="w-px h-10 bg-slate-50" />
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Saturation</span>
                <span className={cn("text-2xl font-bold leading-none tracking-tighter", totalLoad > profile.weeklyHoursAvailable ? 'text-rose-500' : 'text-emerald-500')}>{Math.round((totalLoad / profile.weeklyHoursAvailable) * 100)}%</span>
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-10 overflow-hidden min-h-0 relative">
        
        {/* Task Builder (Left) */}
        <div className="lg:w-[450px] xl:w-[500px] shrink-0 overflow-y-auto custom-scrollbar flex flex-col space-y-8 pb-10">
           <form onSubmit={handleAdd} className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
              
              <div className="flex items-center gap-4 mb-10 relative z-10 transition-transform group-hover:translate-x-1">
                 <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-primary" />
                 </div>
                 <h3 className="text-2xl font-bold tracking-tight text-slate-900">Task Builder</h3>
              </div>

              <div className="space-y-10 relative z-10">
                 {/* Source Selection */}
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Tactical Source</label>
                    <div className="flex flex-wrap gap-2.5">
                       {displayedPlatforms.map((p) => (
                         <button
                           key={p.id}
                           type="button"
                           onClick={() => setSelectedPlatform(p.id)}
                           className={cn(
                             "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest",
                             selectedPlatform === p.id 
                               ? "bg-white border-primary shadow-xl shadow-primary/10 scale-105 z-10" 
                               : "bg-slate-50/50 border-slate-50 text-slate-400 hover:border-primary/20 hover:text-slate-900"
                           )}
                           style={{ borderColor: selectedPlatform === p.id ? p.color : undefined, color: selectedPlatform === p.id ? p.color : undefined }}
                         >
                           <span className="text-base">{p.icon}</span> {p.name}
                         </button>
                       ))}
                    </div>
                 </div>

                 {selectedPlatform && (
                   <div className="animate-in slide-in-from-top-4 duration-500 space-y-4 bg-slate-50/30 rounded-3xl p-6 border border-slate-50">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Available Templates</label>
                      <div className="grid grid-cols-2 gap-3">
                         {currentPlatform?.actions.map((act, i) => (
                           <button
                             key={i}
                             type="button"
                             onClick={() => applyPreset(currentPlatform.name, act)}
                             className="text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-primary/40 transition-all group/btn shadow-sm"
                           >
                             <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800 group-hover/btn:text-primary transition-colors truncate">{act.name}</p>
                             <span className="text-[10px] font-bold text-primary/40 mt-1 block">{act.duration}H Logic</span>
                           </button>
                         ))}
                      </div>
                   </div>
                 )}

                 <div className="space-y-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Task Definition</label>
                       <input 
                         ref={nameInputRef}
                         type="text" 
                         placeholder="Enter description..."
                         className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-4 focus:border-primary/50 outline-none transition-all font-bold text-lg text-slate-900"
                         value={newTask.name}
                         onChange={e => setNewTask({...newTask, name: e.target.value})}
                       />
                    </div>

                    <TacticalDropdown
                       label="Target Project"
                       placeholder="Select Project..."
                       value={newTask.projectId}
                       onChange={(val) => setNewTask({ ...newTask, projectId: val })}
                       options={projects.map(p => ({
                         id: p.id,
                         name: p.name,
                         subName: companies.find(c => c.id === p.companyId)?.name,
                         color: companies.find(c => c.id === p.companyId)?.color
                       }))}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                       <TacticalDropdown 
                          label="Mode"
                          value={newTask.type}
                          onChange={(val) => setNewTask({...newTask, type: val as TaskType})}
                          options={TASK_TYPES.map(t => ({ id: t, name: t }))}
                       />
                       <TacticalDropdown 
                          label="Priority"
                          value={newTask.priority}
                          onChange={(val) => setNewTask({...newTask, priority: val as Priority})}
                          options={['Low', 'Medium', 'High'].map(p => ({ id: p, name: p }))}
                       />
                       <TacticalDropdown 
                          label="Energy"
                          value={newTask.energyLevel}
                          onChange={(val) => setNewTask({...newTask, energyLevel: val as EnergyLevel})}
                          options={['Low', 'Medium', 'High'].map(e => ({ id: e, name: e }))}
                       />
                    </div>
                 </div>

                 {/* Tactical Config Grid */}
                 <div className="space-y-8 pt-8 border-t border-slate-50">
                    <div className="space-y-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 block">Task Duration</span>
                       <div className="flex gap-2">
                          {[0.5, 1, 2, 4].map(v => (
                            <button key={v} type="button" 
                              onClick={() => setNewTask(prev => ({...prev, estimatedDuration: v}))}
                              className={cn(
                                "flex-1 h-10 rounded-xl border font-bold text-xs transition-all",
                                newTask.estimatedDuration === v 
                                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                                  : "bg-slate-50/50 border-slate-50 text-slate-400 hover:border-primary/20"
                              )}>
                              {v < 1 ? '30m' : `${v}H`}
                            </button>
                          ))}
                          <div className="relative flex-1 group">
                             <input 
                                type="number"
                                step="0.5"
                                placeholder="Custom"
                                className="w-full h-10 bg-white border border-slate-100 rounded-xl px-4 font-bold text-center text-xs text-slate-800 focus:border-primary/50 outline-none transition-all shadow-sm"
                                value={newTask.estimatedDuration}
                                onChange={e => setNewTask({...newTask, estimatedDuration: parseFloat(e.target.value) || 0})}
                             />
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 pointer-events-none group-focus-within:opacity-0 transition-opacity">HRS</span>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 block">Daily Freq</span>
                          <div className="flex gap-2">
                             {[1, 2, 3, 4, 5].map(v => (
                               <button key={v} type="button" 
                                 onClick={() => setNewTask(prev => ({...prev, frequency: { ...prev.frequency!, timesPerDay: v }}))}
                                 className={cn(
                                   "flex-1 h-10 rounded-xl border font-bold text-xs transition-all",
                                   newTask.frequency?.timesPerDay === v 
                                     ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                                     : "bg-slate-50/50 border-slate-50 text-slate-400 hover:border-primary/20"
                                 )}>
                                 {v}x
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 block">Weekly Dist</span>
                          <div className="flex gap-2">
                             {[1, 2, 3, 4, 5, 6, 7].map(v => (
                               <button key={v} type="button" 
                                 onClick={() => setNewTask(prev => ({...prev, frequency: { ...prev.frequency!, daysPerWeek: v }}))}
                                 className={cn(
                                   "flex-1 h-10 rounded-xl border font-bold text-xs transition-all",
                                   newTask.frequency?.daysPerWeek === v 
                                     ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                                     : "bg-slate-50/50 border-slate-50 text-slate-400 hover:border-primary/20"
                                 )}>
                                 {v}d
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Calculated Load Card */}
                 <div className="p-8 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                          <Activity className="w-6 h-6 text-primary" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Allocated Bandwidth</p>
                          <p className="text-xs font-bold text-slate-500">Global weekly impact</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-4xl font-bold tracking-tighter text-primary leading-none">
                         {(newTask.frequency?.timesPerDay || 1) * (newTask.frequency?.daysPerWeek || 1) * newTask.estimatedDuration || 0}
                         <span className="text-lg opacity-40 ml-1">H</span>
                       </p>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => { setNewTask({...newTask, name: '', notes: ''}); setSelectedPlatform(null); }} 
                      className="flex-1 px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                    >
                      Clear
                    </button>
                    <button 
                      type="submit" 
                      disabled={!newTask.name || !newTask.projectId} 
                      className="flex-[2] px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-2xl bg-primary text-white shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                    >
                      Deploy Task
                    </button>
                 </div>
              </div>
           </form>
        </div>

        {/* Task Ledger (Right) */}
        <div className="flex-1 flex flex-col h-full bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden min-h-0 relative">
           <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Zap className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Active Backlog</h3>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{tasks.filter(t => !t.parentTaskId).length} Managed Blueprints</p>
                 </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                 <MoreVertical className="w-5 h-5" />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-min">
                 {tasks.filter(t => !t.parentTaskId).map(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    const company = companies.find(c => c.id === project?.companyId);
                    const platform = displayedPlatforms.find(p => p.id === task.platformId);
                    const uiColor = platform?.color || company?.color || '#818CF8';

                    return (
                       <div key={task.id} className="group bg-white rounded-[32px] border border-slate-100 p-8 hover:shadow-xl transition-all duration-300 relative flex flex-col min-h-[220px]">
                          <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ backgroundColor: uiColor }} />
                          
                          <div className="flex justify-between items-start mb-6">
                             <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: uiColor }}>{platform?.name || 'GENERIC PROTOCOL'}</span>
                                <h4 className="text-lg font-bold tracking-tight text-slate-800 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{task.name}</h4>
                             </div>
                             {task.status === 'Scheduled' && (
                                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500 border border-emerald-100">
                                   <CheckCircle2 className="w-4 h-4" />
                                </div>
                             )}
                          </div>

                          <div className="flex flex-wrap gap-2 mb-8">
                             <span className="px-3 py-1 bg-slate-50 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">{project?.name || 'Project-Less'}</span>
                             <span className={cn(
                               "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border",
                               task.priority === 'High' ? "bg-orange-50 text-orange-500 border-orange-100" : "bg-slate-50 text-slate-400 border-slate-100"
                             )}>{task.priority} Priority</span>
                          </div>

                          <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-slate-900 tracking-tighter">{task.estimatedDuration}H</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{task.frequency?.timesPerDay}x Daily · {task.frequency?.daysPerWeek}d Weekly</span>
                             </div>
                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                   onClick={() => {
                                      const half = task.estimatedDuration / 2;
                                      updateTask(task.id, { estimatedDuration: half });
                                      addTask({ ...task, id: generateId(), name: `${task.name} (Part 2)`, estimatedDuration: half });
                                   }}
                                   className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                >
                                   <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteTask(task.id)} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                       </div>
                    );
                 })}

                 {tasks.filter(t => !t.parentTaskId).length === 0 && (
                    <div className="col-span-full py-40 border-2 border-dashed border-slate-50 rounded-[40px] text-center opacity-30 select-none">
                       <ShieldCheck className="w-12 h-12 mx-auto mb-6 text-primary" />
                       <p className="text-xl font-bold tracking-tight text-slate-900">Ledger Offline</p>
                       <p className="text-[10px] font-black uppercase tracking-widest mt-2">Initialize templates to begin backlog management</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
