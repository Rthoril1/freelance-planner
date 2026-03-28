'use client';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { autoScheduleTasks } from '@/lib/scheduler';
import { Task } from '@/types';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addDays, format, startOfWeek } from 'date-fns';
import { Wand2, GripVertical, X, CheckCircle2 } from 'lucide-react';
import { PRESET_PLATFORMS } from '@/lib/constants';

const DAYS_OF_WEEK_LABELS: Record<number, string> = {
  1: 'Day 1', 2: 'Day 2', 3: 'Day 3', 4: 'Day 4', 5: 'Day 5', 6: 'Day 6', 7: 'Day 7'
};

const HOUR_HEIGHT = 80; // px per hour
const START_HOUR = 0;
const END_HOUR = 23;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function DroppableColumn({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} id={id} className={`relative min-h-[${24 * HOUR_HEIGHT}px] transition-colors ${isOver ? 'bg-primary/5' : ''} ${className}`}>
      {children}
    </div>
  );
}

function SortableTaskCard({ 
  task, 
  companyColor, 
  companyName, 
  projectName, 
  onUnschedule,
  isAbsolute = false
}: { 
  task: Task, 
  companyColor: string, 
  companyName: string, 
  projectName: string, 
  onUnschedule?: () => void,
  isAbsolute?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  let style: React.CSSProperties = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    opacity: isDragging ? 0.6 : 1, 
    zIndex: isDragging ? 50 : 1 
  };
  
  if (isAbsolute && task.scheduledStart) {
    const startDate = new Date(task.scheduledStart);
    const startMins = startDate.getHours() * 60 + startDate.getMinutes();
    const gridStartMins = START_HOUR * 60;
    const top = ((startMins - gridStartMins) / 60) * HOUR_HEIGHT;
    const height = task.estimatedDuration * HOUR_HEIGHT;
    
    style = {
      ...style,
      position: 'absolute',
      top: `${top}px`,
      height: `${height}px`,
      left: '4px',
      right: '4px',
      marginBottom: 0
    };
  }

  const platform = PRESET_PLATFORMS.find(p => p.id === task.platformId);
  const uiColor = platform?.color || companyColor;

  return (
    <div 
      ref={setNodeRef} style={{ ...style, backgroundColor: platform ? `${platform.color}0C` : undefined, borderColor: isDragging ? undefined : (platform ? `${platform.color}40` : undefined) }}
      className={`bg-card border border-border rounded-xl p-2.5 shadow-sm mb-3 relative overflow-hidden group hover:border-primary/50 transition-colors ${isDragging ? 'shadow-lg ring-2 ring-primary border-primary' : ''} ${isAbsolute ? 'flex flex-col' : ''}`}
      title={`${task.name}\nDuration: ${task.estimatedDuration}h\nProject: ${projectName}\nCompany: ${companyName}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: uiColor }} />
      <div className="flex flex-col h-full pl-1.5 overflow-hidden">
        <div className="flex items-start justify-between gap-1">
          <div {...(task.status !== 'Scheduled' || isAbsolute ? { ...attributes, ...listeners } : {})} className={`touch-none mt-0.5 p-0.5 -ml-1 rounded text-muted-foreground/30 ${task.status === 'Scheduled' && !isAbsolute ? 'cursor-not-allowed opacity-20' : 'cursor-grab active:cursor-grabbing hover:bg-muted hover:text-foreground'}`}>
            <GripVertical className="w-3 h-3 flex-shrink-0" />
          </div>
          <p className="font-bold text-[11px] truncate leading-tight flex-1">
            {task.name}
          </p>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
            {task.status === 'Scheduled' && !isAbsolute && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[9px] font-bold mr-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Programada
              </span>
            )}
            {!isAbsolute && task.estimatedDuration > 0.5 && task.status !== 'Scheduled' && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const half = task.estimatedDuration/2;
                  useStore.getState().updateTask(task.id, { estimatedDuration: half });
                  useStore.getState().addTask({ ...task, id: Math.random().toString(36).substr(2, 9), name: `${task.name} (Part 2)`, estimatedDuration: half, status: 'Todo' });
                }}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-sm p-0.5 transition-all shrink-0"
                title="Split Task"
              >
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 11-4.243 4.243 3 3 0 014.243-4.243zm0-11.516a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243z" />
                </svg>
              </button>
            )}
            {onUnschedule && (
              <button 
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); onUnschedule(); }} 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm p-0.5 transition-all shrink-0"
                title="Return to Backlog"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-1 mt-1 overflow-hidden">
          <span className="text-[9px] font-bold px-1 py-0.5 rounded-sm uppercase tracking-tight border shrink-0" style={{ backgroundColor: companyColor + '10', color: companyColor, borderColor: companyColor + '30' }}>{companyName}</span>
          {!isAbsolute && (
            <span className="text-[9px] font-medium text-muted-foreground bg-muted/50 px-1 py-0.5 rounded italic truncate max-w-[60px]">
              {projectName}
            </span>
          )}
          {task.frequency && !isAbsolute && (
            <span className="text-[8px] font-bold bg-indigo-500/10 text-indigo-400 px-1 py-0.5 rounded-sm border border-indigo-500/20 shrink-0">
              {task.frequency.timesPerDay}x · {task.frequency.daysPerWeek}d
            </span>
          )}
        </div>

        {isAbsolute && task.estimatedDuration >= 0.75 && (
           <div className="mt-auto flex justify-between items-center pt-1 border-t border-border/10">
              <span className="text-[9px] font-mono opacity-60">
                {format(new Date(task.scheduledStart!), 'HH:mm')}
              </span>
              <span className="text-[9px] font-bold opacity-80 bg-muted px-1 rounded">{task.estimatedDuration}h</span>
           </div>
        )}
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const { tasks, profile, companies, projects, updateTask, clearSchedule } = useStore();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).useStore = useStore;
    }
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  if (!profile) return null;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const workDays = [...profile.workDays].sort((a,b) => (a===0?7:a)-(b===0?7:b));
  
  const days = workDays.map((d, index) => {
    // We map generic days to actual dates starting from weekStart
    // But we label them as Day 1, Day 2... 
    // d is the ID (1-7)
    const rDiff = d === 7 ? 6 : d - 1;
    return addDays(weekStart, rDiff);
  });

  const getTaskInfo = (taskId: string) => {
    const t = tasks.find(x => x.id === taskId);
    const p = projects.find(x => x.id === t?.projectId);
    const c = companies.find(x => x.id === p?.companyId);
    return { 
      companyName: c?.name || 'Unknown', 
      companyColor: c?.color || 'gray',
      projectName: p?.name || 'No Project'
    };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeTaskId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find(t => t.id === activeTaskId);
    if (!activeTask) return;

    // Check if dropping on a day column (e.g. 2023-10-09)
    const isDayColumn = days.map(d => format(d, 'yyyy-MM-dd')).includes(overId);
    
    if (isDayColumn) {
      const dayDate = new Date(overId);
      
      // Calculate relative Y position to determine the hour
      // dnd-kit provides 'over.rect' and 'active.rect.current.translated'
      const activeRect = active.rect.current.translated;
      const overRect = over.rect;
      
      if (activeRect && overRect) {
        const relativeY = activeRect.top - overRect.top;
        const totalHoursFromStart = relativeY / HOUR_HEIGHT;
        const targetHour = Math.floor(totalHoursFromStart + START_HOUR);
        const targetMinutes = Math.round(((totalHoursFromStart + START_HOUR) % 1) * 60 / 15) * 15; // Snap to 15 mins
        
        dayDate.setHours(targetHour, targetMinutes, 0, 0);
        
        // Ensure it doesn't go before START_HOUR or after END_HOUR
        if (dayDate.getHours() < START_HOUR) dayDate.setHours(START_HOUR, 0, 0, 0);
        if (dayDate.getHours() >= END_HOUR) dayDate.setHours(END_HOUR, 0, 0, 0);
        
        const scheduledEnd = new Date(dayDate);
        scheduledEnd.setMinutes(dayDate.getMinutes() + activeTask.estimatedDuration * 60);

        updateTask(activeTaskId, { 
          status: 'Scheduled', 
          scheduledStart: dayDate.toISOString(), 
          scheduledEnd: scheduledEnd.toISOString() 
        });
      }
      return;
    }
    
    if (overId === 'unassigned') {
      updateTask(activeTaskId, { status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined });
      return;
    }
    
    // Drop over another task
    const targetTask = tasks.find(t => t.id === overId);
    if (targetTask) {
      if (targetTask.status === 'Todo') {
        updateTask(activeTaskId, { status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined });
      } else {
        updateTask(activeTaskId, { 
          status: 'Scheduled', 
          scheduledStart: targetTask.scheduledStart,
          scheduledEnd: targetTask.scheduledEnd 
        });
      }
    }
  };

  const runAutoSchedule = async () => {
    // 1. Clear existing scheduled instances first
    await clearSchedule();
    
    // 2. Refresh tasks from state after clear
    const currentTasks = useStore.getState().tasks;
    // Only schedule Master tasks that are in Todo
    const unassigned = currentTasks.filter(t => t.status === 'Todo' && !t.parentTaskId);
    
    // 3. Generate new instances
    const scheduled = autoScheduleTasks(unassigned, profile, new Date());
    
    // 4. Group instances by parent and add to store
    const parentIdsScheduled = new Set<string>();
    
    const addAllTasks = async () => {
      for (const t of scheduled) {
        await useStore.getState().addTask(t);
        if (t.parentTaskId) {
          parentIdsScheduled.add(t.parentTaskId);
        }
      }
      
      // Mark all parents that got at least one instance as Scheduled
      for (const pId of Array.from(parentIdsScheduled)) {
        await updateTask(pId, { status: 'Scheduled' });
      }
    };

    await addAllTasks();
  };

  // Backlog should show BOTH Todo and Scheduled master tasks
  // (Scheduled master tasks represent that they are active on the grid)
  const unassignedTasks = tasks.filter(t => t.status === 'Todo' && !t.parentTaskId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="h-[calc(100vh-7rem)] flex flex-col pt-2 bg-background/50">
        {/* Header Section */}
        <div className="flex items-center justify-between flex-shrink-0 mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Weekly Planner</h2>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-muted-foreground text-sm">Organize availability across companies.</p>
              {profile.weeklyHoursAvailable && (
                <div className="flex items-center gap-2 bg-card border border-border px-3 py-1 rounded-full shadow-sm">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${(tasks.reduce((acc, t) => acc + (t.status === 'Scheduled' && t.parentTaskId ? t.estimatedDuration : 0), 0) > profile.weeklyHoursAvailable) ? 'bg-destructive' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, (tasks.reduce((acc, t) => acc + (t.status === 'Scheduled' && t.parentTaskId ? t.estimatedDuration : 0), 0) / profile.weeklyHoursAvailable) * 100)}%` }} 
                    />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${tasks.reduce((acc, t) => acc + (t.status === 'Scheduled' && t.parentTaskId ? t.estimatedDuration : 0), 0) > profile.weeklyHoursAvailable ? 'text-destructive' : 'text-emerald-500'}`}>
                    {tasks.reduce((acc, t) => acc + (t.status === 'Scheduled' && t.parentTaskId ? t.estimatedDuration : 0), 0)} / {profile.weeklyHoursAvailable}h Capacity
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={clearSchedule}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <X className="h-4 w-4" /> Clear Week
            </button>
            <button 
              onClick={runAutoSchedule}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5"
            >
              <Wand2 className="h-4 w-4" /> Auto-Schedule Framework
            </button>
          </div>
        </div>

        <div className="flex flex-1 gap-6 overflow-hidden min-h-0 relative">
          {/* Left Column: Backlog */}
          <div className="w-72 flex-shrink-0 flex flex-col bg-card/40 border border-border rounded-xl shadow-inner relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-muted to-border rounded-t-xl" />
            <div className="p-5 border-b border-border/50 bg-card/60 rounded-t-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  Backlog
                  <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{unassignedTasks.length}</span>
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-balance">Drag into hours to schedule.</p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <SortableContext id="unassigned" items={unassignedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn id="unassigned" className="h-full">
                  {unassignedTasks.map(task => {
                    const info = getTaskInfo(task.id);
                    return <SortableTaskCard key={task.id} task={task} companyColor={info.companyColor} companyName={info.companyName} projectName={info.projectName} />;
                  })}
                  {unassignedTasks.length === 0 && (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-border/60 rounded-xl bg-card/30">
                      <span className="text-sm font-medium text-muted-foreground/60">Queue empty</span>
                    </div>
                  )}
                </DroppableColumn>
              </SortableContext>
            </div>
          </div>

          {/* Right Section: Time Grid */}
          <div className="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden relative">
             {/* Scrollable Container */}
             <div className="flex-1 overflow-auto custom-scrollbar relative">
                {/* Sticky Grid Header */}
                <div className="flex border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-20 min-w-[800px]">
                   <div className="w-16 border-r border-border/50 shrink-0" />
                   <div className="flex-1 flex">
                      {days.map(day => (
                        <div key={day.toISOString()} className="flex-1 border-r border-border/50 p-3 text-center">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{DAYS_OF_WEEK_LABELS[workDays[days.indexOf(day)]]}</p>
                          <p className="text-lg font-bold">{format(day, 'MMM d')}</p>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="flex min-w-[800px] min-h-full content-start">
                  {/* Time Labels Axis */}
                  <div className="w-16 border-r border-border/50 shrink-0 bg-muted/5 select-none">
                    {HOURS.map(hour => (
                      <div key={hour} className="h-[80px] border-b border-border/30 px-2 py-1 text-right">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground/50">{hour.toString().padStart(2, '0')}:00</span>
                      </div>
                    ))}
                  </div>

                  {/* Day Columns Grid */}
                  <div className="flex-1 flex relative">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 pointer-events-none">
                       {HOURS.map(hour => (
                         <div key={`grid-${hour}`} className="h-[80px] border-b border-border/20 w-full" />
                       ))}
                    </div>

                    {/* Columns */}
                    {days.map(day => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayTasks = tasks.filter(t => t.status === 'Scheduled' && t.scheduledStart?.startsWith(dayStr));
                      
                      // Identify breaks for this day
                      const breaks: any[] = [];
                      
                      // Use profile lunch or standard fallback
                      const lunch = profile.lunchTime || { start: '13:00', durationMinutes: 60 };
                      const [lh, lm] = lunch.start.split(':');
                      breaks.push({ 
                        id: `lunch-${dayStr}`, 
                        type: 'lunch', 
                        start: parseInt(lh)*60 + parseInt(lm), 
                        duration: lunch.durationMinutes, 
                        name: 'Lunch', 
                        icon: '🥗' 
                      });

                      profile.customBreaks?.forEach(b => {
                         const [h, m] = b.start.split(':');
                         breaks.push({ id: b.id, type: 'break', start: parseInt(h)*60 + parseInt(m), duration: b.durationMinutes, name: 'Break', icon: '☕' });
                      });

                      return (
                        <div key={dayStr} className="flex-1 border-r border-border/50 relative group/col h-full min-h-[1280px]">
                          <DroppableColumn id={dayStr} className="h-full">
                            {/* Breaks Rendering */}
                            {breaks.map(b => {
                               const top = ((b.start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                               const height = (b.duration / 60) * HOUR_HEIGHT;
                               return (
                                 <div 
                                   key={b.id} 
                                   className={`absolute left-0 right-0 z-10 flex items-center justify-center gap-2 transition-all border-y border-dashed bg-muted/60 backdrop-blur-[2px] ${b.type === 'lunch' ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' : 'border-border/60 text-muted-foreground/50'}`} 
                                   style={{ top: `${top}px`, height: `${height}px` }}
                                 >
                                   <div className="flex items-center gap-2 px-3 py-1 bg-background/40 rounded-full border border-border/20 shadow-sm">
                                     <span className="text-sm">{b.icon}</span>
                                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">{b.name}</span>
                                   </div>
                                 </div>
                               );
                            })}

                            {/* Tasks Rendering */}
                            <SortableContext id={dayStr} items={dayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                               {dayTasks.map(t => {
                                 const info = getTaskInfo(t.id);
                                 return (
                                   <SortableTaskCard 
                                     key={t.id} 
                                     task={t} 
                                     companyColor={info.companyColor} 
                                     companyName={info.companyName} 
                                     projectName={info.projectName} 
                                     isAbsolute
                                     onUnschedule={() => {
                                       // If it's an instance, just delete it. 
                                       // If it was the master task, it returns to Todo.
                                       if (t.parentTaskId) {
                                         useStore.getState().deleteTask(t.id);
                                       } else {
                                         updateTask(t.id, { status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined });
                                       }
                                     }}
                                   />
                                 );
                               })}
                            </SortableContext>
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
    </DndContext>
  );
}
