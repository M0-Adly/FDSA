'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EmployeeLogin() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // يقبل رقم الموظف (مثلاً 1001) أو الإيميل الكامل
    const email = employeeId.includes('@')
      ? employeeId
      : `emp${employeeId}@gov.eg`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/employee');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🛡️</div>
          <h2 className="text-3xl font-bold text-white">Gov Portal</h2>
          <p className="text-slate-400">Employee Login</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-6 border border-red-500/20 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Employee ID</label>
            <input
              type="text"
              required
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. 1001"
            />
            <p className="text-slate-500 text-xs mt-1">
              ادخل رقم الموظف فقط (مثال: 1001) يتم إنشاؤه عبر Admin Panel
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
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
          <p className="text-slate-400 text-xs text-center">
            🔐 لإنشاء حساب موظف، يجب على المدير استخدام{' '}
            <span className="text-emerald-400 font-mono">/employee/admin</span>
          </p>
        </div>
      </div>
    </div>
  );
}
