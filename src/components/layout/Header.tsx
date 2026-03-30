import { useState, useEffect } from 'react';
import { Menu, Bell, Moon, Sun, LogOut, User as UserIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '@/store/useNotificationStore';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const profile = useStore(state => state.profile);
  const { notifications, markAllAsRead, clearAll, removeNotification } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  return (
    <header className="sticky top-0 z-10 flex h-20 flex-shrink-0 items-center gap-x-4 bg-background/80 backdrop-blur-xl px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button 
            type="button" 
            onClick={toggleTheme}
            className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="sr-only">Toggle theme</span>
            {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>

          <div className="relative">
            <button 
              type="button" 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`-m-2.5 p-2.5 transition-all relative rounded-full ${showNotifications ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive border-2 border-background"></span>
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-3 w-80 z-20 origin-top-right rounded-3xl bg-card border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
                    <h3 className="font-black text-sm uppercase tracking-widest">Notifications</h3>
                    <div className="flex gap-2">
                       <button onClick={markAllAsRead} className="text-[10px] font-bold text-primary hover:underline">Mark read</button>
                       <span className="text-muted-foreground/30">•</span>
                       <button onClick={clearAll} className="text-[10px] font-bold text-muted-foreground hover:text-destructive">Clear</button>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-border/30">
                        {notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-4 hover:bg-muted/30 transition-colors relative group ${!n.read ? 'bg-primary/5' : ''}`}
                            onClick={() => useNotificationStore.getState().markAsRead(n.id)}
                          >
                            <div className="flex gap-3">
                              <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent border border-muted-foreground/30'}`} />
                              <div className="flex-1 space-y-1">
                                <p className={`text-xs leading-relaxed ${!n.read ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{n.message}</p>
                                <p className="text-[10px] text-muted-foreground opacity-50">
                                  {formatDistanceToNow(parseISO(n.timestamp), { addSuffix: true })}
                                </p>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                              >
                                <LogOut className="w-3 h-3 rotate-180" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center space-y-3">
                         <div className="w-12 h-12 bg-muted rounded-full mx-auto flex items-center justify-center opacity-20">
                           <Bell className="w-6 h-6" />
                         </div>
                         <p className="text-xs font-bold text-muted-foreground">All caught up!</p>
                      </div>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="p-3 bg-muted/10 border-t border-border/30 text-center">
                       <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">View All Activity</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />
          
          <div className="flex items-center gap-x-4">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-semibold text-foreground">{profile?.name || 'Loading...'}</p>
              <p className="text-[11px] text-muted-foreground">{profile?.type || 'Freelancer'}</p>
            </div>
            <div className="flex items-center gap-x-3">
              {profile?.avatarUrl ? (
                <img
                  className="h-10 w-10 rounded-full bg-muted object-cover border-2 border-primary/20"
                  src={profile.avatarUrl}
                  alt={profile.name}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <UserIcon className="w-5 h-5 text-primary" />
                </div>
              )}
              
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
