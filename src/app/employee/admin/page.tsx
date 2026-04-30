'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/components/LanguageContext';

export default function AdminPanel() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'staff' | 'citizens' | 'staff_list'>('citizens');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  
  // Staff Provisioning State
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  // Lists
  const [citizens, setCitizens] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'suspended' | 'rejected'>('all');
  const [selectedCitizen, setSelectedCitizen] = useState<any | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.replace('/employee/login'); return; }
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error) console.error('Error fetching role:', error);
      
      // FORCE ADMIN CHECK
      const userEmail = session.user.email?.toLowerCase();
      const isSuperAdmin = userEmail === 'adlyneedbonus@aast.com' || userEmail === 'adly1@aast.com' || profile?.role === 'admin';
      
      setCurrentUser({ ...profile, isSuperAdmin, email: userEmail });
      setLoadingRole(false);
      
      if (isSuperAdmin) {
        setActiveTab('staff_list');
        fetchCitizens();
        fetchEmployees();
      } else {
        fetchCitizens();
      }
    } catch (err) {
      console.error(err);
      setLoadingRole(false);
    }
  };

  const fetchCitizens = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'citizen').order('created_at', { ascending: false });
    if (data) setCitizens(data);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'employee').order('created_at', { ascending: false });
    if (data) setEmployees(data);
  };

  const handleSearch = () => {
    const list = activeTab === 'citizens' ? citizens : employees;
    return list.filter(c => {
      const matchesSearch = 
        (c.national_id && c.national_id.includes(searchQuery)) || 
        (c.phone && c.phone.includes(searchQuery)) || 
        (c.full_name && c.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.employee_id && c.employee_id.includes(searchQuery));
      
      const matchesStatus = statusFilter === 'all' || c.account_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
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
      setMsg({ type: 'success', text: 'تم إنشاء حساب الموظف بنجاح' });
      setEmpId(''); setName(''); setPassword('');
      fetchEmployees();
    } else {
      setMsg({ type: 'error', text: data.error });
    }
  };

  if (loadingRole) return <div className="p-20 text-center text-white/20 font-black tracking-widest animate-pulse">VERIFYING ACCESS PRIVILEGES...</div>;

  const isAdmin = currentUser?.isSuperAdmin;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080c1a] p-4 md:p-8">
      
      {/* Header with Role Badge */}
      <div className="mb-8 flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-2xl ${
            isAdmin ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-emerald-600 text-white shadow-emerald-500/20'
          }`}>
            {isAdmin ? 'AD' : 'EM'}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{isAdmin ? 'لوحة الإدارة العليا' : 'بوابة العمليات'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${isAdmin ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {isAdmin ? 'System Administrator' : 'Field Employee'}
              </span>
              <span className="text-white/20 text-[9px] font-mono">ID: {currentUser?.id?.substring(0,8)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => window.location.replace('/employee/admin/records')} className="px-5 py-2.5 bg-white/5 text-white/40 border border-white/10 rounded-xl text-xs font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">
            سجلات النظام
          </button>
          <button onClick={() => { supabase.auth.signOut().then(() => window.location.replace('/employee/login')); }} className="px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-black uppercase hover:bg-red-500 hover:text-white transition-all">
            خروج
          </button>
        </div>
      </div>

      {/* Security Check Alert for Users */}
      {!isAdmin && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-400 text-xs font-bold">
          <span>⚠️</span>
          {language === 'ar' ? 'تنبيه: أنت داخل بحساب موظف، صلاحيات الإدارة العليا مخفية.' : 'Warning: You are logged in as an employee. Admin tools are restricted.'}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setActiveTab('citizens')} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'citizens' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
          👤 إدارة المواطنين
        </button>
        
        {isAdmin && (
          <>
            <button onClick={() => setActiveTab('staff_list')} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'staff_list' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
              🛡️ إدارة الموظفين
            </button>
            <button onClick={() => setActiveTab('staff')} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'staff' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
              ➕ إضافة موظف جديد
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'citizens' && (
          <div className="flex h-full flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-black/20 space-y-3">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="input-premium" />
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/30'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {handleSearch().map(c => (
                  <div key={c.id} onClick={() => setSelectedCitizen(c)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedCitizen?.id === c.id ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-transparent'}`}>
                    <h4 className="font-bold text-white/90">{c.full_name}</h4>
                    <p className="text-[10px] text-white/30">{c.phone}</p>
                    <span className="text-[9px] font-black uppercase text-indigo-400 mt-1 block">{c.account_status}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl overflow-y-auto p-8">
              {selectedCitizen ? (
                <div>
                  <h2 className="text-2xl font-black text-white mb-4">{selectedCitizen.full_name}</h2>
                  <div className="flex gap-2 mb-8">
                    <button onClick={async () => { await supabase.from('profiles').update({ account_status: 'approved' }).eq('id', selectedCitizen.id); fetchCitizens(); setSelectedCitizen({...selectedCitizen, account_status: 'approved'}); }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">قبول</button>
                    <button onClick={async () => { await supabase.from('profiles').update({ account_status: 'rejected' }).eq('id', selectedCitizen.id); fetchCitizens(); setSelectedCitizen({...selectedCitizen, account_status: 'rejected'}); }} className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-xl text-[10px] font-black uppercase">رفض</button>
                    <button onClick={async () => { await supabase.from('profiles').update({ account_status: 'suspended' }).eq('id', selectedCitizen.id); fetchCitizens(); setSelectedCitizen({...selectedCitizen, account_status: 'suspended'}); }} className="px-4 py-2 bg-amber-600/20 text-amber-400 border border-amber-600/30 rounded-xl text-[10px] font-black uppercase">إيقاف</button>
                  </div>
                  {selectedCitizen.national_id_image_url && <img src={selectedCitizen.national_id_image_url} className="w-full max-w-lg rounded-2xl border border-white/10" />}
                </div>
              ) : <div className="text-center py-20 text-white/10 italic">اختر مواطناً للمراجعة</div>}
            </div>
          </div>
        )}

        {isAdmin && activeTab === 'staff_list' && (
          <div className="h-full bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 bg-black/20 flex justify-between items-center">
              <h2 className="font-black text-white uppercase tracking-wider">إدارة فريق العمل</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {handleSearch().map(emp => (
                  <div key={emp.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold">{emp.employee_id}</div>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">{emp.account_status}</span>
                    </div>
                    <h4 className="font-black text-white/90 text-sm">{emp.full_name || 'بروفايل غير مكتمل'}</h4>
                    <p className="text-[10px] text-white/30 mt-1">{emp.phone || 'بدون هاتف'}</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                      <button onClick={async () => { await supabase.from('profiles').update({ account_status: 'suspended' }).eq('id', emp.id); fetchEmployees(); }} className="flex-1 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-[9px] font-black uppercase">إيقاف</button>
                      <button onClick={async () => { if(confirm('حذف نهائي؟')) { await supabase.from('profiles').delete().eq('id', emp.id); fetchEmployees(); } }} className="flex-1 py-1.5 bg-white/5 text-white/30 rounded-lg text-[9px] font-black uppercase">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isAdmin && activeTab === 'staff' && (
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-xl font-black text-white mb-6 uppercase tracking-wider">إضافة موظف جديد</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input type="text" required value={empId} onChange={e => setEmpId(e.target.value)} className="input-premium" placeholder="ID" />
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input-premium" placeholder="Full Name" />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-premium" placeholder="Password" />
              <button disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase">
                {loading ? '...' : 'اعتماد الحساب'}
              </button>
              {msg.text && <p className={`text-xs text-center mt-4 font-bold ${msg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
