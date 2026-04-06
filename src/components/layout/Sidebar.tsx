import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarDays, Building2, FolderKanban, ListTodo, Settings, Box } from 'lucide-react';


const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Weekly Planner', href: '/planner', icon: CalendarDays },
  { name: 'Companies', href: '/companies', icon: Building2 },

  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-20 flex-col bg-white/70 backdrop-blur-xl border-r border-slate-200 items-center py-6 group/sidebar">
      <div className="mb-10 px-4">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Box className="h-6 w-6 text-white" />
        </div>
      </div>
      
      <nav className="flex flex-1 flex-col items-center space-y-4 w-full">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={cn(
                'group flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 relative',
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-transform duration-300 group-hover:scale-110',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'
                )}
                aria-hidden="true"
              />
              {isActive && (
                <div className="absolute -left-0 w-1 h-6 bg-primary rounded-r-full shadow-[2px_0_10px_rgba(129,140,248,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto px-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center group cursor-pointer hover:border-primary/50 transition-colors">
           <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">JD</div>
        </div>
      </div>
    </div>
  );
}
