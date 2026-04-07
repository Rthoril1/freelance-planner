'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Task } from '@/types';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable, DragOverlay, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addDays, format, isSameDay, parseISO, addMinutes, setHours, setMinutes } from 'date-fns';
import { X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Calendar, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskEditModal } from '@/components/planner/TaskEditModal';
import { TaskCreationModal } from '@/components/planner/TaskCreationModal';

const HOUR_HEIGHT = 90;
const TIMELINE_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const START_HOUR = 7;

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

  const layoutMap: Record<string, { left: number, width: number, top?: number, height?: number }> = {};
  clusters.forEach(cluster => {
    const sorted = [...cluster].sort((a, b) => {
      const wa = priorityWeights[a.priority as string] ?? 1;
      const wb = priorityWeights[b.priority as string] ?? 1;
      if (wa !== wb) return wb - wa;
      return a.top - b.top;
    });

    const size = sorted.length;
    sorted.forEach((item, idx) => {
      layoutMap[item.id] = {
        left: (idx / size) * 100,
        width: 100 / size,
        top: item.top,
        height: item.height
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
  onUnschedule?: () => void, onMove?: (dir: 'up' | 'down') => void, onEdit?: () => void,
  isAbsolute?: boolean, isDragging?: boolean, 
  layout?: { left: number, width: number, top?: number, height?: number }, startHour: number, style?: React.CSSProperties,
  attributes?: React.HTMLAttributes<HTMLDivElement>, listeners?: React.HTMLAttributes<HTMLDivElement>
}) {
  const height = Math.max(0.4, task.estimatedDuration) * HOUR_HEIGHT;
  let style: React.CSSProperties = { ...parentStyle };
  
  if (isDragging) {
    style = { ...style, position: 'relative', top: 0, left: 0, width: '100%', zIndex: 1000 };
  } else if (isAbsolute && task.scheduledStart) {
    const INSET = 4;
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
      <div className="absolute inset-0 bg-black/15 pointer-events-none" />

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

      {isAbsolute && onMove && !isDragging && (() => {
        const isCompactArrow = height <= 45;
        return (
          <div
            className="absolute inset-0 bg-slate-900/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-40"
            style={{ gap: isCompactArrow ? '3px' : '8px' }}
            onClick={() => { if (onEdit) onEdit(); }}
          >
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
  onUnschedule?: () => void, onMove?: (dir: 'up' | 'down') => void, onEdit?: () => void,
  startHour: number, isAbsolute?: boolean, layout?: { left: number, width: number, top?: number, height?: number },
  containerId: string
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = task.scheduledStart ? new Date(task.scheduledStart) : null;
  const isPast = taskDate ? taskDate < today : false;
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

function DroppableColumn({ id, children, className, type = 'day' }: { id: string, children: React.ReactNode, className?: string, type?: string }) {
  const { isOver, setNodeRef } = useDroppable({ 
    id,
    data: { type: 'day', containerId: id }
  });
  return <div ref={setNodeRef} id={id} className={cn("relative transition-all duration-300", isOver ? "bg-primary/[0.03]" : "", className)}>{children}</div>;
}

export function DailyPlannerWidget() {
  const { profile, tasks, companies, projects, updateTask } = useStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{ day: string, hour: number, mins: number } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => { setMounted(true); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [targetDay, setTargetDay] = useState(() => new Date());
  
  // Only process tasks scheduled for targetDay
  const dayTasks = tasks.filter(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), targetDay));
  const layoutMap = getTaskLayouts(dayTasks, START_HOUR);

  const getDayColId = (dateString: string) => `daycol-${dateString}`;
  const dayId = getDayColId(targetDay.toISOString());

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragTarget(null);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { over, active, delta } = event;
    if (!over || over.id !== dayId || !gridRef.current) {
      setDragTarget(null);
      return;
    }
    const task = tasks.find(t => t.id === active.id);
    if (!task || !task.scheduledStart) return;

    const currentTop = layoutMap[task.id]?.top ?? 0;
    const newTop = currentTop + delta.y;
    const hourDelta = Math.floor(newTop / HOUR_HEIGHT);
    const remainingMins = Math.round(((newTop % HOUR_HEIGHT) / HOUR_HEIGHT) * 60);
    const snapMins = remainingMins >= 45 ? 60 : remainingMins >= 15 ? 30 : 0;
    
    let targetHour = START_HOUR + hourDelta;
    let targetMins = snapMins;
    if (targetMins === 60) {
      targetHour += 1;
      targetMins = 0;
    }
    
    targetHour = Math.max(START_HOUR, Math.min(23, targetHour));
    setDragTarget({ day: targetDay.toISOString(), hour: targetHour, mins: targetMins });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setDragTarget(null);
    
    if (dragTarget) {
      const task = tasks.find(t => t.id === event.active.id);
      if (task) {
        let newDate = setHours(setMinutes(targetDay, dragTarget.mins), dragTarget.hour);
        updateTask(task.id, { scheduledStart: newDate.toISOString() });
        addNotification(`Rescheduled to ${format(newDate, 'HH:mm')}`, 'success');
      }
    }
  };

  const handleMoveArrows = (task: Task, dir: 'up' | 'down') => {
    if (!task.scheduledStart) return;
    const start = new Date(task.scheduledStart);
    let newDate = start;
    if (dir === 'up') newDate = addMinutes(start, -30);
    if (dir === 'down') newDate = addMinutes(start, 30);
    updateTask(task.id, { scheduledStart: newDate.toISOString() });
  };

  if (!mounted) return null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <div className="bg-surface-high rounded-[40px] border border-border/50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header - Light theme and aligned with cards */}
        <div className="bg-transparent border-b border-border/20 flex px-2 py-6">
           <div className="w-20 shrink-0" /> {/* Spacer to align with time column */}
           <div className="flex-1 flex flex-col items-start px-1">
             <div className="flex items-center mb-4 w-full">
                <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                   <Calendar className="w-5 h-5 text-primary" />
                   {isSameDay(targetDay, new Date()) ? "Today's " : ""}Command Center
                </h2>
             </div>
             
             <div className="flex items-end justify-between w-full">
               <div className="flex flex-col select-none">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">
                     {format(targetDay, 'MMM yyyy')}
                  </span>
                  <span className="text-3xl font-black text-foreground tracking-tighter leading-snug">
                     {format(targetDay, 'EEEE d')}
                  </span>
               </div>

                {/* Date Navigation Controls */}
                <div className="flex items-center gap-2 md:gap-3">
                  {!isSameDay(targetDay, new Date()) && (
                    <button 
                      onClick={() => {
                        const d = new Date(); d.setHours(0,0,0,0); setTargetDay(d);
                      }}
                      className="px-4 py-2 sm:mr-2 text-sm font-black tracking-wide bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors leading-none"
                    >
                      TODAY
                    </button>
                  )}
                  <button onClick={() => setTargetDay(d => addDays(d, -1))} className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button onClick={() => setTargetDay(d => addDays(d, 1))} className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
             </div>
           </div>
           {/* Right Spacer to perfectly align controls with end of task cards underneath */}
           <div className="w-20 shrink-0" />
        </div>

        {/* Grid Wrapper */}
        <div className="relative bg-white flex h-[500px] overflow-y-auto custom-scrollbar pt-4">
          {/* Time Column (Symmetric Left/Right if wanted, but left is enough for dashboard) */}
          <div className="w-20 border-r border-slate-100 flex flex-col bg-slate-50/50">
            {TIMELINE_HOURS.map(hour => (
              <div key={hour} className="relative flex flex-col items-center border-b border-slate-100 shrink-0" style={{ height: HOUR_HEIGHT }}>
                <span className="text-[11px] font-bold text-slate-400 absolute -top-2.5 bg-white px-1">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day Column */}
          <div className="flex-1 relative" ref={gridRef}>
             <DroppableColumn id={dayId} className="w-full h-full border-r border-slate-100 flex flex-col relative" type="day">
               {/* Hour Guidelines */}
               <div className="absolute inset-0 pointer-events-none z-0">
                 {TIMELINE_HOURS.map(hour => (
                   <div key={`guide-${hour}`} className="border-b border-slate-100 shrink-0" style={{ height: HOUR_HEIGHT }} />
                 ))}
               </div>

               {/* Hover Hitboxes for Add Assignment */}
               <div className="absolute inset-0 z-0 flex flex-col">
                 {TIMELINE_HOURS.map((hour, idx) => (
                   <div 
                     key={`add-${hour}`} 
                     className="w-full shrink-0 group/add cursor-pointer flex items-center justify-center p-1"
                     style={{ height: HOUR_HEIGHT }}
                     onClick={() => {
                       const newDate = new Date(targetDay);
                       newDate.setHours(hour, 0, 0, 0);
                       setQuickAddDate(newDate);
                       setIsAddModalOpen(true);
                     }}
                   >
                     <div className="w-full h-full border-2 border-dashed border-transparent group-hover/add:border-primary/50 group-hover/add:bg-primary/[0.02] rounded-lg transition-all flex items-center justify-center opacity-0 group-hover/add:opacity-100 text-primary/50">
                       <Plus className="w-5 h-5 transition-transform group-hover/add:scale-110" />
                     </div>
                   </div>
                 ))}
               </div>

               {/* Droppable Hitboxes */}
               <div className="absolute inset-0 z-10 grid pointer-events-none" style={{ gridTemplateRows: `repeat(${TIMELINE_HOURS.length * 4}, 1fr)` }} />

               {/* Render Time-Off Blocks (Breaks/Lunch) */}
               {(() => {
                 const blocks = [];
                 if (profile?.lunchTime) blocks.push({ id: 'lunch', label: 'LUNCH', start: profile.lunchTime.start, duration: profile.lunchTime.durationMinutes, color: 'bg-[#FFC107]' });
                 (profile?.customBreaks || []).forEach((b, i) => blocks.push({ id: `break-${b.id}`, label: 'BREAK', start: b.start, duration: b.durationMinutes, color: 'bg-[#448AFF]' }));
                 
                 return blocks.map(b => {
                   const [h, m] = b.start.split(':').map(Number);
                   const top = ((h * 60 + m) - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                   const height = b.duration * (HOUR_HEIGHT / 60);
                   if (top < 0 && top + height < 0) return null; // Outside visible range

                   return (
                     <div key={b.id} className={cn("absolute left-0 right-0 z-20 flex items-center justify-center rounded-sm mx-1 shadow-sm opacity-90 hover:opacity-100 transition-opacity", b.color)} 
                          style={{ top: `${top + 4}px`, height: `${Math.max(20, height - 8)}px` }}>
                       <span className="text-white text-[10px] font-black tracking-[0.2em] uppercase">{b.label}</span>
                     </div>
                   );
                 });
               })()}

               {/* Render Scheduled Tasks */}
               {dayTasks.map(task => {
                 const project = projects.find(p => p.id === task.projectId);
                 const company = companies.find(c => c.id === project?.companyId);
                 if (!company || !project) return null;
                 return (
                   <SortableTaskCard
                     key={task.id}
                     task={task}
                     companyName={company.name}
                     projectColor={project.color || company.color}
                     onUnschedule={() => updateTask(task.id, { scheduledStart: undefined })}
                     onMove={(dir) => handleMoveArrows(task, dir as 'up' | 'down')}
                     onEdit={() => { setEditingTask(task); setIsEditModalOpen(true); }}
                     startHour={START_HOUR}
                     isAbsolute
                     layout={layoutMap[task.id]}
                     containerId={dayId}
                   />
                 );
               })}

               {/* Drag Target Preview */}
               {activeId && dragTarget?.day === targetDay.toISOString() && (
                 <div 
                   className="absolute left-1 right-1 border-2 border-primary border-dashed rounded-lg bg-primary/[0.05] z-20 transition-all duration-75"
                   style={{ 
                     top: ((dragTarget.hour - START_HOUR) * 60 + dragTarget.mins) * (HOUR_HEIGHT / 60) + 4,
                     height: Math.max(HOUR_HEIGHT * 0.5, (tasks.find(t => t.id === activeId)?.estimatedDuration || 0.5) * HOUR_HEIGHT) - 8
                   }}
                 >
                   <div className="absolute top-1 left-2 bg-primary text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
                     {dragTarget.hour.toString().padStart(2, '0')}:{dragTarget.mins.toString().padStart(2, '0')}
                   </div>
                 </div>
               )}
             </DroppableColumn>
          </div>

          {/* Right Time Column (Symmetric) */}
          <div className="w-20 border-l border-slate-100 flex flex-col bg-slate-50/50">
            {TIMELINE_HOURS.map(hour => (
              <div key={`right-${hour}`} className="relative flex flex-col items-center border-b border-slate-100 shrink-0" style={{ height: HOUR_HEIGHT }}>
                <span className="text-[11px] font-bold text-slate-400 absolute -top-2.5 bg-white px-1">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId ? (() => {
          const task = tasks.find(t => t.id === activeId);
          console.log("DragOverlay Task ID:", activeId, "Task:", task); // DEBUG
          if (!task) return null;
          const project = projects.find(p => p.id === task.projectId);
          const company = companies.find(c => c.id === project?.companyId);
          if (!company || !project) return null;
          return <TaskCardUI task={task} companyName={company.name} projectColor={project.color || company.color} isDragging startHour={START_HOUR} />;
        })() : null}
      </DragOverlay>

      {editingTask && (
        <TaskEditModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setEditingTask(null); }}
          task={editingTask as any}
        />
      )}

      {isAddModalOpen && (
        <TaskCreationModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          initialDate={quickAddDate}
        />
      )}
    </DndContext>
  );
}
