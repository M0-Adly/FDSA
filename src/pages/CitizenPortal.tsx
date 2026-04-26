import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { updateProfile, signOut } from '../lib/auth';
import { useAuth } from '../lib/useAuth';
import type { DbReport, DbDepartment } from '../lib/supabase';
import {
  FileText, AlertCircle, CheckCircle2, Clock, User, LogOut,
  Send, ChevronDown, Star, Phone, Camera, RefreshCw, Filter,
} from 'lucide-react';

// ── Priority Badge ─────────────────────────────────────────────────────────────
function PriorityBadge({ p }: { p: number }) {
  const cls = p >= 4 ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : p === 3 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cls} flex items-center gap-1`}>
      {Array.from({ length: p }).map((_, i) => <Star key={i} className="w-2 h-2 fill-current" />)}
    </span>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ s }: { s: string }) {
  const map = {
    Pending:  'bg-amber-500/20 text-amber-400',
    Ongoing:  'bg-blue-500/20 text-blue-400',
    Resolved: 'bg-emerald-500/20 text-emerald-400',
  } as Record<string, string>;
  const icon = s === 'Pending' ? <Clock className="w-3 h-3" /> :
               s === 'Ongoing' ? <AlertCircle className="w-3 h-3" /> :
               <CheckCircle2 className="w-3 h-3" />;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${map[s] ?? ''}`}>
      {icon}{s}
    </span>
  );
}

