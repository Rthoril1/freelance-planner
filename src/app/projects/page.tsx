'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2 } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { Project } from '@/types';

export default function ProjectsPage() {
  const { projects, companies, addProject, deleteProject } = useStore();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
        <button 
          onClick={() => setIsAdding(true)}
          disabled={companies.length === 0}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" /> Add Project
        </button>
      </div>

      {isAdding && (
         <div className="rounded-xl border border-border bg-card p-6 shadow-xl mb-6 animate-in slide-in-from-top-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h3 className="text-lg font-medium mb-4">New Project</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <select 
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 focus:ring-2 focus:ring-primary"
                value={newProject.companyId}
                onChange={e => setNewProject({...newProject, companyId: e.target.value})}
              >
                <option value="">Select Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Project Name</label>
              <input 
                type="text" 
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 focus:ring-2 focus:ring-primary"
                value={newProject.name}
                onChange={e => setNewProject({...newProject, name: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3 justify-end">
            <button onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-sm font-medium rounded-lg hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleAdd} className="px-5 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground transition-colors">Save Project</button>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {projects.map(project => {
          const company = companies.find(c => c.id === project.companyId);
          return (
            <div key={project.id} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ backgroundColor: company?.color + '15', color: company?.color || 'gray', borderColor: company?.color + '40' }}>
                    {company?.name || 'Unknown Company'}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{project.status}</span>
                </div>
                <h3 className="font-semibold text-xl mb-1">{project.name}</h3>
                <p className="text-sm text-muted-foreground">Started: {new Date(project.startDate).toLocaleDateString()}</p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => deleteProject(project.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {projects.length === 0 && !isAdding && (
          <div className="col-span-full py-16 text-center rounded-2xl border-2 border-dashed border-border bg-muted/30">
            <p className="text-muted-foreground font-medium">No projects listed.</p>
            {companies.length === 0 && <p className="text-sm text-muted-foreground mt-1">Please add a Company first.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
