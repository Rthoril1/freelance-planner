import { useState, useEffect } from 'react';
import { Menu, Moon, Sun, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
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
          {/* Main workspace header layout */}
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

          <div className="flex items-center gap-x-3">
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
    </header>
  );
}
