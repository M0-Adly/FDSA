'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CrisisManager } from '@/lib/CrisisManager';
import { useLanguage } from '@/components/LanguageContext';
import { TreeVisualizer } from '@/components/TreeVisualizer';
import { MapVisualizer } from '@/components/MapVisualizer';

export default function EmployeeDashboard() {
  const { t, language } = useLanguage();
  const [manager] = useState(() => new CrisisManager());
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  
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
      
      // FIX: If profile is missing, don't hang. Auto-create a temporary one or prompt.
      if (profileError || !profileData) {
        console.warn('Profile missing, creating temp profile...');
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
      setInitialized(true); // Still set to true to show something or error UI
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
    <div className="min-h-screen bg-[#080c1a] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
      <div className="font-black animate-pulse text-white/20 tracking-widest text-xs uppercase">Initializing System Interface...</div>
    </div>
  );

  if (isProfileIncomplete && !profile?.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#080c1a] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-3xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-2 italic">COMPLETE PROFILE</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em]">Official Personnel Records</p>
          </div>
          <form onSubmit={handleProfileComplete} className="space-y-4">
            <input required value={compName} onChange={e => setCompName(e.target.value)} placeholder="Full Name" className="input-premium" />
            <input required value={compPhone} onChange={e => setCompPhone(e.target.value)} placeholder="Phone Number" className="input-premium" />
            <input required value={compNID} onChange={e => setCompNID(e.target.value)} placeholder="National ID (14 Digits)" className="input-premium" minLength={14} maxLength={14} />
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <label className="text-[10px] font-black text-white/30 uppercase block mb-3">Upload National ID Photo</label>
              <input type="file" required accept="image/*" onChange={e => setCompFile(e.target.files?.[0] || null)} className="text-xs text-white/40" />
            </div>
            <button disabled={compLoading} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all">
              {compLoading ? 'PROCESSING...' : 'ESTABLISH SECURITY PROFILE'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#080c1a]">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xs font-black text-white/40 uppercase tracking-widest">{t('system_hierarchy')}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {manager.root.children.toArray().map(district => (
            <div key={district.id} className="mb-4">
              <div className="px-3 py-1 text-[10px] font-black text-emerald-500 uppercase tracking-tighter mb-1">{language === 'ar' ? district.name_ar : district.name_en}</div>
              {district.children.toArray().map(dept => (
                <button key={dept.id} onClick={() => setSelectedNode(dept)} className={`w-full text-right p-3 rounded-xl border text-sm mb-1 transition-all ${selectedNode?.id === dept.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'}`}>
                  {language === 'ar' ? dept.name_ar : dept.name_en}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-white/10 px-8 flex items-center justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] font-bold text-white/40">STEP: <span className="text-emerald-400">{manager.simStep}</span></div>
            <button onClick={() => window.location.replace('/employee/admin')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-indigo-600/20">Control Panel</button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{profile?.full_name}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-black text-xs uppercase">{profile?.role?.substring(0,2)}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {selectedNode ? (
             <div className="space-y-6">
                <h2 className="text-3xl font-black text-white italic">{language === 'ar' ? selectedNode.name_ar : selectedNode.name_en}</h2>
                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                      <h3 className="text-blue-400 text-xs font-black uppercase mb-4 tracking-widest">Active Operations</h3>
                      {selectedNode.ongoingReports.toArray().map((r:any) => (
                        <div key={r.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-2 flex justify-between items-center">
                          <span className="text-white font-bold">{r.type}</span>
                          <button onClick={async () => { await manager.resolveReport(r.id, user.id); window.location.reload(); }} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase">Resolve</button>
                        </div>
                      ))}
                   </div>
                   <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                      <h3 className="text-amber-400 text-xs font-black uppercase mb-4 tracking-widest">Pending Requests</h3>
                      {selectedNode.pendingReports.toArray().map((r:any) => (
                        <div key={r.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-2 flex justify-between items-center">
                          <span className="text-white font-bold">{r.type}</span>
                          <button onClick={async () => { await manager.startResponse(r.id, user.id); window.location.reload(); }} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase">Deploy</button>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          ) : (
            <div className="h-full space-y-8">
              <div className="h-[400px]"><MapVisualizer rootNode={manager.root} /></div>
              <div className="h-[400px]"><TreeVisualizer rootNode={manager.root} selectedDeptId={null} onNodeClick={(n:any) => setSelectedNode(n)} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
