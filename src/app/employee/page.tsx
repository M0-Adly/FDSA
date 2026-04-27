'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CrisisManager } from '@/lib/CrisisManager';
import { DepartmentNode, Report } from '@/lib/structures/DepartmentTree';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  ArrowRightLeft, 
  Undo2, 
  Zap,
  MessageSquare
} from 'lucide-react';

export default function EmployeeDashboard() {
  const [manager] = useState(() => new CrisisManager());
  const [initialized, setInitialized] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DepartmentNode | null>(null);
  const [user, setUser] = useState<any>(null);
  const [simStep, setSimStep] = useState(0);
  const [isArabic, setIsArabic] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/employee/login');
      return;
    }
    
    // verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (profile?.role !== 'employee' && profile?.role !== 'admin') {
      await supabase.auth.signOut();
      router.push('/employee/login');
      return;
    }

    setUser(session.user);
    await manager.initialize();
    setSimStep(manager.simStep);
    setInitialized(true);
  };

  const refreshState = () => {
    setSimStep(manager.simStep);
    // Force re-render of components using the manager
    setSelectedNode(selectedNode ? manager.root.findNode(selectedNode.id) : null);
  };

  const handleResolve = async (reportId: string) => {
    if (!user) return;
    await manager.resolveReport(reportId, user.id);
    refreshState();
  };

  const handleEscalateAll = async () => {
    if (!user) return;
    await manager.escalateAll(user.id);
    refreshState();
    alert('Global Escalation Triggered');
  };

  const handleTransfer = async (reportId: string) => {
    if (!user || !selectedNode) return;
    // Simple transfer to sibling district for demo
    const targetDistrictId = selectedNode.district_id === 1 ? 2 : 1;
    const targetDept = manager.root.children.toArray()
      .find(d => d.district_id === targetDistrictId)?.children.toArray()
      .find(d => d.name_en === selectedNode.name_en);
    
    if (targetDept) {
      await manager.transferPending(reportId, targetDept.id, user.id);
      refreshState();
    }
  };

  // Helper to get all departments for the tree visualization
  const departments = useMemo(() => {
    if (!initialized) return [];
    const dists = manager.root.children.toArray();
    return dists.flatMap(dist => dist.children.toArray());
  }, [initialized, manager]);

  if (!initialized) return (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono">Initializing Neural Crisis Network...</p>
      </div>
    </div>
  );

  return (
    <div className={`flex-1 flex h-full ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Sidebar / Tree View */}
      <div className="w-80 border-r border-slate-800 bg-slate-900/30 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Departments</h2>
          <button 
            onClick={() => setIsArabic(!isArabic)}
            className="text-[10px] px-2 py-1 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 transition"
          >
            {isArabic ? 'ENGLISH' : 'العربية'}
          </button>
        </div>

        <div className="space-y-6">
          {manager.root.children.toArray().map(district => (
            <div key={district.id} className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400 px-2 py-1">
                <ChevronRight size={14} className="rotate-90" />
                <span className="text-sm font-bold">{isArabic ? district.name_ar : district.name_en}</span>
              </div>
              <div className="pl-4 space-y-1">
                {district.children.toArray().map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedNode(dept)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition ${
                      selectedNode?.id === dept.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{isArabic ? dept.name_ar : dept.name_en}</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-1.5 rounded">{dept.ongoingReports.size()}</span>
                      <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-1.5 rounded">{dept.pendingReports.size()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent)]">
        {/* Actions Bar */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-emerald-500" />
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Sim Step:</span>
              <span className="font-bold text-emerald-400 font-mono text-lg">{simStep}</span>
            </div>
            
            <div className="h-4 w-[1px] bg-slate-800"></div>

            <button 
              onClick={handleEscalateAll}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition text-xs font-bold"
            >
              <Zap size={14} />
              GLOBAL ESCALATION
            </button>
          </div>

          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md hover:bg-slate-700 transition text-xs font-bold">
            <Undo2 size={14} />
            UNDO ACTION
          </button>
        </div>

        {/* Dashboard Panels */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedNode ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Ongoing Reports */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Clock size={20} className="text-blue-400" />
                    Ongoing Reports
                    <span className="text-xs font-normal text-slate-500">({selectedNode.ongoingReports.size()}/3)</span>
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {selectedNode.ongoingReports.toArray().length === 0 && (
                    <div className="p-10 border-2 border-dashed border-slate-800 rounded-xl text-center text-slate-500 italic text-sm">
                      No active emergencies in this department.
                    </div>
                  )}
                  {selectedNode.ongoingReports.toArray().map(report => (
                    <div key={report.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl group hover:border-emerald-500/30 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-slate-100">{report.type}</h4>
                          <p className="text-xs text-slate-500 font-mono">ID: {report.id.substring(0,8)}</p>
                        </div>
                        <button 
                          onClick={() => handleResolve(report.id)}
                          className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-white transition text-xs font-bold"
                        >
                          RESOLVE
                        </button>
                      </div>
                      <p className="text-sm text-slate-400 mb-4 leading-relaxed">{report.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <div className="flex gap-4">
                           <div className="flex flex-col">
                             <span className="text-[10px] text-slate-500 uppercase">Priority</span>
                             <span className={`text-sm font-bold ${report.priority > 3 ? 'text-red-400' : 'text-blue-400'}`}>{report.priority}</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-slate-500 uppercase">Started Step</span>
                             <span className="text-sm font-mono text-slate-300">{report.timestamp}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Queue */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle size={20} className="text-yellow-400" />
                  Pending Queue
                  <span className="text-xs font-normal text-slate-500">(Priority Sorted)</span>
                </h3>
                
                <div className="space-y-3">
                  {selectedNode.pendingReports.toArray().length === 0 && (
                    <div className="p-10 border-2 border-dashed border-slate-800 rounded-xl text-center text-slate-500 italic text-sm">
                      Queue is empty.
                    </div>
                  )}
                  {selectedNode.pendingReports.toArray().map(report => (
                    <div key={report.id} className="bg-slate-900/40 border border-slate-800 border-l-yellow-500/50 border-l-4 rounded-xl p-4 transition hover:bg-slate-800/60">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-200">{report.type}</h4>
                          <p className="text-xs text-slate-500">{report.description.substring(0, 60)}...</p>
                        </div>
                        <button 
                          onClick={() => handleTransfer(report.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-400 rounded hover:text-white transition text-[10px] font-bold"
                        >
                          <ArrowRightLeft size={10} />
                          TRANSFER
                        </button>
                      </div>
                      <div className="mt-3 flex gap-4">
                         <span className="text-[10px] font-mono text-slate-500">PRIORITY: {report.priority}</span>
                         <span className="text-[10px] font-mono text-slate-500">STEP: {report.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
                 <Activity size={40} className="text-slate-800" />
              </div>
              <p className="text-sm font-mono">Select a department node to begin coordination</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant FAB / Panel could go here */}
      <div className="absolute bottom-8 right-8">
        <button className="w-14 h-14 bg-emerald-600 rounded-full shadow-2xl shadow-emerald-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
          <MessageSquare className="text-white" />
        </button>
      </div>
    </div>
  );
}
