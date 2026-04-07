'use client';

import { useStore } from '@/store/useStore';
import { Trash2, CheckCircle2, Zap, LayoutGrid, ShieldCheck, MoreVertical } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { PRESET_PLATFORMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { TaskBuilderForm } from '@/components/planner/TaskBuilderForm';

export default function TasksPage() {
  const { tasks, projects, companies, addTask, deleteTask, profile, updateTask } = useStore();

  const allPlatforms = [
    ...(profile?.customPlatforms || []),
    ...PRESET_PLATFORMS.filter(p => !profile?.customPlatforms?.some(cp => cp.id === p.id))
  ];

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
           <TaskBuilderForm />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-min">
                 {tasks.filter(t => !t.parentTaskId).map(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    const company = companies.find(c => c.id === project?.companyId);
                    const platform = allPlatforms.find(p => p.id === task.platformId);
                    const projectColor = project?.color || company?.color || "#6366f1";
                     const uiColor = platform?.color || projectColor;

                    return (
                       <div key={task.id} className="group bg-white rounded-[32px] border border-slate-100 p-6 hover:shadow-xl transition-all duration-300 relative flex flex-col min-h-[220px] overflow-hidden" style={{ backgroundColor: projectColor + "0D" }}>
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
                             <span className="px-3 py-1 bg-white rounded-lg text-[9px] font-bold uppercase tracking-widest border" style={{ color: projectColor, borderColor: projectColor + "30" }}>{project?.name || "Project-Less"}</span>
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
