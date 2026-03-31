'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2, Building2, MoreVertical, Zap, FolderKanban, ArrowRight, ArrowLeft, X, Camera, Image as ImageIcon, Loader2, Calendar, CheckCircle2, Circle, ListTodo, Activity } from 'lucide-react';
import { format, isThisMonth } from 'date-fns';
import { generateId } from '@/lib/utils';
import { TacticalColorPicker } from '@/components/ui/TacticalColorPicker';
import { cn } from '@/lib/utils';
import { uploadToStorage, supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';

function CompanyWorkspace({ companyId, onBack }: { companyId: string; onBack: () => void }) {
  const { companies, updateCompany, projects, tasks, addProject, deleteProject, updateProject, updateTask } = useStore();
  const company = companies.find(c => c.id === companyId);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', status: 'Active' as any, color: '#6366f1' });

  // Dashboard Accordion State
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  if (!company) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImageSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
    e.target.value = '';
  };

  const handleApplyCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;

    try {
      setIsUploadingLogo(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to crop image");

      const file = new File([croppedBlob], `logo.jpg`, { type: 'image/jpeg' });
      const path = `logos/${user.id}/${generateId()}-${file.name}`;
      const url = await uploadToStorage('profile_assets', path, file);
      
      await updateCompany(companyId, { logoUrl: url });
      setCropImageSrc(null);
    } catch (error) {
       console.error(`Failed to upload logo`, error);
       alert("Upload failed. Ensure Supabase storage bucket exists.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleAddProject = () => {
    if (!newProject.name) return;
    addProject({
      id: generateId(),
      name: newProject.name,
      companyId: company.id,
      color: newProject.color,
      status: newProject.status,
      startDate: new Date().toISOString()
    });
    setNewProject({ name: '', status: 'Active', color: '#6366f1' });
    setIsAddingProject(false);
  };

  const companyProjects = projects.filter(p => p.companyId === company.id);
  const companyTasks = tasks.filter(t => companyProjects.some(p => p.id === t.projectId));

  const currentMonthHours = companyTasks
    .filter(t => t.status === 'Completed' && t.completedAt && isThisMonth(new Date(t.completedAt)))
    .reduce((acc, task) => acc + (task.estimatedDuration || 0), 0);
    
  const currentMonthEarnings = currentMonthHours * (company.hourlyRate || 0);

  return (
    <div 
        className="flex flex-col animate-in fade-in zoom-in-95 duration-500 w-full relative min-h-[calc(100vh-120px)] max-w-[1600px] xl:px-4 mx-auto"
        onClick={() => setActiveProjectId(null)} /* Click-away to hide tasks */
    >
       <input type="file" ref={logoInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

       {/* Top Navigation Row */}
       <div className="flex items-center justify-between mb-6">
          <button 
             onClick={onBack} 
             className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors bg-white hover:bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
             <ArrowLeft className="w-4 h-4" /> Back to Portfolio
          </button>
       </div>

       {/* Sub-Header: Dashboard Row */}
       <div className="bg-white w-full rounded-[40px] shadow-sm border border-slate-200/60 p-8 flex flex-col lg:flex-row items-center justify-between gap-10 mb-12">
           
           {/* Left side: Identity */}
           <div className="flex flex-col sm:flex-row items-center gap-8 w-full">
              <div 
                 onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }} 
                 className="w-28 h-28 shrink-0 rounded-[28px] border-4 border-slate-50 bg-slate-50 shadow-inner overflow-hidden group cursor-pointer relative flex items-center justify-center hover:-translate-y-1 transition-transform" 
                 style={{ color: company.color }}
              >
                 {company.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                 ) : (
                    <Building2 className="w-12 h-12" />
                 )}
                 <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center backdrop-blur-sm">
                    {isUploadingLogo ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                 </div>
              </div>
              
              <div className="flex flex-col w-full">
                 <input
                    type="text"
                    className="text-4xl font-black text-slate-900 tracking-tight bg-transparent border-none outline-none hover:bg-slate-50 focus:bg-slate-50 rounded-2xl px-4 py-2 -ml-4 transition-colors w-full placeholder:text-slate-200"
                    value={company.name}
                    onChange={(e) => updateCompany(company.id, { name: e.target.value })}
                 />
                 <input
                    type="text"
                    className="text-slate-400 font-medium text-base bg-transparent border-none outline-none hover:bg-slate-50 focus:bg-slate-50 rounded-2xl px-4 py-1.5 -ml-4 transition-colors w-full placeholder:text-slate-200"
                    value={company.description || ''}
                    onChange={(e) => updateCompany(company.id, { description: e.target.value })}
                    placeholder="Add an enterprise description..."
                 />
              </div>
           </div>

           {/* Right side: Dashboard Metrics */}
           <div className="flex items-center gap-6 shrink-0 w-full lg:w-auto justify-end">
           
               <div className="hidden lg:flex bg-emerald-50 rounded-[24px] px-6 py-4 items-center gap-5 border border-emerald-100 focus-within:ring-4 ring-emerald-500/10 transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                     <span className="text-emerald-500 font-bold text-xl">$</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">MTD Earnings</span>
                     <div className="flex items-center gap-1">
                        <span className="text-emerald-900 font-black text-xl leading-none">$</span>
                        <span className="font-black text-2xl text-emerald-900 leading-none h-auto">
                           {currentMonthEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                     </div>
                  </div>
               </div>

               <div className="bg-slate-50 rounded-[24px] px-6 py-4 flex items-center gap-5 border border-slate-100 focus-within:ring-4 ring-primary/10 transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                     <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hourly Yield</span>
                     <div className="flex items-center gap-1">
                        <span className="text-slate-900 font-black text-xl leading-none">$</span>
                        <input 
                           type="number"
                           className="bg-transparent border-none outline-none font-black text-2xl text-slate-900 w-24 p-0 leading-none h-auto focus:ring-0"
                           value={company.hourlyRate || 0}
                           onChange={(e) => updateCompany(company.id, { hourlyRate: Number(e.target.value) })}
                        />
                     </div>
                  </div>
               </div>
               
               <div className="hidden xl:flex bg-slate-50 rounded-[24px] px-6 py-4 items-center gap-5 border border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                     <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Initiatives</span>
                     <span className="text-2xl font-black text-slate-900 leading-none">{companyProjects.length}</span>
                  </div>
               </div>
           </div>
       </div>

       {/* Initiatives Section Header */}
       <div className="flex items-center justify-between pb-6 mb-8 border-b-2 border-slate-100 w-full">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
              <FolderKanban className="w-5 h-5 text-slate-300"/> Strategic Grid
          </h4>
          <button 
             onClick={(e) => { e.stopPropagation(); setIsAddingProject(true); }} 
             className="text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-2 transition-all bg-slate-900 px-5 py-3 rounded-2xl hover:bg-primary hover:scale-[1.02] shadow-xl shadow-slate-900/20"
          >
             <Plus className="w-4 h-4" /> Issue New Initiative
          </button>
       </div>

       {isAddingProject && (
          <div 
             onClick={(e) => e.stopPropagation()} 
             className="bg-slate-50 rounded-[32px] p-8 border border-slate-200/60 shadow-inner flex flex-col md:flex-row md:items-center gap-4 animate-in slide-in-from-top-4 fade-in z-20 relative mb-8"
          >
             <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
             </div>
             <div className="flex flex-col flex-1 gap-4">
                <input 
                   type="text" 
                   autoFocus
                   placeholder="New Initiative Title..."
                   className="w-full bg-white rounded-2xl border-none shadow-sm px-6 py-4 font-bold text-lg text-slate-900 focus:ring-4 ring-primary/20 outline-none transition-all"
                   value={newProject.name}
                   onChange={e => setNewProject({...newProject, name: e.target.value})}
                   onKeyDown={e => e.key === 'Enter' && handleAddProject()}
                />
                <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-slate-100">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3">Identity Color</span>
                   <div className="flex-1">
                      <TacticalColorPicker 
                         value={newProject.color} 
                         onChange={(c) => setNewProject({...newProject, color: c})} 
                      />
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <button onClick={handleAddProject} className="bg-primary text-white rounded-2xl px-8 py-4 font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-indigo-500 hover:scale-105 transition-all">Compile</button>
                <button onClick={() => setIsAddingProject(false)} className="bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl p-4 transition-colors shadow-sm"><X className="w-5 h-5" /></button>
             </div>
          </div>
       )}

       {/* Initiatives Masonry/Grid Feed */}
       <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8 pb-16 items-start">
          {companyProjects.length === 0 && !isAddingProject ? (
             <div className="col-span-full py-24 text-center rounded-[40px] border-2 border-dashed border-slate-100 bg-slate-50/50">
                <div className="w-20 h-20 rounded-[24px] bg-white border border-slate-100 shadow-sm mx-auto flex items-center justify-center mb-6">
                   <FolderKanban className="w-8 h-8 text-slate-200" />
                </div>
                <h5 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Operational Grid Empty</h5>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block max-w-sm mx-auto leading-relaxed">System awaiting operational parameters. Tap "Issue New Initiative" to deploy blocks into this grid.</span>
             </div>
          ) : (
             companyProjects.map(project => {
                const projectTasks = tasks.filter(t => t.projectId === project.id);
                const completed = projectTasks.filter(t => t.status === 'Completed').length;
                const total = projectTasks.length;
                const progress = total > 0 ? (completed / total) * 100 : 0;
                const isActive = activeProjectId === project.id; // Check deploy state

                return (
                  <div 
                     key={project.id} 
                     onClick={(e) => { 
                         e.stopPropagation(); 
                         setActiveProjectId(isActive ? null : project.id); 
                     }}
                     className={cn(
                        "group bg-white rounded-[40px] border p-8 shadow-sm hover:shadow-xl transition-all duration-500 relative flex flex-col cursor-pointer",
                        isActive ? "border-primary/40 shadow-2xl scale-[1.01]" : "border-slate-200/60 hover:-translate-y-1"
                     )}
                  >
                    
                    {/* Project Header */}
                    <div className="flex items-start justify-between relative z-10 mb-8">
                       <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-4">
                              <h3 className="text-2xl font-black tracking-tight text-slate-900 leading-tight pr-4">
                                 {project.name}
                              </h3>
                              <div className="scale-75 origin-left h-auto min-h-0 -mt-2 shadow-none bg-transparent">
                                 <TacticalColorPicker 
                                    value={project.color || "#6366f1"} 
                                    onChange={(c) => updateProject(project.id, { color: c })} 
                                 />
                              </div>
                           </div>
                          <div className="flex items-center gap-3">
                             <span className={cn(
                               "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                               project.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                             )}>
                               {project.status}
                             </span>
                             <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">{format(new Date(project.startDate), 'MMM dd')}</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Progress Bar Snippet (Always Visible) */}
                    <div className="relative z-10 bg-slate-50 rounded-[24px] p-6 border border-slate-100 w-full mb-2" style={{ borderColor: (project.color || '#6366f1') + '15' }}>
                       <div className="flex justify-between items-end mb-4">
                          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Progression</span>
                          <span className={cn("text-2xl font-black tracking-tighter leading-none transition-colors duration-500", progress === 100 ? 'text-emerald-500' : '')} style={progress !== 100 ? { color: project.color || '#6366f1' } : {}}>
                             {Math.round(progress)}<span className="text-sm font-bold opacity-40 ml-0.5">%</span>
                          </span>
                       </div>
                       <div className="relative h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                          <div 
                             className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out", progress === 100 ? 'bg-emerald-500' : '')}
                             style={{ 
                               width: `${Math.max(1, progress)}%`,
                               backgroundColor: progress === 100 ? undefined : (project.color || '#6366f1')
                             }}
                          />
                       </div>
                    </div>

                    {/* Collapsible Deployed Tasks Accordion */}
                    <div 
                        className={cn(
                           "grid transition-all duration-500 ease-in-out cursor-default",
                           isActive ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"
                        )}
                        onClick={(e) => e.stopPropagation()} // Prevent closing when interacting inside deployed block
                    >
                       <div className="overflow-hidden">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 px-2">
                             <h5 className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                                <ListTodo className="w-3.5 h-3.5 text-slate-300" /> Action Items ({completed}/{total})
                             </h5>
                             <button 
                                onClick={() => {
                                   if (window.confirm(`Delete block?`)) {
                                      deleteProject(project.id);
                                   }
                                }}
                                className="text-slate-300 hover:text-rose-500 transition-colors"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                          
                          <div className="flex flex-col gap-2 pb-2">
                             {projectTasks.length === 0 ? (
                                <div className="py-6 px-4 text-center">
                                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">No tasks instantiated</span>
                                </div>
                             ) : (
                                projectTasks.map(task => (
                                   <div 
                                      key={task.id} 
                                      className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl group transition-all" style={{ backgroundColor: project.color + "0D" }}
                                   >
                                      <button
                                         onClick={(e) => { 
                                             e.stopPropagation(); 
                                             updateTask(task.id, { status: task.status === 'Completed' ? 'Todo' : 'Completed' }); 
                                         }}
                                         className={cn(
                                            "shrink-0 transition-transform duration-300",
                                            task.status === 'Completed' ? "text-emerald-500 scale-110" : "text-slate-200 hover:text-primary"
                                         )}
                                      >
                                         {task.status === 'Completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 border-[3px] rounded-full border-current text-transparent" />}
                                      </button>
                                      <span className={cn(
                                         "font-bold text-xs tracking-tight flex-1 transition-all duration-300",
                                         task.status === 'Completed' ? "text-slate-300 line-through" : "text-slate-700"
                                      )}>
                                         {task.name}
                                      </span>
                                      {task.estimatedDuration && (
                                         <span className="px-2 py-1 rounded bg-slate-50 text-[8px] font-black tracking-widest uppercase text-slate-400 border border-slate-100">
                                            {task.estimatedDuration} HR
                                         </span>
                                      )}
                                   </div>
                                ))
                             )}
                          </div>
                       </div>
                    </div>

                  </div>
                );
             })
          )}
       </div>

       {/* Crop Modal Detail View */}
       {cropImageSrc && (
          <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="relative w-full max-w-2xl h-[400px] bg-slate-900 rounded-[48px] overflow-hidden mb-8 shadow-2xl border border-white/10">
                <Cropper
                   image={cropImageSrc}
                   crop={crop}
                   zoom={zoom}
                   aspect={1 / 1}
                   onCropChange={setCrop}
                   onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                   onZoomChange={setZoom}
                />
             </div>
             <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-[32px] border border-white/10">
                <button onClick={() => setCropImageSrc(null)} className="px-8 py-4 text-xs font-bold text-white/70 hover:text-white transition-colors uppercase tracking-widest">
                   Cancel
                </button>
                <button onClick={handleApplyCrop} disabled={isUploadingLogo} className="flex items-center gap-2 px-10 py-4 bg-primary text-white text-xs font-bold rounded-[24px] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                   {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                   Confirm Crop
                </button>
             </div>
          </div>
       )}
    </div>
  );
}

export default function CompaniesPage() {
  const { companies, projects, tasks, addCompany, deleteCompany } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
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

  if (selectedCompanyId) {
    return <CompanyWorkspace companyId={selectedCompanyId} onBack={() => setSelectedCompanyId(null)} />;
  }

  return (
    <div className="flex flex-col space-y-12 animate-in fade-in duration-700 min-h-[calc(100vh-120px)] relative">
      
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
                 className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 focus:border-primary/50 outline-none transition-all font-bold text-xl text-slate-900"
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
              className="group bg-white rounded-[40px] border border-slate-100 p-10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col min-h-[400px] cursor-pointer"
              onClick={() => setSelectedCompanyId(company.id)}
            >
              <div className="flex justify-between items-start mb-10">
                 <div className="w-16 h-16 rounded-[24px] bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500" style={{ color: company.color }}>
                    {company.logoUrl ? (
                        <img src={company.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <Building2 className="h-7 w-7" />
                    )}
                 </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); /* optional context menu */ }} 
                    className="p-2 text-slate-200 hover:text-primary transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                 >
                    <MoreVertical className="h-5 w-5" />
                 </button>
              </div>

              <div className="flex-1 mb-8">
                 <div className="flex items-center gap-3 mb-2">
                     <h3 className="text-2xl font-bold tracking-tight text-slate-900 group-hover:text-primary transition-colors pr-2 truncate">{company.name}</h3>
                     <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: company.color }} />
                 </div>
                 <p className="text-sm text-slate-400 font-medium leading-relaxed line-clamp-2">
                    {company.description || 'Enterprise-level strategic partnership.'}
                 </p>
              </div>

              <div className="space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-1 transition-colors group-hover:bg-slate-50 group-hover:border-slate-200/50">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <FolderKanban className="w-2.5 h-2.5" /> Initiatives
                       </span>
                       <span className="text-2xl font-bold text-slate-900">{stats.projectCount}</span>
                    </div>
                    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-1 transition-colors group-hover:bg-slate-50 group-hover:border-slate-200/50">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <Zap className="w-2.5 h-2.5" /> Hourly Rate
                       </span>
                       <span className="text-2xl font-bold text-slate-900 truncate">
                          {company.currencyCode === 'USD' ? '$' : company.currencyCode} {company.hourlyRate || 0}
                       </span>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                    <button 
                       onClick={(e) => { e.stopPropagation(); deleteCompany(company.id); }}
                       className="text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-rose-500 transition-colors"
                    >
                       Remove Account
                    </button>
                    <button 
                       className="flex items-center gap-2 group/btn text-primary font-bold text-xs"
                    >
                       View Dashboard <ArrowRight className="h-4 w-4 overflow-visible group-hover/btn:translate-x-1.5 transition-transform" />
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


