'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/Toasts';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from './AuthGuard';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isPublic = ['/login', '/register'].includes(pathname);
  const fetchData = useStore(state => state.fetchData);
  const isLoadingData = useStore(state => state.loading);

  useEffect(() => {
    if (!isPublic) {
      fetchData();
    }
  }, [isPublic, fetchData]);

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
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-20 lg:flex-col">
        <Sidebar />
      </div>

      <div className="w-full flex flex-col lg:pl-20 min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-6 w-full relative min-h-[50vh]">
          {isLoadingData ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Sincronizando con Supabase...</p>
              </div>
            </div>
          ) : children}
        </main>
        <ToastContainer />
      </div>
    </div>
    </AuthGuard>
  );
}
