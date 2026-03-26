import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Company, Project, Task, UserProfile } from '../types';

interface AppState {
  profile: UserProfile | null;
  companies: Company[];
  projects: Project[];
  tasks: Task[];

  setProfile: (profile: UserProfile) => void;
  
  addCompany: (company: Company) => void;
  updateCompany: (id: string, company: Partial<Company>) => void;
  deleteCompany: (id: string) => void;

  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Quick setup with dummy data action.
  loadDummyData: () => void;
  clearSchedule: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      companies: [],
      projects: [],
      tasks: [],

      setProfile: (profile) => set({ profile }),

      addCompany: (company) => set((state) => ({ companies: [...state.companies, company] })),
      updateCompany: (id, updatedFields) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, ...updatedFields } : c)
      })),
      deleteCompany: (id) => set((state) => ({
        companies: state.companies.filter(c => c.id !== id),
        projects: state.projects.filter(p => p.companyId !== id),
        tasks: state.tasks.filter(t => state.projects.find(p => p.id === t.projectId)?.companyId !== id)
      })),

      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (id, updatedFields) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...updatedFields } : p)
      })),
      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        tasks: state.tasks.filter(t => t.projectId !== id)
      })),

      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, updatedFields) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updatedFields } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),

      clearSchedule: () => set((state) => ({
        tasks: state.tasks.map(t => t.status === 'Scheduled' ? { ...t, status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined } : t)
      })),

      loadDummyData: () => set({
        profile: {
          name: 'Freelancer',
          type: 'Consultant',
          weeklyHoursAvailable: 60,
          workDays: [1, 2, 3, 4, 5], // Mon-Fri
          dailyAvailability: { start: '08:00', end: '18:00' },
          maxHoursPerDay: 8,
          preferredBlocks: ['Morning', 'Afternoon'],
          lunchTime: { start: '13:00', durationMinutes: 60 },
          customBreaks: [
            { id: 'b1', start: '10:30', durationMinutes: 15 },
            { id: 'b2', start: '16:00', durationMinutes: 15 }
          ]
        },
        companies: [
          { id: 'c1', name: 'Entretedigital1', description: 'Digital Marketing rules', color: '#3b82f6', status: 'Active', priority: 'High' }
        ],
        projects: [
          { id: 'p1', companyId: 'c1', name: 'Natx 404', status: 'Active', startDate: new Date().toISOString() },
          { id: 'p2', companyId: 'c1', name: '33 North', status: 'New', startDate: new Date().toISOString() }
        ],
        tasks: [
          { id: 't1', projectId: 'p1', name: 'Desarrollo de features', type: 'Deep Work', priority: 'High', estimatedDuration: 4, energyLevel: 'High', notes: '', status: 'Todo' },
          { id: 't2', projectId: 'p1', name: 'Bugs críticos', type: 'Deep Work', priority: 'High', estimatedDuration: 3, energyLevel: 'High', notes: '', status: 'Todo' },
          { id: 't3', projectId: 'p1', name: 'QA', type: 'QA/Testing', priority: 'High', estimatedDuration: 2, energyLevel: 'Low', notes: '', status: 'Todo' },
          { id: 't4', projectId: 'p2', name: 'Setup inicial', type: 'Deep Work', priority: 'High', estimatedDuration: 4, energyLevel: 'High', notes: '', status: 'Todo' },
          { id: 't5', projectId: 'p2', name: 'Roadmap', type: 'Administrative', priority: 'High', estimatedDuration: 2, energyLevel: 'Medium', notes: '', status: 'Todo' },
          { id: 't6', projectId: 'p2', name: 'Reunión cliente', type: 'Meetings', priority: 'Medium', estimatedDuration: 1, energyLevel: 'Medium', notes: '', status: 'Todo' }
        ]
      })
    }),
    {
      name: 'freelance-planner-storage',
    }
  )
);
