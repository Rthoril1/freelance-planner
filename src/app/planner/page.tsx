'use client';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { autoScheduleTasks } from '@/lib/scheduler';
import { Task } from '@/types';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { Wand2, GripVertical, X, CheckCircle2, Moon, Utensils, Coffee, ShieldCheck, Calendar, Info, Zap } from 'lucide-react';
import { PRESET_PLATFORMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK_LABELS: Record<number, string> = {
  6: 'Saturday', 7: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday'
};

const HOUR_HEIGHT = 90; // Slightly taller for more airy feel
const START_HOUR = 0;
const END_HOUR = 23;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function DroppableColumn({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} id={id} className={cn(
      "relative transition-all duration-300",
      isOver ? "bg-primary/[0.03]" : "",
      className
    )}>
      {children}
    </div>
  );
}

function SortableTaskCard({ 
  task, 
  companyColor, 
  projectColor,
  companyName, 
  projectName, 
  onUnschedule,
  isAbsolute = false
}: { 
  task: Task, 
  companyColor: string, 
  projectColor: string,
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
  
  const height = Math.max(0.35, task.estimatedDuration) * HOUR_HEIGHT;

  if (isAbsolute && task.scheduledStart) {
    const startDate = new Date(task.scheduledStart);
    const startMins = startDate.getHours() * 60 + startDate.getMinutes();
    const gridStartMins = START_HOUR * 60;
    const top = ((startMins - gridStartMins) / 60) * HOUR_HEIGHT;
    
    style = {
      ...style,
      position: 'absolute',
      top: `${top}px`,
      height: `${height}px`,
      left: '6px',
      right: '6px',
      marginBottom: 0
    };
  }

  const { profile } = useStore();
  const allPlatforms = [
    ...PRESET_PLATFORMS,
    ...(profile?.customPlatforms || [])
  ];
  const platform = allPlatforms.find(p => p.id === task.platformId);
  const uiColor = projectColor;

  return (
    <div 
      ref={setNodeRef} 
      style={{ 
        ...style,
        backgroundColor: task.status === 'Completed' ? undefined : projectColor + '0D'
      }}
      className={cn(
        "group relative rounded-[20px] transition-all duration-300 overflow-hidden shadow-sm border border-slate-100",
        isDragging ? "shadow-2xl ring-4 ring-primary/20 border-primary scale-105 z-50 bg-white" : "bg-white hover:border-primary/40 hover:shadow-lg",
        task.status === 'Completed' ? "opacity-50 grayscale-[0.3]" : "",
        !isAbsolute ? "mb-3" : ""
      )}
    >
      {/* Accent line on the left */}
      <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: uiColor }} />
      
      <div className={cn(
        "flex flex-col h-full pl-4 pr-3 py-2.5 overflow-hidden",
        isAbsolute ? "" : "min-h-[70px] justify-between"
      )}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div {...(isAbsolute || task.status === 'Todo' ? { ...attributes, ...listeners } : {})} 
            className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-primary transition-colors mt-0.5"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-bold text-xs tracking-tight leading-tight",
              task.status === 'Completed' ? "line-through text-slate-400" : "text-slate-900 group-hover:text-primary transition-colors"
            )}>
              {task.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1 border-t border-slate-50 pt-1">
              <span className="text-[9px] font-bold" style={{ color: uiColor }}>{companyName}</span>
              {projectName && (
                <>
                  <span className="text-[8px] text-slate-200">·</span>
                  <span className="text-[9px] font-bold text-slate-400 truncate max-w-[90px]">{projectName}</span>
                </>
              )}
            </div>
          </div>
          {onUnschedule && (
            <button 
              onPointerDown={(e) => { e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); onUnschedule(); }} 
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg p-1 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
          <div className={cn(
            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
            task.priority === 'High' ? "bg-rose-500/10 text-rose-500" :
            task.priority === 'Medium' ? "bg-amber-500/10 text-amber-500" :
            "bg-slate-100 text-slate-400"
          )}>
            {task.priority || 'Medium'}
          </div>
          {task.energyLevel && (
            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5 fill-current" />
              {task.energyLevel}
            </div>
          )}
          <div className="ml-auto text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-white/50 border border-slate-100 px-2 py-0.5 rounded-lg">
            {task.estimatedDuration}h
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const { tasks, profile, companies, projects, updateTask, clearSchedule } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const plannerStart = startOfWeek(new Date(), { weekStartsOn: 6 }); 
  const days = Array.from({ length: 7 }, (_, i) => addDays(plannerStart, i));

  if (!mounted || !profile) return null;

  const getTaskInfo = (taskId: string) => {
    const t = tasks.find(x => x.id === taskId);
    const p = projects.find(x => x.id === t?.projectId);
    const c = companies.find(x => x.id === p?.companyId);
    return { 
      companyName: c?.name || 'Unknown', 
      companyColor: c?.color || '#818CF8',
      projectColor: p?.color || c?.color || '#818CF8',
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

    if (days.map(d => format(d, 'yyyy-MM-dd')).includes(overId)) {
      const dayDate = new Date(overId);
      const activeRect = active.rect.current.translated;
      const overRect = over.rect;
      
      if (activeRect && overRect) {
        const relativeY = activeRect.top - overRect.top;
        const totalHoursFromStart = relativeY / HOUR_HEIGHT;
        const targetHour = Math.floor(totalHoursFromStart + START_HOUR);
        const targetMinutes = Math.round(((totalHoursFromStart + START_HOUR) % 1) * 60 / 15) * 15;
        
        dayDate.setHours(targetHour, targetMinutes, 0, 0);
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
  };

  const runAutoSchedule = async () => {
    await clearSchedule();
    const currentTasks = useStore.getState().tasks;
    const unassigned = currentTasks.filter(t => t.status === 'Todo' && !t.parentTaskId);
    const scheduled = autoScheduleTasks(unassigned, profile, new Date());
    
    const parentIdsScheduled = new Set<string>();
    for (const t of scheduled) {
      await useStore.getState().addTask(t);
      if (t.parentTaskId) parentIdsScheduled.add(t.parentTaskId);
    }
    for (const pId of Array.from(parentIdsScheduled)) {
      await updateTask(pId, { status: 'Scheduled' });
    }
  };

  const unassignedTasks = tasks.filter(t => t.status === 'Todo' && !t.parentTaskId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex flex-col space-y-8 animate-in fade-in duration-1000 min-h-[calc(100vh-120px)]">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Weekly Planner</h2>
            <p className="text-slate-400 font-medium text-sm">Distribute your bandwidth between clients</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={clearSchedule}
                className="px-6 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all active:scale-95"
              >
                Reset Grid
              </button>
              <button 
                onClick={runAutoSchedule}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-primary text-white text-xs font-bold shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Wand2 className="h-4 w-4" /> Auto Schedule
              </button>
          </div>
        </div>

        <div className="flex flex-1 gap-6 overflow-hidden relative min-h-0">
          
          {/* Backlog Column */}
          <div className="w-[340px] flex-shrink-0 flex flex-col bg-white/40 backdrop-blur-md rounded-[32px] border border-white/60 p-6 shadow-inner overflow-hidden">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 tracking-tight">Backlog</h3>
                </div>
                <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-primary/20">
                   {unassignedTasks.length}
                </span>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                <SortableContext id="unassigned" items={unassignedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                   <DroppableColumn id="unassigned" className="h-full min-h-[400px]">
                      {unassignedTasks.map(task => {
                        const info = getTaskInfo(task.id);
                        return <SortableTaskCard key={task.id} task={task} companyColor={info.companyColor} projectColor={info.projectColor} companyName={info.companyName} projectName={info.projectName} />;
                      })}
                      {unassignedTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 select-none">
                           <ShieldCheck className="w-16 h-16 text-primary mb-4" />
                           <p className="text-xs font-bold uppercase tracking-widest">Queue is Clear</p>
                        </div>
                      )}
                   </DroppableColumn>
                </SortableContext>
             </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 overflow-hidden bg-white rounded-[40px] border border-slate-100 flex flex-col shadow-sm">
             <div className="flex-1 overflow-auto custom-scrollbar relative">
                
                {/* Grid Header Labels */}
                <div className="flex border-b border-slate-50 bg-white/95 sticky top-0 z-30 min-w-[900px] shadow-sm">
                   <div className="w-20 border-r border-slate-50 shrink-0 bg-slate-50/20" />
                   <div className="flex-1 flex">
                      {days.map((day, idx) => {
                        const isOffDay = !profile.workDays.includes(day.getDay() === 0 ? 7 : day.getDay());
                        return (
                          <div key={day.toISOString()} className={cn(
                            "flex-1 py-6 px-4 text-center border-r border-slate-50 last:border-r-0",
                            isOffDay ? "bg-slate-50/50" : "bg-white"
                          )}>
                             <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] mb-1">
                                {DAYS_OF_WEEK_LABELS[day.getDay() === 0 ? 7 : day.getDay()].substring(0, 3)}
                             </p>
                             <p className={cn(
                               "text-xl font-bold tracking-tight",
                               isOffDay ? "text-slate-300" : "text-slate-900"
                             )}>
                                {format(day, 'MMM dd')}
                             </p>
                          </div>
                        );
                      })}
                   </div>
                </div>

                <div className="flex min-w-[900px] min-h-full content-start bg-grid-slate-50">
                   {/* Time Axis */}
                   <div className="w-20 border-r border-slate-50 shrink-0 select-none bg-slate-50/10">
                      {HOURS.map(hour => (
                        <div key={hour} className="h-[90px] border-b border-slate-50/50 px-4 py-3 text-right">
                           <span className="text-[11px] font-bold text-slate-200">{hour.toString().padStart(2, '0')}:00</span>
                        </div>
                      ))}
                   </div>

                   {/* Vertical Day Columns */}
                   <div className="flex-1 flex relative">
                      {/* Background lines */}
                      <div className="absolute inset-0 pointer-events-none">
                         {HOURS.map(hour => (
                           <div key={`line-${hour}`} className="h-[90px] border-b border-slate-50/50 w-full" />
                         ))}
                      </div>

                      {days.map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const dayTasks = tasks.filter(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), day));
                        const isOffDay = !profile.workDays.includes(day.getDay() === 0 ? 7 : day.getDay());

                        // Render life events logic
                        const breaks: any[] = [];
                        const lunch = profile.lunchTime || { start: '13:00', durationMinutes: 60 };
                        const [lh, lm] = lunch.start.split(':');
                        breaks.push({ id: `lunch-${dayStr}`, type: 'lunch', start: parseInt(lh)*60 + parseInt(lm), duration: lunch.durationMinutes, name: 'FUEL BREAK', icon: <Utensils className="h-3.5 w-3.5" /> });

                        profile.customBreaks?.forEach(b => {
                           const [h, m] = b.start.split(':');
                           breaks.push({ id: b.id, type: 'break', start: parseInt(h)*60 + parseInt(m), duration: b.durationMinutes, name: 'RECHARGE', icon: <Coffee className="h-3.5 w-3.5" /> });
                        });

                        return (
                          <div key={dayStr} className={cn(
                            "flex-1 relative h-full min-h-[2160px] border-r border-slate-50 last:border-r-0 transition-colors duration-500",
                            isOffDay ? "bg-slate-50/30" : "hover:bg-primary/[0.005]"
                          )}>
                             {isOffDay && (
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-[0.04] p-10 select-none">
                                   <Moon className="w-32 h-32 -rotate-12 mb-6" />
                                   <p className="text-3xl font-black uppercase tracking-[0.4em] text-center leading-none">Rest Period</p>
                                </div>
                             )}

                             <DroppableColumn id={dayStr} className="h-full">
                                {/* Life Events */}
                                {breaks.map(b => {
                                   const top = ((b.start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                                   const height = (b.duration / 60) * HOUR_HEIGHT;
                                   return (
                                     <div 
                                       key={b.id} 
                                       className={cn(
                                         "absolute left-0 right-0 z-10 flex items-center justify-center gap-3 transition-all border-y border-dashed border-slate-100",
                                         b.type === 'lunch' ? "bg-amber-50/30 text-amber-500" : "bg-slate-100/30 text-slate-300"
                                       )} 
                                       style={{ top: `${top}px`, height: `${height}px` }}
                                     >
                                       <div className="flex items-center gap-2.5 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm scale-90">
                                          {b.icon}
                                          <span className="text-[9px] font-black uppercase tracking-wider">{b.name}</span>
                                       </div>
                                     </div>
                                   );
                                })}

                                {/* Task Cards */}
                                <SortableContext id={dayStr} items={dayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                   {dayTasks.map(t => {
                                      const info = getTaskInfo(t.id);
                                      return (
                                        <SortableTaskCard 
                                          key={t.id} 
                                          task={t} 
                                          companyColor={info.companyColor} 
                                          projectColor={info.projectColor}
                                          companyName={info.companyName} 
                                          projectName={info.projectName} 
                                          isAbsolute
                                          onUnschedule={() => {
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
