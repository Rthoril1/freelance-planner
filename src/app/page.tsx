'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Clock, AlertTriangle, Briefcase, TrendingUp, Calendar, Zap } from 'lucide-react';

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
  const assignedHours = tasks.filter(t => t.status === 'Scheduled').reduce((acc, t) => acc + t.estimatedDuration, 0);
  const remainingHours = Math.max(0, totalHours - assignedHours);
  const percentAssigned = Math.min(100, (assignedHours / totalHours) * 100);

  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const criticalTasks = pendingTasks.filter(t => t.priority === 'High');

  // Load per company
  const companyLoad = companies.map(c => {
    const cProjects = projects.filter(p => p.companyId === c.id);
    const cTasks = tasks.filter(t => t.status === 'Scheduled' && cProjects.map(p => p.id).includes(t.projectId));
    const hours = cTasks.reduce((acc, t) => acc + t.estimatedDuration, 0);
    return { ...c, hours };
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
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${percentAssigned}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="tracking-tight text-sm font-semibold text-muted-foreground uppercase">Remaining Time</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <div className="text-4xl font-black tracking-tighter">{remainingHours} <span className="text-lg text-muted-foreground font-semibold">hrs</span></div>
          <p className="text-xs text-muted-foreground mt-2 font-medium">Free to allocate</p>
        </div>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="tracking-tight text-sm font-semibold text-destructive uppercase">Critical Tasks</h3>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          </div>
          <div className="text-4xl font-black tracking-tighter text-destructive">{criticalTasks.length}</div>
          <p className="text-xs text-destructive/80 mt-2 font-medium">High priority pending</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="flex items-center gap-2 mb-8 relative z-10">
            <div className="bg-primary/10 p-2 rounded-lg"><Briefcase className="h-5 w-5 text-primary" /></div>
            <h3 className="text-xl font-bold tracking-tight">Load by Company</h3>
          </div>
          
          <div className="space-y-6 relative z-10">
            {companyLoad.map(company => (
              <div key={company.id} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-md shadow-sm border border-border/50" style={{ backgroundColor: company.color }} />
                    <span className="font-semibold">{company.name}</span>
                  </div>
                  <span className="text-sm font-bold opacity-80 group-hover:opacity-100 transition-opacity">{company.hours} <span className="text-muted-foreground font-medium">hrs</span></span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden flex">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ backgroundColor: company.color, width: `${totalHours ? (company.hours / totalHours) * 100 : 0}%` }} 
                  />
                </div>
              </div>
            ))}
            {companyLoad.length === 0 && (
               <div className="text-sm text-muted-foreground py-8 border-2 border-dashed border-border rounded-xl text-center font-medium bg-muted/20">No data available. Schedule some tasks first!</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-primary/10 p-2 rounded-lg"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <h3 className="text-xl font-bold tracking-tight">Work vs Life Balance</h3>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center py-6">
            <div className="relative w-56 h-56 mb-8 group">
              <svg className="w-full h-full -rotate-90 transform drop-shadow-xl" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="stroke-muted" strokeWidth="12" fill="transparent" />
                <circle 
                  cx="50" cy="50" r="40" 
                  className="stroke-primary transition-all duration-1000 ease-out group-hover:stroke-primary/80" strokeWidth="12" fill="transparent" 
                  strokeDasharray={`${percentAssigned > 0 ? percentAssigned * 2.51 : 0} 251.2`} 
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black tracking-tighter">{Math.round(percentAssigned)}%</span>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Booked</span>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground max-w-sm font-medium leading-relaxed">
              {percentAssigned > 90 ? "⚠️ You're at maximum capacity! Consider taking a break or delegating tasks." : 
               percentAssigned > 75 ? "🎯 Optimal productivity range. Stay focused and keep the momentum going!" : 
               "✅ You have plenty of breathing room this week. Great for deep work or starting new projects."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
