'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CitizenSignup() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [idImage, setIdImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idImage) {
      setError("National ID Image is required");
      return;
    }
    
    setLoading(true);
    setError('');

    const email = `${phone}@citizen.eg`;
    
    try {
      // 1. Upload ID Image
      const fileExt = idImage.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('national-ids')
        .upload(filePath, idImage);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('national-ids')
        .getPublicUrl(filePath);

      // 3. Create User Auth
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: 'citizen',
            national_id_image_url: publicUrl
          }
        }
      });

      if (authError) throw authError;

      // 4. Update Profile explicitly (since trigger might not handle the image URL)
      // Supabase trigger will create the row, we just need to update it with the image URL once user is logged in
      // Actually, standard practice with Supabase is to let trigger create row, then we update it, or insert explicitly if trigger is removed.
      // Wait, we set national_id_image_url in the migration? I didn't add that to the trigger. Let's update it directly if session exists.
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
         await supabase.from('profiles').update({
           national_id_image_url: publicUrl
         }).eq('id', session.user.id);
      }

      router.push('/citizen');
      
    } catch (err: any) {
      setError(err.message || "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">Citizen Registration</h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
      
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input 
            type="text" 
            required 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input 
            type="text" 
            required 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0123456789"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input 
            type="password" 
            required 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">National ID Image (Front)</label>
          <input 
            type="file" 
            accept="image/*"
            required 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            onChange={(e) => setIdImage(e.target.files?.[0] || null)}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition font-medium mt-4"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      
      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account? <Link href="/citizen/login" className="text-blue-600 hover:underline">Login here</Link>
      </div>
    </div>
  );
}
