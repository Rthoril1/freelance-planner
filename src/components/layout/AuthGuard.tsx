'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/login', '/register'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session && !PUBLIC_ROUTES.includes(pathname)) {
        router.push('/login');
      } else if (session && PUBLIC_ROUTES.includes(pathname)) {
        router.push('/tasks');
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !PUBLIC_ROUTES.includes(pathname)) {
        router.push('/login');
      } else if (session && PUBLIC_ROUTES.includes(pathname)) {
        router.push('/tasks');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    }
  }, [pathname, router]);

  // Prevent flashing protected content before redirect
  if (loading && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-sm">Authenticating Session...</p>
      </div>
    );
  }

  return <>{children}</>;
}
