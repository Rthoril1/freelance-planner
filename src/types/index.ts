export type TaskType = 'Deep Work' | 'Operative' | 'Administrative' | 'Meetings' | 'Creative' | 'Research' | 'QA/Testing';
export type Priority = 'High' | 'Medium' | 'Low';
export type EnergyLevel = 'High' | 'Medium' | 'Low';

export interface UserProfile {
  name: string;
  type: string; // e.g., 'Freelancer'
  avatarUrl?: string; // Added
  email?: string;
  phone?: string;
  weeklyHoursAvailable: number;
  workDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  dailyAvailability: { start: string; end: string }; // "08:00" to "18:00"
  maxHoursPerDay: number;
  preferredBlocks: string[]; // "Morning", "Afternoon", "Evening"
  lunchTime?: { start: string; durationMinutes: number };
  customBreaks?: { id: string; start: string; durationMinutes: number }[];
  customPlatforms?: CustomPlatform[];
  hiddenPresetIds?: string[];
  platformsInitialized?: boolean;
}

export interface CustomAction {
  name: string;
  type: TaskType;
  duration: number;
  priority: Priority;
  energyLevel: EnergyLevel;
  daysPerWeek?: number;
  timesPerDay?: number;
}

export interface CustomPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  actions: CustomAction[];
  isHidden?: boolean;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  color: string;
  logoUrl?: string; // Added for brand logo
  bannerUrl?: string; // Added for background banner
  priority?: Priority;
  status: 'Active' | 'Paused';
  hourlyRate?: number;
  currencyCode?: string;
}


export interface Project {
  id: string;
  companyId: string;
  name: string;
  color?: string;
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
    daysPerWeek: number; // New: 1-7 days per week
    daysOfWeek?: number[]; // [1, 2, 3...] where 1 = Monday, 7 = Sunday. Optional for pinning.
  };
  parentTaskId?: string; // Links instance to template task
  completedAt?: string; // ISO datetime when task was finished
}
