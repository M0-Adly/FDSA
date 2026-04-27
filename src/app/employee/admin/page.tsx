'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    const res = await fetch('/api/admin/create-employee', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: empId,
        fullName: name,
        password: password
      })
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      setMsg({ type: 'success', text: `Employee ${empId} created successfully!` });
      setEmpId('');
      setName('');
      setPassword('');
    } else {
      setMsg({ type: 'error', text: data.error });
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-950">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
          <span className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500">🛡️</span>
          Admin Control Center
        </h1>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-slate-200">Register New Government Employee</h2>
          
          {msg.text && (
            <div className={`p-4 rounded-lg mb-6 text-sm font-medium border ${
              msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Employee ID</label>
              <input 
                type="text" required value={empId} onChange={e => setEmpId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. 1024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
              <input 
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Ahmed Ali"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Minimum 6 characters"
              />
            </div>
            
            <button 
              disabled={loading}
              className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Deploy Employee Access'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
