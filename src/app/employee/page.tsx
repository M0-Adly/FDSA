'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CrisisManager } from '@/lib/CrisisManager';
import { useLanguage } from '@/components/LanguageContext';
import dynamic from 'next/dynamic';
const MapVisualizer = dynamic(() => import('@/components/MapVisualizer').then(mod => mod.MapVisualizer), { ssr: false });
const TreeVisualizer = dynamic(() => import('@/components/TreeVisualizer').then(mod => mod.TreeVisualizer), { ssr: false });

export default function EmployeeDashboard() {
  const { t, language } = useLanguage();
  const [manager] = useState(() => new CrisisManager());
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  
  // Profile completion states
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [compName, setCompName] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compNID, setCompNID] = useState('');
  const [compFile, setCompFile] = useState<File | null>(null);
  const [compLoading, setCompLoading] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.replace('/employee/login'); return; }
      setUser(session.user);

      const userEmail = session.user.email?.toLowerCase();
      const isSuperAdmin = userEmail === 'adlyneedbonus@aast.com' || userEmail === 'adly1@aast.com';

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError || !profileData) {
        const tempName = session.user.email?.split('@')[0] || 'User';
        const { data: newProfile, error: createError } = await supabase.from('profiles').upsert({
          id: session.user.id,
          role: isSuperAdmin ? 'admin' : 'employee',
          full_name: tempName,
          account_status: 'approved'
        }).select().single();
        
        if (createError) throw createError;
        setProfile({ ...newProfile, isSuperAdmin });
        if (!isSuperAdmin) setIsProfileIncomplete(true);
      } else {
        setProfile({ ...profileData, isSuperAdmin: isSuperAdmin || profileData.role === 'admin' });
        if (!isSuperAdmin && profileData.role === 'employee' && (!profileData.national_id || !profileData.phone)) {
          setIsProfileIncomplete(true);
          setCompName(profileData.full_name || '');
        }
      }

      await manager.initialize();
      setInitialized(true);
    } catch (err) {
      console.error('Init error:', err);
      setInitialized(true); 
    }
  };

  const handleProfileComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompLoading(true);
    try {
      let imageUrl = profile?.national_id_image_url;
      if (compFile) {
        const fileExt = compFile.name.split('.').pop();
        const fileName = `emp_${user.id}_${Date.now()}.${fileExt}`;
        await supabase.storage.from('national-ids').upload(fileName, compFile);
        const { data: { publicUrl } } = supabase.storage.from('national-ids').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('profiles').update({
        full_name: compName,
        phone: compPhone,
        national_id: compNID,
        national_id_image_url: imageUrl
      }).eq('id', user.id);

      if (error) throw error;
      setIsProfileIncomplete(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCompLoading(false);
    }
  };

  if (!initialized) return (
    <div className="min-h-screen bg-[#080c1a] flex flex-col items-center justify-center font-sans">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
        </div>
      </div>
      <div className="mt-8 font-black animate-pulse text-emerald-500/50 tracking-[0.3em] text-xs uppercase">جاري تهيئة مركز القيادة...</div>
    </div>
  );

  if (isProfileIncomplete && !profile?.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#080c1a] flex items-center justify-center p-4 font-sans text-right" dir="rtl">
        {/* Same completion UI but styled nicely */}
        <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-3xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">إكمال السجل الوظيفي</h2>
            <p className="text-white/30 text-xs font-bold">يرجى تسجيل بياناتك الرسمية للوصول للعمليات</p>
          </div>
          <form onSubmit={handleProfileComplete} className="space-y-4">
            <input required value={compName} onChange={e => setCompName(e.target.value)} placeholder="الاسم الكامل" className="input-premium" />
            <input required value={compPhone} onChange={e => setCompPhone(e.target.value)} placeholder="رقم الهاتف" className="input-premium" />
            <input required value={compNID} onChange={e => setCompNID(e.target.value)} placeholder="الرقم القومي (14 رقم)" className="input-premium" minLength={14} maxLength={14} />
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <label className="text-[10px] font-black text-white/30 uppercase block mb-3">رفع صورة البطاقة</label>
              <input type="file" required accept="image/*" onChange={e => setCompFile(e.target.files?.[0] || null)} className="text-xs text-white/40" />
            </div>
            <button disabled={compLoading} className="w-full py-5 bg-amber-600 text-white rounded-2xl font-black uppercase shadow-xl shadow-amber-500/20 hover:bg-amber-500 transition-all">
              {compLoading ? 'جاري المعالجة...' : 'تأكيد وحفظ'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Determine if database is empty to show a warning
  const isDbEmpty = manager.root.children.toArray().length === 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050811] font-sans text-right text-white" dir="rtl">
      
      {/* Top Navbar */}
      <nav className="h-20 bg-white/[0.02] border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/10">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">بوابة العمليات الميدانية</h1>
            <p className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase mt-0.5">National Crisis Command</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-black/40 rounded-xl border border-white/5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Step</span>
            <span className="text-lg font-black text-white font-mono leading-none">{manager.simStep}</span>
          </div>

          <div className="h-8 w-px bg-white/10 hidden md:block"></div>

          <div className="flex items-center gap-4">
            <div className="text-left hidden sm:block">
              <h3 className="text-sm font-black text-white/90">{profile?.full_name}</h3>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{profile?.isSuperAdmin ? 'Super Admin' : 'Field Agent'}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shadow-lg border border-white/10 ${
              profile?.isSuperAdmin ? 'bg-indigo-600 shadow-indigo-600/20' : 'bg-emerald-600 shadow-emerald-600/20'
            }`}>
              {profile?.isSuperAdmin ? 'AD' : 'EM'}
            </div>
            
            {profile?.isSuperAdmin && (
              <button 
                onClick={() => window.location.replace('/employee/admin')} 
                className="ml-4 px-6 py-3 bg-white/5 hover:bg-indigo-600 border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 group"
              >
                <span>لوحة التحكم العليا</span>
                <svg className="w-4 h-4 text-white/40 group-hover:text-white transition-colors rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Right Sidebar - Hierarchy */}
        <aside className="w-80 bg-white/[0.01] border-l border-white/5 flex flex-col z-40 backdrop-blur-md">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
            <h2 className="text-sm font-black text-white/70 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              الهيكل التنظيمي
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {isDbEmpty ? (
              <div className="p-6 text-center border border-dashed border-red-500/20 rounded-2xl bg-red-500/5 mt-10">
                <span className="text-3xl mb-3 block">⚠️</span>
                <h3 className="text-red-400 font-black text-sm mb-2">قاعدة البيانات فارغة</h3>
                <p className="text-[10px] text-white/40 leading-relaxed font-bold">لم يتم العثور على الأقسام والمناطق. يرجى تشغيل كود الـ SQL المرفق لإنشائها.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {manager.root.children.toArray().map(district => (
                  <div key={district.id} className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="px-4 py-3 bg-black/20 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-black text-white">{language === 'ar' ? district.name_ar : district.name_en}</span>
                    </div>
                    <div className="p-2 space-y-1">
                      {district.children.toArray().map(dept => {
                        const isSelected = selectedNode?.id === dept.id;
                        return (
                          <button 
                            key={dept.id} 
                            onClick={() => setSelectedNode(dept)} 
                            className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all flex justify-between items-center group ${
                              isSelected ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-transparent border-transparent hover:bg-white/5'
                            }`}
                          >
                            <span className={`font-bold ${isSelected ? 'text-blue-400' : 'text-white/60 group-hover:text-white/90'}`}>
                              {language === 'ar' ? dept.name_ar : dept.name_en}
                            </span>
                            {(dept.ongoingReports.size() > 0 || dept.pendingReports.size() > 0) && (
                              <div className="flex gap-1">
                                {dept.ongoingReports.size() > 0 && <span className="w-5 h-5 flex items-center justify-center bg-blue-500/20 text-blue-400 text-[9px] font-black rounded-md">{dept.ongoingReports.size()}</span>}
                                {dept.pendingReports.size() > 0 && <span className="w-5 h-5 flex items-center justify-center bg-amber-500/20 text-amber-400 text-[9px] font-black rounded-md">{dept.pendingReports.size()}</span>}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Center Content Area */}
        <div className="flex-1 flex flex-col relative z-10 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.05),transparent_50%)]">
          {selectedNode ? (
             <div className="p-8 h-full flex flex-col overflow-hidden animate-fade-in">
                {/* Node Header */}
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                      🏢
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white">{language === 'ar' ? selectedNode.name_ar : selectedNode.name_en}</h2>
                      <div className="flex gap-4 mt-2">
                        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black rounded-lg">عمليات جارية: {selectedNode.ongoingReports.size()} / 3</span>
                        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black rounded-lg">قائمة الانتظار: {selectedNode.pendingReports.size()}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black hover:bg-white/10 transition-colors flex items-center gap-2">
                    العودة للخريطة <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                </div>

                {/* Lists Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                   {/* Ongoing */}
                   <div className="flex flex-col bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent"></div>
                      <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                        <h3 className="text-blue-400 text-sm font-black flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          البلاغات الجارية (Active)
                        </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {selectedNode.ongoingReports.toArray().length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-white/20">
                            <span className="text-4xl mb-4 opacity-50">🛡️</span>
                            <p className="font-bold text-sm">لا توجد بلاغات قيد التنفيذ</p>
                          </div>
                        ) : (
                          selectedNode.ongoingReports.toArray().map((r:any) => (
                            <div key={r.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl group hover:border-blue-500/30 transition-all">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="text-lg font-black text-white">{r.type}</h4>
                                  <span className="text-[10px] text-white/30 font-mono mt-1 block">ID: {r.id.substring(0,8)}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button onClick={async () => { await manager.resolveReport(r.id, user.id); window.location.reload(); }} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition-all">
                                    إنهاء البلاغ (Resolve)
                                  </button>
                                  {r.lat && r.lng && (
                                    <button onClick={() => { setFocusedLocation([r.lat, r.lng]); setSelectedNode(null); }} className="px-5 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">
                                      موقع المشكلة 📍
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-white/60 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">{r.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                   </div>

                   {/* Pending */}
                   <div className="flex flex-col bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-amber-500 to-transparent"></div>
                      <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                        <h3 className="text-amber-400 text-sm font-black flex items-center gap-2">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          قائمة الانتظار (Pending)
                        </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {selectedNode.pendingReports.toArray().length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-white/20">
                            <span className="text-4xl mb-4 opacity-50">⏳</span>
                            <p className="font-bold text-sm">قائمة الانتظار خالية</p>
                          </div>
                        ) : (
                          selectedNode.pendingReports.toArray().map((r:any) => (
                            <div key={r.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl group hover:border-amber-500/30 transition-all">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="text-lg font-black text-white">{r.type}</h4>
                                  <span className="px-2 py-0.5 mt-2 inline-block bg-red-500/10 text-red-400 rounded text-[9px] font-black border border-red-500/20">أولوية: {r.priority}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button onClick={async () => { await manager.startResponse(r.id, user.id); window.location.reload(); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all">
                                    بدء الاستجابة
                                  </button>
                                  {r.lat && r.lng && (
                                    <button onClick={() => { setFocusedLocation([r.lat, r.lng]); setSelectedNode(null); }} className="px-5 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">
                                      موقع المشكلة 📍
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-white/60 leading-relaxed line-clamp-2">{r.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                   </div>
                </div>
             </div>
          ) : (
            // Full screen Map and Tree view when no node is selected
            <div className="h-full flex flex-col animate-fade-in relative">
               {!isDbEmpty && (
                 <div className="absolute top-6 left-6 z-10 flex flex-col gap-4">
                    <div className="bg-black/50 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                      <h3 className="text-emerald-400 font-black text-xs mb-2">حالة النظام العام</h3>
                      <p className="text-white/70 text-[10px] max-w-[200px] leading-relaxed">حدد قطاعاً من الهيكل الإداري يميناً أو من الخريطة لعرض تفاصيل البلاغات.</p>
                    </div>
                 </div>
               )}
               
               <div className="flex-1 relative border-b border-white/10">
                 {/* Decorative Map overlay shadow */}
                 <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10 pointer-events-none"></div>
                 <MapVisualizer rootNode={manager.root} focusedLocation={focusedLocation} />
               </div>
               
               <div className="h-[35%] min-h-[300px] bg-black/40">
                 <TreeVisualizer rootNode={manager.root} selectedDeptId={null} onNodeClick={(n:any) => setSelectedNode(n)} />
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
