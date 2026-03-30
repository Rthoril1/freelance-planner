'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2, LayoutGrid, Calendar, MoreVertical, X, FolderKanban, CheckCircle2, Circle, Zap, ArrowRight } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { Project } from '@/types';
import { format } from 'date-fns';
import { TacticalDropdown } from '@/components/ui/TacticalDropdown';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
  const { projects, companies, tasks, addProject, deleteProject } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', companyId: '', status: 'Active' as Project['status'] });

  const handleAdd = () => {
    if (!newProject.name || !newProject.companyId) return;
    addProject({
      id: generateId(),
      name: newProject.name,
      companyId: newProject.companyId,
      status: newProject.status,
      startDate: new Date().toISOString()
    });
    setIsAdding(false);
    setNewProject({ name: '', companyId: '', status: 'Active' });
  };

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const completed = projectTasks.filter(t => t.status === 'Completed').length;
    const total = projectTasks.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { completed, total, progress };
  };

  return (
    <div className="flex flex-col space-y-12 animate-in fade-in duration-700 min-h-[calc(100vh-120px)]">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Project Portfolio</h2>
          <p className="text-slate-400 font-medium text-sm">Strategic milestone tracking across all active initiatives</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          disabled={companies.length === 0}
          className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 whitespace-nowrap disabled:opacity-20"
        >
          <Plus className="h-4 w-4" /> Initialize Project
        </button>
      </div>

      {isAdding && (
         <div className="bg-white rounded-[40px] border border-slate-100 p-10 lg:p-12 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-8 duration-500">
           <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
           
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FolderKanban className="text-primary h-6 w-6" />
                 </div>
                 <h3 className="text-2xl font-bold tracking-tight text-slate-900">New Initiative</h3>
              </div>
              <button 
                onClick={() => setIsAdding(false)} 
                className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 hover:text-slate-900 transition-all hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
           </div>
           
           <div className="grid gap-10 md:grid-cols-12 items-start max-w-5xl">
             <div className="md:col-span-5">
               <TacticalDropdown
                 label="Client Assignment"
                 placeholder="Select Client..."
                 value={newProject.companyId}
                 onChange={(val) => setNewProject({ ...newProject, companyId: val })}
                 options={companies.map(c => ({
                   id: c.id,
                   name: c.name,
                   color: c.color
                 }))}
               />
             </div>
             <div className="md:col-span-7 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Initiative Title</label>
                <input 
                   placeholder="e.g. Q3 Brand Modernization..."
                   type="text" 
                   className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 focus:border-primary/50 outline-none transition-all font-bold text-lg text-slate-900"
                   value={newProject.name}
                   onChange={e => setNewProject({...newProject, name: e.target.value})}
                />
             </div>
           </div>

           <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-end gap-5">
             <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-xs font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest">
               Discard
             </button>
             <button onClick={handleAdd} className="px-10 py-3.5 bg-primary text-white text-xs font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
               Deploy Project
             </button>
           </div>
         </div>
      )}

      {/* Projects Grid */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
        {projects.map(project => {
          const company = companies.find(c => c.id === project.companyId);
          const { completed, total, progress } = getProjectStats(project.id);
          
          return (
            <div key={project.id} 
              className="group bg-white rounded-[40px] border border-slate-100 p-10 hover:shadow-2xl transition-all duration-300 flex flex-col min-h-[420px]"
            >
              <div className="flex justify-between items-start mb-8">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300" style={{ color: company?.color }}>
                       {company?.name || 'Unassigned Entity'}
                    </span>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight group-hover:text-primary transition-colors">{project.name}</h3>
                 </div>
                 <div className={cn(
                   "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                   project.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                 )}>
                   {project.status}
                 </div>
              </div>

              <div className="flex-1 space-y-4">
                 <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="h-4 w-4 opacity-40" />
                    <span className="text-[11px] font-bold tracking-tight">Launched {format(new Date(project.startDate), 'MMM dd, yyyy')}</span>
                 </div>
              </div>

              <div className="mt-10 space-y-8 pt-8 border-t border-slate-50">
                 <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Phase Completion</span>
                       <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-bold text-slate-900 tracking-tighter">{completed}</span>
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">/ {total} Units</span>
                       </div>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className={cn(
                         "text-5xl font-bold tracking-tighter transition-colors",
                         progress === 100 ? 'text-emerald-500' : 'text-primary'
                       )}>
                          {Math.round(progress)}<span className="text-lg opacity-40 ml-0.5">%</span>
                       </span>
                    </div>
                 </div>

                 <div className="relative h-2.5 w-full bg-slate-50 rounded-full border border-slate-100 overflow-hidden shadow-inner">
                    <div 
                       className={cn(
                         "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
                         progress === 100 ? 'bg-emerald-500' : 'bg-primary shadow-[0_0_15px_rgba(129,140,248,0.4)]'
                       )}
                       style={{ width: `${Math.max(1, progress)}%` }}
                    />
                 </div>

                 <div className="flex items-center justify-between pt-2">
                    <button 
                       onClick={() => deleteProject(project.id)}
                       className="text-[10px] font-bold uppercase tracking-widest text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                       Purge Record
                    </button>
                    <button className="flex items-center gap-2 group/btn text-primary font-bold text-xs">
                       Open Interface <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                 </div>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && !isAdding && (
          <div className="col-span-full py-32 rounded-[48px] bg-white/40 border-2 border-dashed border-slate-100 backdrop-blur-sm text-center group">
             <div className="w-24 h-24 rounded-[32px] bg-white shadow-xl border border-slate-50 mx-auto flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform duration-700">
                <LayoutGrid className="h-10 w-10 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
             </div>
             <h4 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">No Active Initiatives</h4>
             <p className="text-slate-400 font-medium text-sm max-w-sm mx-auto mb-10">Organize your tactical workflow by initializing your first project entity.</p>
             <button 
                onClick={() => setIsAdding(true)}
                disabled={companies.length === 0}
                className="px-10 py-4 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20"
             >
                {companies.length === 0 ? 'Requires Active Client' : 'Initialize First Project'}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
