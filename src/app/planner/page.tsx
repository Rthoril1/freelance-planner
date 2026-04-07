'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Task } from '@/types';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable, DragOverlay, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addDays, format, isSameDay, parseISO, startOfWeek, addMinutes } from 'date-fns';
import { X, Moon, Calendar, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskCreationModal } from '@/components/planner/TaskCreationModal';
import { TaskEditModal } from '@/components/planner/TaskEditModal';

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
  task, companyName, projectColor,
  onUnschedule, onMove, onEdit,
  isAbsolute, isDragging, layout, startHour, style: parentStyle, attributes, listeners
}: { 
  task: Task, companyName: string, projectColor: string, 
  onUnschedule?: () => void, onMove?: (dir: 'up' | 'down' | 'left' | 'right') => void, onEdit?: () => void,
  isAbsolute?: boolean, isDragging?: boolean, 
  layout?: { left: number, width: number }, startHour: number, style?: React.CSSProperties,
  attributes?: React.HTMLAttributes<HTMLDivElement>, listeners?: React.HTMLAttributes<HTMLDivElement>
}) {
  const height = Math.max(0.4, task.estimatedDuration) * HOUR_HEIGHT;
  let style: React.CSSProperties = { ...parentStyle };
  
  if (isDragging) {
    style = { ...style, position: 'relative', top: 0, left: 0, width: '100%', zIndex: 1000 };
  } else if (isAbsolute && task.scheduledStart) {
    const INSET = 4; // px gap matching the dashed placeholder box inset
    const startDate = new Date(task.scheduledStart);
    const startMins = startDate.getHours() * 60 + startDate.getMinutes();
    const top = ((startMins - startHour * 60) / 60) * HOUR_HEIGHT;
    style = {
      ...style, position: 'absolute',
      top: `${top + INSET}px`,
      height: `${Math.max(20, height - INSET * 2)}px`,
      left: layout ? `calc(${layout.left}% + ${INSET}px)` : `${INSET}px`,
      width: layout ? `calc(${layout.width}% - ${INSET * 2}px)` : `calc(100% - ${INSET * 2}px)`,
      zIndex: 30
    };
  }

  const isCompact = height <= 45;

  return (
    <div
      style={{ ...style, backgroundColor: projectColor, borderLeft: `3px solid ${projectColor}dd` }}
      className={cn(
        "group relative overflow-hidden transition-all duration-150 cursor-pointer select-none",
        isDragging ? "rotate-1 scale-105 shadow-2xl ring-2 ring-primary/40 z-[1000] rounded-md" : "hover:brightness-110 rounded-sm",
        task.status === 'Completed' ? "opacity-40 grayscale" : "",
        !isAbsolute ? "mb-0.5 rounded-sm" : ""
      )}
    >
      {/* Subtle dark tint on top for text legibility */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none" />

      {/* Card Content */}
      <div
        className="relative z-10 flex items-center h-full px-2 gap-1 overflow-hidden"
        style={{ paddingTop: isCompact ? '0' : '4px', paddingBottom: isCompact ? '0' : '4px' }}
        onClick={() => { if (isAbsolute && onEdit) onEdit(); }}
        {...(task.status === 'Todo' ? { ...attributes, ...listeners } : {})}
      >
        {!isCompact ? (
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/75 leading-none truncate mb-0.5">{companyName}</p>
            <p className="text-[11px] font-bold text-white leading-snug line-clamp-2 drop-shadow-sm">{task.name}</p>
            <div className="mt-auto flex items-center gap-2 pt-1">
              <span className="text-[9px] font-black text-white/60">{task.estimatedDuration}H</span>
              {onUnschedule && (
                <button
                  onClick={e => { e.stopPropagation(); onUnschedule(); }}
                  className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 bg-black/20 hover:bg-black/40 text-white rounded transition-all"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Ultra-compact single line for 30min cells */
          <>
            <p className="text-[10px] font-bold text-white leading-none truncate flex-1">
              <span className="opacity-70">{companyName} · </span>{task.name}
            </p>
            {onUnschedule && (
              <button
                onClick={e => { e.stopPropagation(); onUnschedule(); }}
                className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 bg-black/20 hover:bg-black/40 text-white rounded transition-all"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Direction arrows — only on hover, scaled to card */}
      {isAbsolute && onMove && !isDragging && (() => {
        const isCompactArrow = height <= 45;
        return (
          <div
            className="absolute inset-0 bg-slate-900/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-40"
            style={{ gap: isCompactArrow ? '3px' : '8px' }}
            onClick={() => { if (onEdit) onEdit(); }}
          >
            <button onClick={e => { e.stopPropagation(); onMove('left'); }}
               className={cn("rounded-full bg-white/20 hover:bg-white flex items-center justify-center text-white hover:text-slate-900 transition-all active:scale-95", isCompactArrow ? "w-4 h-4" : "w-7 h-7")}>
               <ChevronLeft className={isCompactArrow ? "w-2.5 h-2.5" : "w-4 h-4"} />
            </button>
            <div className={cn("flex", isCompactArrow ? "flex-row gap-1" : "flex-col gap-2")}>
              <button onClick={e => { e.stopPropagation(); onMove('up'); }}
                 className={cn("rounded-full bg-white/20 hover:bg-white flex items-center justify-center text-white hover:text-slate-900 transition-all active:scale-95", isCompactArrow ? "w-4 h-4" : "w-7 h-7")}>
                 <ChevronUp className={isCompactArrow ? "w-2.5 h-2.5" : "w-4 h-4"} />
              </button>
              <button onClick={e => { e.stopPropagation(); onMove('down'); }}
                 className={cn("rounded-full bg-white/20 hover:bg-white flex items-center justify-center text-white hover:text-slate-900 transition-all active:scale-95", isCompactArrow ? "w-4 h-4" : "w-7 h-7")}>
                 <ChevronDown className={isCompactArrow ? "w-2.5 h-2.5" : "w-4 h-4"} />
              </button>
            </div>
            <button onClick={e => { e.stopPropagation(); onMove('right'); }}
               className={cn("rounded-full bg-white/20 hover:bg-white flex items-center justify-center text-white hover:text-slate-900 transition-all active:scale-95", isCompactArrow ? "w-4 h-4" : "w-7 h-7")}>
               <ChevronRight className={isCompactArrow ? "w-2.5 h-2.5" : "w-4 h-4"} />
            </button>
          </div>
        );
      })()}
    </div>
  );
}


function SortableTaskCard({ 
  task, companyName, projectColor, onUnschedule, onMove, onEdit, startHour, isAbsolute = false, layout, containerId
}: { 
  task: Task, companyName: string, projectColor: string, 
  onUnschedule?: () => void, onMove?: (dir: 'up' | 'down' | 'left' | 'right') => void, onEdit?: () => void,
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
        task={task} companyName={companyName} projectColor={projectColor} 
        onUnschedule={onUnschedule} onMove={onMove} onEdit={onEdit} startHour={startHour} isAbsolute={isAbsolute} 
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
  const { tasks, profile, companies, projects, updateTask, updateTasks } = useStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{ day: string, hour: number, mins: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const gridRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [weekOffset, setWeekOffset] = useState(0); // Each unit = 7 days (one week block)

  useEffect(() => { setMounted(true); }, []);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const plannerStart = addDays(startOfWeek(new Date(), { weekStartsOn: 6 }), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(plannerStart, i));
  
  if (!mounted || !profile) return null;
  
  const startHour = profile.dailyAvailability?.start ? parseInt(profile.dailyAvailability.start.split(':')[0]) : 0;
  const endHour = profile.dailyAvailability?.end ? parseInt(profile.dailyAvailability.end.split(':')[0]) : 23;
  const hoursList = Array.from({ length: (endHour - startHour) + 1 }, (_, i) => startHour + i);
  
  const getTaskInfo = (taskId: string) => {
    const t = tasks.find(x => x.id === taskId), p = projects.find(x => x.id === t?.projectId), c = companies.find(x => x.id === p?.companyId);
    return { companyName: c?.name || 'Unknown', projectColor: p?.color || c?.color || '#818CF8' };
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
        const relTop = focusY - colRect.top;
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
      // Use days array for local-safe date (new Date(string) parses as UTC, shifting day in UTC- zones)
      const targetDay = days.find(d => format(d, 'yyyy-MM-dd') === targetContainerId);
      if (!targetDay) return;
      const isPastDay = targetDay < today;
      if (isPastDay) {
        addNotification("Cannot move tasks to a past day", "warning");
        return;
      }

      const dayDate = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate());
      const columnElement = gridRefs.current[targetContainerId];
      if (activeRect && columnElement) {
        const columnRect = columnElement.getBoundingClientRect();
        const relativeTop = activeRect.top - columnRect.top;
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
        
        const updates = [
          { id: activeTaskId, updates: { status: 'Scheduled' as const, scheduledStart: dayDate.toISOString(), scheduledEnd: scheduledEnd.toISOString() } }
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

  const handleBacklogClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const duration = task.estimatedDuration;
    
    // Scan through all 14 days and all valid hours to find the first open block
    for (const day of days) {
      if (!profile.workDays.includes(day.getDay() === 0 ? 7 : day.getDay())) continue;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (day < today) continue; // Skip past days

      const dayTasks = tasks.filter(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), day) && t.status !== 'Completed');
      
      for (const hour of hoursList) {
        const candidateStart = new Date(day);
        candidateStart.setHours(hour, 0, 0, 0);
        
        // Prevent scheduling in hours that have already passed today
        if (candidateStart.getTime() <= new Date().getTime()) continue;

        const candidateEnd = addMinutes(candidateStart, duration * 60);
        
        if (candidateEnd.getHours() > endHour && !(candidateEnd.getHours() === endHour && candidateEnd.getMinutes() === 0)) continue; // Doesn't fit in shift

        const startMins = candidateStart.getHours() * 60 + candidateStart.getMinutes();
        const endMins = candidateEnd.getHours() * 60 + candidateEnd.getMinutes();
        
        const breaks = getDayBreaks(candidateStart);
        const collidesWithBreak = breaks.some(b => startMins < b.end && endMins > b.start);
        if (collidesWithBreak) continue;

        const overlapThreshold = 1 * 60 * 1000; // 1 minute allowed
        const taskColliding = dayTasks.find(t => {
          const tStart = new Date(t.scheduledStart!).getTime();
          const tEnd = new Date(t.scheduledEnd!).getTime();
          return (candidateStart.getTime() < tEnd - overlapThreshold && candidateEnd.getTime() > tStart + overlapThreshold);
        });

        if (!taskColliding) {
           updateTask(taskId, {
              status: 'Scheduled',
              scheduledStart: candidateStart.toISOString(),
              scheduledEnd: candidateEnd.toISOString()
           });
           addNotification(`Task scheduled to ${format(candidateStart, 'MMM dd, HH:mm')}`, 'success');
           return;
        }
      }
    }
    
    addNotification("No available slots found in the 2-week horizon", "warning");
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const activeTaskInfo = activeTask ? getTaskInfo(activeTask.id) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <TaskCreationModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setModalInitialDate(null); }} initialDate={modalInitialDate} />
      <TaskEditModal task={editingTask} isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingTask(null); }} />
      <div className="flex flex-col space-y-8 animate-in fade-in duration-1000 min-h-[calc(100vh-120px)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-6">
            <div className="space-y-1 block relative">
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">Weekly Planner</h2>
              <p className="text-slate-400 font-medium text-sm">Distribute your bandwidth between clients</p>
            </div>
            {/* Calendar Navigation */}
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWeekOffset(o => o - 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:border-primary/30 hover:text-primary text-slate-400 font-bold transition-all shadow-sm active:scale-95"
                  title="Previous week"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setWeekOffset(o => o + 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:border-primary/30 hover:text-primary text-slate-400 font-bold transition-all shadow-sm active:scale-95"
                  title="Next week"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/70 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  title="Back to today"
                >
                  Today
                </button>
              )}
            </div>
          </div>
          {/* Company Capacity Summary */}
          {(() => {
            const totalCapacity = profile?.weeklyHoursAvailable || 40;
            const companyTotals = tasks
              .filter(t => t.scheduledStart && t.status !== 'Completed' && days.some(d => isSameDay(parseISO(t.scheduledStart!), d)))
              .reduce((acc, t) => {
                const info = getTaskInfo(t.id);
                if (!acc[info.companyName]) acc[info.companyName] = { hours: 0, color: info.projectColor };
                acc[info.companyName].hours += t.estimatedDuration || 0;
                return acc;
              }, {} as Record<string, { hours: number; color: string }>);
            const totalScheduled = Object.values(companyTotals).reduce((s, c) => s + c.hours, 0);
            const entries = Object.entries(companyTotals);
            return entries.length > 0 ? (
              <div className="flex-1 flex items-center gap-3 flex-wrap justify-end">
                {entries.map(([name, { hours, color }]) => (
                  <div key={name} className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{name}</span>
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (hours / totalCapacity) * 100)}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">{hours}H</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 shadow-sm">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total</span>
                  <span className={cn("text-[11px] font-bold", totalScheduled > totalCapacity ? "text-rose-400" : "text-white")}>{totalScheduled}H</span>
                  <span className="text-[11px] font-bold text-slate-600">/ {totalCapacity}H</span>
                </div>
                <button onClick={() => { setModalInitialDate(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95">
                  <Plus className="w-4 h-4" /> New Assignment
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => { setModalInitialDate(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95">
                  <Plus className="w-4 h-4" /> New Assignment
                </button>
              </div>
            );
          })()}
        </div>
        <div className="flex flex-1 gap-6 relative">
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 flex flex-col shadow-sm">
             <div ref={scrollContainerRef} className="flex-1 relative">
                
                {/* 1-WEEK HEADER WRAPPER */}
                <div className="flex bg-slate-900 sticky top-0 z-50 w-full shadow-sm border-b border-slate-700 rounded-t-[40px] overflow-hidden">
                   {/* Corner space left blank to keep hours col alignment perfect */}
                   <div className="w-24 border-r border-slate-700 shrink-0 bg-slate-900" />
                   <div className="flex-1 flex">
                      {days.map((day, idx) => {
                        const isOffDay = !profile.workDays.includes(day.getDay() === 0 ? 7 : day.getDay());
                        const dayTasks = tasks.filter(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), day) && t.status !== 'Completed');
                        const dayTotal = dayTasks.reduce((acc, t) => acc + (t.estimatedDuration || 0), 0);
                        const dailyCapacity = profile?.weeklyHoursAvailable ? (profile.weeklyHoursAvailable / Math.max(1, profile.workDays.length)).toFixed(1) : '8.0';
                        return (
                          <div key={day.toISOString()} className={cn("flex-1 pt-2 pb-1 px-2 text-center border-r border-slate-700 last:border-r-0", isOffDay ? "bg-slate-800" : "bg-slate-900")}>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{DAYS_OF_WEEK_LABELS[day.getDay() === 0 ? 7 : day.getDay()].substring(0, 3)}</p>
                             <p className={cn("text-base font-black tracking-tight", isOffDay ? "text-slate-500" : "text-white")}>{format(day, 'MMM dd')}</p>
                             {!isOffDay && (
                                <div className="mt-0.5 flex items-center justify-center gap-1">
                                   <span className={cn("text-[9px] font-bold", dayTotal > parseFloat(dailyCapacity) ? "text-rose-400" : "text-slate-400")}>{dayTotal}H</span>
                                   <span className="text-[9px] font-bold text-slate-600">/ {dailyCapacity}H</span>
                                </div>
                             )}
                          </div>
                        );
                      })}
                   </div>
                   <div className="w-24 border-l border-slate-700 shrink-0 bg-slate-900" />
                </div>

                <div className="flex w-full min-h-full content-start bg-grid-slate-50 relative rounded-b-2xl overflow-hidden">
                    <div className="w-24 border-r border-slate-200 shrink-0 select-none bg-white z-20 overflow-hidden">
                       {/* empty spacer removed — sticky header self-aligns */}
                       {hoursList.map(hour => (
                         <div key={hour} className="h-[90px] border-b border-slate-200 px-4 flex flex-col items-end justify-center group/h bg-white">
                            <span className="text-xl font-black text-slate-800 group-hover/h:text-primary transition-colors">{hour.toString().padStart(2, '0')}</span>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter -mt-1">:00</span>
                         </div>
                       ))}
                    </div>
                    <div className="flex-1 flex relative">
                      <div className="absolute inset-0 pointer-events-none">{hoursList.map(hour => (<div key={`line-${hour}`} className="h-[90px] border-b border-slate-200 w-full" />))}</div>
                      {days.map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd'), dayTasks = tasks.filter(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), day)), isOffDay = !profile.workDays.includes(day.getDay() === 0 ? 7 : day.getDay());
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPastDay = day < today;
                        const breaks: any[] = [];
                        const lunch = profile.lunchTime || { start: '13:00', durationMinutes: 60 };
                        const [lh, lm] = lunch.start.split(':');
                        breaks.push({ id: `lunch-${dayStr}`, type: 'lunch', start: parseInt(lh)*60 + parseInt(lm), duration: lunch.durationMinutes });
                        profile.customBreaks?.forEach(b => { const [h, m] = b.start.split(':'); breaks.push({ id: b.id, type: 'break', start: parseInt(h)*60 + parseInt(m), duration: b.durationMinutes }); });
                         return (
                           <div key={dayStr} ref={(el) => { gridRefs.current[dayStr] = el; }} className={cn("flex-1 relative h-full border-r border-slate-200 last:border-r-0 transition-colors duration-500", isOffDay || isPastDay ? "bg-slate-50/30" : "hover:bg-primary/[0.005]")} style={{ minHeight: `${hoursList.length * HOUR_HEIGHT}px` }}>
                              {isOffDay && <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-[0.04] p-10 select-none z-[1]"><Moon className="w-32 h-32 -rotate-12 mb-6" /><p className="text-3xl font-black uppercase tracking-[0.4em] text-center leading-none">Rest Period</p></div>}
                              

                                 <DroppableColumn id={dayStr} type="day" className="h-full z-[5]" disabled={isPastDay}>
                                    {/* ACTUAL INTERACTIVE SLOTS */}
                                    <div className="absolute inset-0 flex flex-col">
                                       {hoursList.map(h => (
                                          <div key={h} className="h-[90px] w-full relative group/slot flex items-center justify-center p-2">
                                             <button 
                                               onClick={() => {
                                                 const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0, 0);
                                                 setModalInitialDate(d);
                                                 setIsModalOpen(true);
                                               }}
                                               className="w-full h-full rounded-2xl border-2 border-dashed border-slate-100 group-hover/slot:border-primary/30 group-hover/slot:bg-primary/[0.02] flex items-center justify-center text-transparent group-hover/slot:text-primary/40 transition-all pointer-events-auto"
                                             >
                                               <Plus className="w-8 h-8 pointer-events-none transform group-hover/slot:scale-110 transition-transform" />
                                             </button>
                                          </div>
                                       ))}
                                    </div>

                                 {dragTarget && dragTarget.day === dayStr && (
                                   <div className="absolute left-1 right-1 z-[20] border-2 border-dashed border-primary/20 bg-primary/5 rounded-[20px] transition-all duration-75 pointer-events-none"
                                        style={{ 
                                          top: `${((dragTarget.hour * 60 + dragTarget.mins - startHour * 60) / 60) * HOUR_HEIGHT}px`, 
                                          height: `${Math.max(0.35, activeTask?.estimatedDuration || 1) * HOUR_HEIGHT}px` 
                                        }} />
                                 )}
                                 {breaks.map(b => {
                                    const INSET = 4;
                                    const top = ((b.start - startHour * 60) / 60) * HOUR_HEIGHT, height = (b.duration / 60) * HOUR_HEIGHT;
                                    if (top < 0 || top > hoursList.length * HOUR_HEIGHT) return null;
                                    const isLunch = b.type === 'lunch';
                                    return (
                                      <div key={b.id}
                                        className={cn(
                                          "absolute z-[15] flex items-center justify-center transition-all rounded-sm",
                                          isLunch ? "bg-amber-400" : "bg-blue-400"
                                        )}
                                        style={{
                                          top: `${top + INSET}px`,
                                          height: `${Math.max(16, height - INSET * 2)}px`,
                                          left: `${INSET}px`,
                                          right: `${INSET}px`,
                                        }}
                                      >
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow">
                                          {isLunch ? 'LUNCH' : 'BREAK'}
                                        </span>
                                      </div>
                                    );
                                 })}
                                 <div className="relative z-[25]">
                                    {(() => {
                                       const layoutMap = getTaskLayouts(dayTasks, startHour);
                                       return dayTasks.map(t => {
                                          const info = getTaskInfo(t.id);
                                          return (
                                            <SortableTaskCard key={t.id} task={t} companyName={info.companyName} projectColor={info.projectColor} startHour={startHour} isAbsolute layout={layoutMap[t.id]} containerId={dayStr}
                                              onMove={(dir) => handleMoveTask(t.id, dir)}
                                              onEdit={() => { setEditingTask(t); setIsEditModalOpen(true); }}
                                              onUnschedule={() => { if (t.parentTaskId) { useStore.getState().deleteTask(t.id); } else { updateTask(t.id, { status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined }); } }}
                                            />
                                          );
                                       });
                                    })()}
                                 </div>
                              </DroppableColumn>
                           </div>
                         );
                      })}
                    </div>
                    <div className="w-24 border-l border-slate-200 shrink-0 select-none bg-white z-20 overflow-hidden">
                       {hoursList.map(hour => (
                         <div key={hour} className="h-[90px] border-b border-slate-200 px-4 flex flex-col items-start justify-center group/h bg-white">
                            <span className="text-xl font-black text-slate-800 group-hover/h:text-primary transition-colors">{hour.toString().padStart(2, '0')}</span>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter -mt-1">:00</span>
                         </div>
                       ))}
                    </div>
                 </div>
             </div>
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null} zIndex={1000}>
        {activeTask && activeTaskInfo ? (
          <div className="w-[240px]" style={{ transformOrigin: 'top left' }}>
             <TaskCardUI 
                task={activeTask} 
                companyName={activeTaskInfo.companyName} 
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
