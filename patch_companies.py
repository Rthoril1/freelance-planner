import re

with open('src/app/companies/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { Plus, Trash2, Building2, MoreVertical, Zap, FolderKanban, BarChart3, ArrowRight, X, Camera, Image as ImageIcon, Loader2, Calendar } from 'lucide-react';", 
"import { Plus, Trash2, Building2, MoreVertical, Zap, FolderKanban, BarChart3, ArrowRight, X, Camera, Image as ImageIcon, Loader2, Calendar, CheckCircle2, Circle, ListTodo } from 'lucide-react';\nimport { format } from 'date-fns';")

# 2. Add `selectedProjectId` to `CompanyDetailsModal`
content = content.replace("const [isAddingProject, setIsAddingProject] = useState(false);",
"const [isAddingProject, setIsAddingProject] = useState(false);\n  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);")

# 3. Update the existing project mapped out HTML in `CompanyDetailsModal`.
project_card_old = """                            <div className="flex items-center gap-1.5 text-slate-400">
                               <Calendar className="w-3.5 h-3.5" />
                               <span className="text-[9px] font-bold uppercase tracking-widest">Since {new Date(project.startDate).toLocaleDateString()}</span>
                            </div>

                            <button
                               onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to completely delete "${project.name}" and all of its tasks?`)) {
                                      deleteProject(project.id);
                                  }
                               }}
                               className="absolute top-4 right-4 p-2 bg-slate-50/0 hover:bg-rose-50 text-slate-200 hover:text-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>"""

project_card_new = """                            <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                               <Calendar className="w-3.5 h-3.5" />
                               <span className="text-[9px] font-bold uppercase tracking-widest">Since {new Date(project.startDate).toLocaleDateString()}</span>
                            </div>

                            <div className="mt-auto pt-3 border-t border-slate-50 flex justify-between items-center">
                               <button
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     if (window.confirm(`Are you sure you want to completely delete "${project.name}" and all its recorded tasks?`)) {
                                         deleteProject(project.id);
                                     }
                                  }}
                                  className="text-[10px] uppercase tracking-widest font-black text-slate-200 hover:text-rose-500 transition-colors"
                               >
                                  Discard
                               </button>
                               <button 
                                  onClick={() => setSelectedProjectId(project.id)}
                                  className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-primary hover:text-primary/80 transition-colors group/view"
                               >
                                  View Activity <ArrowRight className="h-3 w-3 group-hover/view:translate-x-1 transition-transform" />
                               </button>
                            </div>"""

content = content.replace(project_card_old, project_card_new)

# 4. Insert conditional rendering of ProjectActivityModal
# That belongs to CompanyDetailsModal IF we find it before the default export.
idx = content.find('export default function CompaniesPage')
chunk1 = content[:idx]
chunk2 = content[idx:]

chunk1 = chunk1.replace('    </div>\n  );\n}', '       {selectedProjectId && (\n          <ProjectActivityModal\n             projectId={selectedProjectId}\n             companyId={company.id}\n             onClose={() => setSelectedProjectId(null)}\n          />\n       )}\n    </div>\n  );\n}')

content = chunk1 + chunk2

# 5. Insert ProjectActivityModal right above `CompanyDetailsModal`
project_activity_modal = """
function ProjectActivityModal({ projectId, companyId, onClose }: { projectId: string; companyId: string; onClose: () => void }) {
  const { projects, companies, tasks, deleteProject, updateTask } = useStore();
  const project = projects.find(p => p.id === projectId);
  const company = companies.find(c => c.id === companyId);
  if (!project) return null;

  const projectTasks = tasks.filter(t => t.projectId === projectId);
  const completed = projectTasks.filter(t => t.status === 'Completed').length;
  const total = projectTasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
       <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 relative border border-slate-100 max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-8 border-b border-slate-50 bg-slate-50/50">
             <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300" style={{ color: company?.color }}>
                   {company?.name || 'Unassigned Entity'} / ACTIVITY
                </span>
                <div className="flex items-center gap-3">
                   <h3 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">{project.name}</h3>
                   <div className={cn(
                     "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                     project.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                   )}>
                     {project.status}
                   </div>
                </div>
             </div>
             <button onClick={onClose} className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 hover:text-slate-900 transition-all hover:bg-slate-50 shadow-sm">
                <X className="w-5 h-5" />
             </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-8 space-y-12">
             <div className="space-y-8">
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
             </div>

             <div className="space-y-6 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <ListTodo className="w-3.5 h-3.5" /> Constituent Tasks
                   </h4>
                </div>

                <div className="flex flex-col gap-3">
                   {projectTasks.length === 0 ? (
                      <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">No tasks attached to this initiative</span>
                      </div>
                   ) : (
                      projectTasks.map(task => (
                         <div key={task.id} className="flex items-center gap-4 bg-white border border-slate-100 rounded-xl p-4 shadow-sm group">
                            <button
                               onClick={() => updateTask(task.id, { status: task.status === 'Completed' ? 'Todo' : 'Completed' })}
                               className={cn(
                                  "shrink-0 transition-colors",
                                  task.status === 'Completed' ? "text-emerald-500" : "text-slate-300 hover:text-primary"
                               )}
                            >
                               {task.status === 'Completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                            </button>
                            <span className={cn(
                               "font-bold text-sm tracking-tight flex-1 transition-all",
                               task.status === 'Completed' ? "text-slate-300 line-through" : "text-slate-900"
                            )}>
                               {task.title}
                            </span>
                            {task.durationMinutes && (
                               <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase bg-slate-50 text-slate-400 border border-slate-100">
                                  {task.durationMinutes}m
                               </span>
                            )}
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
          
          <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/50 mt-auto">
             <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4 opacity-40" />
                <span className="text-[10px] font-bold tracking-widest uppercase">Launched {format(new Date(project.startDate), 'MMM dd, yyyy')}</span>
             </div>
             
             <button 
                onClick={() => {
                   if (window.confirm(`Are you sure you want to completely delete "${project.name}" and all its recorded tasks? This action cannot be reversed.`)) {
                      deleteProject(project.id);
                      onClose();
                   }
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-rose-500 transition-colors"
             >
                Purge Initiative
             </button>
          </div>
       </div>
    </div>
  );
}
"""

content = content.replace("function CompanyDetailsModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {",
project_activity_modal + "\nfunction CompanyDetailsModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {")

with open('src/app/companies/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
