'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from './AuthGuard';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isPublic = ['/login', '/register'].includes(pathname);

  if (isPublic) {
    return (
      <AuthGuard>
        {children}
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-card border-r border-border shadow-2xl transition-transform">
            <div className="flex items-center justify-between px-4 h-20 border-b border-border/50">
              <span className="text-xl font-bold text-primary">TimeSync</span>
              <button 
                className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" 
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
               <Sidebar />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      <div className="w-full flex flex-col lg:pl-64 min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
