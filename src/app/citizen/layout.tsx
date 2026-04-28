'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuth = pathname === '/citizen/login' || pathname === '/citizen/signup';
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  // For login/signup pages, render without nav wrapper
  if (isAuth) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen bg-[#080c1a] text-white">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[50%] rounded-full bg-blue-600/8 blur-[120px]" />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0 dot-grid" />

      {/* Top Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <Link href="/citizen" className="font-black text-sm hover:text-indigo-400 transition-colors">
                Crisis Portal
              </Link>
              <p className="text-[10px] text-white/40">Citizen Access</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/citizen" className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              pathname === '/citizen' ? 'bg-indigo-600/20 text-indigo-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}>
              Dashboard
            </Link>
            <Link href="/citizen/profile" className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              pathname === '/citizen/profile' ? 'bg-indigo-600/20 text-indigo-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}>
              Profile
            </Link>
            <div className="w-px h-4 bg-white/10" />
            <span className="text-xs text-white/30 hidden sm:block">{user?.email?.replace('@citizen.eg', '')}</span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 transition px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
