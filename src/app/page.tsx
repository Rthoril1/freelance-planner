'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
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
  Image as ImageIcon
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
  differenceInSeconds
} from 'date-fns';
import { cn, generateId } from '@/lib/utils';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';
import { uploadToStorage, supabase } from '@/lib/supabase';
import { useRef } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const { profile, updateProfile, tasks, companies, projects, updateTask } = useStore();
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

  // Financial Orchestration Calculations
  const metrics = useMemo(() => {
    const now = new Date();
    const weekRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };

    const calculateEarnings = (taskList: typeof tasks) => {
      return taskList.reduce((acc, task) => {
        const project = projects.find(p => p.id === task.projectId);
        const company = companies.find(c => c.id === project?.companyId);
        if (!company || !company.hourlyRate) return acc;
        
        const duration = task.estimatedDuration || 1;
        return acc + (duration * company.hourlyRate);
      }, 0);
    };

    const weekTasks = tasks.filter(t => t.scheduledStart && isWithinInterval(parseISO(t.scheduledStart), weekRange));
    const monthTasks = tasks.filter(t => t.scheduledStart && isWithinInterval(parseISO(t.scheduledStart), monthRange));
    
    // Yearly is projected based on weekly average or just a flat sum of current tasks
    const yearlyProjected = calculateEarnings(tasks) * (52 / Math.max(1, tasks.length / 10 || 1));

    return {
      week: calculateEarnings(weekTasks),
      month: calculateEarnings(monthTasks),
      year: yearlyProjected
    };
  }, [tasks, companies, projects]);

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

  const today = new Date();

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-1000 pb-20">
      
      {/* GLOBAL SEARCH & TOP BAR */}
      <div className="flex items-center justify-between gap-8 mb-4">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            {format(today, 'EEEE, dd MMM')}
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Digital Atelier</h1>
            <span className="text-muted-foreground/30 font-light">Ã¢â‚¬Â¢</span>
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

        <div className="flex items-center gap-4">
          <button className="w-12 h-12 rounded-full bg-surface-low border border-border/50 flex items-center justify-center relative hover:bg-surface-high transition-colors">
            <Bell className="h-5 w-5 text-foreground" />
            <div className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-background" />
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-border/30">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-foreground leading-none">{profile.name}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{profile.type}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
               {profile.avatarUrl ? (
                 <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <Zap className="h-6 w-6 text-primary" />
               )}
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD GRID */}
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

                {/* BREAK & LUNCH LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-border/10">
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
                             <p className="text-sm font-bold text-foreground">Lunch Break</p>
                             <p className="text-[10px] text-muted-foreground font-medium">{profile.lunchTime.start} ({profile.lunchTime.durationMinutes} min)</p>
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
                             <p className="text-sm font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[80px] lg:max-w-[100px]">
                               Break {idx + 1}
                             </p>
                             <p className="text-[10px] text-muted-foreground font-medium">{b.start} ({b.durationMinutes} min)</p>
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
          <div className="bg-surface-high rounded-[40px] p-8 border border-border/50 shadow-2xl">
             <div className="flex items-center justify-between mb-10">
                <h2 className="text-xl font-black tracking-tight text-foreground">Operational Timeline</h2>
                <div className="flex items-center gap-2">
                   <Search className="h-4 w-4 text-muted-foreground mr-4" />
                   <div className="bg-surface-low p-1.5 rounded-2xl flex border border-border/30">
                       {(() => {
                         const _tabWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
                         const _dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                         const todayAbbr = _dayNames[new Date().getDay()];
                         return _dayNames.map((day, idx) => {
                           const _dayDate = addDays(_tabWeekStart, idx);
                           const _hasTasks = tasks.some(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), _dayDate));
                           return (
                             <button
                               key={day}
                               onClick={() => setActiveTab(day)}
                               className={cn(
                                 'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                 activeTab === day ? 'bg-primary text-background shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'
                               )}
                             >
                               {day}
                               <span className={cn('text-[8px] font-bold opacity-60', activeTab === day ? 'text-background' : '')}>{format(_dayDate, 'dd')}</span>
                               {_hasTasks && <span className={cn('absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full', activeTab === day ? 'bg-background/60' : 'bg-primary')} />}
                             </button>
                           );
                         });
                       })()}
                   </div>
                </div>
             </div>

             <div className="relative max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                 {(() => {
                   const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
                   const targetDayNum = DAY_MAP[activeTab];
                   const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
                   const targetDate = addDays(weekStart, targetDayNum);
                   const dayTasks = tasks
                     .filter(t => t.scheduledStart && isSameDay(parseISO(t.scheduledStart), targetDate))
                     .sort((a, b) => (a.scheduledStart ?? '').localeCompare(b.scheduledStart ?? ''));
                    const priorityWidth: Record<string, string> = { 'Low': '25%', 'Medium': '50%', 'High': '75%' };

                   const TIMELINE_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
                    const ROW_H = 60;
                   return (
                     <div className="relative" style={{ height: `${TIMELINE_HOURS.length * ROW_H}px` }}>
                       <div className="absolute left-[3.5rem] top-0 bottom-0 w-px bg-border/20" />
                       {TIMELINE_HOURS.map(hour => (
                         <div key={hour} className="absolute w-full flex items-start" style={{ top: `${(hour - TIMELINE_HOURS[0]) * ROW_H}px`, height: `${ROW_H}px` }}>
                           <span className="w-14 text-[10px] font-black text-muted-foreground/30 pr-4 pt-1 shrink-0">{hour}:00</span>
                           <div className="flex-1 border-t border-border/5 h-full" />
                         </div>
                       ))}
                       {dayTasks.length === 0 && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                           <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
                           <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No tasks scheduled</p>
                         </div>
                       )}
                       {dayTasks.map(task => {
                         const startDate = parseISO(task.scheduledStart!);
                         const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                         const topPx = (startHour - TIMELINE_HOURS[0]) * ROW_H;
                          const heightPx = Math.max(30, task.estimatedDuration * ROW_H);
                         const project = projects.find(p => p.id === task.projectId);
                         const company = companies.find(c => c.id === project?.companyId);
                          const leftOff = '3.5rem';
                          const width   = priorityWidth[task.priority] ?? '50%';
                         const projectColor = project?.color || company?.color || "#6366f1";
                         const accentColor = projectColor;
                         const isDone = task.status === 'Completed';
                         return (
                           <div
                             key={task.id}
                             className={cn(
                               "absolute group transition-all duration-300 rounded-2xl border shadow-sm overflow-hidden",
                               isDone 
                                 ? "bg-surface-highest/20 border-border/10 opacity-40 grayscale-[0.5]" 
                                 : "bg-white border-border/50 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5"
                             )}
                             style={{ top: `${topPx}px`, height: `${heightPx}px`, left: leftOff, width, backgroundColor: isDone ? undefined : projectColor + "0D" }}
                           >
                             <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: accentColor }} />
                             <div className="flex items-center h-full pl-4 pr-3 gap-3">
                               <button
                                 onClick={() => updateTask(task.id, { status: isDone ? 'Scheduled' : 'Completed' })}
                                 className={cn(
                                   "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110",
                                   isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-border/50 hover:border-emerald-400"
                                 )}
                               >
                                 {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                               </button>
                               <div className="flex-1 min-w-0">
                                 <p className={cn(
                                   "text-xs font-black tracking-tight leading-tight truncate transition-all duration-300", 
                                   isDone ? "text-emerald-500/70 line-through decoration-emerald-500/30" : "text-foreground"
                                 )}>
                                   {task.name}
                                 </p>
                                 {heightPx > 54 && (
                                   <p className="text-[9px] text-muted-foreground font-medium mt-0.5 truncate">
                                     {company?.name ?? 'Unknown'}{project ? ` Â· ${project.name}` : ''}
                                   </p>
                                 )}
                               </div>
                               <div className="shrink-0 flex flex-col items-end gap-1">
                                 <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", task.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : task.priority === 'Medium' ? 'bg-primary/10 text-primary' : 'bg-surface-highest text-muted-foreground')}>{task.priority}</span>
                                 <span className="text-[9px] font-black text-muted-foreground/50">{task.estimatedDuration}h</span>
                               </div>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   );
                 })()}
              </div>
           </div>

        </div>

        {/* RIGHT COLUMN: HUB METRICS & PLATFORMS */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          
          {/* LOAD ACTIVITY HEATMAP */}
          <div className="bg-surface-high rounded-[40px] p-8 border border-border/50 shadow-xl">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black tracking-tight text-foreground leading-none">Operational Load</h3>
                <span className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap">79% Avg</span>
             </div>

             <div className="grid grid-cols-7 gap-3 mb-8">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                   <div key={i} className="flex flex-col items-center gap-4">
                      <span className="text-[10px] font-black text-muted-foreground/30 uppercase">{day}</span>
                      <div className="grid grid-rows-12 gap-2">
                         {Array.from({length: 12}).map((_, j) => {
                            const active = Math.random() > 0.65;
                            const level = Math.random();
                            return (
                              <div key={j} className={cn(
                                "w-6 h-6 rounded-lg transition-all duration-300",
                                active ? (level > 0.6 ? "bg-primary shadow-[0_0_15px_rgba(155,164,249,0.3)]" : "bg-primary/40") : "bg-surface-highest/30"
                              )} />
                            );
                         })}
                      </div>
                   </div>
                ))}
             </div>

             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 italic">
                <span>08:00</span>
                <span>Structural Threshold</span>
                <span>18:00</span>
             </div>
          </div>

          {/* FINANCIAL HUB */}
          <div className="bg-surface-high rounded-[40px] p-8 border border-border/50 shadow-xl space-y-10">
             <div className="space-y-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Earnings Hub</h3>
                <div className="flex items-baseline gap-2 leading-none">
                   <span className="text-4xl font-black text-foreground tracking-tighter">${metrics.month.toLocaleString()}</span>
                   <span className="text-muted-foreground text-sm font-bold">/ Mo</span>
                </div>
                <div className="flex items-center gap-2 pt-2 text-[10px] font-bold text-emerald-400">
                   <TrendingUp className="h-3 w-3" />
                   <span>Projected Forecast</span>
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Weekly Allocation</p>
                      <p className="text-xl font-black text-foreground">${metrics.week.toLocaleString()}</p>
                   </div>
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Calendar className="h-5 w-5 text-primary" />
                   </div>
                </div>
                <div className="flex items-center justify-between">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Monthly Realized</p>
                      <p className="text-xl font-black text-foreground">${(metrics.month * 0.45).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                   </div>
                   <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <DollarSign className="h-5 w-5 text-emerald-400" />
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
               <button onClick={handleApplyCrop} disabled={isUploadingAvatar} className="flex items-center gap-2 px-8 py-3 bg-primary text-white text-xs font-bold rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                  {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  Apply Crop
               </button>
            </div>
         </div>
      )}

    </div>
  );
}



