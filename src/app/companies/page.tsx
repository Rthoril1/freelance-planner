'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2 } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { Company } from '@/types';

export default function CompaniesPage() {
  const { companies, addCompany, deleteCompany } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', description: '', color: '#3b82f6' });

  const handleAdd = () => {
    if (!newCompany.name) return;
    addCompany({
      id: generateId(),
      name: newCompany.name,
      description: newCompany.description,
      color: newCompany.color,
      status: 'Active',
      priority: 'Medium'
    });
    setIsAdding(false);
    setNewCompany({ name: '', description: '', color: '#3b82f6' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Companies</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <Plus className="h-4 w-4" /> Add Company
        </button>
      </div>

      {isAdding && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-xl mb-6 animate-in slide-in-from-top-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h3 className="text-lg font-medium mb-4">New Company</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input 
                type="text" 
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 focus:ring-2 focus:ring-primary transition-all"
                value={newCompany.name}
                onChange={e => setNewCompany({...newCompany, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand Color</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  className="h-10 w-16 p-1 rounded-lg border border-border cursor-pointer bg-background"
                  value={newCompany.color}
                  onChange={e => setNewCompany({...newCompany, color: e.target.value})}
                />
                <span className="text-sm font-mono text-muted-foreground">{newCompany.color}</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description / Notes</label>
              <input 
                type="text" 
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 focus:ring-2 focus:ring-primary transition-all"
                value={newCompany.description}
                onChange={e => setNewCompany({...newCompany, description: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3 justify-end">
            <button onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-sm font-medium rounded-lg hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleAdd} className="px-5 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Save Company</button>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {companies.map(company => (
          <div key={company.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all relative group pt-1">
            <div className="absolute top-0 left-0 h-1 w-full" style={{ backgroundColor: company.color }}></div>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-xl">{company.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 min-h-[40px]">{company.description || 'No description provided'}</p>
                </div>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-primary/10 text-primary ring-primary/20">
                  {company.status}
                </span>
              </div>
              <div className="mt-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => deleteCompany(company.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors border border-transparent hover:border-destructive/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {companies.length === 0 && !isAdding && (
          <div className="col-span-full py-16 text-center rounded-2xl border-2 border-dashed border-border bg-muted/30">
            <p className="text-muted-foreground font-medium">No companies added yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first company to start organizing your projects.</p>
          </div>
        )}
      </div>
    </div>
  );
}
