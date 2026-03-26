import { useState, useEffect } from 'react';
import { Menu, Bell, Moon, Sun, LogOut, User as UserIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const profile = useStore(state => state.profile);
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);

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

          <button type="button" className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground transition-colors relative">
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute top-2 right-2.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
          </button>
          
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
