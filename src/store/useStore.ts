import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Company, Project, Task, UserProfile } from '../types';
import { startOfWeek, isBefore, parseISO } from 'date-fns';

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

    const companies = (compRes.data || []).map(c => {
      const { user_id, hourly_rate, currency_code, ...rest } = c;
      return { 
        ...rest, 
        hourlyRate: hourly_rate || 0,
        currencyCode: currency_code || 'USD'
      };
    });

    const projects = (projRes.data || []).map(p => {
      const { company_id, user_id, ...rest } = p;
      return { ...rest, companyId: company_id };
    });
    
    const tasks = (taskRes.data || []).map(t => {
      const { project_id, parent_task_id, user_id, ...rest } = t;
      return { 
        ...rest, 
        projectId: project_id,
        parentTaskId: parent_task_id
      };
    });

    const profile = (profRes.data as UserProfile) || {
      name: user.user_metadata?.full_name || 'Freelancer',
      type: 'Freelancer',
      weeklyHoursAvailable: 40,
      workDays: [1, 2, 3, 4, 5],
      dailyAvailability: { start: '09:00', end: '18:00' },
      maxHoursPerDay: 8,
      preferredBlocks: ['Morning', 'Afternoon']
    };

    // Ensure defaults for lunch and breaks if missing
    if (!profile.lunchTime) {
      profile.lunchTime = { start: '13:00', durationMinutes: 60 };
    }
    if (!profile.customBreaks) {
      profile.customBreaks = [
        { id: 'morning-coffee', start: '10:30', durationMinutes: 15 }
      ];
    }
    if (!profile.customPlatforms) {
      profile.customPlatforms = [];
    }
    if (!profile.hiddenPresetIds) {
      profile.hiddenPresetIds = [];
    }

    // 2. Automated Rollover Logic
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    let tasksUpdated = false;
    
    const finalTasks = tasks.map(t => {
      if (t.status !== 'Completed' && t.scheduledStart && isBefore(parseISO(t.scheduledStart), weekStart)) {
        tasksUpdated = true;
        return { ...t, status: 'Todo' as const, scheduledStart: undefined, scheduledEnd: undefined };
      }
      return t;
    });

    if (tasksUpdated) {
      const rolloverTasks = finalTasks.filter((t, i) => t.status === 'Todo' && tasks[i].status !== 'Todo');
      if (rolloverTasks.length > 0) {
        // Update DB in background
        supabase.from('tasks')
          .update({ status: 'Todo', scheduledStart: null, scheduledEnd: null })
          .in('id', rolloverTasks.map(t => t.id))
          .then(() => console.log(`Rolled over ${rolloverTasks.length} tasks`));
      }
    }

    set({ 
      profile, 
      companies: companies, 
      projects: projects,
      tasks: finalTasks,
      loading: false 
    });
  },

  setProfile: async (profile) => {
    // 1. Clean the profile object (ensure integers for DB schema and remove redundant ID)
    const { id, ...rest } = profile as any;
    const cleanProfile = {
      ...rest,
      weeklyHoursAvailable: Math.round(rest.weeklyHoursAvailable || 40),
      maxHoursPerDay: Math.round(rest.maxHoursPerDay || 8)
    };

    set({ profile: { ...profile, ...cleanProfile } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('profiles').update(cleanProfile).eq('id', user.id);
  },

  addCompany: async (company) => {
    set((state) => ({ companies: [...state.companies, company] }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { hourlyRate, currencyCode, ...rest } = company;
      const dbCompany = { 
        ...rest, 
        user_id: user.id, 
        hourly_rate: hourlyRate || 0,
        currency_code: currencyCode || 'USD'
      };
      await supabase.from('companies').insert(dbCompany);
    }
  },

  updateCompany: async (id, updatedFields) => {
    set((state) => ({ companies: state.companies.map(c => c.id === id ? { ...c, ...updatedFields } : c) }));
    
    const dbFields = { ...updatedFields } as any;
    if (dbFields.hourlyRate !== undefined) {
      dbFields.hourly_rate = dbFields.hourlyRate;
      delete dbFields.hourlyRate;
    }
    if (dbFields.currencyCode !== undefined) {
      dbFields.currency_code = dbFields.currencyCode;
      delete dbFields.currencyCode;
    }
    await supabase.from('companies').update(dbFields).eq('id', id);
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
      const { companyId, ...rest } = project;
      const dbProject = { ...rest, user_id: user.id, company_id: companyId };
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
      const { projectId, parentTaskId, ...rest } = task;
      const dbTask = { 
        ...rest, 
        user_id: user.id, 
        project_id: projectId,
        parent_task_id: parentTaskId 
      };
      await supabase.from('tasks').insert(dbTask);
    }
  },

  updateTask: async (id, updatedFields) => {
    const now = new Date().toISOString();
    const finalFields = { ...updatedFields };
    
    if (updatedFields.status === 'Completed') {
      (finalFields as any).completedAt = now;
    } else if (updatedFields.status) {
      (finalFields as any).completedAt = null;
    }

    set((state) => ({ 
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...finalFields } : t) 
    }));

    const dbFields = { ...finalFields } as any;
    if (dbFields.projectId) {
       dbFields.project_id = dbFields.projectId;
       delete dbFields.projectId;
    }
    if (dbFields.parentTaskId !== undefined) {
       dbFields.parent_task_id = dbFields.parentTaskId;
       delete dbFields.parentTaskId;
    }
    await supabase.from('tasks').update(dbFields).eq('id', id);
  },

  deleteTask: async (id) => {
    set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    await supabase.from('tasks').delete().eq('id', id);
  },

  clearSchedule: async () => {
    const { tasks } = get();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Identify tasks to delete (instances created by auto-schedule)
    const toDelete = tasks.filter(t => t.status === 'Scheduled' && t.parentTaskId);
    // 2. Identify tasks to reset (manually scheduled main tasks)
    const toReset = tasks.filter(t => t.status === 'Scheduled' && !t.parentTaskId);

    // Update state
    set((state) => ({
      tasks: state.tasks
        .filter(t => !(t.status === 'Scheduled' && t.parentTaskId))
        .map(t => t.status === 'Scheduled' && !t.parentTaskId 
          ? { ...t, status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined } 
          : t
        )
    }));

    // Update database
    if (toDelete.length > 0) {
      await supabase.from('tasks').delete().in('id', toDelete.map(t => t.id));
    }
    if (toReset.length > 0) {
      await supabase.from('tasks')
        .update({ status: 'Todo', scheduledStart: null, scheduledEnd: null })
        .in('id', toReset.map(t => t.id));
    }
  }

}));