// ── Report Card ────────────────────────────────────────────────────────────────
function ReportCard({ r, depts }: { r: DbReport; depts: DbDepartment[] }) {
  const dept = depts.find(d => d.id === r.department_id);
  const date = new Date(r.created_at).toLocaleDateString('en-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-[10px] text-white/30 font-mono">#{r.id.slice(0,8)}</span>
          <h3 className="font-bold text-white text-sm mt-0.5">{r.description}</h3>
        </div>
        <StatusBadge s={r.status} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
        <span className="font-medium text-white/60">{r.type}</span>
        {dept && <span>📍 {dept.name_en}</span>}
        <PriorityBadge p={r.priority} />
        <span>{date}</span>
        {r.escalated && <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-bold">Escalated</span>}
      </div>
    </motion.div>
  );
}

// ── Submit Report Form ─────────────────────────────────────────────────────────
function SubmitReportForm({
  userId, depts, onSubmit,
}: { userId: string; depts: DbDepartment[]; onSubmit: () => void }) {
  const [districtId,   setDistrictId]   = useState<number | ''>('');
  const [deptId,       setDeptId]       = useState<number | ''>('');
  const [description,  setDescription]  = useState('');
  const [priority,     setPriority]     = useState(3);
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const filteredDepts = districtId ? depts.filter(d => d.district_id === districtId) : [];

  // Auto-detect type from department name
  const getType = (deptId: number): string => {
    const d = depts.find(d => d.id === deptId);
    if (!d) return 'General';
    const n = d.name_en;
    if (n.includes('Fire'))        return 'Fire';
    if (n.includes('Police'))      return 'Theft';
    if (n.includes('Ambulance'))   return 'Accident';
    if (n.includes('Water'))       return 'Water Leak';
    if (n.includes('Electricity')) return 'Power Outage';
    if (n.includes('Gas'))         return 'Gas Leak';
    return 'General';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) { setError('Please select a department'); return; }
    setLoading(true); setError(null);

    const type = getType(deptId as number);
    const { error: err } = await supabase.from('reports').insert({
      created_by:    userId,
      department_id: deptId as number,
      type,
      description,
      priority,
      status: 'Pending',
    });

    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess(true);
    setDescription(''); setDistrictId(''); setDeptId(''); setPriority(3);
    setTimeout(() => { setSuccess(false); onSubmit(); }, 2000);
    setLoading(false);
  };

  const selectCls = 'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:border-indigo-400 transition text-sm appearance-none';
  const inputCls  = 'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-indigo-400 transition text-sm';
  const labelCls  = 'text-xs font-bold uppercase tracking-widest text-white/60 mb-1.5 block';

  if (success) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <p className="text-white font-bold">Report submitted successfully!</p>
        <p className="text-white/40 text-sm">Authorities have been notified</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* District */}
      <div>
        <label className={labelCls}>District</label>
        <div className="relative">
          <select value={districtId} onChange={e => { setDistrictId(Number(e.target.value)); setDeptId(''); }}
            className={selectCls} required>
            <option value="">Select district…</option>
            <option value={1}>First District - المنطقة الأولى</option>
            <option value={2}>Second District - المنطقة الثانية</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        </div>
      </div>

      {/* Department */}
      <div>
        <label className={labelCls}>Department</label>
        <div className="relative">
          <select value={deptId} onChange={e => setDeptId(Number(e.target.value))}
            className={selectCls} required disabled={!districtId}>
            <option value="">Select department…</option>
            {filteredDepts.map(d => (
              <option key={d.id} value={d.id}>{d.name_en}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        </div>
        {deptId && <p className="text-xs text-indigo-400 mt-1 font-medium">Type: {getType(deptId as number)}</p>}
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Incident Description</label>
        <textarea required value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe the emergency in detail…"
          className={inputCls + ' h-28 resize-none'} />
      </div>

      {/* Priority Slider */}
      <div>
        <label className={labelCls}>
          Priority
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
            priority >= 4 ? 'bg-red-500/30 text-red-400' :
            priority === 3 ? 'bg-amber-500/30 text-amber-400' :
            'bg-slate-500/30 text-slate-400'
          }`}>
            {priority === 5 ? 'Critical' : priority === 4 ? 'High' : priority === 3 ? 'Medium' : priority === 2 ? 'Low' : 'Minimal'}
          </span>
        </label>
        <input type="range" min={1} max={5} value={priority} onChange={e => setPriority(Number(e.target.value))}
          className="w-full accent-indigo-500" />
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>1 - Minimal</span><span>3 - Medium</span><span>5 - Critical</span>
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50">
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {loading ? 'Submitting…' : 'Submit Emergency Report'}
      </button>
    </form>
  );
}

// ── Profile Editor ─────────────────────────────────────────────────────────────
function ProfileEditor({ userId, profile }: { userId: string; profile: { full_name: string | null; phone: string | null; national_id_image_url: string | null } }) {
  const [name,    setName]    = useState(profile.full_name ?? '');
  const [phone,   setPhone]   = useState(profile.phone ?? '');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(profile.national_id_image_url);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setImgFile(f);
    if (f) setImgPreview(URL.createObjectURL(f));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);

    let nationalIdUrl: string | undefined = undefined;
    if (imgFile) {
      const ext      = imgFile.name.split('.').pop();
      const filePath = `${userId}/national-id.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('national-ids').upload(filePath, imgFile, { upsert: true });
      if (!uploadErr) {
        nationalIdUrl = supabase.storage.from('national-ids').getPublicUrl(filePath).data.publicUrl;
      }
    }

    const updates: Partial<DbProfile> = { full_name: name, phone };
    if (nationalIdUrl) updates.national_id_image_url = nationalIdUrl;
    const { error: err } = await updateProfile(userId, updates);
    if (err) { setError(err); } else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-2">{error}</div>}
      {saved && <div className="text-emerald-400 text-sm bg-emerald-500/10 rounded-xl px-4 py-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Profile updated!</div>}

      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1.5 block">Full Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:border-indigo-400 transition text-sm" />
      </div>
      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1.5 block">
          <Phone className="w-3 h-3 inline mr-1" />Phone Number
        </label>
        <input value={phone} onChange={e => setPhone(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:border-indigo-400 transition text-sm" />
      </div>
      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1.5 block">
          <Camera className="w-3 h-3 inline mr-1" />National ID Image
        </label>
        {imgPreview && (
          <div className="mb-2 relative w-fit">
            <img src={imgPreview} alt="National ID" className="h-24 rounded-lg border border-white/20 object-cover" />
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-400 hover:text-indigo-300 transition">
          <Camera className="w-4 h-4" />
          <span>Update ID Image</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>
      <button type="submit" disabled={saving}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition flex items-center justify-center gap-2">
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}

// ── Main Citizen Portal ────────────────────────────────────────────────────────
export function CitizenPortal() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [tab,         setTab]         = useState<'submit' | 'reports' | 'profile'>('reports');
  const [reports,     setReports]     = useState<DbReport[]>([]);
  const [depts,       setDepts]       = useState<DbDepartment[]>([]);
  const [statusFilter,setStatusFilter]= useState<'All' | 'Pending' | 'Ongoing' | 'Resolved'>('All');
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from('departments').select('*').then(({ data }) => {
      if (data) setDepts(data as DbDepartment[]);
    });
  }, []);

  const fetchReports = async () => {
    if (!user) return;
    setReportsLoading(true);
    let q = supabase.from('reports').select('*').eq('created_by', user.id).order('created_at', { ascending: false });
    if (statusFilter !== 'All') q = q.eq('status', statusFilter);
    const { data } = await q;
    setReports((data ?? []) as DbReport[]);
    setReportsLoading(false);
  };

  useEffect(() => { if (user) fetchReports(); }, [user, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c1a] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen bg-[#080c1a] text-white">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[50%] rounded-full bg-blue-600/8 blur-[120px]" />
      </div>

      {/* Top Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="font-black text-sm">Crisis Portal</p>
              <p className="text-[10px] text-white/40">Citizen Access</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 hidden sm:block">{profile.full_name ?? user.email}</span>
            <button onClick={async () => { await signOut(); navigate('/login'); }}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition px-3 py-1.5 rounded-lg hover:bg-white/5">
              <LogOut className="w-3.5 h-3.5" />Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black">
            Welcome, <span className="text-indigo-400">{profile.full_name?.split(' ')[0] ?? 'Citizen'}</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Submit emergency reports and track their status in real time.
          </p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Reports', value: reports.length, icon: FileText, color: 'indigo' },
            { label: 'Ongoing',       value: reports.filter(r => r.status === 'Ongoing').length,  icon: AlertCircle,  color: 'blue'    },
            { label: 'Resolved',      value: reports.filter(r => r.status === 'Resolved').length, icon: CheckCircle2, color: 'emerald' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-2xl p-4 text-center`}>
              <Icon className={`w-5 h-5 text-${color}-400 mx-auto mb-2`} />
              <p className="text-2xl font-black">{value}</p>
              <p className="text-[11px] text-white/40">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 mb-6 w-fit">
          {([
            { key: 'reports', label: 'My Reports',   icon: FileText },
            { key: 'submit',  label: 'New Report',   icon: Send     },
            { key: 'profile', label: 'My Profile',   icon: User     },
          ] as { key: typeof tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === key ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white/70'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* My Reports Tab */}
            {tab === 'reports' && (
              <div className="space-y-4">
                {/* Status Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-white/30" />
                  {(['All', 'Pending', 'Ongoing', 'Resolved'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                        statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:text-white/70'
                      }`}>
                      {s}
                    </button>
                  ))}
                  <button onClick={fetchReports} className="ml-auto text-white/30 hover:text-white/60 transition">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {reportsLoading ? (
                  <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-indigo-400" /></div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-16 text-white/20">
                    <FileText className="w-10 h-10 mx-auto mb-3" />
                    <p className="font-bold">No reports yet</p>
                    <p className="text-sm mt-1">Submit your first emergency report</p>
                    <button onClick={() => setTab('submit')} className="mt-4 px-4 py-2 bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-indigo-400 text-sm font-bold hover:bg-indigo-600/50 transition">
                      Submit Report →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map(r => <ReportCard key={r.id} r={r} depts={depts} />)}
                  </div>
                )}
              </div>
            )}

            {/* Submit Tab */}
            {tab === 'submit' && (
              <div className="max-w-lg">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h2 className="text-lg font-black mb-5 flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-400" />Submit Emergency Report
                  </h2>
                  <SubmitReportForm userId={user.id} depts={depts} onSubmit={fetchReports} />
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {tab === 'profile' && (
              <div className="max-w-md">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h2 className="text-lg font-black mb-5 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-400" />My Profile
                  </h2>
                  <div className="mb-4 p-3 bg-white/5 rounded-xl text-xs text-white/40 flex items-center gap-2">
                    <span className="font-mono">{user.email}</span>
                  </div>
                  <ProfileEditor userId={user.id} profile={profile} />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
