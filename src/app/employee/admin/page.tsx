'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/components/LanguageContext';

export default function AdminPanel() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'staff' | 'citizens'>('citizens');
  
  // Staff Provisioning State
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  // Citizen Management State
  const [citizens, setCitizens] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState<any | null>(null);
  const [citizenReports, setCitizenReports] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'citizens') {
      fetchCitizens();
    }
  }, [activeTab]);

  const fetchCitizens = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'citizen').order('created_at', { ascending: false });
    if (data) setCitizens(data);
  };

  const handleSearch = () => {
    return citizens.filter(c => 
      (c.national_id && c.national_id.includes(searchQuery)) || 
      (c.phone && c.phone.includes(searchQuery)) || 
      (c.full_name && c.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const selectCitizen = async (citizen: any) => {
    setSelectedCitizen(citizen);
    // Fetch their reports
    const { data } = await supabase.from('reports').select('*').eq('created_by', citizen.id).order('created_at', { ascending: false }).limit(10);
    if (data) setCitizenReports(data);
  };

  const handleCitizenAction = async (id: string, action: 'approved' | 'rejected' | 'suspended' | 'deleted') => {
    if (action === 'deleted') {
      if (!confirm('Are you sure you want to permanently delete this citizen account?')) return;
      // Note: Full deletion requires deleting the auth user which is usually done via a secure backend route. 
      // We will mark the profile as deleted/rejected for safety here.
      await supabase.from('profiles').update({ account_status: 'rejected' }).eq('id', id);
    } else {
      await supabase.from('profiles').update({ account_status: action }).eq('id', id);
    }
    
    if (selectedCitizen && selectedCitizen.id === id) {
      setSelectedCitizen({ ...selectedCitizen, account_status: action === 'deleted' ? 'rejected' : action });
    }
    fetchCitizens();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    const res = await fetch('/api/admin/create-employee', {
      method: 'POST',
      body: JSON.stringify({ employeeId: empId, fullName: name, password })
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      setMsg({ type: 'success', text: t('success_deploy') });
      setEmpId(''); setName(''); setPassword('');
    } else {
      setMsg({ type: 'error', text: data.error });
    }
  };

  const pendingCount = citizens.filter(c => c.account_status === 'pending').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent)] p-4 md:p-8">
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">{language === 'ar' ? 'لوحة الإدارة الشاملة' : 'Admin Console'}</h1>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-1">Management System</p>
          </div>
        </div>
        
        <button onClick={() => window.location.replace('/employee/admin/records')} 
          className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/10 flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          {t('system_records')}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 shrink-0">
        <button onClick={() => setActiveTab('citizens')} 
          className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'citizens' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          {language === 'ar' ? 'إدارة المواطنين' : 'Citizen Management'}
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500 text-amber-950 text-[10px]">{pendingCount}</span>
          )}
        </button>
        <button onClick={() => setActiveTab('staff')} 
          className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'staff' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          {language === 'ar' ? 'اعتماد الموظفين' : 'Staff Provisioning'}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
        
        {/* ================= CITIZEN MANAGEMENT TAB ================= */}
        {activeTab === 'citizens' && (
          <>
            {/* Citizens List Sidebar */}
            <div className="w-full md:w-1/3 flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              <div className="p-4 border-b border-white/10 bg-black/20">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? "ابحث بالرقم القومي أو الهاتف..." : "Search ID or Phone..."} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {handleSearch().map(citizen => (
                  <div key={citizen.id} onClick={() => selectCitizen(citizen)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      selectedCitizen?.id === citizen.id ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-white/90">{citizen.full_name || 'Citizen'}</h4>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5">{citizen.national_id || 'No ID'} • {citizen.phone}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full mt-1.5 ${
                        citizen.account_status === 'approved' ? 'bg-emerald-500' : 
                        citizen.account_status === 'pending' ? 'bg-amber-500 animate-pulse' : 
                        'bg-red-500'
                      }`} title={citizen.account_status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Citizen Detail View */}
            <div className="w-full md:w-2/3 flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              {selectedCitizen ? (
                <div className="flex flex-col h-full">
                  {/* Detail Header */}
                  <div className="p-6 border-b border-white/10 bg-black/20 flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-black text-white">{selectedCitizen.full_name}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${
                          selectedCitizen.account_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          selectedCitizen.account_status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {selectedCitizen.account_status}
                        </span>
                        <span className="text-xs text-white/40 font-mono">ID: {selectedCitizen.national_id}</span>
                        <span className="text-xs text-white/40 font-mono">Phone: {selectedCitizen.phone}</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {selectedCitizen.account_status === 'pending' && (
                        <button onClick={() => handleCitizenAction(selectedCitizen.id, 'approved')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition">
                          {language === 'ar' ? 'قبول الحساب' : 'Approve Account'}
                        </button>
                      )}
                      {(selectedCitizen.account_status === 'approved' || selectedCitizen.account_status === 'pending') && (
                        <button onClick={() => handleCitizenAction(selectedCitizen.id, 'suspended')} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition">
                          {language === 'ar' ? 'إيقاف الحساب' : 'Suspend'}
                        </button>
                      )}
                      <button onClick={() => handleCitizenAction(selectedCitizen.id, 'deleted')} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition">
                        {language === 'ar' ? 'حذف الحساب' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  {/* Citizen Content: ID Image & Reports */}
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                    {/* ID Image Section */}
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {language === 'ar' ? 'صورة الهوية الوطنية' : 'National ID Image'}
                      </h3>
                      {selectedCitizen.national_id_image_url ? (
                        <div className="relative group rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm aspect-[1.6/1] bg-black/40">
                          <img src={selectedCitizen.national_id_image_url} alt="ID" className="w-full h-full object-cover" />
                          <a href={selectedCitizen.national_id_image_url} target="_blank" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-sm font-bold text-white">
                            {language === 'ar' ? 'عرض بالحجم الكامل' : 'View Full Size'}
                          </a>
                        </div>
                      ) : (
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl border-dashed text-center">
                          <p className="text-xs text-white/30 italic">{language === 'ar' ? 'لم يتم رفع صورة' : 'No image provided'}</p>
                        </div>
                      )}
                    </div>

                    {/* Reports History */}
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        {language === 'ar' ? 'سجل البلاغات السابقة' : 'Recent Reports History'}
                      </h3>
                      
                      {citizenReports.length === 0 ? (
                        <p className="text-xs text-white/30 italic">{language === 'ar' ? 'لا يوجد بلاغات مسجلة' : 'No reports filed yet.'}</p>
                      ) : (
                        <div className="space-y-3">
                          {citizenReports.map(r => (
                            <div key={r.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl flex justify-between items-center">
                              <div>
                                <h4 className="font-bold text-white/90 text-sm">{r.type}</h4>
                                <p className="text-xs text-white/40 truncate max-w-xs">{r.description}</p>
                                <p className="text-[10px] text-white/30 font-mono mt-1">{new Date(r.created_at).toLocaleString()}</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${
                                r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                r.status === 'ongoing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {r.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                  <svg className="w-20 h-20 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <p className="font-bold">{language === 'ar' ? 'حدد مواطن لعرض التفاصيل' : 'Select a citizen to view details'}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= STAFF PROVISIONING TAB ================= */}
        {activeTab === 'staff' && (
          <div className="w-full max-w-xl mx-auto flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl p-8 shadow-2xl relative">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dot-grid" />
            <div className="relative z-10">
              <h2 className="text-lg font-black text-white/90 mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {t('deploy_account')}
              </h2>
              
              {msg.text && (
                <div className={`p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-3 border ${
                  msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {msg.text}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">{t('government_id')}</label>
                  <input type="text" required value={empId} onChange={e => setEmpId(e.target.value)} className="input-premium bg-black/20" placeholder="e.g. 1024" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">{t('officer_name')}</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input-premium bg-black/20" placeholder="e.g. Inspector Ahmed" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">{t('security_clearance')}</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-premium bg-black/20" placeholder="Minimum 6 characters" minLength={6} />
                </div>
                <button disabled={loading} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white p-4 rounded-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('authorize_account')}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
