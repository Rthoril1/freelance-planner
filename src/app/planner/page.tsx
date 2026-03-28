'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { autoScheduleTasks } from '@/lib/scheduler';
import { Task } from '@/types';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addDays, format, startOfWeek } from 'date-fns';
import { Wand2, GripVertical, X } from 'lucide-react';
import { PRESET_PLATFORMS } from '@/lib/constants';

const DAYS_OF_WEEK_LABELS: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun'
};

function DroppableColumn({ id, children }: { id: string, children: React.ReactNode }) {
  // A wrapper for the droppable area simply utilizing its own sortable context
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} id={id} className={`min-h-[200px] h-full transition-colors ${isOver ? 'bg-primary/5 rounded-xl' : ''}`}>
      {children}
    </div>
  );
}

function SortableTaskCard({ task, companyColor, companyName, projectName, onUnschedule }: { task: Task, companyColor: string, companyName: string, projectName: string, onUnschedule?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 50 : 1 };
  
  const platform = PRESET_PLATFORMS.find(p => p.id === task.platformId);
  const uiColor = platform?.color || companyColor;

  return (
    <div 
      ref={setNodeRef} style={{ ...style, backgroundColor: platform ? `${platform.color}0C` : undefined, borderColor: isDragging ? undefined : (platform ? `${platform.color}40` : undefined) }}
      className={`bg-card border border-border rounded-xl p-3 shadow-sm mb-3 relative overflow-hidden group hover:border-primary/50 transition-colors ${isDragging ? 'shadow-lg ring-2 ring-primary border-primary' : ''}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: uiColor }} />
      <div className="flex items-start gap-2 pl-2">
        <div {...attributes} {...listeners} className="touch-none mt-1 p-1 -ml-1 cursor-grab active:cursor-grabbing hover:bg-muted rounded text-muted-foreground/50 hover:text-foreground">
          <GripVertical className="w-4 h-4 flex-shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm truncate leading-snug mb-1">
              {task.name}
            </p>
            {onUnschedule && (
              <button 
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); onUnschedule(); }} 
                className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 rounded-sm p-0.5 transition-all shrink-0"
                title="Return to Backlog"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {platform && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 border shrink-0" style={{ backgroundColor: platform.color + '15', color: platform.color, borderColor: platform.color + '30' }}>
                <span>{platform.icon}</span> {platform.name}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider border shrink-0" style={{ backgroundColor: companyColor + '10', color: companyColor, borderColor: companyColor + '30' }}>{companyName}</span>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded italic truncate max-w-[80px]">
              {projectName}
            </span>
            {task.frequency && (
              <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-1 py-0.5 rounded-sm border border-indigo-500/20 shrink-0">
                {task.frequency.timesPerDay}x · {task.frequency.daysOfWeek.map(d => DAYS_OF_WEEK_LABELS[d]).join(', ')}
              </span>
            )}
            <span className="text-xs font-mono font-medium bg-muted px-1.5 py-0.5 rounded ml-auto shrink-0">{task.estimatedDuration}h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const { tasks, profile, companies, projects, updateTask, clearSchedule } = useStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  if (!profile) return null;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const workDays = [...profile.workDays].sort((a,b) => (a===0?7:a)-(b===0?7:b));
  
  const days = workDays.map(d => {
    const rDiff = d === 0 ? 6 : d - 1;
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
    
    // Direct drop to a day container ID (e.g. 2023-10-09)
    if (days.map(d => format(d, 'yyyy-MM-dd')).includes(overId)) {
      updateTask(activeTaskId, { status: 'Scheduled', scheduledStart: new Date(overId).toISOString() });
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
        updateTask(activeTaskId, { status: 'Scheduled', scheduledStart: targetTask.scheduledStart });
      }
    }
  };

  const runAutoSchedule = async () => {
    const unassigned = tasks.filter(t => t.status === 'Todo');
    const scheduled = autoScheduleTasks(unassigned, profile, new Date());
    
    // We need to keep track of which original unassigned tasks were "processed" 
    // to remove them from the backlog (queue) once their clones are created.
    const processedOrigIds = new Set<string>();

    for (const t of scheduled) {
      // If the ID is NOT one of the unassigned tasks, it means it's a new instance
      const isNewInstance = !unassigned.some(u => u.id === t.id);
      
      if (isNewInstance) {
        await useStore.getState().addTask(t);
        // Find which original task matches this instance (by name/project)
        const matchedOrig = unassigned.find(u => u.name === t.name && u.projectId === t.projectId);
        if (matchedOrig) processedOrigIds.add(matchedOrig.id);
      } else {
        await updateTask(t.id, t);
        processedOrigIds.add(t.id);
      }
    }

    // Delete the original templates from the queue now that they are scheduled
    for (const id of Array.from(processedOrigIds)) {
      await useStore.getState().deleteTask(id);
    }
  };

  const unassignedTasks = tasks.filter(t => t.status === 'Todo');

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="h-[calc(100vh-7rem)] flex flex-col pt-2">
        <div className="flex items-center justify-between flex-shrink-0 mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Weekly Planner</h2>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-muted-foreground text-sm">Organize availability across companies.</p>
              {profile.weeklyHoursAvailable && (
                <div className="flex items-center gap-2 bg-card border border-border px-3 py-1 rounded-full shadow-sm">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${(tasks.reduce((acc, t) => acc + (t.status === 'Scheduled' ? (t.estimatedDuration * (t.frequency?.daysOfWeek?.length || 1) * (t.frequency?.timesPerDay || 1)) : 0), 0) > profile.weeklyHoursAvailable) ? 'bg-destructive' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, (tasks.reduce((acc, t) => acc + (t.status === 'Scheduled' ? (t.estimatedDuration * (t.frequency?.daysOfWeek?.length || 1) * (t.frequency?.timesPerDay || 1)) : 0), 0) / profile.weeklyHoursAvailable) * 100)}%` }} 
                    />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${tasks.reduce((acc, t) => acc + (t.status === 'Scheduled' ? (t.estimatedDuration * (t.frequency?.daysOfWeek?.length || 1) * (t.frequency?.timesPerDay || 1)) : 0), 0) > profile.weeklyHoursAvailable ? 'text-destructive' : 'text-emerald-500'}`}>
                    {tasks.reduce((acc, t) => acc + (t.status === 'Scheduled' ? (t.estimatedDuration * (t.frequency?.daysOfWeek?.length || 1) * (t.frequency?.timesPerDay || 1)) : 0), 0)} / {profile.weeklyHoursAvailable}h Capacity
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

        <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
          <div className="w-72 flex-shrink-0 flex flex-col bg-card/40 border border-border rounded-xl shadow-inner relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-muted to-border rounded-t-xl" />
            <div className="p-5 border-b border-border/50 bg-card/60 rounded-t-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  Backlog
                  <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{unassignedTasks.length}</span>
                </h3>
                {profile.weeklyHoursAvailable && (
                  <div className="text-right">
                    <span className={`text-[10px] font-bold uppercase ${unassignedTasks.reduce((acc, t) => acc + (t.estimatedDuration * (t.frequency?.daysOfWeek?.length || 1) * (t.frequency?.timesPerDay || 1)), 0) > profile.weeklyHoursAvailable ? 'text-destructive' : 'text-emerald-500'}`}>
                      {unassignedTasks.reduce((acc, t) => acc + (t.estimatedDuration * (t.frequency?.daysOfWeek?.length || 1) * (t.frequency?.timesPerDay || 1)), 0)}h / {profile.weeklyHoursAvailable}h
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Drag into days to assign.</p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <SortableContext id="unassigned" items={unassignedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn id="unassigned">
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

          <div className="flex-1 flex gap-4 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar">
            {days.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayTasks = tasks.filter(t => t.status === 'Scheduled' && t.scheduledStart?.startsWith(dayStr));
              const totalHours = dayTasks.reduce((acc, t) => acc + t.estimatedDuration, 0);
              const isOverloaded = totalHours > profile.maxHoursPerDay;

              // Build timeline items to interleave tasks with lunch and breaks
              const timelineItems: any[] = [];
              dayTasks.forEach(t => {
                const time = t.scheduledStart ? new Date(t.scheduledStart).getTime() : new Date(dayStr + 'T00:00:00').getTime();
                timelineItems.push({ type: 'task', id: t.id, task: t, time });
              });

              if (profile.lunchTime) {
                const [lh, lm] = profile.lunchTime.start.split(':');
                const lunchDate = new Date(day);
                lunchDate.setHours(parseInt(lh), parseInt(lm), 0, 0);
                timelineItems.push({ type: 'break', id: `lunch-${dayStr}`, name: 'Lunch Break', duration: profile.lunchTime.durationMinutes, time: lunchDate.getTime(), icon: '🥗' });
              }

              profile.customBreaks?.forEach(b => {
                const [bh, bm] = b.start.split(':');
                const bDate = new Date(day);
                bDate.setHours(parseInt(bh), parseInt(bm), 0, 0);
                timelineItems.push({ type: 'break', id: `break-${b.id}-${dayStr}`, name: 'Break Time', duration: b.durationMinutes, time: bDate.getTime(), icon: '☕' });
              });

              timelineItems.sort((a, b) => a.time - b.time);

              return (
                <div key={dayStr} className="flex-1 min-w-[280px] max-w-[340px] flex flex-col bg-card border border-border rounded-xl shadow-sm relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1 ${isOverloaded ? 'bg-destructive' : 'bg-primary/40'}`} />
                  <div className={`p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10 ${isOverloaded ? 'bg-destructive/5' : ''}`}>
                    <div className="flex justify-between items-end mb-1">
                      <h3 className={`font-bold text-xl ${isOverloaded ? 'text-destructive' : ''}`}>{format(day, 'EEEE')}</h3>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{format(day, 'MMM d')}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                       <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                         <div className={`h-full rounded-full ${isOverloaded ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(100, (totalHours/profile.maxHoursPerDay)*100)}%` }} />
                       </div>
                       <span className={`text-xs font-mono font-bold whitespace-nowrap ${isOverloaded ? 'text-destructive' : 'text-primary'}`}>
                        {totalHours} / {profile.maxHoursPerDay}h
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-3 overflow-y-auto custom-scrollbar bg-muted/10 transition-colors hover:bg-muted/30">
                    <SortableContext id={dayStr} items={dayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <DroppableColumn id={dayStr}>
                         {timelineItems.map(item => {
                          if (item.type === 'task') {
                            const info = getTaskInfo(item.task.id);
                            return (
                              <SortableTaskCard 
                                key={item.id} 
                                task={item.task} 
                                companyColor={info.companyColor} 
                                companyName={info.companyName} 
                                projectName={info.projectName}
                                onUnschedule={() => updateTask(item.task.id, { status: 'Todo', scheduledStart: undefined, scheduledEnd: undefined })}
                              />
                            );
                          } else {
                            return (
                              <div key={item.id} className="bg-card border-2 border-dashed border-border/50 rounded-xl p-3 mb-3 flex items-center justify-between text-muted-foreground shadow-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg opacity-80">{item.icon}</span>
                                  <span className="font-medium text-sm">{item.name}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-xs font-mono font-semibold bg-muted px-1.5 py-0.5 rounded">{format(new Date(item.time), 'HH:mm')}</span>
                                  <span className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-70">{item.duration} min</span>
                                </div>
                              </div>
                            );
                          }
                        })}
                        {timelineItems.length === 0 && (
                          <div className="h-full min-h-[100px] flex items-center justify-center border-2 border-dashed border-border/40 rounded-xl opacity-60">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drop here</span>
                          </div>
                        )}
                      </DroppableColumn>
                    </SortableContext>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
