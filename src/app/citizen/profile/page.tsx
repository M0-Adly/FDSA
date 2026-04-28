'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CitizenProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/citizen/login'); return; }

    const { data } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).maybeSingle();

    if (data) setProfile(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-white/30 font-mono text-sm">Loading profile...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-indigo-600/20 to-blue-600/10 p-8 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-3xl">
                👤
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{profile?.full_name || 'Citizen'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-black uppercase">
                    {profile?.role || 'citizen'}
                  </span>
                  <span className="text-xs text-white/30">Account Active</span>
                </div>
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition border border-red-500/20">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>

        {/* Profile Details */}
        {profile && (
          <div className="p-8 space-y-6">
            {[
              { label: 'Full Name', value: profile.full_name, icon: '👤' },
              { label: 'Phone Number', value: profile.phone, icon: '📱' },
              { label: 'Account Role', value: (profile.role || 'citizen').toUpperCase(), icon: '🔑' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/10 transition">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0">
                  {icon}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">{label}</p>
                  <p className="text-white/90 font-semibold mt-0.5">{value || '—'}</p>
                </div>
              </div>
            ))}

            {/* National ID */}
            <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-3">National ID Image</p>
              {profile.national_id_image_url ? (
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <img 
                    src={profile.national_id_image_url} 
                    alt="National ID" 
                    className="w-full h-auto max-h-64 object-contain bg-black/20"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-white/20">
                  <span className="text-2xl mb-2 block">🪪</span>
                  <p className="text-xs italic">No image uploaded</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
