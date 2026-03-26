import { addDays, setHours, setMinutes, startOfWeek } from 'date-fns';
import { Task, UserProfile } from '@/types';

/**
 * Automagically schedules unassigned tasks into the user's available time blocks.
 * Prioritizes High priority over Medium over Low. 
 * Secondary sort by Energy Level.
 */
export function autoScheduleTasks(
  unassignedTasks: Task[],
  profile: UserProfile,
  startDate: Date = new Date()
): Task[] {
  const priorityWeight = { High: 3, Medium: 2, Low: 1 };
  const energyWeight = { High: 3, Medium: 2, Low: 1 };
  
  // Sort tasks in-place clone
  const sortedTasks = [...unassignedTasks].sort((a, b) => {
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority]; // Descending priority
    }
    // Deep Work / High Energy first
    return energyWeight[b.energyLevel] - energyWeight[a.energyLevel]; // Descending energy
  });

  const scheduledTasks: Task[] = [];
  
  // Get the Monday of the current week as the baseline
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }); 

  // Parse preferred daily start hour (e.g., "08:30" -> 8, "09:00" -> 9)
  const dayStartHour = parseInt(profile.dailyAvailability.start.split(':')[0], 10) || 9;
  const maxHrs = profile.maxHoursPerDay || 8;

  let currentTaskIndex = 0;
  
  // profile.workDays is an array from 0 to 6 representing Sunday to Saturday
  // We want to sort it so Monday (1) comes first, up to Sunday (0=7 in our relative math)
  const sortedDays = [...profile.workDays].sort((a, b) => {
    const adjA = a === 0 ? 7 : a;
    const adjB = b === 0 ? 7 : b;
    return adjA - adjB;
  });

  for (const dayOfWeek of sortedDays) {
    if (currentTaskIndex >= sortedTasks.length) break;

    const daysToAdd = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
    let currentDayDate = addDays(weekStart, daysToAdd);
    
    let hoursAssignedToday = 0;
    let currentHour = dayStartHour;

    while (hoursAssignedToday < maxHrs && currentTaskIndex < sortedTasks.length) {
      const task = sortedTasks[currentTaskIndex];
      
      // Check if task fits in remaining daily hours
      if (hoursAssignedToday + task.estimatedDuration <= maxHrs) {
        
        // Schedule it
        const start = setMinutes(setHours(currentDayDate, currentHour), 0);
        // We handle half hours if duration is e.g. 1.5, we convert to hours/minutes
        const durationMins = task.estimatedDuration * 60;
        const endHour = currentHour + Math.floor(durationMins / 60);
        const endMins = durationMins % 60;
        
        const end = setMinutes(setHours(currentDayDate, endHour), endMins);
        
        scheduledTasks.push({
          ...task,
          status: 'Scheduled',
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString()
        });
        
        hoursAssignedToday += task.estimatedDuration;
        
        // Update current hour tracking (simplistic, assumes exact hour boundaries generally)
        currentHour = endHour + (endMins / 60);
        currentTaskIndex++;
      } else {
        // Move to next day if it doesn't fit
        break; 
      }
    }
  }

  // Whatever tasks are assigned get returned, the caller needs to update the store with them.
  return scheduledTasks;
}
