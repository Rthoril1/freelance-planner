import { addDays, setHours, setMinutes, startOfWeek, format, addMinutes } from 'date-fns';
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
  
  // 1. Sort the base unassigned tasks
  // New rule: Tasks > 5 hours get absolute priority (pinned to start of shift if possible)
  const sortedTasks = [...unassignedTasks].sort((a, b) => {
    const aIsLong = a.estimatedDuration >= 5 ? 1 : 0;
    const bIsLong = b.estimatedDuration >= 5 ? 1 : 0;
    
    if (aIsLong !== bIsLong) return bIsLong - aIsLong;
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return energyWeight[b.energyLevel] - energyWeight[a.energyLevel];
  });

  // 2. Expand recurring tasks into instances and assign to days based on load
  const scheduledTasks: Task[] = [];
  const weekStart = startOfWeek(startDate, { weekStartsOn: 6 }); // Sync with Saturday anchor  
  // Track load per day and global weekly load
  const dayLoads: Record<number, number> = {};
  profile.workDays.forEach(d => dayLoads[d] = 0);
  let totalWeeklyScheduledHours = 0;
  const weeklyLimit = profile.weeklyHoursAvailable || (profile.maxHoursPerDay * profile.workDays.length) || 40;

  const [startH, startM] = (profile.dailyAvailability?.start || '09:00').split(':').map(Number);
  const safeStartH = isNaN(startH) ? 9 : startH;
  const safeStartM = isNaN(startM) ? 0 : startM;
  const [endH, endM] = (profile.dailyAvailability?.end || '21:00').split(':').map(Number);
  const safeEndH = isNaN(endH) ? 21 : endH;
  const safeEndM = isNaN(endM) ? 0 : endM;
  const maxHrsPerDay = profile.maxHoursPerDay || 8;

  // Track the next available minute for each day
  const dayMinutes: Record<number, number> = {};
  profile.workDays.forEach(d => dayMinutes[d] = safeStartH * 60 + safeStartM);

  sortedTasks.forEach(task => {
    // Check global weekly capacity before processing this task at all
    if (totalWeeklyScheduledHours + task.estimatedDuration > weeklyLimit) return;

    const timesPerDay = task.frequency?.timesPerDay || 1;
    const daysPerWeek = task.frequency?.daysPerWeek || 5;

    // Pick top available days based on current load
    const availableDays = [...profile.workDays].sort((a, b) => dayLoads[a] - dayLoads[b]);
    const targetDays = availableDays.slice(0, Math.min(daysPerWeek, availableDays.length));

    targetDays.forEach(dayIndex => {
      for (let j = 0; j < timesPerDay; j++) {
        // Double check daily and weekly capacity before starting this instance
        if (dayLoads[dayIndex] + task.estimatedDuration > maxHrsPerDay) continue;
        if (totalWeeklyScheduledHours + task.estimatedDuration > weeklyLimit) break;

        let remainingMinutes = task.estimatedDuration * 60;
        let currentTime = dayMinutes[dayIndex];
        const shiftEndMins = safeEndH * 60 + safeEndM;
        // Mapping Mon-Sun (1-7) to Sat-Fri offset (0-6) relative to Saturday
        const daysToAdd = (dayIndex - 6 + 7) % 7; 
        const currentDayDate = addDays(weekStart, daysToAdd);

        // Pre-calculate blocked periods just for this day once
        const blockedPeriods: { start: number; end: number }[] = [];
        const lunch = profile.lunchTime || { start: '13:00', durationMinutes: 60 };
        const [lh, lm] = lunch.start.split(':').map(Number);
        const lStartMins = (isNaN(lh) ? 13 : lh) * 60 + (isNaN(lm) ? 0 : lm);
        blockedPeriods.push({ start: lStartMins, end: lStartMins + lunch.durationMinutes });

        if (profile.customBreaks) {
          profile.customBreaks.forEach(b => {
            const [h, m] = b.start.split(':').map(Number);
            const bStart = (isNaN(h) ? 10 : h) * 60 + (isNaN(m) ? 0 : m);
            blockedPeriods.push({ start: bStart, end: bStart + b.durationMinutes });
          });
        }

        while (remainingMinutes > 0 && currentTime < shiftEndMins) {
          let nextBlockEnd = shiftEndMins;
          let inCollision = false;

          for (const period of blockedPeriods) {
            if (currentTime >= period.start && currentTime < period.end) {
              currentTime = period.end;
              inCollision = true;
              break; 
            }
            if (period.start > currentTime && period.start < nextBlockEnd) {
              nextBlockEnd = period.start;
            }
          }

          if (inCollision) continue;

          const availableMins = nextBlockEnd - currentTime;
          if (availableMins > 0) {
            const durationForFragment = Math.round(Math.min(availableMins, remainingMinutes));
            if (durationForFragment <= 0) break;

            const start = setMinutes(setHours(currentDayDate, 0), currentTime);
            const end = addMinutes(start, durationForFragment);

            scheduledTasks.push({
              ...task,
              id: generateId(),
              status: 'Scheduled',
              parentTaskId: task.id,
              scheduledStart: start.toISOString(),
              scheduledEnd: end.toISOString(),
              estimatedDuration: durationForFragment / 60
            });

            remainingMinutes -= durationForFragment;
            currentTime += durationForFragment;
            dayLoads[dayIndex] += (durationForFragment / 60);
            totalWeeklyScheduledHours += (durationForFragment / 60);
          } else {
            break;
          }
        }
        dayMinutes[dayIndex] = currentTime;
      }
    });
  });

  return scheduledTasks;
}
