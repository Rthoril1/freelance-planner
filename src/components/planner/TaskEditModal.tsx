'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Task, Priority, TaskType, EnergyLevel } from '@/types';
import { format, parseISO, addMinutes } from 'date-fns';
import { X, Trash2, Save, Calendar, Clock } from 'lucide-react';
import { TASK_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface TaskEditModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskEditModal({ task, isOpen, onClose }: TaskEditModalProps) {
  const { projects, companies, updateTask, deleteTask } = useStore();

  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState<TaskType>('Deep Work');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('Medium');
  const [duration, setDuration] = useState(1);
  const [notes, setNotes] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');

  useEffect(() => {
    if (task && isOpen) {
      setName(task.name);
      setProjectId(task.projectId);
      setType(task.type);
      setPriority(task.priority);
      setEnergyLevel(task.energyLevel);
      setDuration(task.estimatedDuration);
      setNotes(task.notes || '');
      if (task.scheduledStart) {
        const d = parseISO(task.scheduledStart);
        setStartDateStr(format(d, 'yyyy-MM-dd'));
        setStartTimeStr(format(d, 'HH:mm'));
      }
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    let scheduledStart = task.scheduledStart;
    let scheduledEnd = task.scheduledEnd;

    if (startDateStr && startTimeStr) {
      const d = new Date(`${startDateStr}T${startTimeStr}`);
      scheduledStart = d.toISOString();
      scheduledEnd = addMinutes(d, duration * 60).toISOString();
    }

    updateTask(task.id, {
      name,
      projectId,
      type,
      priority,
      energyLevel,
      estimatedDuration: duration,
      notes,
      scheduledStart,
      scheduledEnd,
    });
    onClose();
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const project = projects.find(p => p.id === (projectId || task.projectId));
  const company = companies.find(c => c.id === project?.companyId);
  const accentColor = project?.color || company?.color || '#6366f1';

  const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none";
  const labelCls = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Accent Header */}
        <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />

        <div className="px-6 pt-5 pb-4 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: accentColor }}>
              {company?.name || 'Task'}
            </p>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{task.name}</h2>
            {task.scheduledStart && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {format(parseISO(task.scheduledStart), 'EEE, MMM d · HH:mm')}
                {task.estimatedDuration && ` · ${task.estimatedDuration}H`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Task Name */}
          <div>
            <label className={labelCls}>Task Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>

          {/* Project */}
          <div>
            <label className={labelCls}>Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputCls}>
              {companies.map(c => (
                <optgroup key={c.id} label={c.name}>
                  {projects.filter(p => p.companyId === c.id).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Row: Type, Priority, Energy */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Mode</label>
              <select value={type} onChange={e => setType(e.target.value as TaskType)} className={inputCls}>
                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputCls}>
                {['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Energy</label>
              <select value={energyLevel} onChange={e => setEnergyLevel(e.target.value as EnergyLevel)} className={inputCls}>
                {['Low', 'Medium', 'High'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Date, Time, Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input type="date" value={startDateStr} onChange={e => setStartDateStr(e.target.value)} className={cn(inputCls, "pl-8")} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Start Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input type="time" value={startTimeStr} onChange={e => setStartTimeStr(e.target.value)} className={cn(inputCls, "pl-8")} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Duration (h)</label>
              <input type="number" min="0.5" step="0.5" value={duration} onChange={e => setDuration(parseFloat(e.target.value) || 0.5)} className={inputCls} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} className={cn(inputCls, "resize-none")} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <div className="flex-1" />
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name || !projectId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-white shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all disabled:opacity-40"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
