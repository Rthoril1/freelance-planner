import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Company, Project, Task, UserProfile } from '../types';

interface AppState {
  profile: UserProfile | null;
  companies: Company[];
  projects: Project[];
  tasks: Task[];
  loading: boolean;

  fetchData: () => Promise<void>;

  setProfile: (profile: UserProfile) => Promise<void>;
  
  addCompany: (company: Company) => Promise<void>;
  updateCompany: (id: string, company: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  clearSchedule: () => Promise<void>;
}

export const useStore = create<AppState>()((set, get) => ({
  profile: null,
  companies: [],
  projects: [],
  tasks: [],
  loading: true,

  fetchData: async () => {
    set({ loading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ loading: false });
      return;
    }

    const [profRes, compRes, projRes, taskRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('companies').select('*').eq('user_id', user.id),
      supabase.from('projects').select('*').eq('user_id', user.id),
      supabase.from('tasks').select('*').eq('user_id', user.id)
    ]);

    const projects = (projRes.data || []).map(p => ({ ...p, companyId: p.company_id }));
    const tasks = (taskRes.data || []).map(t => ({ ...t, projectId: t.project_id }));

    set({ 
      profile: profRes.data as UserProfile, 
      companies: compRes.data || [], 
      projects: projects,
      tasks: tasks,
      loading: false 
    });
  },

  setProfile: async (profile) => {
    set({ profile });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update(profile).eq('id', user.id);
  },

  addCompany: async (company) => {
    set((state) => ({ companies: [...state.companies, company] }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('companies').insert({ ...company, user_id: user.id });
  },

  updateCompany: async (id, updatedFields) => {
    set((state) => ({ companies: state.companies.map(c => c.id === id ? { ...c, ...updatedFields } : c) }));
    await supabase.from('companies').update(updatedFields).eq('id', id);
  },

  deleteCompany: async (id) => {
    set((state) => ({
      companies: state.companies.filter(c => c.id !== id),
      projects: state.projects.filter(p => p.companyId !== id),
      tasks: state.tasks.filter(t => state.projects.find(p => p.id === t.projectId)?.companyId !== id)
    }));
    await supabase.from('companies').delete().eq('id', id);
  },

  addProject: async (project) => {
    set((state) => ({ projects: [...state.projects, project] }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const dbProject = { ...project, user_id: user.id, company_id: project.companyId };
      delete (dbProject as any).companyId;
      await supabase.from('projects').insert(dbProject);
    }
  },

  updateProject: async (id, updatedFields) => {
    set((state) => ({ projects: state.projects.map(p => p.id === id ? { ...p, ...updatedFields } : p) }));
    const dbFields = { ...updatedFields } as any;
    if (dbFields.companyId) {
       dbFields.company_id = dbFields.companyId;
       delete dbFields.companyId;
    }
    await supabase.from('projects').update(dbFields).eq('id', id);
  },

  deleteProject: async (id) => {
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id),
      tasks: state.tasks.filter(t => t.projectId !== id)
    }));
    await supabase.from('projects').delete().eq('id', id);
  },

  addTask: async (task) => {
    set((state) => ({ tasks: [...state.tasks, task] }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const dbTask = { ...task, user_id: user.id, project_id: task.projectId };
      delete (dbTask as any).projectId;
      await supabase.from('tasks').insert(dbTask);
    }
  },

  updateTask: async (id, updatedFields) => {
    set((state) => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, ...updatedFields } : t) }));
    const dbFields = { ...updatedFields } as any;
    if (dbFields.projectId) {
       dbFields.project_id = dbFields.projectId;
       delete dbFields.projectId;
    }
    await supabase.from('tasks').update(dbFields).eq('id', id);
  },

  deleteTask: async (id) => {
    set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    await supabase.from('tasks').delete().eq('id', id);
  },

  clearSchedule: async () => {
    set((state) => ({
      tasks: state.tasks.map(t => t.status === 'Scheduled' ? { ...t, status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined } : t)
    }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('tasks')
        .update({ status: 'Todo', scheduledStart: null, scheduledEnd: null })
        .eq('user_id', user.id)
        .eq('status', 'Scheduled');
    }
  }
}));
