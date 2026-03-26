'use client';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2 } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { TaskType, Priority, EnergyLevel } from '@/types';

import { PRESET_PLATFORMS, PresetAction } from '@/lib/constants';

export default function TasksPage() {
  const { tasks, projects, companies, addTask, deleteTask, profile } = useStore();
  const [newTask, setNewTask] = useState({
    name: '',
    projectId: '',
    type: 'Deep Work' as TaskType,
    priority: 'Medium' as Priority,
    estimatedDuration: 1,
    energyLevel: 'Medium' as EnergyLevel,
    notes: '',
    frequency: { timesPerDay: 1, daysPerWeek: 1 }
  });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const applyPreset = (platformName: string, action: PresetAction) => {
    setNewTask(prev => ({
      ...prev,
      name: action.name,
      type: action.type,
      priority: action.priority,
      energyLevel: action.energyLevel,
      estimatedDuration: action.duration
    }));
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 10);
  };

  // Pre-select the first project if none is selected to save time
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
    // We intentionally don't close the form so you can add tasks rapidly
    setNewTask({...newTask, name: '', notes: ''});
    
    // Auto-focus back to the input for the next task
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 10);
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-3xl font-bold tracking-tight">Tasks Queue</h2>
        {projects.length === 0 && (
          <span className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
            Please create a project first
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 overflow-hidden pb-2">
        {/* Left Column: Quick Task Builder */}
        <div className="w-full lg:w-1/2 xl:w-5/12 shrink-0 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
         <form onSubmit={handleAdd} className="rounded-xl border border-border bg-card p-6 shadow-xl relative overflow-hidden mb-12">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h3 className="text-lg font-medium mb-4">Quick Task Builder</h3>

          {/* 1. Platform & Template Selector */}
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">1. Select Platform</p>
              <div className="flex flex-wrap gap-2 pb-2">
                {PRESET_PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${selectedPlatform === p.id ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border/50 bg-background hover:bg-muted'}`}
                  >
                    <span>{p.icon}</span> {p.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedPlatform && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                <p className="text-sm font-medium text-muted-foreground mb-2">2. Choose Task (Click to preload)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
                  {PRESET_PLATFORMS.find(p => p.id === selectedPlatform)?.actions.map((act, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyPreset(PRESET_PLATFORMS.find(p => p.id === selectedPlatform)?.name || '', act)}
                      className="text-left p-3 rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                    >
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{act.name}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                        <span className="bg-muted px-1.5 py-0.5 rounded text-foreground/80">{act.duration}h</span>
                        <span>•</span>
                        <span>{act.type.replace('/Testing','')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <div>
              <label className="block text-sm font-medium mb-1">Task Name</label>
              <input 
                ref={nameInputRef}
                type="text" 
                autoFocus
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 focus:ring-2 focus:ring-primary transition-shadow"
                value={newTask.name}
                onChange={e => setNewTask({...newTask, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <select 
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 focus:ring-2 focus:ring-primary transition-shadow"
                value={newTask.projectId}
                onChange={e => setNewTask({...newTask, projectId: e.target.value})}
              >
                <option value="">Select Project</option>
                {projects.map(p => {
                  const company = companies.find(c => c.id === p.companyId);
                  return <option key={p.id} value={p.id}>{p.name} ({company?.name})</option>
                })}
              </select>
            </div>
          </div>

          <div className="lg:col-span-4 border-t border-border/50 pt-4 mt-6">
            <p className="text-sm font-medium text-muted-foreground mb-3">3. Quick Adjustments (Optional)</p>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4">
              
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Deep Work', 'Operative', 'Administrative', 'Meetings', 'Creative', 'Research', 'QA/Testing'].map(t => (
                    <button key={t} type="button" onClick={() => setNewTask(prev => ({...prev, type: t as TaskType}))} 
                      className={`px-3 py-1.5 text-xs rounded-md border transition-all ${newTask.type === t ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30' : 'bg-background hover:bg-muted border-border/50'}`}>
                      {t.replace('/Testing', '')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration (hrs)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[0.5, 1, 1.5, 2, 3, 4, 8, 24].map(t => (
                    <button key={t} type="button" onClick={() => setNewTask(prev => ({...prev, estimatedDuration: t}))} 
                      className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${newTask.estimatedDuration === t ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30' : 'bg-background hover:bg-muted border-border/50'}`}>
                      {t}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
                <div className="flex flex-wrap gap-1.5">
                  {['High', 'Medium', 'Low'].map(t => (
                    <button key={t} type="button" onClick={() => setNewTask(prev => ({...prev, priority: t as Priority}))} 
                      className={`px-3 py-1.5 text-xs rounded-md border transition-all ${newTask.priority === t ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30' : 'bg-background hover:bg-muted border-border/50'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Energy</label>
                <div className="flex flex-wrap gap-1.5">
                  {['High', 'Medium', 'Low'].map(t => (
                    <button key={t} type="button" onClick={() => setNewTask(prev => ({...prev, energyLevel: t as EnergyLevel}))} 
                      className={`px-3 py-1.5 text-xs rounded-md border transition-all ${newTask.energyLevel === t ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30' : 'bg-background hover:bg-muted border-border/50'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 mt-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Times per Day</label>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} type="button" 
                      onClick={() => setNewTask(prev => ({...prev, frequency: { ...prev.frequency!, timesPerDay: v }}))}
                      className={`px-4 py-1.5 text-xs rounded-md border transition-all ${newTask.frequency?.timesPerDay === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/50'}`}>
                      {v}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Days per Week</label>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map(v => (
                    <button key={v} type="button" 
                      onClick={() => setNewTask(prev => ({...prev, frequency: { ...prev.frequency!, daysPerWeek: v }}))}
                      className={`px-4 py-1.5 text-xs rounded-md border transition-all ${newTask.frequency?.daysPerWeek === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/50'}`}>
                      {v} days
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Impact & Capacity Preview */}
            <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="text-lg font-bold text-primary">
                    {(newTask.frequency?.timesPerDay || 1) * (newTask.frequency?.daysPerWeek || 1) * newTask.estimatedDuration}h
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary/80 uppercase tracking-wider">Total Weekly Impact</p>
                  <p className="text-[10px] text-muted-foreground italic">
                    {newTask.estimatedDuration}h × {newTask.frequency?.timesPerDay}x/d × {newTask.frequency?.daysPerWeek}d
                  </p>
                </div>
              </div>
              
              {profile?.weeklyHoursAvailable && (
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Capacity Check</p>
                  <p className={`text-xs font-bold ${(tasks.reduce((acc, t) => acc + t.estimatedDuration, 0) + ((newTask.frequency?.timesPerDay || 1) * (newTask.frequency?.daysPerWeek || 1) * newTask.estimatedDuration)) > (profile.weeklyHoursAvailable || 60) ? 'text-destructive' : 'text-emerald-500'}`}>
                    {tasks.reduce((acc, t) => acc + t.estimatedDuration, 0) + ((newTask.frequency?.timesPerDay || 1) * (newTask.frequency?.daysPerWeek || 1) * newTask.estimatedDuration)} / {profile.weeklyHoursAvailable}h
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border/50 flex gap-3 justify-end items-center bg-card">
            <span className="text-xs text-muted-foreground mr-auto italic opacity-70">Tip: Press Enter to rapidly add to queue!</span>
            <button type="button" onClick={() => { setNewTask({...newTask, name: '', notes: ''}); setSelectedPlatform(null); }} className="px-5 py-2.5 text-sm font-medium rounded-lg hover:bg-muted transition-colors border border-border">Clear</button>
            <button type="submit" disabled={!newTask.name || !newTask.projectId} className="px-5 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">Add to Queue</button>
          </div>
        </form>
        </div>

        {/* Right Column: Tasks List */}
        <div className="w-full lg:w-1/2 xl:w-7/12 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 bg-card/60 p-4 border border-border/50 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
             <div>
               <h3 className="text-xl font-bold tracking-tight">Tasks Queue</h3>
               <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Backlog for scheduling</p>
             </div>
             {profile?.weeklyHoursAvailable && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Total Task Load</p>
                      <p className={`text-sm font-mono font-bold ${tasks.reduce((acc, t) => acc + (t.estimatedDuration * (t.frequency?.timesPerDay || 1) * (t.frequency?.daysPerWeek || 1)), 0) > profile.weeklyHoursAvailable ? 'text-destructive' : 'text-primary'}`}>
                        {tasks.reduce((acc, t) => acc + (t.estimatedDuration * (t.frequency?.timesPerDay || 1) * (t.frequency?.daysPerWeek || 1)), 0)}h
                      </p>
                    </div>
                    <div className="h-8 w-px bg-border/50" />
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Remaining</p>
                      <p className={`text-sm font-mono font-bold ${tasks.reduce((acc, t) => acc + (t.estimatedDuration * (t.frequency?.timesPerDay || 1) * (t.frequency?.daysPerWeek || 1)), 0) > profile.weeklyHoursAvailable ? 'text-destructive' : 'text-emerald-500'}`}>
                        {Math.max(0, profile.weeklyHoursAvailable - tasks.reduce((acc, t) => acc + (t.estimatedDuration * (t.frequency?.timesPerDay || 1) * (t.frequency?.daysPerWeek || 1)), 0))}h / {profile.weeklyHoursAvailable}h
                      </p>
                    </div>
                  </div>
                  <div className="w-full min-w-[180px] h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                    <div className={`h-full rounded-full ${tasks.reduce((acc, t) => acc + (t.estimatedDuration * (t.frequency?.timesPerDay || 1) * (t.frequency?.daysPerWeek || 1)), 0) > profile.weeklyHoursAvailable ? 'bg-destructive' : 'bg-primary'}`} 
                      style={{ width: `${Math.min(100, (tasks.reduce((acc, t) => acc + (t.estimatedDuration * (t.frequency?.timesPerDay || 1) * (t.frequency?.daysPerWeek || 1)), 0) / profile.weeklyHoursAvailable) * 100)}%` }} 
                    />
                  </div>
                </div>
              )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 overflow-y-auto items-start custom-scrollbar pr-2 pb-10 content-start flex-1">
            {tasks.filter(t => t.status === 'Todo').map(task => {
              const project = projects.find(p => p.id === task.projectId);
              const company = companies.find(c => c.id === project?.companyId);
              const platform = PRESET_PLATFORMS.find(p => p.id === task.platformId);
              const uiColor = platform?.color || company?.color || 'gray';
              return (
                <div key={task.id} 
                  className="flex flex-col justify-between p-3 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden h-full"
                  style={{ backgroundColor: platform ? `${platform.color}0C` : undefined, borderColor: platform ? `${platform.color}40` : 'hsl(var(--border))' }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: uiColor }} />
                  <div className="pl-3 mb-3">
                    <h4 className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer leading-tight mb-2 line-clamp-2">
                       {task.name}
                    </h4>
                    <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground items-center">
                      {platform && (
                        <span className="font-medium px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0" style={{ backgroundColor: `${platform.color}15`, color: platform.color }}>
                          <span>{platform.icon}</span> {platform.name}
                        </span>
                      )}
                      <span className="font-medium bg-secondary text-secondary-foreground px-1 py-0.5 rounded border border-border/50 truncate max-w-[90px]">{project?.name}</span>
                      <span className="font-mono bg-muted px-1 py-0.5 rounded shrink-0">{task.estimatedDuration}h</span>
                      <span className={task.priority === 'High' ? 'text-destructive font-semibold flex items-center gap-1 bg-destructive/10 px-1 py-0.5 rounded shrink-0' : 'bg-muted px-1 py-0.5 rounded shrink-0'}>
                        {task.priority === 'High' && <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />}
                        {task.priority}
                      </span>
                      <span className="bg-muted px-1 py-0.5 rounded truncate">{task.type.replace('/Testing','')}</span>
                      {task.frequency && (task.frequency.timesPerDay > 1 || task.frequency.daysPerWeek > 1) && (
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-bold">
                          {task.frequency.timesPerDay}x/d • {task.frequency.daysPerWeek}d
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pl-3 flex items-center justify-between border-t border-border/40 pt-2 mt-auto">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Queue</span>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors border border-transparent hover:border-destructive/20 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {tasks.filter(t => t.status === 'Todo').length === 0 && (
              <div className="col-span-full py-16 text-center rounded-2xl border-2 border-dashed border-border bg-muted/30">
                <p className="text-muted-foreground font-medium">Task queue is empty.</p>
                <p className="text-sm text-muted-foreground mt-1">Add tasks to be scheduled into your weekly planner.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
