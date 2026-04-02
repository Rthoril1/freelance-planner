import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Company, Project, Task, UserProfile, CustomPlatform } from '../types';
import { startOfWeek, isBefore, parseISO } from 'date-fns';
import { PRESET_PLATFORMS } from '@/lib/constants';

// Debounce timer for profile saves to avoid spamming Supabase on each keystroke
let profileSaveTimer: ReturnType<typeof setTimeout> | null = null;

async function saveProfileToSupabase(profile: UserProfile) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { email, ...cleanProfile } = profile as any;
  cleanProfile.id = user.id;

  const { error } = await supabase.from('profiles').upsert(cleanProfile);
  if (error) {
    console.error('Profile save error:', error.message, error.details);
    // Optionally trigger a toast or notification system here
  } else {
    console.log('Profile saved successfully.');
  }
}

interface AppState {
  profile: UserProfile | null;
  companies: Company[];
  projects: Project[];
  tasks: Task[];
  loading: boolean;

  fetchData: () => Promise<void>;

  setProfile: (profile: UserProfile) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  
  addCustomPlatform: (platform: CustomPlatform) => Promise<void>;
  updateCustomPlatform: (id: string, platform: Partial<CustomPlatform>) => Promise<void>;
  deleteCustomPlatform: (id: string) => Promise<void>;

