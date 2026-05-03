'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { CrisisManager } from '@/lib/CrisisManager';
import { useLanguage } from '@/components/LanguageContext';

const MapPicker = nextDynamic(() => import('@/components/MapPicker'), { ssr: false });

interface Report {
  id: string;
  type: string;
  description: string;
  priority: number;
  status: string;
  created_at: string;
  resolved_at?: string;
  department_id: number;
  citizen_confirmed?: boolean;
  departments?: { name_ar: string; name_en: string };
  districts?: { name_ar: string; name_en: string };
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
  const [tab, setTab] = useState<'reports' | 'submit' | 'resubmit' | 'notifications'>('reports');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<Report[]>([]);
  const [lastSeen, setLastSeen] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('lastSeenNotifications') || '1970-01-01' : '1970-01-01'
  );

  // Resubmit states
  const [resubmitName, setResubmitName] = useState('');
  const [resubmitID, setResubmitID] = useState('');
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);

  const [includeGps, setIncludeGps] = useState(false);
  const [manualLocation, setManualLocation] = useState<[number, number] | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchDistricts();
    fetchNotifications();
  }, []);

  // ... (keeping fetch methods unchanged)
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

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*, departments(name_ar, name_en), districts(name_ar, name_en)')
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  const handleTabChange = (newTab: typeof tab) => {
    setTab(newTab);
    if (newTab === 'notifications') {
      const now = new Date().toISOString();
      setLastSeen(now);
      localStorage.setItem('lastSeenNotifications', now);
    }
  };

  const unreadCount = notifications.filter(n => 
    n.resolved_at && new Date(n.resolved_at) > new Date(lastSeen)
  ).length;

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = profile.national_id_image_url;
      if (resubmitFile) {
        const fileExt = resubmitFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        await supabase.storage.from('national-ids').upload(fileName, resubmitFile);
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
      showToast(language === 'ar' ? 'تم إعادة تقديم البيانات بنجاح' : 'Resubmitted');
      setTab('reports');
      checkAuth();
    } catch (err: any) {
      showToast(err.message);
    } finally { setSubmitting(false); }
  };

    const showToast = (msg: string) => {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedDept || !user) return;
      setSubmitting(true);
      try {
        let lat = manualLocation ? manualLocation[0] : undefined;
        let lng = manualLocation ? manualLocation[1] : undefined;

        if (includeGps && !manualLocation) {
          showToast(language === 'ar' ? 'جاري تحديد موقعك الجغرافي (يرجى الانتظار)...' : 'Getting location (please wait)...');
          
          if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            showToast(language === 'ar' ? 'عذراً، الـ GPS يتطلب رابط آمن (HTTPS) ليعمل.' : 'GPS requires HTTPS to work.');
            setSubmitting(false);
            return;
          }

          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { 
                timeout: 15000, 
                enableHighAccuracy: true,
                maximumAge: 0
              });
            });
            lat = position.coords.latitude;
            lng = position.coords.longitude;
          } catch (err: any) {
            console.error("GPS Error:", err);
            let msg = language === 'ar' ? 'فشل تحديد الموقع التلقائي. يرجى استخداد الخريطة يدوياً.' : 'Auto-location failed. Please use the map manually.';
            showToast(msg);
            setShowMapPicker(true);
            setSubmitting(false);
            return; 
          }
        }

        const mgr = new CrisisManager();
        await mgr.initialize();
        await mgr.fileReport(
          [parseInt(selectedDept)], 
          { description, priority: parseInt(priority.toString()), lat, lng }, 
          user.id
        );
        
        showToast(language === 'ar' ? 'تم إرسال البلاغ بنجاح' : 'Report submitted successfully');
        setTab('reports');
        setDescription('');
        setPriority(3);
        setManualLocation(null);
        setShowMapPicker(false);
        fetchMyReports(user.id);
      } catch (err: any) {
        showToast(err.message);
      } finally { setSubmitting(false); }
    };


  const filteredReports = reports.filter(r => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Active') return r.status === 'pending' || r.status === 'ongoing';
    if (statusFilter === 'Awaiting Confirmation') return r.status === 'resolved' && !r.citizen_confirmed;
    if (statusFilter === 'Resolved') return r.status === 'resolved' && r.citizen_confirmed;
    return r.status.toLowerCase() === statusFilter.toLowerCase();
  });

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-white/20">LOADING...</div>;

  const isApproved = profile?.account_status === 'approved';
  const showBanner = profile && (
    (profile.account_status === 'approved' && reports.length === 0) || 
    profile.account_status === 'pending' || 
    profile.account_status === 'rejected' || 
    profile.account_status === 'suspended'
  );

  return (
    <div className="animate-fade-in">
      {showBanner && (
        <div className={`mb-8 p-5 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          profile.account_status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          profile.account_status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
          profile.account_status === 'suspended' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
          'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-4">
            <span className="text-2xl">{profile.account_status === 'approved' ? '✅' : profile.account_status === 'pending' ? '⏳' : '🚫'}</span>
            <p className="text-sm font-bold leading-relaxed">
              {profile.account_status === 'approved' ? (language === 'ar' ? 'تم قبول حسابك بنجاح' : 'Approved') :
               profile.account_status === 'pending' ? (language === 'ar' ? 'حسابك قيد المراجعة حالياً' : 'Reviewing') :
               profile.account_status === 'suspended' ? (language === 'ar' ? 'عذراً تم إيقاف حسابك لارتكابك شيء مخالف الرجاء التواصل مع الإدارة لحل المشكلة' : 'Suspended') :
               (language === 'ar' ? 'عذراً لم يتم قبول حسابك بسبب عدم وضوح البيانات الشخصية أو صورة البطاقة الشخصية الرجاء مراجعة البيانات وإعادة التقديم' : 'Rejected')}
            </p>
          </div>
          {profile.account_status === 'rejected' && (
            <button onClick={() => setTab('resubmit')} className="px-5 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase">
              {language === 'ar' ? 'إعادة التقديم' : 'Re-submit'}
            </button>
          )}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black">{t('welcome')}, <span className="text-indigo-400">{profile?.full_name}</span></h1>
        <p className="text-white/20 text-sm mt-1">{language === 'ar' ? 'لوحة التحكم الوطنية' : 'National Dashboard'}</p>
      </div>

      {/* DASHBOARD STATS RE-ADDED */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: t('total_reports'), value: reports.length, color: 'indigo', icon: '📋' },
          { label: t('ongoing'), value: reports.filter(r => r.status === 'ongoing').length, color: 'blue', icon: '🔵' },
          { label: t('resolved'), value: reports.filter(r => r.status === 'resolved').length, color: 'emerald', icon: '✅' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`bg-white/5 border border-white/10 rounded-3xl p-6 text-center backdrop-blur-xl transition hover:bg-white/10`}>
            <span className="text-3xl block mb-2">{icon}</span>
            <p className="text-4xl font-black mb-1">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 mb-8 w-fit">
        <button onClick={() => handleTabChange('reports')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${tab === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/70'}`}>
          {language === 'ar' ? 'بلاغاتي' : 'My Reports'}
        </button>
        <button onClick={() => handleTabChange('notifications')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all relative ${tab === 'notifications' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/70'}`}>
          {language === 'ar' ? 'الإشعارات' : 'Notifications'}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] items-center justify-center text-white font-black">{unreadCount}</span>
            </span>
          )}
        </button>
        <button onClick={() => isApproved && handleTabChange('submit')} disabled={!isApproved} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${!isApproved ? 'opacity-20' : tab === 'submit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/70'}`}>
          {language === 'ar' ? 'بلاغ جديد' : 'New Report'}
        </button>
      </div>

      <div className="animate-fade-in">
        {tab === 'reports' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap mb-4">
              {(['All', 'Active', 'Awaiting Confirmation', 'Resolved'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${statusFilter === s ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/30 hover:text-white/50'}`}>{t(s.toLowerCase().replace(/ /g, '_'))}</button>
              ))}
            </div>
            
            {reports.length === 0 ? <p className="py-20 text-center text-white/10 font-bold italic">No records yet.</p> :
              filteredReports.map(r => (
                <div key={r.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 group hover:bg-white/[0.08] transition-all">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${r.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                      {r.status === 'resolved' ? '✅' : '📄'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white/90">{r.type}</h3>
                      <p className="text-xs text-white/40">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* RESOLUTION CONFIRMATION RE-ADDED */}
                  <div className="flex items-center gap-4">
                    {r.status === 'resolved' && !r.citizen_confirmed && (
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          const mgr = new CrisisManager();
                          await mgr.confirmResolution(r.id, user.id);
                          fetchMyReports(user.id);
                          showToast(language === 'ar' ? 'تم تأكيد حل البلاغ' : 'Confirmed');
                        }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase hover:scale-105 transition-all">
                          {language === 'ar' ? 'تأكيد الحل' : 'Confirm Fixed'}
                        </button>
                        <button onClick={async () => {
                          const mgr = new CrisisManager();
                          await mgr.reopenReport(r.id, user.id);
                          fetchMyReports(user.id);
                          showToast(language === 'ar' ? 'تم إعادة فتح البلاغ' : 'Reopened');
                        }} className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-xl text-xs font-black uppercase hover:scale-105 transition-all">
                          {language === 'ar' ? 'لم يتم الحل' : 'Not Fixed'}
                        </button>
                      </div>
                    )}
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>{t(r.status)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><span>🔔</span> {language === 'ar' ? 'آخر التحديثات الوطنية' : 'Latest National Updates'}</h2>
            {notifications.length === 0 ? (
              <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/10">
                <p className="text-white/10 font-bold italic">{language === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-start gap-4 hover:bg-white/[0.08] transition-all border-l-4 border-l-emerald-500">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">✨</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white/90 leading-relaxed">
                      {language === 'ar' 
                        ? `تم حل مشكلة (${n.type}) في منطقة (${n.districts?.name_ar || 'غير معروف'}) بواسطة (${n.departments?.name_ar || 'الجهة المختصة'})`
                        : `The (${n.type}) issue in (${n.districts?.name_en || 'Unknown'}) has been resolved by (${n.departments?.name_en || 'Department'})`
                      }
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] text-white/30 uppercase font-black">{new Date(n.resolved_at!).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10"></span>
                      <span className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-widest">{language === 'ar' ? 'تم الإنجاز' : 'COMPLETED'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'submit' && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-xl mx-auto backdrop-blur-xl shadow-2xl">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><span>📝</span> {language === 'ar' ? 'تقديم بلاغ جديد' : 'New Report'}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">{language === 'ar' ? 'المنطقة' : 'District'}</label>
                  <select required value={selectedDistrict} onChange={e => {setSelectedDistrict(e.target.value); setSelectedDept('');}} className="input-premium">
                    <option value="" className="bg-slate-900 text-white">{language === 'ar' ? 'اختر المنطقة' : 'Select District'}</option>
                    {districts.map(d => <option key={d.id} value={d.id} className="bg-slate-900 text-white">{language === 'ar' ? d.name_ar : d.name_en}</option>)}
                  </select>
                </div>
                {selectedDistrict && (
                  <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">{language === 'ar' ? 'الجهة المختصة' : 'Department'}</label>
                    <select required value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="input-premium">
                      <option value="" className="bg-slate-900 text-white">{language === 'ar' ? 'اختر الجهة' : 'Select Dept'}</option>
                      {departments.map(d => <option key={d.id} value={d.id} className="bg-slate-900 text-white">{language === 'ar' ? d.name_ar : d.name_en}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">{language === 'ar' ? 'درجة الخطورة' : 'Priority'}</label>
                <select required value={priority} onChange={e => setPriority(Number(e.target.value))} className="input-premium mb-5">
                  <option value="1" className="bg-slate-900 text-white">{language === 'ar' ? 'منخفضة (1)' : 'Low (1)'}</option>
                  <option value="2" className="bg-slate-900 text-white">{language === 'ar' ? 'متوسطة (2)' : 'Medium (2)'}</option>
                  <option value="3" className="bg-slate-900 text-white">{language === 'ar' ? 'عالية (3)' : 'High (3)'}</option>
                  <option value="4" className="bg-slate-900 text-white">{language === 'ar' ? 'حالة طوارئ قصوى (4)' : 'Critical (4)'}</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">{language === 'ar' ? 'وصف المشكلة' : 'Description'}</label>
                <textarea required rows={5} value={description} onChange={e => setDescription(e.target.value)} className="input-premium resize-none" placeholder={language === 'ar' ? 'اشرح ما حدث بالتفصيل...' : 'Details...'} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="includeGps" 
                    checked={includeGps} 
                    onChange={e => setIncludeGps(e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-black/20 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                  />
                  <label htmlFor="includeGps" className="text-sm font-bold text-white/80 cursor-pointer flex-1">
                    {language === 'ar' ? 'إرفاق موقعي الحالي بدقة (GPS) 📍' : 'Include my current GPS location 📍'}
                  </label>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <button 
                    type="button" 
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    className="w-full flex items-center justify-between text-sm font-bold text-indigo-400"
                  >
                    <span>{language === 'ar' ? 'تحديد الموقع يدوياً على الخريطة 🗺️' : 'Select location manually on map 🗺️'}</span>
                    <span className="text-xs">{showMapPicker ? '▲' : '▼'}</span>
                  </button>

                  {showMapPicker && (
                    <div className="mt-4 space-y-4">
                      <MapPicker 
                        onLocationSelect={(coords: [number, number]) => setManualLocation(coords)} 
                        selectedLocation={manualLocation} 
                      />
                      <p className="text-[10px] text-white/40 italic text-center">
                        {/* Build Trigger: 2026-04-30-v4 */}
                        {language === 'ar' ? 'اضغط على الخريطة لتحديد مكان المشكلة بالضبط' : 'Click on the map to set the exact location'}
                      </p>
                      {manualLocation && (
                        <div className="flex items-center justify-between bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">الموقع محدد ✅</span>
                          <button type="button" onClick={() => setManualLocation(null)} className="text-[10px] text-white/20 hover:text-white/50">إلغاء</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 active:scale-95 disabled:opacity-50 mt-4">
                {submitting ? '...' : language === 'ar' ? 'إرسال البلاغ الآن' : 'Submit Report'}
              </button>
            </form>
          </div>
        )}

        {tab === 'resubmit' && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-lg mx-auto backdrop-blur-xl">
            <h2 className="text-xl font-black mb-6 text-red-400">{language === 'ar' ? 'تحديث بيانات الحساب' : 'Update Profile'}</h2>
            <form onSubmit={handleResubmit} className="space-y-6">
              <input required value={resubmitName} onChange={e => setResubmitName(e.target.value)} className="input-premium" placeholder="Name" />
              <input required value={resubmitID} onChange={e => setResubmitID(e.target.value)} className="input-premium" placeholder="ID" />
              <input type="file" onChange={e => setResubmitFile(e.target.files?.[0] || null)} className="text-xs text-white/40" />
              <button type="submit" disabled={submitting} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20">
                {submitting ? '...' : language === 'ar' ? 'إرسال للمراجعة' : 'Submit Review'}
              </button>
              <button type="button" onClick={() => setTab('reports')} className="w-full text-xs text-white/20 hover:text-white/40 mt-4">Cancel</button>
            </form>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl animate-slide-up z-[200] border border-white/10 backdrop-blur-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
