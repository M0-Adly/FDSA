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
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ account_status: newStatus }).eq('id', id);
      if (error) throw error;
      await fetchCitizens();
      await fetchEmployees();
      if (selectedCitizen && selectedCitizen.id === id) {
        setSelectedCitizen({ ...selectedCitizen, account_status: newStatus });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, type: 'citizen' | 'employee') => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من الحذف النهائي؟' : 'Are you sure? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      if (type === 'citizen') fetchCitizens(); else fetchEmployees();
      setSelectedCitizen(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
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
    <div className="flex-1 flex flex-col h-full bg-[#080c1a] p-4 md:p-8 overflow-hidden">
      
      {/* Header */}
      <div className="mb-8 flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10 shrink-0">
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
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => { supabase.auth.signOut().then(() => window.location.replace('/employee/login')); }} className="px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-black uppercase hover:bg-red-500 hover:text-white transition-all">
            خروج
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 shrink-0">
        <button onClick={() => setActiveTab('citizens')} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'citizens' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
          👤 إدارة المواطنين
        </button>
        {isAdmin && (
          <>
            <button onClick={() => setActiveTab('staff_list')} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'staff_list' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
              🛡️ إدارة الموظفين
            </button>
            <button onClick={() => setActiveTab('staff')} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'staff' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
              ➕ إضافة موظف جديد
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'citizens' && (
          <div className="flex h-full flex-col md:flex-row gap-6">
            <div className="w-full md:w-80 flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden shrink-0">
              <div className="p-4 border-b border-white/10 bg-black/20 space-y-3">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="input-premium" />
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                  {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/30'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {handleSearch().map(c => (
                  <div key={c.id} onClick={() => setSelectedCitizen(c)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedCitizen?.id === c.id ? 'bg-indigo-500/20 border-indigo-500/30 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                    <h4 className="font-bold text-white/90 text-sm truncate">{c.full_name}</h4>
                    <p className="text-[10px] text-white/30">{c.phone}</p>
                    <span className={`text-[8px] font-black uppercase mt-2 px-1.5 py-0.5 rounded inline-block ${c.account_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : c.account_status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{c.account_status}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl overflow-y-auto p-8 custom-scrollbar">
              {selectedCitizen ? (
                <div className="max-w-4xl animate-fade-in">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-3xl font-black text-white italic">{selectedCitizen.full_name}</h2>
                      <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-1">Citizen Profile Records</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedCitizen.account_status !== 'approved' && (
                        <button disabled={actionLoading} onClick={() => handleStatusUpdate(selectedCitizen.id, 'approved')} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">قبول</button>
                      )}
                      {selectedCitizen.account_status !== 'rejected' && (
                        <button disabled={actionLoading} onClick={() => handleStatusUpdate(selectedCitizen.id, 'rejected')} className="px-5 py-2.5 bg-red-600/20 text-red-400 border border-red-600/30 rounded-xl text-xs font-black uppercase hover:scale-105 transition-all">رفض</button>
                      )}
                      {selectedCitizen.account_status !== 'suspended' && (
                        <button disabled={actionLoading} onClick={() => handleStatusUpdate(selectedCitizen.id, 'suspended')} className="px-5 py-2.5 bg-amber-600/20 text-amber-400 border border-amber-600/30 rounded-xl text-xs font-black uppercase hover:scale-105 transition-all">إيقاف</button>
                      )}
                      <button disabled={actionLoading} onClick={() => handleDelete(selectedCitizen.id, 'citizen')} className="px-5 py-2.5 bg-white/5 text-white/30 border border-white/10 rounded-xl text-xs font-black uppercase hover:bg-red-600 hover:text-white transition-all">حذف نهائي</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">National ID</span>
                        <p className="text-lg font-black text-white font-mono tracking-tighter">{selectedCitizen.national_id || 'Not Provided'}</p>
                      </div>
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Phone Number</span>
                        <p className="text-lg font-black text-white">{selectedCitizen.phone || 'Not Provided'}</p>
                      </div>
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Account Status</span>
                        <p className={`text-lg font-black uppercase ${selectedCitizen.account_status === 'approved' ? 'text-emerald-400' : 'text-amber-400'}`}>{selectedCitizen.account_status}</p>
                      </div>
                    </div>
                    <div>
                       <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-3">Identity Verification Image</span>
                       {selectedCitizen.national_id_image_url ? (
                         <div className="group relative">
                           <img src={selectedCitizen.national_id_image_url} className="w-full rounded-3xl border border-white/10 shadow-2xl transition group-hover:scale-[1.02]" alt="ID" />
                           <a href={selectedCitizen.national_id_image_url} target="_blank" className="absolute top-4 right-4 bg-black/50 p-2 rounded-lg backdrop-blur text-[10px] font-black text-white opacity-0 group-hover:opacity-100 transition">View Full</a>
                         </div>
                       ) : (
                         <div className="w-full h-48 bg-white/5 border border-white/10 border-dashed rounded-3xl flex items-center justify-center text-white/10 font-bold">No Image Provided</div>
                       )}
                    </div>
                  </div>
                </div>
              ) : <div className="h-full flex flex-col items-center justify-center text-white/10">
                    <span className="text-6xl mb-6 opacity-50">👤</span>
                    <p className="text-xl font-bold italic">اختر مواطناً من القائمة للمراجعة والاعتماد</p>
                  </div>}
            </div>
          </div>
        )}

        {isAdmin && activeTab === 'staff_list' && (
          <div className="h-full bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 bg-black/20 flex justify-between items-center shrink-0">
              <h2 className="font-black text-white uppercase tracking-wider">إدارة فريق العمل</h2>
              <div className="text-[10px] font-bold text-white/30 uppercase">Total Employees: {employees.length}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {handleSearch().map(emp => (
                  <div key={emp.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl group hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black shadow-inner">{emp.employee_id}</div>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${emp.account_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{emp.account_status}</span>
                    </div>
                    <h4 className="font-black text-white/90 text-sm">{emp.full_name || 'بروفايل غير مكتمل'}</h4>
                    <p className="text-[10px] text-white/30 mt-1 font-mono">{emp.phone || 'NO PHONE'}</p>
                    <div className="mt-5 pt-5 border-t border-white/5 flex gap-2">
                      <button disabled={actionLoading} onClick={() => handleStatusUpdate(emp.id, emp.account_status === 'suspended' ? 'approved' : 'suspended')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition ${emp.account_status === 'suspended' ? 'bg-emerald-600 text-white' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {emp.account_status === 'suspended' ? 'تفعيل' : 'إيقاف'}
                      </button>
                      <button disabled={actionLoading} onClick={() => handleDelete(emp.id, 'employee')} className="px-3 py-2.5 bg-white/5 text-white/20 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isAdmin && activeTab === 'staff' && (
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-black text-white mb-2 italic">CREATE PERSONNEL</h2>
            <p className="text-white/20 text-[10px] uppercase tracking-widest mb-8">Official Staff Provisioning</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase ml-2">Employee ID</label>
                <input type="text" required value={empId} onChange={e => setEmpId(e.target.value)} className="input-premium" placeholder="e.g. 1001" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase ml-2">Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input-premium" placeholder="Full Legal Name" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase ml-2">Secure Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-premium" placeholder="••••••••" />
              </div>
              <button disabled={loading} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all mt-4">
                {loading ? 'PROVISIONING...' : 'CONFIRM ACCESS'}
              </button>
              {msg.text && <p className={`text-xs text-center mt-6 p-4 rounded-xl font-bold ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{msg.text}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
