'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Report {
  id: string;
  type: string;
  description: string;
  priority: number;
  status: string;
  created_at: string;
  department_id: number;
}

export default function CitizenDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(3);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      fetchDepartments(parseInt(selectedDistrict));
    }
  }, [selectedDistrict]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/citizen/login');
      return;
    }
    
    // verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (profile?.role !== 'citizen') {
      await supabase.auth.signOut();
      router.push('/citizen/login');
      return;
    }

    setUser(session.user);
    fetchMyReports(session.user.id);
  };

  const fetchDistricts = async () => {
    const { data } = await supabase.from('districts').select('*');
    if (data) setDistricts(data);
  };

  const fetchDepartments = async (districtId: number) => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('district_id', districtId);
    if (data) setDepartments(data);
  };

  const fetchMyReports = async (userId: string) => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    if (data) setReports(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !user) return;
    
    setSubmitting(true);
    
    // Auto detect type based on dept name (fallback mechanism)
    const dept = departments.find(d => d.id.toString() === selectedDept);
    let type = 'Other';
    if (dept) {
      if (dept.name_en.includes('Fire')) type = 'Fire';
      else if (dept.name_en.includes('Police')) type = 'Theft';
      else if (dept.name_en.includes('Ambulance')) type = 'Accident';
      else if (dept.name_en.includes('Water')) type = 'Water Leak';
      else if (dept.name_en.includes('Electricity')) type = 'Power Outage';
      else if (dept.name_en.includes('Gas')) type = 'Gas Leak';
    }

    const { error } = await supabase.from('reports').insert({
      department_id: parseInt(selectedDept),
      district_id: parseInt(selectedDistrict),
      description,
      priority,
      type,
      created_by: user.id
    });

    setSubmitting(false);

    if (!error) {
      setDescription('');
      setPriority(3);
      setSelectedDept('');
      fetchMyReports(user.id);
      alert('Report submitted successfully!');
    } else {
      alert('Error submitting report: ' + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="text-center mt-20 text-xl">Loading...</div>;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Submit Report Form */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-blue-600">Submit New Report</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
            <select 
              required
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedDept('');
              }}
            >
              <option value="">Select a district...</option>
              {districts.map(d => (
                <option key={d.id} value={d.id}>{d.name_en} - {d.name_ar}</option>
              ))}
            </select>
          </div>
          
          {selectedDistrict && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select 
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="">Select a department...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name_en} - {d.name_ar}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              required
              rows={4}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the emergency..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-5)</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" 
                max="5" 
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
              />
              <span className="font-bold text-lg text-blue-600">{priority}</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting || !selectedDept}
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {/* My Reports List */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">My Reports</h2>
        {reports.length === 0 ? (
          <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg">
            No reports submitted yet.
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {reports.map(report => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-1">{report.type}</h3>
                <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>Priority: {report.priority}</span>
                  <span>ID: {report.id.substring(0,8)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
