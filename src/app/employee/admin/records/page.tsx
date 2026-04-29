'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminRecords() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    time: 'all',
    dept: 'all',
    status: 'all'
  });
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: depts } = await supabase.from('departments').select('*');
    if (depts) setDepartments(depts);

    let query = supabase.from('reports').select('*, departments(name_en), districts(name_en)').order('created_at', { ascending: false });
    
    const { data: reportData } = await query;
    if (reportData) setReports(reportData);
    setLoading(false);
  };

  const filteredReports = reports.filter(r => {
    // Time filter
    if (filter.time !== 'all') {
      const date = new Date(r.created_at);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const day = 24 * 60 * 60 * 1000;
      if (filter.time === 'day' && diff > day) return false;
      if (filter.time === 'week' && diff > 7 * day) return false;
      if (filter.time === 'month' && diff > 30 * day) return false;
    }
    // Dept filter
    if (filter.dept !== 'all' && r.department_id.toString() !== filter.dept) return false;
    // Status filter
    if (filter.status !== 'all' && r.status !== filter.status) return false;
    
    return true;
  });

  return (
    <div className="min-h-screen bg-[#080c1a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">System Records Log</h1>
            <p className="text-white/40 text-sm mt-1">Comprehensive archive of all crisis reports and resolutions.</p>
          </div>
          <button onClick={() => window.location.replace('/employee/admin')} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition">
            ← Back to Admin
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <label className="block text-[10px] font-black text-white/30 uppercase mb-2">Time Period</label>
            <select value={filter.time} onChange={e => setFilter({...filter, time: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="all">All Time</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <label className="block text-[10px] font-black text-white/30 uppercase mb-2">Department</label>
            <select value={filter.dept} onChange={e => setFilter({...filter, dept: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name_en}</option>)}
            </select>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <label className="block text-[10px] font-black text-white/30 uppercase mb-2">Status</label>
            <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="ongoing">Ongoing</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/10">
                  <th className="px-6 py-4">Report ID</th>
                  <th className="px-6 py-4">Type & Details</th>
                  <th className="px-6 py-4">Dept / District</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-20 text-white/20">Loading records...</td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-20 text-white/20">No matching records found.</td></tr>
                ) : filteredReports.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 font-mono text-[10px] text-white/40">#{r.id.substring(0,8)}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-white/90">{r.type}</div>
                      <div className="text-xs text-white/40 truncate max-w-xs">{r.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-white/70">{r.departments?.name_en}</div>
                      <div className="text-[10px] text-white/30 uppercase">{r.districts?.name_en}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        r.status === 'resolved' ? (r.citizen_confirmed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20') :
                        r.status === 'ongoing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-white/30 border-white/10'
                      }`}>
                        {r.status === 'resolved' ? (r.citizen_confirmed ? 'Confirmed' : 'Awaiting Citizen') : r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-white/40">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
