export type TaskType = 'Deep Work' | 'Operative' | 'Administrative' | 'Meetings' | 'Creative' | 'Research' | 'QA/Testing';
export type Priority = 'High' | 'Medium' | 'Low';
export type EnergyLevel = 'High' | 'Medium' | 'Low';

export interface UserProfile {
  name: string;
  type: string; // e.g., 'Freelancer'
  avatarUrl?: string; // Added
  weeklyHoursAvailable: number;
  workDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  dailyAvailability: { start: string; end: string }; // "08:00" to "18:00"
  maxHoursPerDay: number;
  preferredBlocks: string[]; // "Morning", "Afternoon", "Evening"
  lunchTime?: { start: string; durationMinutes: number };
  customBreaks?: { id: string; start: string; durationMinutes: number }[];
}

export interface Company {
  id: string;
  name: string;
  description: string;
  color: string;
  priority?: Priority;
  status: 'Active' | 'Paused';
}

export interface Project {
  id: string;
  companyId: string;
  name: string;
  status: 'Active' | 'New' | 'Paused' | 'Delivered';
  startDate: string;
  deadline?: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  type: TaskType;
  priority: Priority;
  estimatedDuration: number; // in hours
  deadline?: string;
  energyLevel: EnergyLevel;
  notes: string;
  status: 'Todo' | 'Scheduled' | 'Completed';
  scheduledStart?: string; // ISO datetime if scheduled
  scheduledEnd?: string; // ISO datetime if scheduled
  platformId?: string; // Links task to generic platform templates
  frequency?: {
    timesPerDay: number;
    daysOfWeek: number[]; // [1, 2, 3...] where 1 = Monday, 0 = Sunday
  };
}
