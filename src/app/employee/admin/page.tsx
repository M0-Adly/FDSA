'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminPanel() {
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('account_status', 'pending');
    if (data) setPendingUsers(data);
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
    await supabase.from('profiles').update({ account_status: status }).eq('id', id);
    fetchPendingUsers();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    const res = await fetch('/api/admin/create-employee', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: empId,
        fullName: name,
        password: password
      })
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      setMsg({ type: 'success', text: `Employee ${empId} credentials deployed successfully!` });
      setEmpId('');
      setName('');
      setPassword('');
    } else {
      setMsg({ type: 'error', text: data.error });
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent)]">
      <div className="w-full max-w-xl animate-fade-in">
        
        <div className="mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Admin Console</h1>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-1">Staff Provisioning System</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle grid pattern inside card */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] dot-grid" />
          
          <div className="relative z-10">
            <h2 className="text-lg font-black text-white/90 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Deploy New Government Account
            </h2>
            
            {msg.text && (
              <div className={`p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-3 border ${
                msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {msg.type === 'success' ? (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                )}
                {msg.text}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Government ID</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <input 
                    type="text" required value={empId} onChange={e => setEmpId(e.target.value)}
                    className="input-premium pl-12 bg-black/20"
                    placeholder="e.g. 1024"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Officer Full Name</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input 
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="input-premium pl-12 bg-black/20"
                    placeholder="e.g. Inspector Ahmed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Security Clearance (Password)</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input 
                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="input-premium pl-12 bg-black/20"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                </div>
              </div>
              
              <button 
                disabled={loading}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white p-4 rounded-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Authorize Account
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Pending Citizens Section */}
        <div className="mt-8 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-lg font-black text-white/90 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Pending Citizen Approvals ({pendingUsers.length})
            </h2>

            {pendingUsers.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">No pending accounts to approve.</p>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map(user => (
                  <div key={user.id} className="p-4 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">{user.full_name || 'Citizen'}</h3>
                      <p className="text-xs text-white/40">{user.phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproval(user.id, 'approved')} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30">Approve</button>
                      <button onClick={() => handleApproval(user.id, 'rejected')} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
