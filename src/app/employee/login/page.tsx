'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EmployeeLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. تسجيل الدخول
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw new Error('Login Error: ' + signInError.message);
      if (!data?.user) throw new Error('Login failed: No user returned');

      // 2. التحقق من البروفايل
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile) {
        // محاولة الإنشاء
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id: data.user.id,
          role: 'employee',
          full_name: data.user.email?.split('@')[0] || 'Employee',
        }, { onConflict: 'id' });
        
        if (upsertErr) throw new Error('Profile Creation Error: ' + upsertErr.message);
      } else if (profile.role !== 'employee' && profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Access Denied: هذا الحساب ليس مسجلاً كموظف أو مسؤول.');
      }

      // 3. توجيه
      window.location.replace('/employee');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🛡️</div>
          <h2 className="text-3xl font-bold text-white">Gov Portal</h2>
          <p className="text-slate-400">Employee / Admin Login</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-6 border border-red-500/20 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 transition font-bold text-lg shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Enter Dashboard'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <p className="text-slate-400 text-xs text-center leading-relaxed">
            🔐 أضف الموظفين من لوحة تحكم Supabase<br/>
            <span className="text-slate-500">Authentication → Users → Add User</span>
          </p>
        </div>
      </div>
    </div>
  );
}
