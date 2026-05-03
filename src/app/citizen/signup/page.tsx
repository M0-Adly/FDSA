'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';

export default function CitizenSignup() {
  const { language } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [idImage, setIdImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!idImage) {
      setError(language === 'ar' ? 'صورة البطاقة مطلوبة' : 'National ID image is required');
      setLoading(false);
      return;
    }

    try {
      // AI Image Verification
      if (language === 'ar') setError('جاري فحص صورة البطاقة باستخدام الذكاء الاصطناعي...');
      else setError('Verifying ID card using AI...');

      const tf = await import('@tensorflow/tfjs');
      const model = await tf.loadLayersModel('/models/tfjs_model/model.json');

      const imgElement = document.createElement('img');
      imgElement.src = URL.createObjectURL(idImage);
      
      await new Promise((resolve, reject) => {
        imgElement.onload = resolve;
        imgElement.onerror = reject;
      });

      // Resize and normalize image (x / 255.0)
      const tensor = tf.browser.fromPixels(imgElement)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(tf.scalar(255.0))
        .expandDims(0);

      const prediction = model.predict(tensor) as any;
      const score = prediction.dataSync()[0];

      // Cleanup memory
      tensor.dispose();
      prediction.dispose();

      if (score > 0.5) {
        setError(language === 'ar' 
          ? `عذراً، هذه ليست صورة بطاقة هوية صحيحة. يرجى رفع صورة بطاقة حقيقية.` 
          : `Uploaded image is not a valid ID card. Please upload a real ID card.`);
        setLoading(false);
        return;
      }
      
      setError(''); // Clear verifying message
      
    } catch (err: any) {
      console.error("AI Verification failed:", err);
      // If AI fails to load or error happens, we can either block or allow.
      // We will allow it but log error to not block users if model fails to load.
      setError(''); 
    }

    const email = `${phone.trim()}@citizen.eg`;

    try {
      // 1. Create Auth account
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone: phone.trim(), role: 'citizen' },
        }
      });

      if (authError) throw authError;
      if (!signUpData.user) throw new Error('Failed to create account');

      // 2. Auto-login to perform upsert
      await supabase.auth.signInWithPassword({ email, password });

      // 3. Create profile in Database
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        full_name: fullName,
        role: 'citizen',
        phone: phone.trim(),
        national_id: nationalId.trim(),
        account_status: 'pending'
      }, { onConflict: 'id' });

      if (profileError) {
        if (profileError.message.includes('national_id')) {
          throw new Error(language === 'ar' ? 'الرقم القومي مسجل بالفعل' : 'National ID already exists');
        }
        throw profileError;
      }

      // 4. Upload ID image
      if (idImage) {
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
      }

      window.location.href = '/citizen';
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التسجيل');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c1a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-15%] w-[70%] h-[70%] rounded-full bg-indigo-600/10 blur-[180px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/8 blur-[150px]" />
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dot-grid" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <span className="text-3xl">👥</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">Create Account</h1>
          <p className="text-white/30 text-sm">Register as a citizen to report emergencies</p>
        </div>

        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 mb-6">
          <Link href="/citizen/login" className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white/70 transition-colors">
            Sign In
          </Link>
          <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-lg">
            New Account
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-5 flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase mb-2">Full Name</label>
              <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ahmed Mohamed" className="input-premium" />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/50 uppercase mb-2">Phone Number</label>
              <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" className="input-premium" />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/50 uppercase mb-2">Password</label>
              <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} minLength={6} placeholder="min 6 characters" className="input-premium" />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/50 uppercase mb-2">National ID (14 Digits)</label>
              <input required value={nationalId} onChange={e => setNationalId(e.target.value)} placeholder="14-digit National ID" className="input-premium" minLength={14} maxLength={14} />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/50 uppercase mb-2">National ID Image *</label>
              <label className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-xl border-2 border-dashed border-white/15 hover:border-indigo-400/40 cursor-pointer transition bg-white/[0.02]">
                <span className="text-xs text-white/40">{idImage ? idImage.name : 'Click to upload image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setIdImage(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black rounded-xl transition-all disabled:opacity-50 mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
