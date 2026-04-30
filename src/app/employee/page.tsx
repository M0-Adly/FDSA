'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CrisisManager } from '@/lib/CrisisManager';
import { DepartmentNode } from '@/lib/structures/DepartmentTree';
import { TreeVisualizer } from '@/components/TreeVisualizer';
import { MapVisualizer } from '@/components/MapVisualizer';
import { useLanguage } from '@/components/LanguageContext';

export default function EmployeeDashboard() {
  const { t, language } = useLanguage();
  const [manager] = useState(() => new CrisisManager());
  const [initialized, setInitialized] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DepartmentNode | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [simStep, setSimStep] = useState(0);
  const [showBackupModal, setShowBackupModal] = useState<string | null>(null);
  const [backupDepts, setBackupDepts] = useState<number[]>([]);
  
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

      // Fetch Profile - DO NOT UPSERT HERE TO AVOID OVERWRITING ADMIN ROLE
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError || !profileData) {
        // If no profile exists, this user shouldn't be here or needs setup
        // But for safety, we'll just check if we can proceed
        console.error('Profile not found');
        return;
      }

      setProfile(profileData);

      // Only force profile completion for employees, admins have full access
      if (profileData.role === 'employee' && (!profileData.national_id || !profileData.phone)) {
        setIsProfileIncomplete(true);
        setCompName(profileData.full_name || '');
      }

      await manager.initialize();
      setSimStep(manager.simStep);
      setInitialized(true);
    } catch (err) {
      window.location.replace('/employee/login');
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
      init();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCompLoading(false);
    }
  };

  const refreshState = () => {
    setSimStep(manager.simStep);
    setSelectedNode(selectedNode ? manager.root.findNode(selectedNode.id) : null);
  };

  const handleResolve = async (reportId: string) => {
    if (!user) return;
    await manager.resolveReport(reportId, user.id);
    refreshState();
  };

  const handleEscalateAll = async () => {
    if (!user) return;
    await manager.escalateAll(user.id);
    refreshState();
    alert('Global Escalation Triggered');
  };

  const handleStartResponse = async (reportId: string) => {
    if (!user) return;
    try {
      await manager.startResponse(reportId, user.id);
      refreshState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTransfer = async (reportId: string) => {
    if (!user || !selectedNode) return;
    const targetDistrictId = selectedNode.district_id === 1 ? 2 : 1;
    const targetDept = manager.root.children.toArray()
      .find(d => d.district_id === targetDistrictId)?.children.toArray()
      .find(d => d.name_en === selectedNode.name_en);
    
    if (targetDept) {
      await manager.transferPending(reportId, targetDept.id, user.id);
      refreshState();
    }
  };

  const handleAddBackup = async (reportId: string) => {
    if (!user || backupDepts.length === 0) return;
    await manager.assignBackup(reportId, backupDepts, user.id);
    setShowBackupModal(null);
    setBackupDepts([]);
    refreshState();
  };

  const getPriorityColor = (p: number) => {
    if (p >= 4) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (p === 3) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  if (isProfileIncomplete) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-[#080c1a]">
        <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-3xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-2">{language === 'ar' ? 'إكمال بيانات الملف الشخصي' : 'Complete Your Profile'}</h2>
            <p className="text-white/30 text-xs uppercase tracking-widest">{language === 'ar' ? 'يرجى إكمال بياناتك للمتابعة إلى لوحة العمل' : 'Please fill your details to access the dashboard'}</p>
          </div>
          <form onSubmit={handleProfileComplete} className="space-y-5">
            <input required value={compName} onChange={e => setCompName(e.target.value)} placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full Name'} className="input-premium" />
            <input required value={compPhone} onChange={e => setCompPhone(e.target.value)} placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone Number'} className="input-premium" />
            <input required value={compNID} onChange={e => setCompNID(e.target.value)} placeholder={language === 'ar' ? 'الرقم القومي (14 رقم)' : 'National ID'} className="input-premium" minLength={14} maxLength={14} />
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase ml-2">{language === 'ar' ? 'صورة البطاقة الشخصية' : 'ID Image Upload'}</label>
              <input type="file" required accept="image/*" onChange={e => setCompFile(e.target.files?.[0] || null)} className="text-xs text-white/40 block" />
            </div>
            <button disabled={compLoading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20">
              {compLoading ? '...' : (language === 'ar' ? 'حفظ البيانات والدخول' : 'Save & Enter')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!initialized) return (
    <div className="flex-1 flex items-center justify-center font-black animate-pulse text-white/20">INITIALIZING...</div>
  );

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="w-80 border-r border-white/10 bg-white/[0.02] overflow-y-auto flex flex-col backdrop-blur-sm">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            {t('system_hierarchy')}
          </h2>
        </div>
        <div className="p-3 space-y-6 flex-1 overflow-y-auto">
          {manager.root.children.toArray().map(district => (
            <div key={district.id} className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{language === 'ar' ? district.name_ar : district.name_en}</span>
              </div>
              <div className="pl-3 space-y-1">
                {district.children.toArray().map(dept => {
                  const isSelected = selectedNode?.id === dept.id;
                  const oSize = dept.ongoingReports.size();
                  const pSize = dept.pendingReports.size();
                  return (
                    <button key={dept.id} onClick={() => setSelectedNode(dept)} className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all border ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-transparent hover:bg-white/5 hover:border-white/10'}`}>
                      <span className={`font-semibold ${isSelected ? 'text-emerald-400' : 'text-white/70'}`}>{language === 'ar' ? dept.name_ar : dept.name_en}</span>
                      <div className="flex gap-1.5 items-center">
                        <span className="w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black border bg-blue-500/10 text-blue-400 border-blue-500/20">{oSize}</span>
                        <span className="w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black border bg-amber-500/10 text-amber-400 border-amber-500/20">{pSize}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">{t('sim_step')}</span>
              <span className="font-black text-emerald-400 font-mono text-lg ml-1">{simStep}</span>
            </div>
            <button onClick={handleEscalateAll} className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-black uppercase">{t('global_escalation')}</button>
            {selectedNode && <button onClick={() => setSelectedNode(null)} className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-black uppercase">{t('back_to_overview')}</button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedNode ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                <h3 className="font-black text-xs uppercase tracking-widest text-blue-400 mb-4">{t('ongoing_responses')}</h3>
                {selectedNode.ongoingReports.toArray().map(report => (
                  <div key={report.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white">{report.type}</h4>
                      <button onClick={() => handleResolve(report.id)} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase">Resolve</button>
                    </div>
                    <p className="text-xs text-white/40">{report.description}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                <h3 className="font-black text-xs uppercase tracking-widest text-amber-400 mb-4">{t('pending_queue')}</h3>
                {selectedNode.pendingReports.toArray().map(report => (
                  <div key={report.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white">{report.type}</h4>
                      <button onClick={() => handleStartResponse(report.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase">Start</button>
                    </div>
                    <p className="text-xs text-white/40">{report.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-6">
              <div className="flex-1"><MapVisualizer rootNode={manager.root} /></div>
              <div className="flex-1"><TreeVisualizer rootNode={manager.root} selectedDeptId={null} onNodeClick={(node: any) => setSelectedNode(node)} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
