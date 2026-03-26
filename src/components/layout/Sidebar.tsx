import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarDays, Building2, FolderKanban, ListTodo, Settings } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Weekly Planner', href: '/planner', icon: CalendarDays },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'Profile', href: '/profile', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-muted/20">
      <div className="flex h-20 shrink-0 items-center px-6">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mr-3 shadow-lg shadow-primary/30">
          <CalendarDays className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent tracking-tight">TimeSync</h1>
      </div>
      <nav className="flex flex-1 flex-col px-4 py-6 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 mt-auto">
        <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-transparent p-4">
          <p className="text-sm font-medium text-foreground mb-1">Freelance Pro</p>
          <p className="text-xs text-muted-foreground mb-3">You are managing 3 companies right now.</p>
          <div className="w-full bg-background/50 rounded-full h-1.5 mb-1 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: '65%' }}></div>
          </div>
          <p className="text-[10px] text-muted-foreground text-right">38/60 hrs booked</p>
        </div>
      </div>
    </div>
  );
}
