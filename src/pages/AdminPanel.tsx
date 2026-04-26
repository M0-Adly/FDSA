import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { adminCreateEmployee, signOut } from '../lib/auth';
import { useAuth } from '../lib/useAuth';
import { useNavigate } from 'react-router-dom';
import type { DbProfile } from '../lib/supabase';
import {
  UserPlus, Users, Shield, RefreshCw, CheckCircle2, AlertCircle,
  LogOut, Trash2, Eye, EyeOff,
} from 'lucide-react';

export function AdminPanel() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [tab, setTab]             = useState<'list' | 'create'>('list');
  const [fetching, setFetching]   = useState(false);

  // Create form
  const [empId,    setEmpId]    = useState('');
  const [name,     setName]     = useState('');
  const [pass,     setPass]     = useState('');
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [success,  setSuccess]  = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) navigate('/');
  }, [user, profile, loading, navigate]);

  const fetchEmployees = async () => {
    setFetching(true);
    const { data } = await supabase.from('profiles')
      .select('*')
      .in('role', ['employee', 'admin'])
      .order('created_at', { ascending: false });
    setEmployees((data ?? []) as DbProfile[]);
    setFetching(false);
  };

  useEffect(() => { if (user) fetchEmployees(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setError(null); setSuccess(null);
    const { error: err } = await adminCreateEmployee({ empId, fullName: name, password: pass, isAdmin });
    if (err) { setError(err); }
    else { setSuccess(`Employee emp${empId} created successfully`); setEmpId(''); setName(''); setPass(''); fetchEmployees(); }
    setCreating(false);
  };

  const handleDelete = async (empUserId: string) => {
    if (!confirm('Delete this employee account?')) return;
    await supabase.from('profiles').delete().eq('id', empUserId);
    setEmployees(prev => prev.filter(e => e.id !== empUserId));
  };

  const inputCls  = 'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-amber-400 transition text-sm';
  const labelCls  = 'text-xs font-bold uppercase tracking-widest text-white/60 mb-1.5 block';

  if (loading) return <div className="min-h-screen bg-[#080c1a] flex items-center justify-center"><RefreshCw className="w-6 h-6 text-amber-400 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#080c1a] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[50%] h-[50%] rounded-full bg-amber-600/8 blur-[150px]" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-black text-sm">Admin Panel</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/')} className="text-xs text-white/40 hover:text-white/70 px-3 py-1.5 rounded-lg hover:bg-white/5 transition">
              ← Employee Dashboard
            </button>
            <button onClick={async () => { await signOut(); navigate('/login'); }}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 px-3 py-1.5 rounded-lg hover:bg-white/5 transition">
              <LogOut className="w-3.5 h-3.5" />Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-amber-400" />Employee Management</h1>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
          {([['list','Employee List'],['create','Add Employee']] as [typeof tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === k ? 'bg-amber-600 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}>
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Employee List */}
          {tab === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-amber-400" />All Staff ({employees.length})</h2>
                <button onClick={fetchEmployees} className="text-white/30 hover:text-white/60 transition">
                  <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {employees.length === 0 ? (
                <div className="text-center py-12 text-white/20">
                  <Users className="w-10 h-10 mx-auto mb-3" />
                  <p>No employees yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{emp.full_name ?? '—'}</p>
                          <p className="text-xs text-white/40">ID: {emp.employee_id ?? '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          emp.role === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>{emp.role.toUpperCase()}</span>
                        {emp.id !== user?.id && (
                          <button onClick={() => handleDelete(emp.id)} className="text-white/20 hover:text-red-400 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Create Employee */}
          {tab === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h2 className="font-black text-lg mb-5 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-400" />Create Employee Account
                </h2>

                {error   && <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
                {success && <div className="mb-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm"><CheckCircle2 className="w-4 h-4" />{success}</div>}

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className={labelCls}>Employee ID</label>
                    <input required value={empId} onChange={e => setEmpId(e.target.value)}
                      placeholder="e.g. 1001" className={inputCls} />
                    <p className="text-[10px] text-white/30 mt-1">Login email: emp{empId || 'ID'}@gov.eg</p>
                  </div>
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input required value={name} onChange={e => setName(e.target.value)}
                      placeholder="Mohamed Ahmed" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} required value={pass}
                        onChange={e => setPass(e.target.value)} placeholder="min 8 characters"
                        minLength={8} className={inputCls + ' pr-10'} />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded" />
                    <span className="text-sm text-white/60">Grant Admin privileges</span>
                  </label>
                  <button type="submit" disabled={creating}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
                    {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {creating ? 'Creating…' : 'Create Employee'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
