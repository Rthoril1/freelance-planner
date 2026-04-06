'use client';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { autoScheduleTasks } from '@/lib/scheduler';
import { Task } from '@/types';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable, DragOverlay, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addDays, format, isSameDay, parseISO, startOfWeek, addMinutes } from 'date-fns';
import { Wand2, GripVertical, X, CheckCircle2, Moon, Utensils, Coffee, ShieldCheck, Calendar, Info, Zap, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { PRESET_PLATFORMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK_LABELS: Record<number, string> = {
  6: 'Saturday', 7: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday'
};

const HOUR_HEIGHT = 90;

function getTaskLayouts(dayTasks: Task[], startHour: number) {
  const gridStartMins = startHour * 60;
  const priorityWeights: Record<string, number> = { 'Low': 0, 'Medium': 1, 'High': 2 };

  const taskItems = dayTasks.map(t => {
    const start = parseISO(t.scheduledStart!);
    const mins = start.getHours() * 60 + start.getMinutes();
    const top = ((mins - gridStartMins) / 60) * HOUR_HEIGHT;
    const visualDuration = Math.max(t.estimatedDuration, 0.4); 
    const height = Math.max(0.35, t.estimatedDuration) * HOUR_HEIGHT;
    return { ...t, id: t.id, top, height, visualBottom: top + (visualDuration * HOUR_HEIGHT) };
  });

  taskItems.sort((a, b) => a.top - b.top);
  const clusters: (typeof taskItems[0])[][] = [];
  let currentCluster: typeof taskItems[0][] = [];
  let clusterMaxBottom = 0;

  taskItems.forEach(item => {
    if (currentCluster.length > 0 && item.top < clusterMaxBottom - 1) {
      currentCluster.push(item);
      clusterMaxBottom = Math.max(clusterMaxBottom, item.visualBottom);
    } else {
      if (currentCluster.length > 0) clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxBottom = item.visualBottom;
    }
  });
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const layoutMap: Record<string, { left: number, width: number }> = {};
  clusters.forEach(cluster => {
    const sorted = [...cluster].sort((a, b) => {
      const wa = priorityWeights[a.priority as string] ?? 1;
      const wb = priorityWeights[b.priority as string] ?? 1;
      if (wa !== wb) return wb - wa; // High priority (wa=2) first (index 0)
      return a.top - b.top;
    });

    const size = sorted.length;
    sorted.forEach((item, idx) => {
      layoutMap[item.id] = {
        left: (idx / size) * 100,
        width: 100 / size
      };
    });
  });

  return layoutMap;
}

function TaskCardUI({ 
  task, companyName, projectName, projectColor, onUnschedule, onMove,
  isAbsolute, isDragging, layout, startHour, style: parentStyle, attributes, listeners
}: { 
  task: Task, companyName: string, projectName: string, projectColor: string, 
  onUnschedule?: () => void, onMove?: (dir: 'up' | 'down' | 'left' | 'right') => void,
  isAbsolute?: boolean, isDragging?: boolean, 
  layout?: { left: number, width: number }, startHour: number, style?: React.CSSProperties,
  attributes?: React.HTMLAttributes<HTMLDivElement>, listeners?: React.HTMLAttributes<HTMLDivElement>
}) {
  const height = Math.max(0.35, task.estimatedDuration) * HOUR_HEIGHT;
  let style: React.CSSProperties = { ...parentStyle };
  
  // DRAG PRECISION FIX: 
  // If we are dragging in the overlay, reset top/left to 0 so the dnd-kit transform 
  // centers the grab handle under the mouse, instead of keeping the 10 AM offset.
  if (isDragging) {
    style = { ...style, position: 'relative', top: 0, left: 0, width: '100%' };
  } else if (isAbsolute && task.scheduledStart) {
    const startDate = new Date(task.scheduledStart);
    const startMins = startDate.getHours() * 60 + startDate.getMinutes();
    const top = ((startMins - startHour * 60) / 60) * HOUR_HEIGHT;
    style = {
      ...style, position: 'absolute', top: `${top}px`, height: `${height}px`,
      left: layout ? `${layout.left}%` : '6px',
      width: layout ? `${layout.width}%` : 'calc(100% - 12px)',
      paddingRight: layout ? '4px' : '0', marginBottom: 0
    };
  }

  const uiColor = projectColor;
  return (
    <div style={{ ...style, backgroundColor: task.status === 'Completed' ? undefined : uiColor + '0D' }}
      className={cn("group relative rounded-xl transition-all duration-300 overflow-hidden shadow-sm border border-slate-100", 
        isDragging ? "shadow-2xl ring-4 ring-primary/20 border-primary z-[100] bg-white pointer-events-none" : "bg-white hover:border-primary/40 hover:shadow-lg z-20",
        task.status === 'Completed' ? "opacity-50 grayscale-[0.3]" : "", !isAbsolute ? "mb-3" : "")}>
      <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: uiColor }} />
      <div className={cn("flex flex-col h-full pl-4 pr-3 py-2.5 overflow-hidden", isAbsolute ? "" : "min-h-[70px] justify-between")}>
        <div className="flex items-start justify-between gap-2 mb-1">
          {!isAbsolute && (
            <div {...(task.status === 'Todo' ? { ...attributes, ...listeners } : {})} className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-primary transition-colors mt-0.5">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={cn("font-bold text-xs tracking-tight leading-tight", task.status === 'Completed' ? "line-through text-slate-400" : "text-slate-900 group-hover:text-primary transition-colors")}>{task.name}</p>
            <div className="flex items-center gap-1.5 mt-1 border-t border-slate-50 pt-1">
              <span className="text-[9px] font-bold" style={{ color: uiColor }}>{companyName}</span>
              {projectName && <><span className="text-[8px] text-slate-200">·</span><span className="text-[9px] font-bold text-slate-400 truncate max-w-[90px]">{projectName}</span></>}
            </div>
          </div>
          {onUnschedule && (
            <button onPointerDown={(e) => { e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); onUnschedule(); }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg p-1 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
          <div className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", task.priority === 'High' ? "bg-rose-500/10 text-rose-500" : task.priority === 'Medium' ? "bg-amber-500/10 text-amber-500" : "bg-slate-100 text-slate-400")}>{task.priority || 'Medium'}</div>
          {task.energyLevel && <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full"><Zap className="w-2.5 h-2.5 fill-current" />{task.energyLevel}</div>}
          <div className="ml-auto text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-white/50 border border-slate-100 px-2 py-0.5 rounded-lg">{task.estimatedDuration}h</div>
        </div>
      </div>

      {/* Movement Controls Overlay - Only for Scheduled Tasks */}
      {isAbsolute && onMove && !isDragging && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 z-30 translate-y-2 group-hover:translate-y-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onMove('left'); }}
            className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onMove('up'); }}
              className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:scale-110 active:scale-95 transition-all"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMove('down'); }}
              className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:scale-110 active:scale-95 transition-all"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); onMove('right'); }}
            className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function SortableTaskCard({ 
  task, companyName, projectName, projectColor, onUnschedule, onMove, startHour, isAbsolute = false, layout, containerId
}: { 
  task: Task, companyName: string, projectName: string, projectColor: string, 
  onUnschedule?: () => void, onMove?: (dir: 'up' | 'down' | 'left' | 'right') => void,
  startHour: number, isAbsolute?: boolean, layout?: { left: number, width: number },
  containerId: string
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = task.scheduledStart ? new Date(task.scheduledStart) : null;
  const isPast = taskDate && taskDate < today;
  const isCompleted = task.status === 'Completed';
  const canMove = !isPast || !isCompleted;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: task.id, 
    data: { type: 'task', containerId },
    disabled: !canMove || isAbsolute
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  
  return (
    <div ref={setNodeRef} style={{ ...style, opacity: isDragging ? 0.3 : 1 }}>
      <TaskCardUI 
        task={task} companyName={companyName} projectName={projectName} projectColor={projectColor} 
        onUnschedule={onUnschedule} onMove={onMove} startHour={startHour} isAbsolute={isAbsolute} 
        isDragging={isDragging} layout={layout} attributes={attributes} listeners={listeners}
      />
    </div>
  );
}

function DroppableColumn({ id, children, className, type, disabled }: { id: string, children: React.ReactNode, className?: string, type: 'backlog' | 'day', disabled?: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ 
    id,
    data: { type, containerId: id },
    disabled
  });
  return <div ref={setNodeRef} id={id} className={cn("relative transition-all duration-300", isOver && !disabled ? "bg-primary/[0.03]" : "", className)}>{children}</div>;
}

export default function PlannerPage() {
  const { tasks, profile, companies, projects, updateTask, updateTasks, clearSchedule } = useStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{ day: string, hour: number, mins: number } | null>(null);
  const [hasScheduled, setHasScheduled] = useState(false);
  const gridRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { setMounted(true); }, []);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const plannerStart = startOfWeek(new Date(), { weekStartsOn: 6 }); 
  const days = Array.from({ length: 7 }, (_, i) => addDays(plannerStart, i));
  
  if (!mounted || !profile) return null;
  
  const startHour = profile.dailyAvailability?.start ? parseInt(profile.dailyAvailability.start.split(':')[0]) : 0;
  const endHour = profile.dailyAvailability?.end ? parseInt(profile.dailyAvailability.end.split(':')[0]) : 23;
  const hoursList = Array.from({ length: (endHour - startHour) + 1 }, (_, i) => startHour + i);
  
  const getTaskInfo = (taskId: string) => {
    const t = tasks.find(x => x.id === taskId), p = projects.find(x => x.id === t?.projectId), c = companies.find(x => x.id === p?.companyId);
    return { companyName: c?.name || 'Unknown', companyColor: c?.color || '#818CF8', projectColor: p?.color || c?.color || '#818CF8', projectName: p?.name || 'No Project' };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event;
    if (!over) { setDragTarget(null); return; }

    const activeRect = active.rect.current.translated;
    if (!activeRect) return;

    // Reliability First: Trust the built-in "over" detector from dnd-kit
    let targetContainerId = over.id as string;
    
    // Boundary Fallback: If "over" is ambiguous, use the manual center detection
    const focusX = activeRect.left + activeRect.width / 2;
    const focusY = activeRect.top;

    if (!days.map(d => format(d, 'yyyy-MM-dd')).includes(targetContainerId)) {
      const foundId = Object.keys(gridRefs.current).find(key => {
        const rect = gridRefs.current[key]?.getBoundingClientRect();
        return rect && focusX >= rect.left && focusX <= rect.right;
      });
      if (foundId) targetContainerId = foundId;
    }

    const isDayColumn = targetContainerId && days.map(d => format(d, 'yyyy-MM-dd')).includes(targetContainerId);

    if (isDayColumn && targetContainerId) {
      const colEl = gridRefs.current[targetContainerId];
      if (colEl) {
        const colRect = colEl.getBoundingClientRect();
        const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
        const relTop = focusY - colRect.top + scrollY;
        const totalH = Math.max(0, relTop / HOUR_HEIGHT);
        const h = Math.floor(totalH + startHour);
        const m = Math.round(((totalH + startHour) % 1) * 60 / 15) * 15;
        setDragTarget({ day: targetContainerId, hour: h, mins: m });
      }
    } else {
      setDragTarget(null);
    }
  };

  const getDayBreaks = (date: Date) => {
    const breaks: { start: number, end: number }[] = [];
    const lunch = profile.lunchTime || { start: '13:00', durationMinutes: 60 };
    const [lh, lm] = lunch.start.split(':');
    const lStart = parseInt(lh) * 60 + parseInt(lm);
    breaks.push({ start: lStart, end: lStart + lunch.durationMinutes });
    profile.customBreaks?.forEach(b => {
      const [bh, bm] = b.start.split(':');
      const bStart = parseInt(bh) * 60 + parseInt(bm);
      breaks.push({ start: bStart, end: bStart + b.durationMinutes });
    });
    return breaks;
  };

  const adjustForBreaks = (start: Date, end: Date, direction: 'up' | 'down') => {
    let currentStart = new Date(start);
    let currentEnd = new Date(end);
    const duration = (currentEnd.getTime() - currentStart.getTime()) / (60 * 1000);
    const dayBreaks = getDayBreaks(currentStart);

    let attempts = 0;
    while (attempts < 5) {
      const sMins = currentStart.getHours() * 60 + currentStart.getMinutes();
      const eMins = sMins + duration;
      const overlap = dayBreaks.find(b => sMins < b.end && eMins > b.start);

      if (!overlap) break;

      if (direction === 'up') {
        const diff = eMins - overlap.start;
        currentStart = addMinutes(currentStart, -diff);
        currentEnd = addMinutes(currentEnd, -diff);
      } else {
        const diff = overlap.end - sMins;
        currentStart = addMinutes(currentStart, diff);
        currentEnd = addMinutes(currentEnd, diff);
      }
      attempts++;
    }
    return { start: currentStart, end: currentEnd };
  };

  const resolveShifts = (movedTaskId: string, newStart: Date, newEnd: Date, dayTasks: Task[]) => {
    // Simplified: Only resolve immediate overlaps to prevent "column ripple"
    const updates: { id: string, updates: Partial<Task> }[] = [];
    const otherTasks = [...dayTasks].filter(t => t.id !== movedTaskId && t.status !== 'Completed');
    const overlapThreshold = 15 * 60 * 1000;

    const taskColliding = otherTasks.find(t => {
      const tStart = new Date(t.scheduledStart!).getTime();
      const tEnd = new Date(t.scheduledEnd!).getTime();
      return (newStart.getTime() < tEnd - overlapThreshold && newEnd.getTime() > tStart + overlapThreshold);
    });

    if (taskColliding) {
      // If we are colliding, we don't automatically shift anymore
      // handleMoveTask handles the "swap" logic now.
    }

    return updates;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setDragTarget(null);
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find(t => t.id === activeTaskId);
    if (!activeTask) return;

    const activeRect = active.rect.current.translated;

    // STRATEGY: Trust "over" ID first (most reliable for days), then boundary fallback
    let targetContainerId = overId;
    const isDayStr = (id: string) => days.map(d => format(d, 'yyyy-MM-dd')).includes(id);

    if (!isDayStr(targetContainerId) && targetContainerId !== 'unassigned') {
      if (activeRect) {
        const activeCenterX = activeRect.left + activeRect.width / 2;
        const foundId = Object.keys(gridRefs.current).find(key => {
          const rect = gridRefs.current[key]?.getBoundingClientRect();
          return rect && activeCenterX >= rect.left && activeCenterX <= rect.right;
        });
        if (foundId) targetContainerId = foundId;
      }
    }

    const isDay = days.map(d => format(d, 'yyyy-MM-dd')).includes(targetContainerId);

    if (isDay) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPastDay = new Date(targetContainerId) < today;
      if (isPastDay) {
        addNotification("Cannot move tasks to a past day", "warning");
        return;
      }

      const dayDate = new Date(targetContainerId);
      const columnElement = gridRefs.current[targetContainerId];
      if (activeRect && columnElement) {
        const columnRect = columnElement.getBoundingClientRect();
        const relativeTop = activeRect.top - columnRect.top + (typeof window !== 'undefined' ? window.scrollY : 0);
        let totalHoursFromStart = relativeTop / HOUR_HEIGHT;
        
        // Safety Clamping: Ensure it doesn't fall above the first line
        totalHoursFromStart = Math.max(0, totalHoursFromStart);

        const targetHour = Math.floor(totalHoursFromStart + startHour);
        const targetMinutes = Math.round(((totalHoursFromStart + startHour) % 1) * 60 / 15) * 15;
        
        dayDate.setHours(targetHour, targetMinutes, 0, 0);
        
        if (targetHour < startHour || targetHour >= endHour + 1) {
          addNotification(`Task "${activeTask.name}" scheduled outside shift hours`, 'warning');
        }

        const scheduledEnd = new Date(dayDate);
        scheduledEnd.setMinutes(dayDate.getMinutes() + activeTask.estimatedDuration * 60);
        
        const dayTasks = tasks.filter(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), new Date(targetContainerId)));
        const shiftUpdates = resolveShifts(activeTaskId, dayDate, scheduledEnd, dayTasks);
        
        const updates = [
          { id: activeTaskId, updates: { status: 'Scheduled' as const, scheduledStart: dayDate.toISOString(), scheduledEnd: scheduledEnd.toISOString() } },
          ...shiftUpdates
        ];
        updateTasks(updates);
      }
      return;
    }

    if (targetContainerId === 'unassigned') {
      updateTask(activeTaskId, { status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined });
      return;
    }
  };

  const handleMoveTask = (taskId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.scheduledStart || !task.scheduledEnd) return;

    const start = parseISO(task.scheduledStart);
    const end = parseISO(task.scheduledEnd);
    const durationMins = (end.getTime() - start.getTime()) / (60 * 1000);
    
    let newStart = new Date(start);
    let newEnd = new Date(end);

    const dayTasks = tasks.filter(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), start) && t.status !== 'Completed')
                          .sort((a, b) => parseISO(a.scheduledStart!).getTime() - parseISO(b.scheduledStart!).getTime());
    const currentIndex = dayTasks.findIndex(t => t.id === taskId);

    // 1. Swap Logic for Up/Down
    if (direction === 'up' && currentIndex > 0) {
      const taskAbove = dayTasks[currentIndex - 1];
      const taskAboveEnd = parseISO(taskAbove.scheduledEnd!);
      // If we are touching or overlapping, SWAP
      if (start.getTime() <= taskAboveEnd.getTime() + (1 * 60 * 1000)) {
        const taskAboveStart = parseISO(taskAbove.scheduledStart!);
        const aboveDuration = (taskAboveEnd.getTime() - taskAboveStart.getTime()) / (60 * 1000);
        
        const swappedMovedStart = new Date(taskAboveStart);
        const swappedMovedEnd = new Date(swappedMovedStart.getTime() + (durationMins * 60 * 1000));
        const swappedAboveStart = new Date(swappedMovedEnd);
        const swappedAboveEnd = new Date(swappedAboveStart.getTime() + (aboveDuration * 60 * 1000));

        updateTasks([
          { id: taskId, updates: { scheduledStart: swappedMovedStart.toISOString(), scheduledEnd: swappedMovedEnd.toISOString() } },
          { id: taskAbove.id, updates: { scheduledStart: swappedAboveStart.toISOString(), scheduledEnd: swappedAboveEnd.toISOString() } }
        ]);
        return;
      }
    }

    if (direction === 'down' && currentIndex < dayTasks.length - 1) {
      const taskBelow = dayTasks[currentIndex + 1];
      const taskBelowStart = parseISO(taskBelow.scheduledStart!);
      // If we are touching or overlapping, SWAP
      if (end.getTime() >= taskBelowStart.getTime() - (1 * 60 * 1000)) {
        const taskBelowEnd = parseISO(taskBelow.scheduledEnd!);
        const belowDuration = (taskBelowEnd.getTime() - taskBelowStart.getTime()) / (60 * 1000);
        
        const swappedBelowStart = new Date(start);
        const swappedBelowEnd = new Date(swappedBelowStart.getTime() + (belowDuration * 60 * 1000));
        const swappedMovedStart = new Date(swappedBelowEnd);
        const swappedMovedEnd = new Date(swappedMovedStart.getTime() + (durationMins * 60 * 1000));

        updateTasks([
          { id: taskId, updates: { scheduledStart: swappedMovedStart.toISOString(), scheduledEnd: swappedMovedEnd.toISOString() } },
          { id: taskBelow.id, updates: { scheduledStart: swappedBelowStart.toISOString(), scheduledEnd: swappedBelowEnd.toISOString() } }
        ]);
        return;
      }
    }

    // 2. Default Movement (if no swap)
    if (direction === 'up') {
      newStart = addMinutes(start, -15);
      newEnd = addMinutes(end, -15);
    } else if (direction === 'down') {
      newStart = addMinutes(start, 15);
      newEnd = addMinutes(end, 15);
    } else if (direction === 'left') {
      newStart = addDays(start, -1);
      newEnd = addDays(end, -1);
    } else if (direction === 'right') {
      newStart = addDays(start, 1);
      newEnd = addDays(end, 1);
    }
    
    // Boundary Validation
    if (direction === 'up' || direction === 'down') {
      if (newStart.getHours() < startHour || newStart.getHours() > endHour) {
        addNotification("Cannot move outside shift hours", "warning");
        return;
      }
    }
    
    // Past Date Validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newStart < today) {
      addNotification("Cannot move to a past day", "warning");
      return;
    }

    // Work Day Validation for Left/Right
    if (direction === 'left' || direction === 'right') {
      const dayNum = newStart.getDay() === 0 ? 7 : newStart.getDay();
      if (!profile.workDays.includes(dayNum)) {
        addNotification("Target day is outside your work week", "warning");
        return;
      }
    }

    // Magnetic Snap (Snap to neighbor if within 5 mins)
    const snapThreshold = 5 * 60 * 1000;
    const neighbor = dayTasks.find(t => t.id !== taskId && (
      Math.abs(newStart.getTime() - parseISO(t.scheduledEnd!).getTime()) < snapThreshold ||
      Math.abs(newEnd.getTime() - parseISO(t.scheduledStart!).getTime()) < snapThreshold
    ));

    if (neighbor) {
      if (newStart.getTime() < parseISO(neighbor.scheduledStart!).getTime()) {
        // We are above the neighbor, snap our end to their start
        newEnd = parseISO(neighbor.scheduledStart!);
        newStart = new Date(newEnd.getTime() - (durationMins * 60 * 1000));
      } else {
        // We are below the neighbor, snap our start to their end
        newStart = parseISO(neighbor.scheduledEnd!);
        newEnd = new Date(newStart.getTime() + (durationMins * 60 * 1000));
      }
    }

    // Break Awareness for handled task
    const adjusted = adjustForBreaks(newStart, newEnd, direction === 'up' ? 'up' : 'down');
    newStart = adjusted.start;
    newEnd = adjusted.end;

    updateTask(taskId, { scheduledStart: newStart.toISOString(), scheduledEnd: newEnd.toISOString(), status: 'Scheduled' });
  };

  const runAutoSchedule = async () => {
    if (hasScheduled) return;
    setHasScheduled(true);
    await clearSchedule();
    const scheduled = autoScheduleTasks(
      useStore.getState().tasks.filter(t => t.status === 'Todo' && !t.parentTaskId), 
      profile, 
      new Date() 
    );
    
    const parentIdsScheduled = new Set<string>();
    for (const t of scheduled) {
      await useStore.getState().addTask(t);
      if (t.parentTaskId) parentIdsScheduled.add(t.parentTaskId);
    }
    for (const pId of Array.from(parentIdsScheduled)) { await updateTask(pId, { status: 'Scheduled' }); }
  };

  const handleReset = async () => {
    setHasScheduled(false);
    await clearSchedule();
  };
  
  const unassignedTasks = tasks.filter(t => t.status === 'Todo' && !t.parentTaskId);
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const activeTaskInfo = activeTask ? getTaskInfo(activeTask.id) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <div className="flex flex-col space-y-8 animate-in fade-in duration-1000 min-h-[calc(100vh-120px)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Weekly Planner</h2>
            <p className="text-slate-400 font-medium text-sm">Distribute your bandwidth between clients</p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handleReset} className="px-6 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all active:scale-95">Reset Grid</button>
             <button 
               onClick={runAutoSchedule} 
               disabled={hasScheduled}
               className={cn(
                 "flex items-center gap-2 px-8 py-3 rounded-2xl text-xs font-bold transition-all shadow-xl",
                 hasScheduled 
                   ? "bg-slate-100 text-slate-300 shadow-none cursor-not-allowed opacity-60" 
                   : "bg-primary text-white shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
               )}
             >
               <Wand2 className="h-4 w-4" /> 
               {hasScheduled ? 'Scheduled ✓' : 'Auto Schedule'}
             </button>
          </div>
        </div>
        <div className="flex flex-1 gap-6 overflow-hidden relative min-h-0">
          <div className="w-[340px] flex-shrink-0 flex flex-col bg-white/40 backdrop-blur-md rounded-[32px] border border-white/60 p-6 shadow-inner overflow-hidden">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Zap className="h-5 w-5 text-primary" /></div><h3 className="text-xl font-bold text-slate-900 tracking-tight">Backlog</h3></div>
                <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-primary/20">{unassignedTasks.length}</span>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                <SortableContext id="unassigned" items={unassignedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                   <DroppableColumn id="unassigned" type="backlog" className="h-full min-h-[400px]">
                      {unassignedTasks.map(task => { const info = getTaskInfo(task.id); return <SortableTaskCard key={task.id} task={task} companyName={info.companyName} projectName={info.projectName} projectColor={info.projectColor} startHour={startHour} containerId="unassigned" />; })}
                      {unassignedTasks.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 select-none"><ShieldCheck className="w-16 h-16 text-primary mb-4" /><p className="text-xs font-bold uppercase tracking-widest">Queue is Clear</p></div>}
                   </DroppableColumn>
                </SortableContext>
             </div>
          </div>
          <div className="flex-1 overflow-hidden bg-white rounded-[40px] border border-slate-100 flex flex-col shadow-sm">
             <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="flex border-b border-slate-50 bg-white/95 sticky top-0 z-30 min-w-[900px] shadow-sm">
                   <div className="w-20 border-r border-slate-50 shrink-0 bg-slate-50/20" />
                   <div className="flex-1 flex">
                      {days.map((day) => {
                        const isOffDay = !profile.workDays.includes(day.getDay() === 0 ? 7 : day.getDay());
                        return (
                          <div key={day.toISOString()} className={cn("flex-1 py-6 px-4 text-center border-r border-slate-50 last:border-r-0", isOffDay ? "bg-slate-50/50" : "bg-white")}>
                             <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] mb-1">{DAYS_OF_WEEK_LABELS[day.getDay() === 0 ? 7 : day.getDay()].substring(0, 3)}</p>
                             <p className={cn("text-xl font-bold tracking-tight", isOffDay ? "text-slate-300" : "text-slate-900")}>{format(day, 'MMM dd')}</p>
                          </div>
                        );
                      })}
                   </div>
                </div>
                <div className="flex min-w-[900px] min-h-full content-start bg-grid-slate-50">
                   <div className="w-20 border-r border-slate-50 shrink-0 select-none bg-slate-50/10">
                      {hoursList.map(hour => (<div key={hour} className="h-[90px] border-b border-slate-50/50 px-4 py-3 text-right"><span className="text-[11px] font-bold text-slate-200">{hour.toString().padStart(2, '0')}:00</span></div>))}
                   </div>
                   <div className="flex-1 flex relative">
                      <div className="absolute inset-0 pointer-events-none">{hoursList.map(hour => (<div key={`line-${hour}`} className="h-[90px] border-b border-slate-50/50 w-full" />))}</div>
                      {days.map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd'), dayTasks = tasks.filter(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), day)), isOffDay = !profile.workDays.includes(day.getDay() === 0 ? 7 : day.getDay());
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPastDay = day < today;
                        const breaks: any[] = [];
                        const lunch = profile.lunchTime || { start: '13:00', durationMinutes: 60 };
                        const [lh, lm] = lunch.start.split(':');
                        breaks.push({ id: `lunch-${dayStr}`, type: 'lunch', start: parseInt(lh)*60 + parseInt(lm), duration: lunch.durationMinutes, name: 'FUEL BREAK', icon: <Utensils className="h-3.5 w-3.5" /> });
                        profile.customBreaks?.forEach(b => { const [h, m] = b.start.split(':'); breaks.push({ id: b.id, type: 'break', start: parseInt(h)*60 + parseInt(m), duration: b.durationMinutes, name: 'RECHARGE', icon: <Coffee className="h-3.5 w-3.5" /> }); });
                        return (
                          <div key={dayStr} ref={(el) => { gridRefs.current[dayStr] = el; }} className={cn("flex-1 relative h-full border-r border-slate-50 last:border-r-0 transition-colors duration-500", isOffDay || isPastDay ? "bg-slate-50/30" : "hover:bg-primary/[0.005]")} style={{ minHeight: `${hoursList.length * HOUR_HEIGHT}px` }}>
                             {isOffDay && <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-[0.04] p-10 select-none"><Moon className="w-32 h-32 -rotate-12 mb-6" /><p className="text-3xl font-black uppercase tracking-[0.4em] text-center leading-none">Rest Period</p></div>}
                             {isPastDay && !isOffDay && <div className="absolute inset-0 pointer-events-none bg-slate-200/5 transition-opacity" title="Past Day" />}
                             <DroppableColumn id={dayStr} type="day" className="h-full" disabled={isPastDay}>
                                {dragTarget && dragTarget.day === dayStr && (
                                  <div className="absolute left-1 right-1 z-[5] border-2 border-dashed border-primary/20 bg-primary/5 rounded-[20px] transition-all duration-75 pointer-events-none"
                                       style={{ 
                                         top: `${((dragTarget.hour * 60 + dragTarget.mins - startHour * 60) / 60) * HOUR_HEIGHT}px`, 
                                         height: `${Math.max(0.35, activeTask?.estimatedDuration || 1) * HOUR_HEIGHT}px` 
                                       }} />
                                )}
                                {breaks.map(b => {
                                   const top = ((b.start - startHour * 60) / 60) * HOUR_HEIGHT, height = (b.duration / 60) * HOUR_HEIGHT;
                                   if (top < 0 || top > hoursList.length * HOUR_HEIGHT) return null;
                                   return (<div key={b.id} className={cn("absolute left-0 right-0 z-10 flex items-center justify-center gap-3 transition-all border-y border-dashed border-slate-100", b.type === 'lunch' ? "bg-amber-50/30 text-amber-500" : "bg-slate-100/30 text-slate-300")} style={{ top: `${top}px`, height: `${height}px` }}><div className="flex items-center gap-2.5 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm scale-90">{b.icon}<span className="text-[9px] font-black uppercase tracking-wider">{b.name}</span></div></div>);
                                })}
                                {(() => {
                                   const layoutMap = getTaskLayouts(dayTasks, startHour);
                                   return dayTasks.map(t => {
                                      const info = getTaskInfo(t.id);
                                      return (
                                        <SortableTaskCard key={t.id} task={t} companyName={info.companyName} projectName={info.projectName} projectColor={info.projectColor} startHour={startHour} isAbsolute layout={layoutMap[t.id]} containerId={dayStr}
                                          onMove={(dir) => handleMoveTask(t.id, dir)}
                                          onUnschedule={() => { if (t.parentTaskId) { useStore.getState().deleteTask(t.id); } else { updateTask(t.id, { status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined }); } }}
                                        />
                                      );
                                   });
                                })()}
                             </DroppableColumn>
                          </div>
                        );
                      })}
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null} zIndex={1000}>
        {activeTask && activeTaskInfo ? (
          <div className="w-[300px]" style={{ transformOrigin: 'top left' }}>
             <TaskCardUI 
                task={activeTask} 
                companyName={activeTaskInfo.companyName} 
                projectName={activeTaskInfo.projectName} 
                projectColor={activeTaskInfo.projectColor} 
                startHour={startHour} 
                isDragging
             />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
