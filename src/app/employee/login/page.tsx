'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EmployeeLogin() {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert ID to the internal email format used during creation
      const email = `emp${empId.trim()}@gov.eg`;
      
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) throw loginError;

      // Check if user is staff/admin
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user?.id).single();
      
      if (profile?.role === 'citizen') {
        await supabase.auth.signOut();
        throw new Error('Access denied: Citizen accounts cannot access Gov Portal.');
      }

      router.replace('/employee');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c1a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10 animate-fade-in">
          <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10">
            <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2 uppercase italic">Gov Portal</h1>
          <p className="text-white/30 text-sm font-bold tracking-widest">NATIONAL CRISIS MANAGEMENT</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] dot-grid" />
          
          <div className="relative z-10">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-[11px] font-black text-amber-200/70 uppercase leading-tight tracking-wider">Restricted Access — Authorized Personnel Only</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 ml-1">Government ID</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <input
                    type="text"
                    required
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="e.g. 1001"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-4 focus:border-emerald-500 outline-none transition-all placeholder:text-white/10 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-4 focus:border-emerald-500 outline-none transition-all placeholder:text-white/10 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 mt-4 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
                    Access Dashboard
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <button onClick={() => router.push('/')} className="w-full text-center text-white/20 text-xs font-bold mt-10 hover:text-white/40 transition">
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
