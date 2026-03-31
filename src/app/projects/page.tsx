'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/companies');
  }, [router]);

  return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Redirecting to Client Portfolio...</div>;
}
