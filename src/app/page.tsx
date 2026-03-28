'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Clock, AlertTriangle, Briefcase, TrendingUp, Calendar, Zap, CheckCircle2, Coffee, Utensils } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const router = useRouter();
  const { profile, tasks, companies, projects } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !profile) {
      router.push('/onboarding');
    }
  }, [mounted, profile, router]);

  if (!mounted || !profile) return null;

  const totalHours = profile.weeklyHoursAvailable;
  const assignedHours = tasks.filter(t => t.status === 'Scheduled' && t.scheduledStart).reduce((acc, t) => acc + t.estimatedDuration, 0);
  const remainingHours = totalHours - assignedHours;
  const percentAssigned = (assignedHours / totalHours) * 100;
  
  const todayDate = new Date();
  const todayStr = format(todayDate, 'yyyy-MM-dd');
  
  const scheduledToday = tasks.filter(t => t.scheduledStart?.startsWith(todayStr));
  const completedToday = tasks.filter(t => t.status === 'Completed' && t.scheduledStart?.startsWith(todayStr));
  const criticalToday = scheduledToday.filter(t => t.priority === 'High');
  const progressPercent = scheduledToday.length > 0 ? (completedToday.length / scheduledToday.length) * 100 : 0;

  // Build the combined Timeline (Tasks + Lunch + Breaks)
  interface TimelineItem {
    id: string;
    type: 'task' | 'life';
    time: string;
    name: string;
    duration: number;
    priority?: string;
    status?: string;
    projectId?: string;
    icon?: React.ReactNode;
    color?: string;
  }

  const agendaItems: TimelineItem[] = [
    ...scheduledToday.map(t => ({ 
      id: t.id, 
      type: 'task' as const, 
      time: t.scheduledStart!,
      name: t.name,
      duration: t.estimatedDuration,
      priority: t.priority,
      status: t.status,
      projectId: t.projectId
    }))
  ];

  if (profile.lunchTime) {
    const lunchDate = new Date(todayDate);
    const [h, m] = profile.lunchTime.start.split(':').map(Number);
    lunchDate.setHours(h, m, 0, 0);
    
    agendaItems.push({
      id: 'lunch',
      type: 'life',
      time: lunchDate.toISOString(), 
      name: 'Lunch Break',
      duration: profile.lunchTime.durationMinutes / 60,
      icon: <Utensils className="h-3 w-3" />,
      color: '#f59e0b'
    });
  }

  if (profile.customBreaks) {
    profile.customBreaks.forEach((b, idx) => {
      const breakDate = new Date(todayDate);
      const [h, m] = b.start.split(':').map(Number);
      breakDate.setHours(h, m, 0, 0);

      agendaItems.push({
        id: `break-${idx}`,
        type: 'life',
        time: breakDate.toISOString(),
        name: (b as any).name || 'Break',
        duration: b.durationMinutes / 60,
        icon: <Coffee className="h-3 w-3" />,
        color: '#10b981'
      });
    });
  }

  const sortedAgenda = agendaItems.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Load per company
  const companyLoad = companies.map(c => {
    const cProjects = projects.filter(p => p.companyId === c.id);
    const cTasks = tasks.filter(t => t.status === 'Scheduled' && cProjects.map(p => p.id).includes(t.projectId));
    const hours = cTasks.reduce((acc, t) => acc + t.estimatedDuration, 0);
    return { ...c, hours: Math.round(hours * 10) / 10 };
  }).sort((a, b) => b.hours - a.hours);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back, {profile.name}. Here's your weekly freelance snapshot.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="tracking-tight text-sm font-semibold text-muted-foreground uppercase">Total Weekly Capacity</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="text-4xl font-black tracking-tighter">{totalHours} <span className="text-lg text-muted-foreground font-semibold">hrs</span></div>
          <p className="text-xs text-muted-foreground mt-2 font-medium">Configured for {profile.workDays.length} days</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <Calendar className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <h3 className="tracking-tight text-sm font-semibold text-muted-foreground uppercase">Hours Scheduled</h3>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="text-4xl font-black tracking-tighter relative z-10">{assignedHours} <span className="text-lg text-muted-foreground font-semibold">hrs</span></div>
          <div className="mt-4 w-full bg-muted rounded-full h-1.5 relative z-10 overflow-hidden">
            <div className={`${percentAssigned > 100 ? 'bg-destructive' : 'bg-primary'} h-1.5 rounded-full`} style={{ width: `${Math.min(100, percentAssigned)}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="tracking-tight text-sm font-semibold text-muted-foreground uppercase">Remaining Time</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <div className={`text-4xl font-black tracking-tighter ${remainingHours < 0 ? 'text-destructive' : ''}`}>
            {remainingHours < 0 ? `+${Math.abs(remainingHours)}` : remainingHours}
            <span className="text-lg text-muted-foreground font-semibold ml-1">hrs</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-medium">{remainingHours < 0 ? 'Over-capacity' : 'Free to allocate'}</p>
        </div>

         <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="tracking-tight text-sm font-semibold text-destructive uppercase">High Priority</h3>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          </div>
          <div className="text-4xl font-black tracking-tighter text-destructive">
             {criticalToday.length}
             {criticalToday.length > 0 && <span className="text-lg ml-1 font-bold">!!!</span>}
          </div>
          <p className="text-xs text-destructive/80 mt-2 font-medium">Critical focus for today</p>
        </div>
      </div>

       <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        {/* Today's Agenda - Main Column */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
            {/* ... header content ... */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20"><Calendar className="h-5 w-5 text-primary" /></div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Today's Agenda</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mt-1">{format(new Date(), 'eeee, MMM do')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="flex flex-col items-end mr-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Completion</p>
                  <p className="text-sm font-bold ">{completedToday.length} / {scheduledToday.length}</p>
               </div>
               <div className="w-12 h-12 relative flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" className="stroke-muted" strokeWidth="3" fill="transparent" />
                    <circle cx="18" cy="18" r="16" className="stroke-emerald-500 transition-all duration-700" strokeWidth="3" fill="transparent" 
                      strokeDasharray={`${progressPercent} 100`} strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-emerald-600">{Math.round(progressPercent)}%</span>
               </div>
            </div>
          </div>
          
          <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1 max-h-[600px]">
            {sortedAgenda.length > 0 ? sortedAgenda.map(item => {
              if (item.type === 'life') {
                return (
                  <div key={item.id} className="flex items-center gap-4 py-2.5 px-4 rounded-xl border border-dashed border-border/60 bg-muted/5 opacity-80">
                    <div className="flex flex-col items-center justify-center min-w-[50px] font-mono text-xs font-bold text-muted-foreground">
                      <span>{format(new Date(item.time), 'HH:mm')}</span>
                    </div>
                    <div className="bg-background/50 p-1.5 rounded-lg border border-border/50">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-muted-foreground italic flex items-center gap-2">
                        {item.name} 
                        <span className="text-[10px] lowercase font-medium bg-muted/40 px-1.5 py-0.5 rounded border border-border/30 not-italic">{item.duration * 60} min</span>
                      </h4>
                    </div>
                  </div>
                );
              }

              const project = projects.find(p => p.id === item.projectId);
              const company = companies.find(c => c.id === project?.companyId);
              const isCompleted = item.status === 'Completed';

              return (
                <div key={item.id} 
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-300 border-l-[3px] shadow-sm hover:shadow-md
                    ${isCompleted ? 'bg-muted/10 border-border/40 opacity-50 grayscale-[0.3]' : 'bg-background hover:bg-muted/10 border-border/80'}
                  `}
                  style={{ borderLeftColor: company?.color || '#94a3b8' }}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`flex flex-col items-center justify-center min-w-[50px] py-1 bg-muted/20 rounded-lg border border-border/30 font-mono text-xs font-bold ${isCompleted ? 'text-muted-foreground' : 'text-primary'}`}>
                      <span>{format(new Date(item.time), 'HH:mm')}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className={`font-bold text-sm truncate transition-all ${isCompleted ? 'line-through text-muted-foreground' : 'group-hover:text-primary'}`}>{item.name}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                          item.priority === 'High' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                          item.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                          'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-sm shadow-blue-500/10'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-50 truncate">
                        {project?.name} • {item.duration < 1 ? `${Math.round(item.duration * 60)}m` : `${Math.round(item.duration * 10) / 10}h`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button 
                      onClick={() => useStore.getState().updateTask(item.id, { status: isCompleted ? 'Scheduled' : 'Completed' })}
                      className={`p-1.5 rounded-lg border transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600' : 'bg-background hover:bg-emerald-500/10 border-border/50 hover:border-emerald-500/30 text-muted-foreground hover:text-emerald-500'
                      }`}
                      title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'fill-emerald-500/20' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-border bg-muted/10 grayscale opacity-40">
                <div className="p-4 bg-muted rounded-full mb-4"><Zap className="w-8 h-8 text-muted-foreground" /></div>
                <h4 className="text-lg font-bold text-muted-foreground">Today's map is blank</h4>
                <p className="text-sm text-muted-foreground/60 mt-1 max-w-[200px]">Go to the Weekly Planner and auto-schedule your tasks!</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col h-full gap-6 lg:min-h-[600px]">
          {/* Work vs Life Balance */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col relative overflow-hidden flex-[2]">
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary/10 p-2 rounded-lg"><TrendingUp className="h-5 w-5 text-primary" /></div>
              <h3 className="text-lg font-bold tracking-tight">Focus Score</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center py-4">
              <div className="relative w-40 h-40 mb-6 group">
                <svg className="w-full h-full -rotate-90 transform drop-shadow-xl" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-muted" strokeWidth="12" fill="transparent" />
                  <circle 
                    cx="50" cy="50" r="40" 
                    className={`transition-all duration-1000 ease-out fill-transparent ${percentAssigned > 100 ? 'stroke-destructive' : 'stroke-primary'} group-hover:opacity-80`} 
                    strokeWidth="12" 
                    strokeDasharray={`${Math.min(100, percentAssigned) * 2.51} 251.2`} 
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black tracking-tighter ${percentAssigned > 100 ? 'text-destructive' : 'text-foreground'}`}>{Math.round(percentAssigned)}%</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Booked</span>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground max-w-sm font-medium leading-relaxed px-2">
                {percentAssigned > 100 ? "❌ OVER CAPACITY. Burnout risk is high." :
                 percentAssigned > 90 ? "⚠️ At maximum capacity! Stay focused." : 
                 percentAssigned > 75 ? "🎯 Optimal productivity range." : 
                 "✅ Plenty of breathing room today."}
              </p>
            </div>
          </div>

          {/* Load by Company */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden relative flex flex-col min-h-0 flex-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <div className="bg-primary/10 p-2 rounded-lg"><Briefcase className="h-5 w-5 text-primary" /></div>
              <h3 className="text-lg font-bold tracking-tight">Active Load</h3>
            </div>
            
            <div className="space-y-4 relative z-10 flex-1 overflow-y-auto custom-scrollbar">
              {companyLoad.map(company => (
                <div key={company.id} className="group p-3 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: company.color }} />
                      <span className="font-bold text-xs truncate">{company.name}</span>
                    </div>
                    <span className="text-[10px] font-black opacity-80 shrink-0">{company.hours}h</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden flex">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ backgroundColor: company.color, width: `${totalHours ? (company.hours / totalHours) * 100 : 0}%` }} 
                    />
                  </div>
                </div>
              ))}
              {companyLoad.length === 0 && (
                 <div className="text-[10px] text-muted-foreground py-4 border border-dashed border-border rounded-lg text-center font-medium bg-muted/20">No data.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
