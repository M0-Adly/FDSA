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
    setLoading(true);
    setError('');

    const email = `${phone}@citizen.eg`;

    try {
      // STEP 1: إنشاء الحساب أولاً — الـ Trigger سيُنشئ البروفايل تلقائياً
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: 'citizen',
          }
        }
      });

      if (authError) throw authError;
      if (!signUpData.user) throw new Error('Failed to create account');

      // STEP 2: تسجيل الدخول فوراً للحصول على session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // إذا فشل الدخول التلقائي (قد يحتاج تأكيد email)، نوجه لصفحة الدخول
        router.push('/citizen/login?msg=created');
        return;
      }

      // STEP 3: رفع صورة البطاقة بعد الحصول على session (اختياري)
      if (idImage && signInData.session) {
        const fileExt = idImage.name.split('.').pop();
        const fileName = `${signUpData.user.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('national-ids')
          .upload(fileName, idImage, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('national-ids')
            .getPublicUrl(fileName);

          await supabase.from('profiles').update({
            national_id_image_url: publicUrl
          }).eq('id', signUpData.user.id);
        }
        // نتجاهل خطأ الرفع — الحساب اتعمل، الصورة ممكن تتحدث لاحقاً
      }

      // STEP 4: التوجيه للوحة التحكم
      router.push('/citizen');

    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">Citizen Registration</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Mohamed Ali"
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
            placeholder="01012345678"
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
            placeholder="Minimum 6 characters"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            National ID Image (Front) <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            onChange={(e) => setIdImage(e.target.files?.[0] || null)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition font-medium mt-4 disabled:opacity-50"
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
