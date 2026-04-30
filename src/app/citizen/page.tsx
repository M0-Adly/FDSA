'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CrisisManager } from '@/lib/CrisisManager';
import { useLanguage } from '@/components/LanguageContext';

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
  const { t, language } = useLanguage();
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
    
    try {
      const mgr = new CrisisManager();
      await mgr.initialize();
      // Send as array with one ID to match updated CrisisManager signature
      await mgr.fileReport([parseInt(selectedDept)], {
        description,
        priority: parseInt(priority.toString())
      }, user.id);
      
      setToast(t('success_submit'));
      setTab('reports');
      setDescription('');
      setPriority(3);
      setSelectedDept('');
      fetchMyReports(user.id);
    } catch (err: any) {
      setToast('Error: ' + err.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 3000);
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
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-black">
          {t('welcome')}, <span className="text-indigo-400">{profile?.full_name || user?.email?.replace('@citizen.eg', '') || 'Citizen'}</span>
        </h1>
        <p className="text-white/30 text-sm mt-1">{t('citizen_access')}.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: t('total_reports'), value: reports.length, color: 'indigo', icon: '📋' },
          { label: t('ongoing'), value: reports.filter(r => r.status === 'ongoing').length, color: 'blue', icon: '🔵' },
          { label: t('resolved'), value: reports.filter(r => r.status === 'resolved').length, color: 'emerald', icon: '✅' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-2xl p-5 text-center backdrop-blur-sm transition hover:bg-${color}-500/15`}>
            <span className="text-2xl">{icon}</span>
            <p className="text-3xl font-black mt-2">{value}</p>
            <p className="text-[11px] text-white/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 mb-6 w-fit">
        {[
          { key: 'reports' as const, label: t('my_reports'), icon: '📄' },
          { key: 'submit' as const, label: t('new_report'), icon: '📝', disabled: profile?.account_status !== 'approved' },
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

      <div className="animate-fade-in">
        {tab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {(['All', 'Active', 'Awaiting Confirmation', 'Resolved'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                    statusFilter === s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:text-white/70'
                  }`}>
                  {t(s.toLowerCase().replace(/ /g, '_'))}
                </button>
              ))}
            </div>

            {filteredReports.length === 0 ? (
              <div className="text-center py-16 text-white/20">
                <span className="text-4xl mb-4 block">📋</span>
                <p className="font-bold">{t('no_reports')}</p>
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
                            {report.status === 'resolved' ? (report.citizen_confirmed ? t('fully_resolved') : t('resolution_pending')) : t(report.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      {report.status === 'resolved' && !report.citizen_confirmed && (
                        <div className="flex gap-2">
                          <button onClick={() => {
                            const mgr = new CrisisManager();
                            mgr.confirmResolution(report.id, user.id).then(() => fetchMyReports(user.id));
                          }} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold">{t('confirm_fixed')}</button>
                          <button onClick={() => {
                            const mgr = new CrisisManager();
                            mgr.reopenReport(report.id, user.id).then(() => fetchMyReports(user.id));
                          }} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold">{t('not_fixed')}</button>
                        </div>
                      )}
                      <div className="text-right px-3">
                        <p className="font-black text-white/60">P{report.priority}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'submit' && (
          <div className="max-w-lg">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h2 className="text-lg font-black mb-5 flex items-center gap-2">
                <span>📝</span> {t('submit_report')}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">{t('district')}</label>
                  <select required value={selectedDistrict}
                    onChange={e => { setSelectedDistrict(e.target.value); setSelectedDept(''); }}
                    className="input-premium appearance-none cursor-pointer">
                    <option value="" className="bg-slate-900">{t('select_district')}</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id} className="bg-slate-900">{language === 'ar' ? d.name_ar : d.name_en}</option>
                    ))}
                  </select>
                </div>

                {selectedDistrict && (
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">{t('department')}</label>
                    <select required value={selectedDept}
                      onChange={e => setSelectedDept(e.target.value)}
                      className="input-premium appearance-none cursor-pointer">
                      <option value="" className="bg-slate-900">{t('select_dept')}</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id} className="bg-slate-900">{language === 'ar' ? d.name_ar : d.name_en}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">{t('description')}</label>
                  <textarea required rows={4} value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={language === 'ar' ? 'صف حالة الطوارئ بالتفصيل...' : 'Describe the emergency in detail...'}
                    className="input-premium resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                    {t('priority_level')}: <span className="font-black">{priority}</span>
                  </label>
                  <input type="range" min="1" max="5" value={priority}
                    onChange={e => setPriority(parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-white/10" />
                </div>

                <button type="submit" disabled={submitting || !selectedDept}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 mt-2">
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : t('submit_report')}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm border backdrop-blur-md bg-emerald-500/90 border-emerald-400 text-white animate-slide-up">
          ✅ {toast}
        </div>
      )}
    </>
  );
}
