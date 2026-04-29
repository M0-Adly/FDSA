'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CrisisManager } from '@/lib/CrisisManager';

interface Report {
  id: string;
  type: string;
  description: string;
  priority: number;
  status: string;
  created_at: string;
  department_id: number;
  citizen_confirmed?: boolean;
}

export default function CitizenDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(3);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<'reports' | 'submit'>('reports');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      fetchDepartments(parseInt(selectedDistrict));
    }
  }, [selectedDistrict]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.replace('/citizen/login'); return; }
      setUser(session.user);
      
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profileData) setProfile(profileData);

      fetchMyReports(session.user.id);
    } catch {
      window.location.replace('/citizen/login');
    }
  };

  const fetchDistricts = async () => {
    const { data } = await supabase.from('districts').select('*');
    if (data) setDistricts(data);
  };

  const fetchDepartments = async (districtId: number) => {
    const { data } = await supabase.from('departments').select('*').eq('district_id', districtId);
    if (data) setDepartments(data);
  };

  const fetchMyReports = async (userId: string) => {
    const { data } = await supabase.from('reports').select('*').eq('created_by', userId)
      .order('created_at', { ascending: false });
    if (data) setReports(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !user) return;
    setSubmitting(true);
    
    const dept = departments.find(d => d.id.toString() === selectedDept);
    let type = 'Other';
    if (dept) {
      if (dept.name_en.includes('Fire')) type = 'Fire';
      else if (dept.name_en.includes('Police')) type = 'Theft';
      else if (dept.name_en.includes('Ambulance')) type = 'Accident';
      else if (dept.name_en.includes('Water')) type = 'Water Leak';
      else if (dept.name_en.includes('Electricity')) type = 'Power Outage';
      else if (dept.name_en.includes('Gas')) type = 'Gas Leak';
    }

    const { error } = await supabase.from('reports').insert({
      department_id: parseInt(selectedDept), district_id: parseInt(selectedDistrict),
      description, priority, type, created_by: user.id
    });

    setSubmitting(false);
    if (!error) {
      setDescription(''); setPriority(3); setSelectedDept('');
      fetchMyReports(user.id);
      setToast('Report submitted successfully!');
      setTimeout(() => setToast(null), 3000);
      setTab('reports');
    } else {
      setToast('Error: ' + error.message);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':   return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ongoing':   return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'resolved':  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'escalated': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:          return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getPriorityColor = (p: number) => {
    if (p >= 4) return 'text-red-400';
    if (p === 3) return 'text-amber-400';
    return 'text-blue-400';
  };

  const filteredReports = reports.filter(r => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Active') return r.status === 'pending' || r.status === 'ongoing';
    if (statusFilter === 'Awaiting Confirmation') return r.status === 'resolved' && !r.citizen_confirmed;
    if (statusFilter === 'Resolved') return r.status === 'resolved' && r.citizen_confirmed;
    return r.status.toLowerCase() === statusFilter.toLowerCase();
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-white/30 font-mono text-sm">Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Welcome */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-black">
          Welcome, <span className="text-indigo-400">{profile?.full_name || user?.email?.replace('@citizen.eg', '') || 'Citizen'}</span>
        </h1>
        <p className="text-white/30 text-sm mt-1">Submit emergency reports and track their status in real time.</p>
        
        {profile?.account_status === 'pending' && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <span className="text-amber-400 text-xl">⏳</span>
            <div>
              <h3 className="font-bold text-amber-400">Account Pending Approval</h3>
              <p className="text-sm text-amber-200/70 mt-1">Your account is currently under review by an administrator. You cannot submit new reports until your account is approved.</p>
            </div>
          </div>
        )}
        
        {profile?.account_status === 'rejected' && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <span className="text-red-400 text-xl">❌</span>
            <div>
              <h3 className="font-bold text-red-400">Account Rejected</h3>
              <p className="text-sm text-red-200/70 mt-1">Your account application was declined. Please contact support.</p>
            </div>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Reports', value: reports.length, color: 'indigo', icon: '📋' },
          { label: 'Ongoing', value: reports.filter(r => r.status === 'ongoing').length, color: 'blue', icon: '🔵' },
          { label: 'Resolved', value: reports.filter(r => r.status === 'resolved').length, color: 'emerald', icon: '✅' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-2xl p-5 text-center backdrop-blur-sm transition hover:bg-${color}-500/15`}>
            <span className="text-2xl">{icon}</span>
            <p className="text-3xl font-black mt-2">{value}</p>
            <p className="text-[11px] text-white/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 mb-6 w-fit">
        {[
          { key: 'reports' as const, label: 'My Reports', icon: '📄' },
          { key: 'submit' as const, label: 'New Report', icon: '📝', disabled: profile?.account_status !== 'approved' },
        ].map(({ key, label, icon, disabled }) => (
          <button key={key} onClick={() => !disabled && setTab(key)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              disabled ? 'opacity-50 cursor-not-allowed text-white/20' : 
              tab === key ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white/70'
            }`}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {/* My Reports Tab */}
        {tab === 'reports' && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {(['All', 'Active', 'Awaiting Confirmation', 'Resolved'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                    statusFilter === s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:text-white/70'
                  }`}>
                  {s}
                </button>
              ))}
              <button onClick={() => user && fetchMyReports(user.id)} className="ml-auto text-white/30 hover:text-white/60 transition">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              </button>
            </div>

            {filteredReports.length === 0 ? (
              <div className="text-center py-16 text-white/20">
                <span className="text-4xl mb-4 block">📋</span>
                <p className="font-bold">No reports found</p>
                <p className="text-sm mt-1">Submit your first emergency report</p>
                <button onClick={() => setTab('submit')} className="mt-4 px-4 py-2 bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-indigo-400 text-sm font-bold hover:bg-indigo-600/50 transition">
                  Submit Report →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map(report => (
                  <div key={report.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        report.status === 'resolved' ? (report.citizen_confirmed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400') : 
                        report.status === 'ongoing' ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' : 'bg-white/5 text-white/40'
                      }`}>
                        {report.status === 'resolved' ? (report.citizen_confirmed ? '✅' : '👍') : '📄'}
                      </div>
                      <div>
                        <h3 className="font-bold text-white/90">{report.type}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${
                            report.status === 'resolved' ? (report.citizen_confirmed ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-blue-400 border-blue-500/20 bg-blue-500/10') :
                            report.status === 'ongoing' ? 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10' : 'text-white/30 border-white/10 bg-white/5'
                          }`}>
                            {report.status === 'resolved' ? (report.citizen_confirmed ? 'Fully Resolved' : 'Resolution Pending Approval') : report.status}
                          </span>
                          <span className="text-[10px] text-white/20 font-mono">
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {report.status === 'resolved' && !report.citizen_confirmed && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const mgr = new CrisisManager();
                              await mgr.confirmResolution(report.id, user.id);
                              setToast('Resolution confirmed! Thank you.');
                              setTimeout(() => setToast(null), 3000);
                              fetchMyReports(user.id);
                            } catch (err: any) {
                              setToast('Error: ' + (err.message || 'Could not confirm'));
                              setTimeout(() => setToast(null), 4000);
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 animate-bounce"
                        >
                          Confirm it's Fixed
                        </button>
                      )}
                      <div className="text-right px-3">
                        <p className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">Priority</p>
                        <p className="font-black text-white/60">P{report.priority}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit Tab */}
        {tab === 'submit' && (
          <div className="max-w-lg">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h2 className="text-lg font-black mb-5 flex items-center gap-2">
                <span>📝</span> Submit Emergency Report
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">District</label>
                  <select required value={selectedDistrict}
                    onChange={e => { setSelectedDistrict(e.target.value); setSelectedDept(''); }}
                    className="input-premium appearance-none cursor-pointer">
                    <option value="" className="bg-slate-900">Select a district...</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id} className="bg-slate-900">{d.name_en} - {d.name_ar}</option>
                    ))}
                  </select>
                </div>

                {selectedDistrict && (
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Department</label>
                    <select required value={selectedDept}
                      onChange={e => setSelectedDept(e.target.value)}
                      className="input-premium appearance-none cursor-pointer">
                      <option value="" className="bg-slate-900">Select department...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id} className="bg-slate-900">{d.name_en} - {d.name_ar}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Description</label>
                  <textarea required rows={4} value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the emergency in detail..."
                    className="input-premium resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                    Priority Level: <span className={`${getPriorityColor(priority)} font-black`}>{priority}</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input type="range" min="1" max="5" value={priority}
                      onChange={e => setPriority(parseInt(e.target.value))}
                      className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(p => (
                        <button key={p} type="button" onClick={() => setPriority(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                            priority === p ? 'bg-indigo-600 text-white scale-110' : 'bg-white/5 text-white/30 hover:text-white/60'
                          }`}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={submitting || !selectedDept}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 mt-2">
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : 'Submit Report'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 border backdrop-blur-md bg-emerald-500/90 border-emerald-400 text-white animate-slide-up">
          ✅ {toast}
        </div>
      )}
    </>
  );
}
