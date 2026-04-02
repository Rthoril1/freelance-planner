import { addDays, setHours, setMinutes, startOfWeek, format, addMinutes, isBefore, isSameDay } from 'date-fns';
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
  
  // 1. Sort the base unassigned tasks: Priority (High > Medium > Low), then Duration (Descending)
  const sortedTasks = [...unassignedTasks].sort((a, b) => {
    const wa = (priorityWeight[a.priority as keyof typeof priorityWeight] || 0);
    const wb = (priorityWeight[b.priority as keyof typeof priorityWeight] || 0);
    if (wa !== wb) return wb - wa;
    
    // Within same priority, schedule longer tasks first
    return (b.estimatedDuration || 0) - (a.estimatedDuration || 0) || (energyWeight[b.energyLevel || 'Medium'] - energyWeight[a.energyLevel || 'Medium']);
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
  let maxHrsPerDay = 8;
  if (profile.dailyAvailability) {
    const [sh, sm] = profile.dailyAvailability.start.split(':').map(Number);
    const [eh, em] = profile.dailyAvailability.end.split(':').map(Number);
    const duration = (eh + em/60) - (sh + sm/60);
    if (duration > 0) maxHrsPerDay = Math.max(8, Math.floor(duration * 10) / 10);
  }
  if (profile.maxHoursPerDay && profile.maxHoursPerDay > maxHrsPerDay) {
    maxHrsPerDay = profile.maxHoursPerDay;
  }

  // Track the next available minute for each day
  const dayMinutes: Record<number, number> = {};
  profile.workDays.forEach(d => {
    let startMins = safeStartH * 60 + safeStartM;
    const daysToAdd = (d - 6 + 7) % 7;
    const dayDate = addDays(weekStart, daysToAdd);

    if (isSameDay(dayDate, startDate)) {
      // If scheduling for today, start from current time if it's already past shift start
      const nowMins = startDate.getHours() * 60 + startDate.getMinutes();
      startMins = Math.max(startMins, nowMins);
    }
    dayMinutes[d] = startMins;
  });

  sortedTasks.forEach(task => {
    // Check global weekly capacity before processing this task at all
    if (totalWeeklyScheduledHours + task.estimatedDuration > weeklyLimit) return;

    const timesPerDay = task.frequency?.timesPerDay || 1;
    const daysPerWeek = task.frequency?.daysPerWeek || 5;

    // Pick top available days based on current load (ONLY considering future/active days)
    const futureWorkDays = profile.workDays.filter(dayIndex => {
      const daysToAdd = (dayIndex - 6 + 7) % 7;
      const dayDate = addDays(weekStart, daysToAdd);
      return !isBefore(dayDate, startDate) || isSameDay(dayDate, startDate);
    });

    const availableDays = [...futureWorkDays].sort((a, b) => dayLoads[a] - dayLoads[b]);
    const targetDays = availableDays.slice(0, Math.min(daysPerWeek, availableDays.length));

    targetDays.forEach(dayIndex => {
      for (let j = 0; j < timesPerDay; j++) {
        // Double check daily and weekly capacity before starting this instance
        if (dayLoads[dayIndex] + task.estimatedDuration > maxHrsPerDay) continue;
        if (totalWeeklyScheduledHours + task.estimatedDuration > weeklyLimit) break;

        let remainingMinutes = task.estimatedDuration * 60;
        let currentTime = dayMinutes[dayIndex];
        const shiftEndMins = safeEndH * 60 + safeEndM;
        const daysToAdd = (dayIndex - 6 + 7) % 7; 
        const currentDayDate = addDays(weekStart, daysToAdd);

        // Skip days before the start date (prevent scheduling in the past)
        if (isSameDay(currentDayDate, startDate)) {
          // If scheduling for today, we could start from "now", but for a cleaner plan 
          // we'll start from the shift start. If the shift start is past, the dayMinutes 
          // logic should naturally handle it if we update it.
        } else if (isBefore(currentDayDate, startDate)) {
          return; // Skip this day instance
        }

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
