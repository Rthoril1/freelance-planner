'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2, Building2, MoreVertical, Zap, FolderKanban, BarChart3, ArrowRight } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { TacticalColorPicker } from '@/components/ui/TacticalColorPicker';
import { cn } from '@/lib/utils';

export default function CompaniesPage() {
  const { companies, projects, tasks, addCompany, deleteCompany } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newCompany, setNewCompany] = useState({ 
    name: '', 
    description: '', 
    color: '#818CF8',
    hourlyRate: 0,
    currencyCode: 'USD'
  });

  const handleAdd = () => {
    if (!newCompany.name) return;
    addCompany({
      id: generateId(),
      name: newCompany.name,
      description: newCompany.description,
      color: newCompany.color,
      status: 'Active',
      priority: 'Medium',
      hourlyRate: Number(newCompany.hourlyRate) || 0,
      currencyCode: newCompany.currencyCode
    });
    setIsAdding(false);
    setNewCompany({ 
      name: '', 
      description: '', 
      color: '#818CF8',
      hourlyRate: 0,
      currencyCode: 'USD'
    });
  };

  const getCompanyStats = (companyId: string) => {
    const companyProjects = projects.filter(p => p.companyId === companyId);
    const companyTasks = tasks.filter(t => companyProjects.some(p => p.id === t.projectId));
    const completedTasks = companyTasks.filter(t => t.status === 'Completed').length;
    
    return {
      projectCount: companyProjects.length,
      taskCount: companyTasks.length,
      completionRate: companyTasks.length > 0 ? Math.round((completedTasks / companyTasks.length) * 100) : 0
    };
  };

  return (
    <div className="flex flex-col space-y-12 animate-in fade-in duration-700 min-h-[calc(100vh-120px)]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Client Portfolio</h2>
          <p className="text-slate-400 font-medium text-sm">Strategic management of your professional ecosystem</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" /> Add New Client
        </button>
      </div>

      {isAdding && (
         <div className="bg-white rounded-[40px] border border-slate-100 p-10 lg:p-12 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-8 duration-500">
           <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
           <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                 <Building2 className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">Client Setup</h3>
           </div>
           
           <div className="grid gap-10 md:grid-cols-12 items-start">
             <div className="md:col-span-5 space-y-3">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Business Identity</label>
               <input 
                 placeholder="Enter client name..."
                 type="text" 
                 className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 focus:border-primary/50 outline-none transition-all font-bold text-lg text-slate-900"
                 value={newCompany.name}
                 onChange={e => setNewCompany({...newCompany, name: e.target.value})}
               />
             </div>

             <div className="md:col-span-3">
               <TacticalColorPicker
                 label="Brand Palette"
                 value={newCompany.color}
                 onChange={(val) => setNewCompany({...newCompany, color: val})}
               />
             </div>

             <div className="md:col-span-4 lg:col-span-4 space-y-3">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Sector / Notes</label>
               <input 
                 placeholder="Brief description..."
                 type="text" 
                 className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 focus:border-primary/50 outline-none transition-all font-bold text-sm text-slate-900"
                 value={newCompany.description}
                 onChange={e => setNewCompany({...newCompany, description: e.target.value})}
               />
             </div>

             <div className="md:col-span-4 space-y-3">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Tactical Rate (Hourly)</label>
               <div className="relative">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</div>
                 <input 
                    placeholder="0.00"
                    type="number" 
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-10 pr-6 py-4 focus:border-primary/50 outline-none transition-all font-bold text-lg text-slate-900"
                    value={newCompany.hourlyRate}
                    onChange={e => setNewCompany({...newCompany, hourlyRate: Number(e.target.value)})}
                 />
               </div>
             </div>
           </div>

           <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-end gap-5">
             <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-xs font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest">
               Cancel Initialization
             </button>
             <button onClick={handleAdd} className="px-10 py-3.5 bg-primary text-white text-xs font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
               Complete Setup
             </button>
           </div>
         </div>
      )}


      {/* Grid */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {companies.map(company => {
          const stats = getCompanyStats(company.id);
          
          return (
            <div key={company.id} 
              className="group bg-white rounded-[40px] border border-slate-100 p-10 hover:shadow-2xl transition-all duration-300 flex flex-col min-h-[400px]"
            >
              <div className="flex justify-between items-start mb-10">
                 <div className="w-16 h-16 rounded-[24px] bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500" style={{ color: company.color }}>
                    <Building2 className="h-7 w-7" />
                 </div>
                 <button className="p-2 text-slate-200 hover:text-primary transition-all opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-5 w-5" />
                 </button>
              </div>

              <div className="flex-1 mb-8">
                 <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 group-hover:text-primary transition-colors">{company.name}</h3>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: company.color }} />
                 </div>
                 <p className="text-sm text-slate-400 font-medium leading-relaxed line-clamp-2">
                    {company.description || 'Enterprise-level strategic partnership.'}
                 </p>
              </div>

              <div className="space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                          <FolderKanban className="w-2.5 h-2.5" /> Initiatives
                       </span>
                       <span className="text-2xl font-bold text-slate-900">{stats.projectCount}</span>
                    </div>
                    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                          <Zap className="w-2.5 h-2.5" /> Hourly Rate
                       </span>
                       <span className="text-2xl font-bold text-slate-900">
                          {company.currencyCode === 'USD' ? '$' : company.currencyCode} {company.hourlyRate || 0}
                       </span>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                    <button 
                       onClick={() => deleteCompany(company.id)}
                       className="text-[10px] font-bold uppercase tracking-widest text-slate-200 hover:text-rose-500 transition-colors"
                    >
                       Remove Account
                    </button>
                    <button className="flex items-center gap-2 group/btn text-primary font-bold text-xs">
                       View Projects <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                 </div>
              </div>
            </div>
          );
        })}

        {companies.length === 0 && !isAdding && (
          <div className="col-span-full py-32 rounded-[48px] bg-white/40 border-2 border-dashed border-slate-100 backdrop-blur-sm text-center group">
             <div className="w-24 h-24 rounded-[32px] bg-white shadow-xl border border-slate-50 mx-auto flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform duration-700">
                <Zap className="h-10 w-10 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
             </div>
             <h4 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">No Active Clients</h4>
             <p className="text-slate-400 font-medium text-sm max-w-sm mx-auto mb-10">Initialize your first client identity to begin structural management.</p>
             <button 
                onClick={() => setIsAdding(true)}
                className="px-10 py-4 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
             >
                Start Initialization
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
