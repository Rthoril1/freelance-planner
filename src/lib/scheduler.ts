import { addDays, setHours, setMinutes, startOfWeek, format } from 'date-fns';
import { Task, UserProfile } from '@/types';
import { generateId } from './utils';

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
  
  // 1. Sort the base unassigned tasks by priority/energy first
  const sortedTasks = [...unassignedTasks].sort((a, b) => {
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return energyWeight[b.energyLevel] - energyWeight[a.energyLevel];
  });

  // 2. Expand recurring tasks into instances
  const taskInstances: Task[] = [];
  sortedTasks.forEach(task => {
    const timesPerDay = task.frequency?.timesPerDay || 1;
    const daysOfWeek = task.frequency?.daysOfWeek || [1, 2, 3, 4, 5]; // Default to Mon-Fri if not specified
    
    daysOfWeek.forEach(dayIndex => {
      for (let j = 0; j < timesPerDay; j++) {
        taskInstances.push({
          ...task,
          id: generateId(),
          status: 'Scheduled',
          // Temporarily tag which day it SHOULD go to in the notes for easy filtering
          notes: `${task.notes || ''} [target-day:${dayIndex}]` 
        });
      }
    });
  });

  const scheduledTasks: Task[] = [];
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }); 
  const dayStartHour = parseInt(profile.dailyAvailability.start.split(':')[0], 10) || 9;
  const maxHrs = profile.maxHoursPerDay || 8;

  const sortedDays = [...profile.workDays].sort((a, b) => {
    const adjA = a === 0 ? 7 : a;
    const adjB = b === 0 ? 7 : b;
    return adjA - adjB;
  });

  for (const dayOfWeek of sortedDays) {
    const daysToAdd = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
    let currentDayDate = addDays(weekStart, daysToAdd);
    let hoursAssignedToday = 0;
    let currentHour = dayStartHour;
    
    // Only pick tasks that are allowed/targeted for this day
    const tasksForToday = taskInstances.filter(inst => {
      const match = inst.notes.match(/\[target-day:(\d+)\]/);
      return match && parseInt(match[1], 10) === dayOfWeek;
    });

    for (const task of tasksForToday) {
      if (hoursAssignedToday + task.estimatedDuration <= maxHrs) {
        const start = setMinutes(setHours(currentDayDate, currentHour), 0);
        const durationMins = task.estimatedDuration * 60;
        const endHour = currentHour + Math.floor(durationMins / 60);
        const endMins = durationMins % 60;
        const end = setMinutes(setHours(currentDayDate, endHour), endMins);
        
        scheduledTasks.push({
          ...task,
          notes: task.notes.replace(/\[target-day:\d+\]/, '').trim(), // Clean up temporary tag
          status: 'Scheduled',
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString()
        });
        
        hoursAssignedToday += task.estimatedDuration;
        currentHour = endHour + (endMins / 60);
      }
    }
  }

  return scheduledTasks;
}
