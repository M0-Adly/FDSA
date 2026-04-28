'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CitizenSignup() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [idImage, setIdImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const email = `${phone.trim()}@citizen.eg`;

    try {
      // STEP 1: إنشاء حساب Auth
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone.trim(),
            role: 'citizen',
          },
        }
      });

      if (authError) {
        if (authError.message.includes('rate limit')) {
          throw new Error('تم تجاوز حد المحاولات. انتظر دقيقة وحاول مجدداً.');
        }
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          // المستخدم موجود — حاول تسجيل الدخول
          const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
          if (loginErr) throw new Error('رقم الهاتف مسجل بالفعل. جرب تسجيل الدخول بكلمة السر الصحيحة.');
          window.location.href = '/citizen';
          return;
        }
        throw authError;
      }

      if (!signUpData.user) throw new Error('Failed to create account');

      // STEP 2: تسجيل دخول فوراً
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // الحساب اتعمل لكن محتاج تأكيد
        window.location.href = '/citizen/login';
        return;
      }

      // STEP 3: إنشاء البروفايل صراحة
      await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        full_name: fullName,
        role: 'citizen',
        phone: phone.trim(),
      }, { onConflict: 'id' });

      // STEP 4: رفع الصورة (اختياري)
      if (idImage) {
        try {
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
        } catch {
          // تجاهل خطأ رفع الصورة
        }
      }

      // STEP 5: التوجيه
      window.location.href = '/citizen';

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التسجيل');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">Citizen Registration</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Mohamed Ali"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="text"
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01012345678"
          />
          <p className="text-xs text-gray-400 mt-1">سيُستخدم رقم الهاتف لتسجيل الدخول لاحقاً</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            placeholder="6 characters minimum"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            National ID Image <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            className="w-full p-2 border border-gray-300 rounded outline-none"
            onChange={(e) => setIdImage(e.target.files?.[0] || null)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition font-medium mt-2 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/citizen/login" className="text-blue-600 hover:underline">Login here</Link>
      </div>
    </div>
  );
}
