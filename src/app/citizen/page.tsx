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
  const [tab, setTab] = useState<'reports' | 'submit' | 'resubmit'>('reports');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  // Resubmit states
  const [resubmitName, setResubmitName] = useState('');
  const [resubmitID, setResubmitID] = useState('');
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);

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
      if (profileData) {
        setProfile(profileData);
        setResubmitName(profileData.full_name);
        setResubmitID(profileData.national_id || '');
      }

      fetchMyReports(session.user.id);
    } catch (err) {
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

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = profile.national_id_image_url;
      
      if (resubmitFile) {
        const fileExt = resubmitFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('national-ids').upload(fileName, resubmitFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('national-ids').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('profiles').update({
        full_name: resubmitName,
        national_id: resubmitID,
        national_id_image_url: imageUrl,
        account_status: 'pending'
      }).eq('id', user.id);

      if (error) throw error;
      setToast(language === 'ar' ? 'تم إعادة تقديم البيانات بنجاح' : 'Data resubmitted successfully');
      setTab('reports');
      checkAuth();
    } catch (err: any) {
      setToast('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !user) return;
    setSubmitting(true);
    try {
      const mgr = new CrisisManager();
      await mgr.initialize();
      await mgr.fileReport([parseInt(selectedDept)], { description, priority: parseInt(priority.toString()) }, user.id);
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

  if (loading) return <div className="flex items-center justify-center py-20 text-white/20 animate-pulse font-black uppercase">Loading...</div>;

  const isApproved = profile?.account_status === 'approved';
  const showBanner = profile && (
    (profile.account_status === 'approved' && reports.length === 0) || 
    profile.account_status === 'pending' || 
    profile.account_status === 'rejected' || 
    profile.account_status === 'suspended'
  );

  return (
    <>
      {showBanner && (
        <div className={`mb-6 p-5 rounded-3xl border shadow-xl animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-4 ${
          profile.account_status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          profile.account_status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
          profile.account_status === 'suspended' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
          'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-4">
            <span className="text-2xl">
              {profile.account_status === 'approved' ? '✅' : profile.account_status === 'pending' ? '⏳' : profile.account_status === 'suspended' ? '🚫' : '⚠️'}
            </span>
            <div className="text-center sm:text-left">
              <p className="font-black uppercase tracking-wider text-xs mb-1">{language === 'ar' ? 'حالة الحساب' : 'Account Status'}</p>
              <p className="text-sm font-bold leading-relaxed max-w-lg">
                {profile.account_status === 'approved' ? (language === 'ar' ? 'تم قبول حسابك بنجاح' : 'Account Approved Successfully') :
                 profile.account_status === 'pending' ? (language === 'ar' ? 'حسابك قيد المراجعة حالياً' : 'Under Review') :
                 profile.account_status === 'suspended' ? (language === 'ar' ? 'عذراً تم إيقاف حسابك لارتكابك شيء مخالف الرجاء التواصل مع الإدارة لحل المشكلة' : 'Account Suspended') :
                 (language === 'ar' ? 'عذراً لم يتم قبول حسابك بسبب عدم وضوح البيانات الشخصية أو صورة البطاقة الشخصية الرجاء مراجعة البيانات وإعادة التقديم' : 'Account Rejected')}
              </p>
            </div>
          </div>
          {profile.account_status === 'rejected' && (
            <button onClick={() => setTab('resubmit')} className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase hover:scale-105 transition-all shadow-lg shadow-red-500/30">
              {language === 'ar' ? 'إعادة التقديم' : 'Re-submit'}
            </button>
          )}
        </div>
      )}

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black">{t('welcome')}, <span className="text-indigo-400">{profile?.full_name}</span></h1>
          <p className="text-white/20 text-sm mt-1">{language === 'ar' ? 'بوابة المواطن الرسمية' : 'Official Citizen Portal'}</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 mb-8 w-fit">
        <button onClick={() => setTab('reports')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${tab === 'reports' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/70'}`}>
          {language === 'ar' ? 'بلاغاتي' : 'My Reports'}
        </button>
        <button onClick={() => isApproved && setTab('submit')} disabled={!isApproved} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${!isApproved ? 'opacity-30' : tab === 'submit' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/70'}`}>
          {language === 'ar' ? 'بلاغ جديد' : 'New Report'}
        </button>
      </div>

      <div className="animate-fade-in">
        {tab === 'reports' && (
          <div className="grid grid-cols-1 gap-3">
            {reports.length === 0 ? <p className="text-center py-20 text-white/10 font-bold italic">No reports found.</p> :
              reports.map(r => (
                <div key={r.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center group hover:bg-white/[0.08] transition-all">
                  <div>
                    <h3 className="font-bold text-white/90">{r.type}</h3>
                    <p className="text-[10px] text-white/40 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${
                    r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>{r.status}</span>
                </div>
              ))
            }
          </div>
        )}

        {tab === 'submit' && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-lg">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><span>📝</span> {language === 'ar' ? 'تقديم بلاغ جديد' : 'New Report'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select required value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} className="input-premium">
                <option value="">{language === 'ar' ? 'اختر المنطقة' : 'Select District'}</option>
                {districts.map(d => <option key={d.id} value={d.id}>{language === 'ar' ? d.name_ar : d.name_en}</option>)}
              </select>
              {selectedDistrict && (
                <select required value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="input-premium">
                  <option value="">{language === 'ar' ? 'اختر الجهة' : 'Select Dept'}</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{language === 'ar' ? d.name_ar : d.name_en}</option>)}
                </select>
              )}
              <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} className="input-premium resize-none" placeholder={language === 'ar' ? 'وصف المشكلة...' : 'Describe...'} />
              <button type="submit" disabled={submitting} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30">
                {submitting ? '...' : language === 'ar' ? 'إرسال البلاغ' : 'Submit'}
              </button>
            </form>
          </div>
        )}

        {tab === 'resubmit' && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-lg">
            <h2 className="text-xl font-black mb-6 text-red-400">{language === 'ar' ? 'تحديث بيانات الحساب' : 'Update Profile'}</h2>
            <form onSubmit={handleResubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-white/30 uppercase mb-2 block">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                <input required value={resubmitName} onChange={e => setResubmitName(e.target.value)} className="input-premium" />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/30 uppercase mb-2 block">{language === 'ar' ? 'الرقم القومي' : 'National ID'}</label>
                <input required value={resubmitID} onChange={e => setResubmitID(e.target.value)} className="input-premium" />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/30 uppercase mb-2 block">{language === 'ar' ? 'صورة البطاقة الجديدة' : 'New ID Image'}</label>
                <input type="file" onChange={e => setResubmitFile(e.target.files?.[0] || null)} className="text-xs text-white/40" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all">
                {submitting ? '...' : language === 'ar' ? 'إرسال للمراجعة' : 'Submit for Review'}
              </button>
              <button type="button" onClick={() => setTab('reports')} className="w-full text-xs text-white/20 hover:text-white/40">Cancel</button>
            </form>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-2xl animate-slide-up z-[100]">
          {toast}
        </div>
      )}
    </>
  );
}
