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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'suspended' | 'rejected'>('all');
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
    return citizens.filter(c => {
      const matchesSearch = 
        (c.national_id && c.national_id.includes(searchQuery)) || 
        (c.phone && c.phone.includes(searchQuery)) || 
        (c.full_name && c.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || c.account_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const selectCitizen = async (citizen: any) => {
    setSelectedCitizen(citizen);
    const { data } = await supabase.from('reports').select('*').eq('created_by', citizen.id).order('created_at', { ascending: false }).limit(10);
    if (data) setCitizenReports(data);
  };

  const handleCitizenAction = async (id: string, action: 'approved' | 'rejected' | 'suspended' | 'deleted') => {
    if (action === 'deleted') {
      if (!confirm('Are you sure?')) return;
      await supabase.from('profiles').delete().eq('id', id);
      if (selectedCitizen?.id === id) setSelectedCitizen(null);
    } else {
      await supabase.from('profiles').update({ account_status: action }).eq('id', id);
      if (selectedCitizen?.id === id) {
        setSelectedCitizen({ ...selectedCitizen, account_status: action });
      }
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#080c1a] p-4 md:p-8">
      
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">{language === 'ar' ? 'الإدارة المركزية' : 'Central Admin'}</h1>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-1">Management Console</p>
          </div>
        </div>
        
        <button onClick={() => window.location.replace('/employee/admin/records')} 
          className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-black hover:bg-indigo-500 hover:text-white transition-all">
          {t('system_records')}
        </button>
      </div>

      <div className="flex gap-2 mb-6 shrink-0">
        <button onClick={() => setActiveTab('citizens')} 
          className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === 'citizens' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          {language === 'ar' ? 'إدارة المواطنين' : 'Citizens'}
          {pendingCount > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500 text-amber-950 text-[10px]">{pendingCount}</span>}
        </button>
        <button onClick={() => setActiveTab('staff')} 
          className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === 'staff' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          {language === 'ar' ? 'الموظفين' : 'Staff'}
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
        {activeTab === 'citizens' && (
          <>
            <div className="w-full md:w-1/3 flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-black/20 space-y-3">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? "ابحث..." : "Search..."} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
                
                {/* Status Filter Container */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                  {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        statusFilter === s ? 'bg-white/20 text-white' : 'text-white/30 hover:text-white/50'
                      }`}>
                      {language === 'ar' ? 
                        (s === 'all' ? 'الكل' : s === 'pending' ? 'قيد المراجعة' : s === 'approved' ? 'مقبول' : s === 'suspended' ? 'موقوف' : 'مرفوض') 
                        : s}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {handleSearch().map(citizen => (
                  <div key={citizen.id} onClick={() => selectCitizen(citizen)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      selectedCitizen?.id === citizen.id ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-transparent'
                    }`}>
                    <h4 className="font-bold text-sm text-white/90">{citizen.full_name}</h4>
                    <p className="text-[10px] text-white/40">{citizen.phone}</p>
                    <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                      citizen.account_status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                      citizen.account_status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-red-500/20 text-red-400'
                    }`}>{citizen.account_status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-2/3 flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              {selectedCitizen ? (
                <div className="flex flex-col h-full overflow-y-auto">
                  <div className="p-6 border-b border-white/10 flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-black text-white">{selectedCitizen.full_name}</h2>
                      <p className="text-xs text-white/40 mt-1">ID: {selectedCitizen.national_id}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedCitizen.account_status !== 'approved' && (
                        <button onClick={() => handleCitizenAction(selectedCitizen.id, 'approved')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase">{language === 'ar' ? 'قبول' : 'Approve'}</button>
                      )}
                      {selectedCitizen.account_status !== 'rejected' && (
                        <button onClick={() => handleCitizenAction(selectedCitizen.id, 'rejected')} className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-xs font-bold uppercase">{language === 'ar' ? 'رفض' : 'Reject'}</button>
                      )}
                      {selectedCitizen.account_status !== 'suspended' && (
                        <button onClick={() => handleCitizenAction(selectedCitizen.id, 'suspended')} className="px-3 py-1.5 bg-amber-600/20 text-amber-400 border border-amber-600/30 rounded-lg text-xs font-bold uppercase">{language === 'ar' ? 'إيقاف' : 'Suspend'}</button>
                      )}
                      <button onClick={() => handleCitizenAction(selectedCitizen.id, 'deleted')} className="px-3 py-1.5 bg-white/5 text-white/40 rounded-lg text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition-all">{language === 'ar' ? 'حذف' : 'Delete'}</button>
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {selectedCitizen.national_id_image_url && (
                      <div>
                        <h3 className="text-[10px] font-black text-white/30 uppercase mb-4 tracking-widest">{language === 'ar' ? 'البطاقة الشخصية' : 'National ID'}</h3>
                        <img src={selectedCitizen.national_id_image_url} alt="ID" className="w-full max-w-md rounded-2xl border border-white/10" />
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-[10px] font-black text-white/30 uppercase mb-4 tracking-widest">{language === 'ar' ? 'سجل البلاغات' : 'Report History'}</h3>
                      <div className="space-y-2">
                        {citizenReports.map(r => (
                          <div key={r.id} className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold text-white/90">{r.type}</p>
                              <p className="text-[10px] text-white/40">{new Date(r.created_at).toLocaleString()}</p>
                            </div>
                            <span className="text-[10px] font-black uppercase text-indigo-400">{r.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/10 italic">Select a citizen to view details</div>
              )}
            </div>
          </>
        )}

        {activeTab === 'staff' && (
          <div className="w-full max-w-md mx-auto p-8 bg-white/5 border border-white/10 rounded-3xl h-fit">
            <h2 className="text-lg font-black text-white mb-6 uppercase tracking-wider">{t('deploy_account')}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input type="text" required value={empId} onChange={e => setEmpId(e.target.value)} className="input-premium" placeholder="Employee ID" />
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input-premium" placeholder="Full Name" />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-premium" placeholder="Password" />
              <button disabled={loading} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20">
                {loading ? '...' : t('authorize_account')}
              </button>
              {msg.text && <p className={`text-xs font-bold text-center mt-4 ${msg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
