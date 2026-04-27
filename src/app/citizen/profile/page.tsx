'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CitizenProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/citizen/login');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="text-center mt-20 text-xl">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h2 className="text-3xl font-bold text-gray-800">My Profile</h2>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition font-medium"
        >
          Logout
        </button>
      </div>

      {profile && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 border-b border-gray-100 pb-4">
            <span className="text-gray-500 font-medium">Full Name</span>
            <span className="col-span-2 font-semibold text-gray-900">{profile.full_name}</span>
          </div>
          
          <div className="grid grid-cols-3 border-b border-gray-100 pb-4">
            <span className="text-gray-500 font-medium">Phone Number</span>
            <span className="col-span-2 font-semibold text-gray-900">{profile.phone}</span>
          </div>
          
          <div className="grid grid-cols-3 border-b border-gray-100 pb-4">
            <span className="text-gray-500 font-medium">Account Role</span>
            <span className="col-span-2 font-semibold text-gray-900 uppercase">{profile.role}</span>
          </div>

          <div>
            <span className="text-gray-500 font-medium block mb-3">National ID Image</span>
            {profile.national_id_image_url ? (
              <div className="border border-gray-200 rounded-lg p-2 max-w-sm">
                <img 
                  src={profile.national_id_image_url} 
                  alt="National ID" 
                  className="w-full h-auto rounded object-contain max-h-64"
                />
              </div>
            ) : (
              <span className="text-gray-400 italic">No image uploaded</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
