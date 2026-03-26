import { useState, useEffect } from 'react';
import { Menu, Bell, Moon, Sun } from 'lucide-react';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
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
          
          <div className="flex items-center gap-x-3 cursor-pointer p-1.5 rounded-full hover:bg-muted transition-colors">
            <img
              className="h-9 w-9 xl:h-10 xl:w-10 rounded-full bg-muted object-cover border border-border"
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="User"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