  addCompany: (company: Company) => Promise<void>;
  updateCompany: (id: string, company: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  updateTasks: (tasks: { id: string, updates: Partial<Task> }[]) => Promise<void>;
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

    const companies = compRes.data ? (compRes.data.map(c => ({
      ...c,
      hourlyRate: c.hourly_rate,
      currencyCode: c.currency_code,
      logoUrl: c.logo_url,
      bannerUrl: c.banner_url,
      contractHours: c.contract_hours,
      pausedMonths: c.paused_months || [],
      workDays: c.work_days || [],
      offDays: c.off_days || []
    }))) : [];

    const projects = (projRes.data || []).map(p => {
      const { company_id, user_id, ...rest } = p;
      return { ...rest, companyId: company_id } as Project;
    });
    
    const tasks = (taskRes.data || []).map(t => {
      const { project_id, parent_task_id, user_id, completed_at, ...rest } = t;
      return { 
        ...rest, 
        projectId: project_id,
        parentTaskId: parent_task_id,
        completedAt: completed_at
      } as Task;
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

    profile.email = user.email;

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

    // Seed preset platforms into profile if not initialized
    if (!profile.platformsInitialized) {
      profile.customPlatforms = [
        ...(profile.customPlatforms || []),
        ...PRESET_PLATFORMS.map(p => ({
          ...p,
          id: `custom-${p.id}`
        }))
      ];
      profile.platformsInitialized = true;
      
      // Auto-save so it persists for the user
      supabase.from('profiles').update({
        "customPlatforms": profile.customPlatforms,
        "platformsInitialized": true
      }).eq('id', user.id).then();
    }
    if (!profile.vacationDays) {
      profile.vacationDays = [];
    }
    if (!profile.hiddenPresetIds) {
      profile.hiddenPresetIds = [];
    }
    // Note: If you see "Column not found" errors in the console, 
    // please run the SQL migration provided in the implementation/walkthrough.


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
    set({ profile });
    // Immediate save (used for avatar uploads and init saves)
    await saveProfileToSupabase(profile);
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;
    const merged = { ...profile, ...updates };
    // Update UI state immediately for responsiveness
    set({ profile: merged });
    // Debounce the actual DB write by 800ms
    if (profileSaveTimer) clearTimeout(profileSaveTimer);
    profileSaveTimer = setTimeout(() => saveProfileToSupabase(merged), 800);
  },

  addCustomPlatform: async (platform) => {
    const { profile, updateProfile } = get();
    if (profile) {
      const platforms = profile.customPlatforms || [];
      await updateProfile({ customPlatforms: [...platforms, platform] });
    }
  },

  updateCustomPlatform: async (id, updatedFields) => {
    const { profile, updateProfile } = get();
    if (profile) {
      const platforms = (profile.customPlatforms || []).map(p => 
        p.id === id ? { ...p, ...updatedFields } : p
      );
      await updateProfile({ customPlatforms: platforms });
    }
  },

  deleteCustomPlatform: async (id) => {
    const { profile, updateProfile } = get();
    if (profile) {
      const platformToDelete = profile.customPlatforms?.find(p => p.id === id);
      if (platformToDelete && platformToDelete.icon.startsWith('http')) {
        const pathMatch = platformToDelete.icon.match(/profile_assets\/(.+)$/);
        if (pathMatch && pathMatch[1]) {
          const filePath = pathMatch[1].split('?')[0];
          supabase.storage.from('profile_assets').remove([filePath])
            .then(({ error }) => {
               if (error) console.error("Failed to delete platform icon from storage:", error);
            });
        }
      }

      const platforms = (profile.customPlatforms || []).filter(p => p.id !== id);
      await updateProfile({ customPlatforms: platforms });
    }
  },

  addCompany: async (company) => {
    set((state) => ({ companies: [...state.companies, company] }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { hourlyRate, currencyCode, logoUrl, bannerUrl, contractHours, pausedMonths, ...rest } = company;
      const dbCompany = { 
        ...rest, 
        user_id: user.id, 
        hourly_rate: hourlyRate || 0,
        currency_code: currencyCode || 'USD',
        logo_url: logoUrl,
        banner_url: bannerUrl,
        contract_hours: contractHours || 0,
        paused_months: pausedMonths || [],
        work_days: company.workDays || [],
        off_days: company.offDays || []
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
    if (dbFields.contractHours !== undefined) {
      dbFields.contract_hours = dbFields.contractHours;
      delete dbFields.contractHours;
    }
    if (dbFields.pausedMonths !== undefined) {
      dbFields.paused_months = dbFields.pausedMonths;
      delete dbFields.pausedMonths;
    }
    if (dbFields.currencyCode !== undefined) {
      dbFields.currency_code = dbFields.currencyCode;
      delete dbFields.currencyCode;
    }
    if (dbFields.logoUrl !== undefined) {
      dbFields.logo_url = dbFields.logoUrl;
      delete dbFields.logoUrl;
    }
    if (dbFields.bannerUrl !== undefined) {
      dbFields.banner_url = dbFields.bannerUrl;
      delete dbFields.bannerUrl;
    }
    if (dbFields.workDays !== undefined) {
      dbFields.work_days = dbFields.workDays;
      delete dbFields.workDays;
    }
    if (dbFields.offDays !== undefined) {
      dbFields.off_days = dbFields.offDays;
      delete dbFields.offDays;
    }
    await supabase.from('companies').update(dbFields).eq('id', id);
  },

  deleteCompany: async (id) => {
    const { companies } = get();
    const companyToDelete = companies.find(c => c.id === id);
    if (companyToDelete) {
       [companyToDelete.logoUrl, companyToDelete.bannerUrl].forEach(url => {
          if (url && url.startsWith('http')) {
             const pathMatch = url.match(/profile_assets\/(.+)$/);
             if (pathMatch && pathMatch[1]) {
                const filePath = pathMatch[1].split('?')[0];
                supabase.storage.from('profile_assets').remove([filePath]).catch(console.error);
             }
          }
       });
    }

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
    set((state) => ({ tasks: [task, ...state.tasks] }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { projectId, parentTaskId, ...rest } = task;
      const dbTask = { 
        ...rest, 
        user_id: user.id, 
        project_id: projectId,
        parent_task_id: parentTaskId 
      };
      const { error } = await supabase.from('tasks').insert(dbTask);
      if (error) {
        console.error('Task insertion failed:', error);
        // Rollback local state on failure
        set((state) => ({ tasks: state.tasks.filter(t => t.id !== task.id) }));
      }
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
    if (dbFields.completedAt !== undefined) {
       dbFields.completed_at = dbFields.completedAt;
       delete dbFields.completedAt;
    }
    const { error } = await supabase.from('tasks').update(dbFields).eq('id', id);
    if (error) {
      console.error('Task update failed:', error);
    }
  },

  updateTasks: async (taskUpdates) => {
    const now = new Date().toISOString();
    
    // 1. Prepare local state update
    set((state) => ({
      tasks: state.tasks.map(t => {
        const update = taskUpdates.find(u => u.id === t.id);
        if (update) {
          const finalUpdates = { ...update.updates };
          if (finalUpdates.status === 'Completed') {
            (finalUpdates as any).completedAt = now;
          } else if (finalUpdates.status) {
            (finalUpdates as any).completedAt = null;
          }
          return { ...t, ...finalUpdates };
        }
        return t;
      })
    }));

    // 2. Update Supabase in bulk (using upsert or multiple calls)
    // For simplicity and to avoid complex mapping here, we'll use Promise.all with updates
    // In a production app, a single bulk update or RPC would be better.
    const promises = taskUpdates.map(({ id, updates }) => {
      const dbFields = { ...updates } as any;
      if (dbFields.projectId) { dbFields.project_id = dbFields.projectId; delete dbFields.projectId; }
      if (dbFields.parentTaskId !== undefined) { dbFields.parent_task_id = dbFields.parentTaskId; delete dbFields.parentTaskId; }
      if (dbFields.completedAt !== undefined) { dbFields.completed_at = dbFields.completedAt; delete dbFields.completedAt; }
      return supabase.from('tasks').update(dbFields).eq('id', id);
    });

    const results = await Promise.all(promises);
    results.forEach((res, i) => {
      if (res.error) console.error(`Failed to update task ${taskUpdates[i].id}:`, res.error);
    });
  },

  deleteTask: async (id) => {
    set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    await supabase.from('tasks').delete().eq('id', id);
  },

  clearSchedule: async () => {
    const { tasks } = get();
    // 1. Identify tasks to delete (instances created by auto-schedule)
    const toDelete = tasks.filter(t => t.status === 'Scheduled' && t.parentTaskId);
    // 2. Identify tasks to reset (all scheduled tasks, including past incompletes)
    const toReset = tasks.filter(t => t.status === 'Scheduled' && !t.parentTaskId);

    const idsToDelete = toDelete.map(t => t.id);
    const idsToReset = toReset.map(t => t.id);

    // Update state
    set((state) => ({
      tasks: state.tasks
        .filter(t => !idsToDelete.includes(t.id))
        .map(t => idsToReset.includes(t.id)
          ? { ...t, status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined } 
          : t
        )
    }));

    // Update database
    if (idsToDelete.length > 0) {
      await supabase.from('tasks').delete().in('id', idsToDelete);
    }
    if (idsToReset.length > 0) {
      await supabase.from('tasks')
        .update({ status: 'Todo', scheduledStart: null, scheduledEnd: null })
        .in('id', idsToReset);
    }
  }

}));
