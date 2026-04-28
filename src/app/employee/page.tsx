'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CrisisManager } from '@/lib/CrisisManager';
import { DepartmentNode } from '@/lib/structures/DepartmentTree';
import { TreeVisualizer } from '@/components/TreeVisualizer';
import { MapVisualizer } from '@/components/MapVisualizer';
export default function EmployeeDashboard() {
  const [manager] = useState(() => new CrisisManager());
  const [initialized, setInitialized] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DepartmentNode | null>(null);
  const [user, setUser] = useState<any>(null);
  const [simStep, setSimStep] = useState(0);
  
  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.replace('/employee/login'); return; }
      setUser(session.user);

      try {
        await supabase.from('profiles').upsert({
          id: session.user.id, role: 'employee', full_name: session.user.email?.split('@')[0] || 'Employee',
        }, { onConflict: 'id', ignoreDuplicates: true });
      } catch {}

      try {
        await manager.initialize();
        setSimStep(manager.simStep);
      } catch (err) { console.warn('Manager init warning:', err); }

      setInitialized(true);
    } catch (err) {
      console.error('Dashboard init error:', err);
      window.location.replace('/employee/login');
    }
  };

  const refreshState = () => {
    setSimStep(manager.simStep);
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

  const handleStartResponse = async (reportId: string) => {
    if (!user) return;
    try {
      await manager.startResponse(reportId, user.id);
      refreshState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTransfer = async (reportId: string) => {
    if (!user || !selectedNode) return;
    const targetDistrictId = selectedNode.district_id === 1 ? 2 : 1;
    const targetDept = manager.root.children.toArray()
      .find(d => d.district_id === targetDistrictId)?.children.toArray()
      .find(d => d.name_en === selectedNode.name_en);
    
    if (targetDept) {
      await manager.transferPending(reportId, targetDept.id, user.id);
      refreshState();
    }
  };

  const getPriorityColor = (p: number) => {
    if (p >= 4) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (p === 3) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  if (!initialized) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-white/40 font-mono text-sm tracking-widest uppercase font-bold">Initializing Neural Crisis Network...</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Sidebar / Tree View */}
      <div className="w-80 border-r border-white/10 bg-white/[0.02] overflow-y-auto flex flex-col backdrop-blur-sm">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            System Hierarchy
          </h2>
        </div>

        <div className="p-3 space-y-6 flex-1 overflow-y-auto">
          {manager.root.children.toArray().map(district => (
            <div key={district.id} className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{district.name_en}</span>
              </div>
              <div className="pl-3 space-y-1">
                {district.children.toArray().map(dept => {
                  const isSelected = selectedNode?.id === dept.id;
                  const oSize = dept.ongoingReports.size();
                  const pSize = dept.pendingReports.size();
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedNode(dept)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all border ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                          : 'bg-white/[0.02] border-transparent hover:bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <span className={`font-semibold ${isSelected ? 'text-emerald-400' : 'text-white/70'}`}>
                        {dept.name_en}
                      </span>
                      <div className="flex gap-1.5 items-center">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black border ${oSize === 3 ? 'bg-red-500/20 text-red-400 border-red-500/30' : oSize > 0 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-white/30 border-white/10'}`} title="Ongoing Reports">
                          {oSize}
                        </span>
                        <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black border ${pSize > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-white/5 text-white/30 border-white/10'}`} title="Pending Queue">
                          {pSize}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03),transparent)]">
        {/* Actions Bar */}
        <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-white/[0.02] backdrop-blur-md shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Sim Step</span>
              <span className="font-black text-emerald-400 font-mono text-lg ml-1">{simStep}</span>
            </div>
            
            <div className="h-6 w-px bg-white/10" />

            <button 
              onClick={handleEscalateAll}
              className="group flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 text-xs font-black uppercase tracking-wider"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Global Escalation
            </button>
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedNode ? (
            <div className="h-full flex flex-col">
              {/* Dept Header */}
              <div className="mb-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <span className="text-2xl">🏢</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedNode.name_en}</h2>
                  <div className="flex items-center gap-3 text-xs font-bold text-white/40 uppercase tracking-wider mt-1">
                    <span>Active: <span className="text-white/80">{selectedNode.ongoingReports.size()}/3</span></span>
                    <span>•</span>
                    <span>Pending: <span className="text-white/80">{selectedNode.pendingReports.size()}</span></span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Ongoing Reports */}
                <div className="flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                    <h3 className="font-black text-sm uppercase tracking-widest text-blue-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      Ongoing Responses
                    </h3>
                    <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-black border border-blue-500/30">
                      {selectedNode.ongoingReports.size()}/3
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {selectedNode.ongoingReports.toArray().length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-white/20">
                        <svg className="w-16 h-16 mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                        <p className="font-bold text-sm">No active emergencies</p>
                      </div>
                    ) : (
                      selectedNode.ongoingReports.toArray().map(report => (
                        <div key={report.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-blue-500/30 transition-colors group relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-black text-lg text-white/90">{report.type}</h4>
                              <p className="text-[10px] text-white/30 font-mono mt-0.5">ID: {report.id.substring(0,8)}</p>
                            </div>
                            <button 
                              onClick={() => handleResolve(report.id)}
                              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/10"
                            >
                              Resolve
                            </button>
                          </div>
                          <p className="text-sm text-white/60 mb-5 leading-relaxed">{report.description}</p>
                          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${getPriorityColor(report.priority)}`}>
                              Priority {report.priority}
                            </span>
                            <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/40 uppercase font-mono">
                              Step: {report.timestamp}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pending Queue */}
                <div className="flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                    <h3 className="font-black text-sm uppercase tracking-widest text-amber-400 flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Pending Queue
                    </h3>
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-black border border-amber-500/30">
                      {selectedNode.pendingReports.size()}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {selectedNode.pendingReports.toArray().length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-white/20">
                        <svg className="w-16 h-16 mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        <p className="font-bold text-sm">Queue is clear</p>
                      </div>
                    ) : (
                      selectedNode.pendingReports.toArray().map(report => (
                        <div key={report.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.08] transition-colors relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-bold text-white/90">{report.type}</h4>
                              <p className="text-xs text-white/50 line-clamp-1 mt-1">{report.description}</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleStartResponse(report.id)}
                                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider"
                              >
                                Start
                              </button>
                              <button 
                                onClick={() => handleTransfer(report.id)}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/50 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider"
                                title="Transfer to sibling district"
                              >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
                                Transfer
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase ${getPriorityColor(report.priority)}`}>
                              P{report.priority}
                            </span>
                            <span className="text-[10px] font-mono text-white/30 uppercase">
                              Wait: {simStep - report.timestamp} steps
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-6">
              <div className="flex-1 min-h-[300px]">
                <MapVisualizer rootNode={manager.root} />
              </div>
              <div className="flex-1 min-h-[300px]">
                <TreeVisualizer 
                  rootNode={manager.root} 
                  selectedDeptId={null} 
                  onNodeClick={(node: any) => setSelectedNode(node)} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
