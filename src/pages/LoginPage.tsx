import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signUpCitizen, signInCitizen, signInEmployee } from '../lib/auth';
import { Shield, User, Lock, Phone, Upload, Eye, EyeOff, ChevronRight, AlertCircle } from 'lucide-react';

type Mode = 'citizen-login' | 'citizen-signup' | 'employee-login';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode]         = useState<Mode>('citizen-login');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Citizen login fields
  const [cEmail,    setCEmail]    = useState('');
  const [cPassword, setCPassword] = useState('');

  // Citizen signup fields
  const [sEmail,    setSEmail]    = useState('');
  const [sPassword, setSPassword] = useState('');
  const [sName,     setSName]     = useState('');
  const [sPhone,    setSPhone]    = useState('');
  const [sFile,     setSFile]     = useState<File | null>(null);

  // Employee login fields
  const [empId,     setEmpId]     = useState('');
  const [empPass,   setEmpPass]   = useState('');

  const handleCitizenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await signInCitizen(cEmail, cPassword);
    if (error) { setError(error); setLoading(false); return; }
    navigate('/citizen');
  };

  const handleCitizenSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sFile) { setError('Please upload your National ID image'); return; }
    setLoading(true); setError(null);
    const { error } = await signUpCitizen({
      email: sEmail, password: sPassword,
      fullName: sName, phone: sPhone, nationalIdFile: sFile,
    });
    if (error) { setError(error); setLoading(false); return; }
    navigate('/citizen');
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await signInEmployee(empId, empPass);
    if (error) { setError(error); setLoading(false); return; }
    navigate('/');
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-indigo-400 focus:bg-white/15 transition text-sm';
  const labelCls = 'text-xs font-bold uppercase tracking-widest text-white/60 mb-1 block';

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#080c1a]">
      {/* Animated background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 mb-4 shadow-xl shadow-indigo-500/20">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">National Crisis Management</h1>
          <p className="text-white/50 text-sm mt-1">Aswan Governorate • Arab Republic of Egypt</p>
        </motion.div>

        {/* Tab Selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 mb-6"
        >
          {(['citizen-login', 'citizen-signup', 'employee-login'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                mode === m
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {m === 'citizen-login'  ? 'Citizen Login' :
               m === 'citizen-signup' ? 'Sign Up'       : 'Gov. Staff'}
            </button>
          ))}
        </motion.div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-8 shadow-2xl"
          >
            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mb-5 flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Citizen Login */}
            {mode === 'citizen-login' && (
              <form onSubmit={handleCitizenLogin} className="space-y-5">
                <div>
                  <label className={labelCls}>Email Address</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type="email" required value={cEmail} onChange={e => setCEmail(e.target.value)}
                      placeholder="your@email.com" className={inputCls + ' pl-10'} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type={showPass ? 'text' : 'password'} required value={cPassword} onChange={e => setCPassword(e.target.value)}
                      placeholder="••••••••" className={inputCls + ' pl-10 pr-10'} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50">
                  {loading ? 'Signing in…' : <><span>Sign In</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {/* Citizen Signup */}
            {mode === 'citizen-signup' && (
              <form onSubmit={handleCitizenSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}>Full Name</label>
                    <input required value={sName} onChange={e => setSName(e.target.value)}
                      placeholder="Ahmed Mohamed" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input required value={sPhone} onChange={e => setSPhone(e.target.value)}
                        placeholder="01xxxxxxxxx" className={inputCls + ' pl-10'} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" required value={sEmail} onChange={e => setSEmail(e.target.value)}
                      placeholder="you@email.com" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Password</label>
                    <input type={showPass ? 'text' : 'password'} required value={sPassword} onChange={e => setSPassword(e.target.value)}
                      placeholder="min 8 characters" minLength={8} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>National ID — Front Side</label>
                    <label className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-xl border-2 border-dashed border-white/20 hover:border-indigo-400/60 cursor-pointer transition bg-white/5">
                      <Upload className="w-6 h-6 text-white/40" />
                      <span className="text-xs text-white/50">{sFile ? sFile.name : 'Click to upload image'}</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => setSFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50">
                  {loading ? 'Creating account…' : <><span>Create Account</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {/* Employee Login */}
            {mode === 'employee-login' && (
              <form onSubmit={handleEmployeeLogin} className="space-y-5">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 text-center">
                  Government staff only — accounts are pre-created by admin
                </div>
                <div>
                  <label className={labelCls}>Employee ID</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input required value={empId} onChange={e => setEmpId(e.target.value)}
                      placeholder="e.g. 1001" className={inputCls + ' pl-10'} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type={showPass ? 'text' : 'password'} required value={empPass} onChange={e => setEmpPass(e.target.value)}
                      placeholder="••••••••" className={inputCls + ' pl-10 pr-10'} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 disabled:opacity-50">
                  {loading ? 'Authenticating…' : <><span>Access Employee Dashboard</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          <Link to="/" className="hover:text-white/40 transition">← Back to Employee Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
