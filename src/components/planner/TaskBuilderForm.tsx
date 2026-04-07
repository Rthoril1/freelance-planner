'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Plus, Activity, X } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { TaskType, Priority, EnergyLevel } from '@/types';
import { PRESET_PLATFORMS, TASK_TYPES } from '@/lib/constants';
import { TacticalDropdown } from '@/components/ui/TacticalDropdown';
import { cn } from '@/lib/utils';
import { addMinutes } from 'date-fns';

export interface TaskBuilderFormProps {
  initialDate?: Date | null;
  hideFrequency?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export function TaskBuilderForm({ 
  initialDate, 
  hideFrequency = false, 
  onSuccess, 
  onCancel,
  showCancelButton = false,
  className 
}: TaskBuilderFormProps) {
  const { tasks, projects, companies, addTask, profile } = useStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [newTask, setNewTask] = useState({
    name: '',
    projectId: '',
    type: 'Deep Work' as TaskType,
    priority: 'Medium' as Priority,
    estimatedDuration: 1,
    energyLevel: 'Medium' as EnergyLevel,
    notes: '',
    frequency: { timesPerDay: 1, daysPerWeek: hideFrequency ? 1 : 5 }
  });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (projects.length > 0 && !newTask.projectId) {
      setNewTask(prev => ({ ...prev, projectId: projects[0].id }));
    }
  }, [projects, newTask.projectId]);

  useEffect(() => {
    // If explicitly hiding frequency (e.g. scheduling a single cell instance), default to 1x 1d.
    if (hideFrequency) {
      setNewTask(prev => ({ ...prev, frequency: { timesPerDay: 1, daysPerWeek: 1 } }));
    }
  }, [hideFrequency]);

  const applyPreset = (platformName: string, action: any) => {
    setNewTask(prev => ({
      ...prev,
      name: action.name || '',
      type: action.type || 'Deep Work',
      priority: action.priority || 'Medium',
      energyLevel: action.energyLevel || 'Medium',
      estimatedDuration: action.duration || action.estimatedDuration || 1,
      frequency: hideFrequency ? { timesPerDay: 1, daysPerWeek: 1 } : {
        timesPerDay: action.timesPerDay || 1,
        daysPerWeek: action.daysPerWeek || 5
      }
    }));
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 10);
  };

  const displayedPlatforms = (profile?.customPlatforms || []).filter(p => !p.isHidden);
  const currentPlatform = displayedPlatforms.find(p => p.id === selectedPlatform);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTask.name || !newTask.projectId) return;

    let scheduledStart: string | undefined = undefined;
    let scheduledEnd: string | undefined = undefined;
    let status: 'Todo' | 'Scheduled' = 'Todo';

    if (initialDate) {
      scheduledStart = initialDate.toISOString();
      scheduledEnd = addMinutes(initialDate, newTask.estimatedDuration * 60).toISOString();
      status = 'Scheduled';
    }

    addTask({
      id: generateId(),
      ...newTask,
      platformId: selectedPlatform || undefined,
      status,
      scheduledStart,
      scheduledEnd
    });
    
    if (initialDate) {
       addNotification(`Scheduled ${newTask.name} for ${newTask.estimatedDuration}H`, 'success');
    } else {
       addNotification(`Blueprint ${newTask.name} created`, 'success');
    }

    setNewTask({...newTask, name: '', notes: ''});
    
    if (onSuccess) {
      onSuccess();
    } else {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 10);
    }
  };

  return (
    <form onSubmit={handleAdd} className={cn("bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm relative overflow-hidden group", className)}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-12 -translate-y-12 pointer-events-none" />
      
      {showCancelButton && onCancel && (
        <button type="button" onClick={onCancel} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-20">
          <X className="w-5 h-5" />
        </button>
      )}
      
      <div className="flex items-center gap-4 mb-10 relative z-10 transition-transform group-hover:translate-x-1">
         <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
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
                   <span className="text-base flex items-center justify-center">
                      {typeof p.icon === 'string' && (p.icon.startsWith('data:image/') || p.icon.startsWith('http')) ? <img src={p.icon} alt={p.name} className="w-4 h-4 object-cover rounded shadow-sm" /> : p.icon}
                   </span> {p.name}
                 </button>
               ))}
            </div>
         </div>

         {selectedPlatform && currentPlatform && (
           <div className="animate-in slide-in-from-top-4 duration-500 space-y-4 bg-slate-50/30 rounded-3xl p-6 border border-slate-50">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Available Templates</label>
              <div className="grid grid-cols-2 gap-3">
                 {currentPlatform.actions.map((act, i) => (
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
                 autoFocus
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

            {!hideFrequency && (
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
            )}
         </div>

         {/* Calculated Load Card */}
         {!hideFrequency && (
           <div className="p-8 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
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
         )}

         <div className="flex gap-4 pt-4">
            {onCancel ? (
              <button 
                type="button" 
                onClick={onCancel}
                className="flex-1 px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
              >
                Cancel
              </button>
            ) : (
              <button 
                type="button" 
                onClick={() => { setNewTask({...newTask, name: '', notes: ''}); setSelectedPlatform(null); }} 
                className="flex-1 px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
              >
                Clear
              </button>
            )}
            <button 
              type="submit" 
              disabled={!newTask.name || !newTask.projectId} 
              className="flex-[2] px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-2xl bg-primary text-white shadow-xl shadow-primary/30 hover:-translate-y-0.5 active:-translate-y-0 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
            >
              Deploy Task
            </button>
         </div>
      </div>
    </form>
  );
}
