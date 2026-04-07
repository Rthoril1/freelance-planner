'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { DailyPlannerWidget } from '@/components/dashboard/DailyPlannerWidget';
import { 
  TrendingUp, 
  Clock, 
  Zap, 
  Search, 
  Bell, 
  Plus, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Laptop, 
  Monitor, 
  Smartphone,
  CheckCircle2,
  Calendar,
  DollarSign,
  Activity,
  Play,
  Settings,
  User,
  Camera,
  Loader2,
  Image as ImageIcon,
  Coffee,
  Utensils,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { 
  format, 
  isSameDay, 
  parseISO, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval,
  addHours,
  addDays,
  startOfDay,
  setHours,
  setMinutes,
  addMinutes,
  differenceInMinutes,
  differenceInSeconds,
  eachDayOfInterval,
  isWeekend,
  isSameMonth,
  addMonths,
  subMonths
} from 'date-fns';
import { cn, generateId } from '@/lib/utils';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';
import { uploadToStorage, supabase } from '@/lib/supabase';
import { useRef } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const { profile, updateProfile, tasks, updateTask, companies, projects, fetchData } = useStore();
  const [viewingMonth, setViewingMonth] = useState(new Date());

  // Derived ranges based on viewingMonth
  const monthRange = useMemo(() => ({ 
    start: startOfMonth(viewingMonth), 
    end: endOfMonth(viewingMonth) 
  }), [viewingMonth]);

  const weekRange = useMemo(() => {
    const isViewingCurrentMonth = isSameMonth(viewingMonth, new Date());
    const weekBase = isViewingCurrentMonth ? new Date() : startOfMonth(viewingMonth);
    return { 
      start: startOfWeek(weekBase, { weekStartsOn: 1 }), 
      end: endOfWeek(weekBase, { weekStartsOn: 1 }) 
    };
  }, [viewingMonth]);

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date().getDay()];
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setCurrentTime(new Date()), 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mounted && !profile) {
      router.push('/onboarding');
    }
  }, [mounted, profile, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImageSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
    e.target.value = '';
  };

  const handleApplyCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      setIsUploadingAvatar(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to crop image");

      const file = new File([croppedBlob], `avatar.jpg`, { type: 'image/jpeg' });
      const path = `avatars/${user.id}/${generateId()}-${file.name}`;
      const url = await uploadToStorage('profile_assets', path, file);
      
      await updateProfile({ avatarUrl: url });
      setCropImageSrc(null);
    } catch (error) {
       console.error(`Failed to upload avatar`, error);
       alert("Upload failed. Ensure Supabase storage bucket exists.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const toggleVacationDay = (day: Date) => {
    if (!profile) return;
    const iso = day.toISOString();
    const isExistent = profile.vacationDays?.some(v => isSameDay(parseISO(v), day));
    const nextDays = isExistent
      ? profile.vacationDays?.filter(v => !isSameDay(parseISO(v), day))
      : [...(profile.vacationDays || []), iso];
    updateProfile({ vacationDays: nextDays });
  };

  // Financial Orchestration Calculations
  const metrics = useMemo(() => {
    const allDaysInMonth = eachDayOfInterval({ start: monthRange.start, end: monthRange.end });
    const monthKey = format(viewingMonth, 'yyyy-MM');
    const globalOffDays = profile?.vacationDays || [];

    // Filter companies that are not paused this month
    const activeCompanies = companies.filter(c => !c.pausedMonths?.includes(monthKey));

    const isCompanyWorkingOn = (company: typeof companies[0], day: Date) => {
      const dayIdx = day.getDay();
      const standardWorkDays = company.workDays && company.workDays.length > 0 ? company.workDays : (profile?.workDays || [1, 2, 3, 4, 5]);
      const isStandardDay = standardWorkDays.includes(dayIdx);
      const isSpecificOffDay = company.offDays?.some(d => isSameDay(parseISO(d), day));
      return isStandardDay && !isSpecificOffDay;
    };

    const isAvailableAtAll = (day: Date) => {
      const isGlobalOff = globalOffDays.some(v => isSameDay(parseISO(v), day));
      if (isGlobalOff) return false;
      return activeCompanies.some(c => isCompanyWorkingOn(c, day));
    };

    const workingDaysCount = allDaysInMonth.filter(day => isAvailableAtAll(day)).length;
    const totalPossibleWeekdays = allDaysInMonth.filter(day => !isWeekend(day)).length;
    const workingRatio = workingDaysCount / Math.max(1, totalPossibleWeekdays);

    // Calculate projected monthly income precisely per day per company
    let projectedMonth = 0;
    activeCompanies.forEach(company => {
      const standardWorkDays = company.workDays && company.workDays.length > 0 ? company.workDays : (profile?.workDays || [1, 2, 3, 4, 5]);
      const dailyHours = (company.contractHours || 0) / Math.max(1, standardWorkDays.length);
      const dailyRate = dailyHours * (company.hourlyRate || 0);
      
      const companyWorkDaysInMonth = allDaysInMonth.filter(day => 
        isCompanyWorkingOn(company, day) && 
        !globalOffDays.some(v => isSameDay(parseISO(v), day))
      ).length;

      projectedMonth += dailyRate * companyWorkDaysInMonth;
    });

    const calculateEarningsFromTasks = (taskList: typeof tasks) => {
      return taskList.reduce((acc, task) => {
        const project = projects.find(p => p.id === task.projectId);
        const company = companies.find(c => c.id === project?.companyId);
        if (!company || !company.hourlyRate) return acc;
        return acc + ((task.estimatedDuration || 1) * company.hourlyRate);
      }, 0);
    };

    const monthTasks = tasks.filter(t => t.scheduledStart && isWithinInterval(parseISO(t.scheduledStart), monthRange));
    const activeMonthTasks = monthTasks.filter(t => {
      const project = projects.find(p => p.id === t.projectId);
      return activeCompanies.some(c => c.id === project?.companyId);
    });
    
    const monthRealized = activeMonthTasks
      .filter(t => t.status === 'Completed')
      .reduce((acc, task) => {
        const project = projects.find(p => p.id === task.projectId);
        const company = companies.find(c => c.id === project?.companyId);
        if (!company || !company.hourlyRate) return acc;
        return acc + ((task.estimatedDuration || 1) * company.hourlyRate);
      }, 0);

    const weekTasks = tasks.filter(t => t.scheduledStart && isWithinInterval(parseISO(t.scheduledStart), weekRange));
    const yearlyProjected = projectedMonth * 12;

    return {
      week: calculateEarningsFromTasks(weekTasks),
      month: projectedMonth,
      monthRealized,
      targetProgress: projectedMonth > 0 ? (monthRealized / projectedMonth) * 100 : 0,
      year: yearlyProjected,
      workingDaysCount,
      workingRatio
    };
  }, [tasks, companies, projects, profile?.vacationDays, profile?.workDays, viewingMonth, monthRange, weekRange]);

  const workCompositionData = useMemo(() => {
    const inner: any[] = [];
    const outer: any[] = [];
    let totalHours = 0;

    companies.forEach(company => {
      const companyProjects = projects.filter(p => p.companyId === company.id);
      let companyTotal = 0;

      companyProjects.forEach(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const projectHours = projectTasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
        
        if (projectHours > 0) {
          outer.push({
            name: project.name,
            value: projectHours,
            fill: company.color,
            companyName: company.name
          });
          companyTotal += projectHours;
        }
      });

      if (companyTotal > 0) {
        inner.push({
          name: company.name,
          value: companyTotal,
          fill: company.color
        });
        totalHours += companyTotal;
      }
    });

    return { inner, outer, totalHours };
  }, [companies, projects, tasks]);

  // Operational Status Logic
  const operationalStatus = useMemo(() => {
    if (!profile) return { state: 'Off-Shift', color: 'text-muted-foreground', bg: 'bg-surface-highest/20', label: 'Offline' };

    const now = currentTime;
    const [startH, startM] = profile.dailyAvailability.start.split(':').map(Number);
    const [endH, endM] = profile.dailyAvailability.end.split(':').map(Number);
    
    const shiftStart = setMinutes(setHours(startOfDay(now), startH), startM);
    const shiftEnd = setMinutes(setHours(startOfDay(now), endH), endM);

    // 1. Check if we are in Shift
    const inShift = isWithinInterval(now, { start: shiftStart, end: shiftEnd });
    
    if (!inShift) return { 
      state: 'Off-Shift', 
      color: 'text-muted-foreground', 
      bg: 'bg-surface-highest/10', 
      label: 'End of Shift',
      timeLabel: 'Next: ' + profile.dailyAvailability.start
    };

    // 2. Check for Lunch
    if (profile.lunchTime) {
      const [lH, lM] = profile.lunchTime.start.split(':').map(Number);
      const lunchStart = setMinutes(setHours(startOfDay(now), lH), lM);
      const lunchEnd = addMinutes(lunchStart, profile.lunchTime.durationMinutes);
      if (isWithinInterval(now, { start: lunchStart, end: lunchEnd })) {
        return { 
          state: 'Lunch', 
          color: 'text-amber-500', 
          bg: 'bg-amber-500/10', 
          label: 'Taking Lunch',
          timeLabel: 'Back in: ' + differenceInMinutes(lunchEnd, now) + 'm'
        };
      }
    }

    // 3. Check for Custom Breaks
    const activeBreak = profile.customBreaks?.find(b => {
      const [bH, bM] = b.start.split(':').map(Number);
      const breakStart = setMinutes(setHours(startOfDay(now), bH), bM);
      const breakEnd = addMinutes(breakStart, b.durationMinutes);
      return isWithinInterval(now, { start: breakStart, end: breakEnd });
    });

    if (activeBreak) {
      return { 
        state: 'Break', 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10', 
        label: 'Short Break',
        timeLabel: activeBreak.id
      };
    }

    // 4. In Active Work
    const elapsedMinutes = differenceInMinutes(now, shiftStart);
    const h = Math.floor(elapsedMinutes / 60);
    const m = elapsedMinutes % 60;
    
    return { 
      state: 'Work', 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10', 
      label: 'Deep Work',
      timeLabel: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    };
  }, [profile, currentTime]);

  if (!mounted || !profile) return null;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-1000 pb-20">
      
      {/* GLOBAL SEARCH & TOP BAR */}
      <div className="flex items-center justify-between gap-8 mb-4">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            {format(currentTime, 'EEEE, dd MMM')}
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Digital Atelier</h1>
            <span className="text-primary font-bold text-sm">Strategic Node</span>
          </div>
        </div>

        <div className="flex-1 max-w-2xl relative group hidden md:block">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search tactical assets, initiatives, or logs..."
            className="w-full bg-surface-low border border-border/50 rounded-full py-3.5 pl-14 pr-6 text-sm focus:border-primary/50 outline-none transition-all shadow-inner"
          />
        </div>
      </div>

        {/* MONTHLY ACTION REMINDER */}
        {(() => {
          const today = new Date();
          const isFirstDay = today.getDate() === 1;
          // Show reminder if it's the first day OR if no vacation days are set for the current month
          const monthStart = startOfMonth(today);
          const hasMonthData = profile?.vacationDays?.some(v => isSameMonth(parseISO(v), monthStart));
          
          if (isFirstDay || !hasMonthData) {
            return (
              <div className="mb-8 bg-primary/10 border border-primary/20 rounded-[30px] p-6 flex items-center justify-between animate-in fade-in slide-in-from-top duration-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <Calendar className="w-6 h-6 text-background" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground">Operational Strategy Required</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Please confirm your working days for {format(today, 'MMMM')} to optimize forecasts.</p>
                  </div>
                </div>
                <button 
                  onClick={() => router.push('/settings')}
                  className="px-6 py-3 bg-primary text-background rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20  transition-all"
                >
                  Configure Schedule
                </button>
              </div>
            );
          }
          return null;
        })()}

        {/* TOP METRICS GRID */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: IDENTITY & METRICS */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          
          {/* USER PROFILE CARD */}
          <div className="bg-surface-high rounded-[40px] p-8 border border-border/50 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -translate-y-12 translate-x-12" />
            
            <div className="relative z-10">
              <input type="file" ref={avatarInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
              
              <div onClick={() => avatarInputRef.current?.click()} className="cursor-pointer w-full aspect-[4/5] rounded-[32px] overflow-hidden mb-8 relative border-4 border-background shadow-2xl group/avatar">
                {profile.avatarUrl ? (
                   <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-highest flex items-center justify-center">
                    <User className="h-16 w-16 text-primary/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center">
                   {isUploadingAvatar ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : (
                     <>
                       <Camera className="w-8 h-8 text-white mb-2" />
                       <span className="text-white text-[10px] font-black uppercase tracking-widest leading-none">Update Photo</span>
                       <span className="text-white/70 text-[8px] font-black uppercase tracking-widest mt-1">Recommended: 400x500 (4:5)</span>
                     </>
                   )}
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex flex-col">
                  <input 
                     className="text-2xl font-black tracking-tight text-foreground bg-transparent border-none outline-none hover:bg-surface-highest focus:bg-surface-highest rounded px-2 -ml-2 transition-colors w-full"
                     value={profile.name}
                     onChange={(e) => updateProfile({ name: e.target.value })}
                  />
                  <div className="flex items-center gap-1">
                     <input 
                        className="text-sm text-muted-foreground font-medium bg-transparent border-none outline-none hover:bg-surface-highest focus:bg-surface-highest rounded px-2 -ml-2 transition-colors w-full max-w-[120px]"
                        value={profile.type}
                        onChange={(e) => updateProfile({ type: e.target.value })}
                     />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/30">
                  <div className="flex items-center gap-3 text-muted-foreground group">
                    <div className="w-8 h-8 rounded-[10px] bg-surface-highest flex items-center justify-center border border-border/50 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-medium truncate">{profile.email || 'Initializing...'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground group">
                    <div className="w-8 h-8 rounded-[10px] bg-surface-highest flex items-center justify-center border border-border/50 shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Add phone..."
                      className="text-[13px] font-medium bg-transparent border-none outline-none hover:bg-surface-highest focus:bg-surface-highest rounded px-2 -ml-2 transition-colors w-full"
                      value={profile.phone || ''}
                      onChange={(e) => updateProfile({ phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-high rounded-[32px] p-6 border border-border/50 flex flex-col gap-2">
              <span className="text-3xl font-black text-foreground">362</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Days in Atelier</span>
            </div>
            <div className="bg-surface-high rounded-[32px] p-6 border border-border/50 flex flex-col gap-2">
              <span className="text-3xl font-black text-foreground">{projects.length}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Hubs</span>
            </div>
          </div>

          <div className="bg-surface-high rounded-[32px] p-8 border border-border/50 flex flex-col gap-2 relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12">
               <DollarSign className="h-24 w-24 text-primary" />
             </div>
             <span className="text-3xl font-black text-foreground">
               ${metrics.year.toLocaleString(undefined, { maximumFractionDigits: 0 })}
             </span>
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Projected Annual Output</span>
          </div>

          {/* PREMIUM CTA */}
          <div className="bg-gradient-to-br from-primary/20 to-indigo-500/10 rounded-[40px] p-8 border border-primary/20 relative group cursor-pointer overflow-hidden">
             <div className="absolute top-4 right-4 bg-background/50 backdrop-blur-md p-2 rounded-xl border border-white/10 group-hover:scale-110 transition-transform">
               <Zap className="h-5 w-5 text-primary" />
             </div>
             <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20 mb-6">
                <Settings className="h-6 w-6 text-white" />
             </div>
             <h3 className="text-xl font-black tracking-tight text-foreground text-center mb-2">Stitch Prime</h3>
             <p className="text-xs text-muted-foreground text-center leading-relaxed mb-6 px-4">Unlock neural scheduling and multi-currency tracking.</p>
             <button className="w-full h-12 rounded-2xl bg-foreground text-background font-bold text-xs uppercase tracking-widest hover:bg-primary transition-colors">
               Upgrade Node
             </button>
          </div>

        </div>

        {/* MIDDLE COLUMN: TACTICAL CONTROL & TIMELINE */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* OPERATIONAL STATUS CARD (REPLACED TIME TRACKING) */}
            <div className="bg-surface-high rounded-[40px] p-8 border border-border/50 shadow-xl flex flex-col min-h-[360px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black tracking-tight">Operational Status</h3>
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* LEGEND ROW */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/10">
                 <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Work</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Break</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-highest" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Off</span>
                 </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className={cn(
                  "rounded-[32px] p-6 border transition-all duration-700 flex items-center justify-between mb-8",
                  operationalStatus.bg,
                  operationalStatus.state === 'Work' ? 'border-emerald-500/20' : 
                  operationalStatus.state !== 'Off-Shift' ? 'border-amber-500/20' : 'border-border/30'
                )}>
                   <div className="space-y-1">
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", operationalStatus.color)}>
                        {operationalStatus.label}
                      </p>
                      <h4 className="text-2xl font-black text-foreground">Operational Node</h4>
                      <p className="text-3xl font-light text-foreground/70 font-mono tracking-tighter">
                        {operationalStatus.timeLabel}
                      </p>
                   </div>
                   <button className={cn(
                     "w-16 h-16 rounded-[24px] flex items-center justify-center transition-all shadow-xl shadow-primary/20 ml-4 group animate-pulse",
                     operationalStatus.state === 'Work' ? "bg-emerald-500 text-white" : 
                     operationalStatus.state !== 'Off-Shift' ? "bg-amber-500 text-white" : "bg-foreground text-background"
                   )}>
                      <Zap className="h-8 w-8 fill-current group-hover:scale-110 transition-transform" />
                   </button>
                </div>

                {/* BREAK & LUNCH LIST - 2 COLUMN GRID */}
                <div className="grid grid-cols-2 gap-x-10 gap-y-5 pt-8 border-t border-border/20">
                   {profile.lunchTime && (
                     <div className="flex items-center justify-between group/lunch">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                            operationalStatus.state === 'Lunch' ? "bg-amber-500/20 border-amber-500/30 shadow-lg shadow-amber-500/10" : "bg-surface-highest border-border/50"
                          )}>
                             <Clock className={cn("h-4 w-4", operationalStatus.state === 'Lunch' ? "text-amber-500" : "text-muted-foreground")} />
                          </div>
                          <div className="leading-tight">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Meal Break</p>
                             <p className="text-sm font-bold text-foreground">Lunch</p>
                             <p className="text-[11px] text-muted-foreground font-medium">{profile.lunchTime.start} ({profile.lunchTime.durationMinutes}m)</p>
                          </div>
                       </div>
                       {operationalStatus.state === 'Lunch' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ring-4 ring-amber-500/20" />}
                     </div>
                   )}
                   {profile.customBreaks?.map((b, idx) => (
                     <div key={b.id} className="flex items-center justify-between group/break">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                            operationalStatus.timeLabel === b.id ? "bg-amber-500/20 border-amber-500/30 shadow-lg shadow-amber-500/10" : "bg-surface-highest border-border/50"
                          )}>
                             <Zap className={cn("h-4 w-4", operationalStatus.timeLabel === b.id ? "text-amber-500" : "text-muted-foreground")} />
                          </div>
                          <div className="leading-tight">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Rest Period</p>
                             <p className="text-sm font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[102px]">
                               Break {idx + 1}
                             </p>
                             <p className="text-[11px] text-muted-foreground font-medium">{b.start} ({b.durationMinutes}m)</p>
                          </div>
                       </div>
                       {operationalStatus.timeLabel === b.id && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ring-4 ring-amber-500/20" />}
                     </div>
                   ))}
                            </div>
          </div>
        </div>

          {/* WORKING FORMAT (ENERGY COMPOSITION) */}
            <div className="bg-surface-high rounded-[40px] p-8 border border-border/50 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black tracking-tight text-foreground">Focus composition</h3>
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-surface-highest/90 backdrop-blur-md border border-border/50 p-3 rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[140px] animate-in fade-in zoom-in-95">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                CLIENT: {data.name}
                              </span>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-sm font-black text-foreground">{data.value} Hours</span>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Simplified Single Ring: Company Distribution */}
                    <Pie
                      data={workCompositionData.inner}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      stroke="none"
                      animationDuration={1500}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute flex flex-col items-center justify-center text-center leading-none pointer-events-none">
                   <span className="text-3xl font-black text-foreground">{Math.round(workCompositionData.totalHours)}</span>
                   <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Total Effort<br/>(Hours)</span>
                </div>
              </div>

              {/* Dynamic Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-6 border-t border-border/30 mt-6 max-h-[100px] overflow-y-auto custom-scrollbar">
                 {workCompositionData.inner.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                       <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">{entry.name}</span>
                    </div>
                 ))}
                            </div>
            </div>
          </div>

          {/* TASKS OVERVIEW (TIMELINE) */}
          <DailyPlannerWidget />
        </div>

        {/* RIGHT COLUMN: HUB METRICS & PLATFORMS */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          
           {/* OPERATIONAL WORK CALENDAR */}
           <div className="bg-surface-high rounded-[40px] p-8 border border-border/50 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                 <div>
                   <h3 className="text-lg font-black tracking-tight text-foreground leading-none">Work Availability</h3>
                   <div className="flex items-center gap-3 mt-2">
                      <button 
                         onClick={() => setViewingMonth(subMonths(viewingMonth, 1))}
                         className="p-1 hover:bg-surface-highest rounded-lg transition-colors text-muted-foreground"
                      >
                         <ChevronLeft className="w-4 h-4" />
                      </button>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest min-w-[80px] text-center">
                         {format(viewingMonth, 'MMM yyyy')}
                      </p>
                      <button 
                         onClick={() => setViewingMonth(addMonths(viewingMonth, 1))}
                         className="p-1 hover:bg-surface-highest rounded-lg transition-colors text-muted-foreground"
                      >
                         <ChevronRight className="w-4 h-4" />
                      </button>
                   </div>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                   <span className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap">{metrics.workingDaysCount} Days Active</span>
                   
                 </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-6">
                 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                   <span key={day} className="text-[10px] font-black text-muted-foreground/20 text-center uppercase">{day[0]}</span>
                 ))}
                 {(() => {
                   const monthStart = startOfMonth(viewingMonth);
                   const monthEnd = endOfMonth(monthStart);
                   const calendarDays = eachDayOfInterval({
                     start: startOfWeek(monthStart, { weekStartsOn: 0 }),
                     end: endOfWeek(monthEnd, { weekStartsOn: 0 })
                   });

                                                           return calendarDays.map((day, i) => {
                      const isCurrentMonth = isSameMonth(day, monthStart);
                      const monthKey = format(viewingMonth, 'yyyy-MM');
                      const activeCompanies = companies.filter(c => !c.pausedMonths?.includes(monthKey));
                      
                      const isGlobalOff = profile?.vacationDays?.some(v => isSameDay(parseISO(v), day));
                      
                      const activeCompaniesOnDay = activeCompanies.filter(c => {
                        const standardWorkDays = c.workDays && c.workDays.length > 0 ? c.workDays : (profile?.workDays || [1, 2, 3, 4, 5]);
                        const isStandardDay = standardWorkDays.includes(day.getDay());
                        const isSpecificOffDay = c.offDays?.some(d => isSameDay(parseISO(d), day));
                        return isStandardDay && !isSpecificOffDay;
                      });

                      const isActuallyWorking = activeCompaniesOnDay.length > 0;
                      const isVacation = isGlobalOff;
                      const isToday = isSameDay(day, new Date());

                      return ( 
                        <div 
                          key={i} 
                          className={cn(
                            "aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-300 border relative group",
                            !isCurrentMonth ? "opacity-10 pointer-events-none" : "",
                            isActuallyWorking 
                              ? "bg-surface-highest/5 border-border/10 text-foreground shadow-sm"
                              : (isVacation 
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
                                : "bg-surface-highest/20 border-border/5 text-muted-foreground/30"),
                            isToday && "ring-2 ring-primary ring-offset-4 ring-offset-surface-high"
                          )} 
                        > 
                          <span className="text-[11px] font-black">{format(day, 'd')}</span>
                          {isCurrentMonth && activeCompaniesOnDay.length > 0 && (
                            <div className="flex gap-0.5 absolute bottom-1">
                              {activeCompaniesOnDay.slice(0, 4).map(c => (
                                <div 
                                  key={c.id} 
                                  title={c.name}
                                  className="w-1 h-1 rounded-full cursor-help hover:scale-150 transition-transform" 
                                  style={{ backgroundColor: c.color }} 
                                />
                              ))}
                              {activeCompaniesOnDay.length > 4 && <div className="w-1 h-1 rounded-full bg-slate-400" />}
                            </div>
                          )} 
                        </div> 
                      );
                    });
                  })()}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/5">
                 <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-primary" />
                     <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground/50">Working</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-rose-500/40" />
                     <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground/50">Off</span>
                   </div>
                 </div>
                 <span className="text-[9px] font-black text-muted-foreground/30 italic">Target: 22 Days/Mo</span>
              </div>
           </div>

           {/* FINANCIAL HUB */}
           <div className="bg-surface-high rounded-[40px] p-8 border border-border/50 shadow-xl space-y-10">
              <div className="grid grid-cols-2 gap-8 divide-x divide-border/5">
                 {/* LEFT: TARGET FORECAST */}
                 <div className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Target Set</h3>
                    <div className="flex items-baseline gap-2 leading-none">
                       <span className="text-3xl font-black text-foreground tracking-tighter">${metrics.month.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 text-[8px] font-bold text-muted-foreground/60">
                       <TrendingUp className="h-3 w-3 text-primary" />
                       <span>Projected Forecast</span>
                    </div>
                 </div>

                 {/* RIGHT: REALIZED INCOME */}
                 <div className="pl-8 space-y-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Realized Hub</h3>
                    <div className="flex items-baseline gap-2 leading-none">
                       <span className="text-3xl font-black text-foreground tracking-tighter">
                          ${metrics.monthRealized.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                       </span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 text-[8px] font-bold text-muted-foreground/60">
                       <DollarSign className="h-3 w-3 text-emerald-500" />
                       <span>Completed Portfolio</span>
                    </div>
                 </div>
              </div>

              {/* TARGET PROGRESS VISUAL */}
              <div className="space-y-3">
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Target Alignment</span>
                    <span className="text-xl font-black text-emerald-500 tracking-tighter">
                       {Math.min(100, Math.round(metrics.targetProgress))}%
                    </span>
                 </div>
                 <div className="h-2 w-full bg-surface-highest/20 rounded-full overflow-hidden border border-border/5">
                    <div 
                       className={`h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out`}
                       style={{ width: `${Math.min(100, metrics.targetProgress)}%` }}
                    />
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Weekly Allocation</p>
                       <h4 className="text-xl font-black text-foreground tracking-tight">${metrics.week.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary/40 border border-primary/10">
                       <Calendar className="w-5 h-5" />
                    </div>
                 </div>
              </div>
           </div>

          {/* SYNERGY ALLOCATION */}
          <div className="bg-surface-high rounded-[40px] p-8 border border-border/50 shadow-xl">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black tracking-tight text-foreground leading-none">App Synergy</h3>
                <span className="text-[10px] font-black text-muted-foreground uppercase bg-surface-highest/60 px-3 py-1.5 rounded-full">15 Nodes</span>
             </div>

             <div className="space-y-7">
                {[
                  { name: 'VS Code', hours: '42:00:07', percent: 85, icon: Laptop, color: 'text-indigo-300' },
                  { name: 'Figma', hours: '30:00:00', percent: 65, icon: Monitor, color: 'text-rose-400' },
                  { name: 'Terminal', hours: '21:36:07', percent: 45, icon: Activity, color: 'text-emerald-400' },
                  { name: 'Slack', hours: '14:24:05', percent: 30, icon: Smartphone, color: 'text-sky-300' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between group cursor-pointer">
                     <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl bg-surface-highest/50 flex items-center justify-center transition-all group-hover:bg-surface-highest", item.color)}>
                           <item.icon className="h-6 w-6" />
                        </div>
                        <div className="leading-tight">
                           <p className="text-sm font-black text-foreground leading-none mb-1 group-hover:text-primary transition-colors">{item.name}</p>
                           <p className="text-[10px] text-muted-foreground font-mono">{item.hours}</p>
                        </div>
                     </div>
                     <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
                        <svg 
                          viewBox="0 0 44 44" 
                          preserveAspectRatio="xMidYMid meet"
                          className="absolute inset-0 w-full h-full transform -rotate-90"
                        >
                           <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-surface-highest/30" />
                           <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="113" strokeDashoffset={113 - (113 * item.percent / 100)} className={cn("transition-all duration-1000", item.color)} />
                        </svg>
                        <span className="text-[8px] font-black text-foreground">{item.percent}%</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>

        </div>

      </div>

      {cropImageSrc && (
         <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl h-[400px] bg-slate-900 rounded-[32px] overflow-hidden mb-8 shadow-2xl">
               <Cropper
                  image={cropImageSrc || undefined}
                  crop={crop}
                  zoom={zoom}
                  aspect={4 / 5}
                  onCropChange={setCrop}
                  onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                  onZoomChange={setZoom}
               />
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-3xl">
               <button onClick={() => setCropImageSrc(null)} className="px-6 py-3 text-xs font-bold text-white/70 hover:text-white transition-colors uppercase tracking-widest">
                  Cancel
               </button>
               <button onClick={handleApplyCrop} disabled={isUploadingAvatar} className="flex items-center gap-2 px-8 py-3 bg-primary text-white text-xs font-bold rounded-2xl shadow-xl  active:scale-95 transition-all disabled:opacity-50">
                  {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  Apply Crop
               </button>
            </div>
         </div>
      )}

    </div>
  );
}




