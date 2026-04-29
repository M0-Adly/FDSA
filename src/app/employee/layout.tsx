'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/components/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isAuth = pathname === '/employee/login';
  const isAdmin = pathname === '/employee/admin';
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  if (isAuth) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen bg-[#080c1a] text-white flex flex-col relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0 dot-grid" />

      {/* Top Header */}
      <header className="h-16 border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-xl">🛡️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-white">{t('portal_name')}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">v2.0</span>
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{t('secure_portal')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <LanguageSwitcher />
          <div className="w-px h-5 bg-white/10" />
          <Link href="/employee" className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${!isAdmin ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
            {t('command_center')}
          </Link>
          <Link href="/employee/admin" className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isAdmin ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
            {t('admin_panel')}
          </Link>
          
          <div className="w-px h-5 bg-white/10" />

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 shadow-inner">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">{t('system_live')}</span>
          </div>

          <div className="w-px h-5 bg-white/10" />

          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="font-bold">{t('logout')}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative z-10">
        {children}
      </main>
    </div>
  );
}
