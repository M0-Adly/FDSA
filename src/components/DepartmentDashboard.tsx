import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import { type Report, type ICSAssessment, getICSTriage } from '../lib/crisis-system';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, MapPin, X, Shield, Activity, Users, Zap } from 'lucide-react';
import { ICSModal } from './ICSModal';

export function DepartmentDashboard() {
  const { t } = useTranslation();
  const { system, version, selectedNode, setSelectedNode, resolveReport, fileReport, isMassCrisis } = useAppStore();

  // ICS flow state
  const [showICS, setShowICS] = useState(false);
  // After ICS completes, store the result then show the description form
  const [icsResult, setIcsResult] = useState<{ priority: number; score: number; assessment: ICSAssessment } | null>(null);
  const [showFileForm, setShowFileForm] = useState(false);
  const [desc, setDesc] = useState('');
  const [secondaryDept, setSecondaryDept] = useState('');

  const node = useMemo(() => {
    if (!selectedNode) return null;
    return system.findNode(system.root, selectedNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, version, selectedNode]);

  if (!node || node.name === 'Central Crisis System') {
    return (
      <div className="flex-1 glass-panel p-6 flex flex-col items-center justify-center text-slate-500 text-center gap-4">
        <Activity className="w-16 h-16 text-slate-300 animate-pulse" />
        <div>
          <h2 className="text-xl font-bold text-slate-400">System Ready</h2>
          <p className="max-w-xs mx-auto">Select a District or Department from the hierarchy tree to monitor real-time status.</p>
        </div>
      </div>
    );
  }

  // ─── District Overview ────────────────────────────────────────────────────
  if (node.isDistrict) {
    const childrenArr = node.children.toArray();
    return (
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="glass-panel p-6 bg-indigo-600 text-white flex justify-between items-center shadow-xl rounded-2xl">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3"><Shield /> {node.name} Dashboard</h2>
            <p className="opacity-80 text-sm mt-1">Overview of all 5 critical departments in this jurisdiction.</p>
          </div>
          <Users className="w-12 h-12 opacity-20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {childrenArr.map(dept => {
            const resourcePct = dept.resources.total > 0 ? (dept.resources.available / dept.resources.total) * 100 : 0;
            return (
              <motion.div
                whileHover={{ y: -5, boxShadow: '0 20px 40px -10px rgba(0,0,0,.15)' }}
                onClick={() => setSelectedNode(dept.name)}
                key={dept.name}
                className="glass-panel p-5 cursor-pointer hover:border-indigo-500 transition-all"
              >
                <h4 className="font-bold text-lg mb-3">{dept.name.split(' - ')[0]}</h4>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-blue-500 font-bold">Ongoing: {dept.ongoingReports.size()}/3</span>
                  <span className="text-amber-500 font-bold">Pending: {dept.pendingReports.size()}</span>
                </div>
                {/* Resource bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Resources</span>
                    <span className={dept.resources.available <= 1 ? 'text-red-500 font-black' : 'text-emerald-500 font-black'}>
                      {dept.resources.available}/{dept.resources.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${resourcePct > 50 ? 'bg-emerald-500' : resourcePct > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${resourcePct}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Department Detail ────────────────────────────────────────────────────
  const ongoing  = node.ongoingReports.toArray();
  const pending  = node.pendingReports.toArray();
  const resolved = node.resolvedArchive.toArray();

  // Derive department type label from node name
  const deptType = node.name.includes('Fire') ? 'Fire' : node.name.includes('Police') ? 'Theft' :
    node.name.includes('Ambulance') ? 'Medical' : node.name.includes('Water') ? 'Water Leak' : 'Power Outage';

  const handleICSComplete = (priority: number, score: number, assessment: ICSAssessment) => {
    setIcsResult({ priority, score, assessment });
    setShowICS(false);
    setShowFileForm(true);         // Now show the simple description form
  };

  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!icsResult) return;
    const district = node.name.includes('D1') ? 'First District' : 'Second District';
    const deptShort = node.name.split(' ')[0];
    fileReport(district, deptShort, deptType, desc, icsResult.priority, secondaryDept || undefined, icsResult.score);
    setShowFileForm(false);
    setIcsResult(null);
    setDesc('');
    setSecondaryDept('');
  };

  const TriageBadge = ({ score }: { score?: number }) => {
    if (!score) return null;
    const t = getICSTriage(score);
    const colors = { RED: 'bg-red-500', ORANGE: 'bg-orange-500', YELLOW: 'bg-yellow-400' };
    return (
      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${colors[t.color]}`}>
        {t.color}
      </span>
    );
  };

  const ReportCard = ({ r, typeObj }: { r: Report; typeObj: 'ongoing' | 'pending' | 'resolved' }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className={`p-4 rounded-xl border-t-4 shadow-sm ${
        typeObj === 'ongoing'  ? 'bg-white dark:bg-slate-900 border-blue-500' :
        typeObj === 'pending'  ? 'bg-white dark:bg-slate-900 border-amber-500' :
                                 'bg-slate-50 dark:bg-slate-900/50 border-emerald-500'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-mono text-slate-400">#{r.id}</span>
        <div className="flex items-center gap-1">
          <TriageBadge score={r.icsScore} />
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            r.priority >= 4 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
            r.priority === 3 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
            'bg-slate-100 text-slate-500'
          }`}>P{r.priority}</span>
        </div>
      </div>

      <h3 className="font-bold text-sm truncate mt-1">{r.description}</h3>

      {/* Show supporting depts if any (notification badge only) */}
      {r.supportingDepts && r.supportingDepts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {r.supportingDepts.map(sd => (
            <span key={sd} className="text-[9px] font-semibold px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> {sd.split(' - ')[0]}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Step {r.timestamp}</span>
        {typeObj === 'resolved' && r.duration !== undefined && (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ {r.duration} steps</span>
        )}
      </div>

      {typeObj === 'ongoing' && (
        <button
          onClick={() => resolveReport(r.id)}
          className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-black transition"
        >
          MARK RESOLVED
        </button>
      )}
    </motion.div>
  );

  return (
    <>
      {/* ICS SCORING MODAL */}
      <AnimatePresence>
        {showICS && <ICSModal onComplete={handleICSComplete} onCancel={() => setShowICS(false)} />}
      </AnimatePresence>

      {/* SIMPLE DESCRIPTION FORM (after ICS) */}
      <AnimatePresence>
        {showFileForm && icsResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.form
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              onSubmit={handleFileSubmit}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl w-full max-w-md shadow-2xl border dark:border-slate-800"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black">{t('actions.file')}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">Dispatching to</span>
                    <span className="text-xs font-bold text-indigo-500">{node.name}</span>
                    <span className="text-xs font-bold text-slate-400">·</span>
                    <span className="text-xs font-bold">Priority {icsResult.priority}</span>
                    <span className="text-xs font-bold text-slate-400">·</span>
                    <span className="text-xs text-slate-400">ICS Score {icsResult.score}</span>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowFileForm(false); setIcsResult(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <X />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Incident Description</label>
                  <textarea
                    autoFocus required
                    value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="Describe the emergency..."
                    className="w-full p-4 rounded-2xl border dark:border-slate-800 bg-slate-50 dark:bg-black/20 outline-none focus:border-indigo-500 h-28 resize-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Support Department (optional)</label>
                  <select
                    value={secondaryDept} onChange={e => setSecondaryDept(e.target.value)}
                    className="w-full p-3 rounded-2xl border dark:border-slate-800 bg-slate-50 dark:bg-black/20 text-sm font-medium outline-none"
                  >
                    <option value="">No Secondary Support</option>
                    <option value={node.name.includes('D1') ? 'Police Dept - D1' : 'Police Dept - D2'}>Police Dept (same district)</option>
                    <option value={node.name.includes('D1') ? 'Ambulance - D1' : 'Ambulance - D2'}>Ambulance (same district)</option>
                    <option value={node.name.includes('D1') ? 'Fire Dept - D1' : 'Fire Dept - D2'}>Fire Dept (same district)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">* Supporting dept is <strong>notified</strong> only — no duplicate report is created.</p>
                </div>

                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl transition active:scale-95">
                  DISPATCH INCIDENT
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN DEPARTMENT PANEL */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden rounded-2xl border transition-all duration-500 ${
        isMassCrisis ? 'border-red-500 shadow-2xl shadow-red-500/20' : 'border-slate-200 dark:border-slate-800'
      }`}>
        {/* Dept Header */}
        <div className={`p-5 flex justify-between items-center transition-colors ${
          isMassCrisis ? 'bg-red-600 text-white' : 'bg-white dark:bg-slate-900'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isMassCrisis ? 'bg-white/20' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">{node.name}</h2>
              <div className="flex items-center gap-3 text-xs opacity-70 mt-0.5">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Resources: {node.resources.available}/{node.resources.total}
                </span>
                {node.resources.available === 0 && (
                  <span className="font-black text-red-300 animate-pulse">⚠ NO UNITS AVAILABLE</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowICS(true)}
              className={`px-5 py-2.5 rounded-xl font-black text-sm shadow-lg transition active:scale-95 ${
                isMassCrisis ? 'bg-white text-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {t('actions.file')} →
            </button>
            <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Three Columns */}
        <div className="flex-1 overflow-hidden flex bg-slate-50 dark:bg-black/40 divide-x dark:divide-slate-800">
          {/* Ongoing */}
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                {t('ongoing')}
              </h3>
              <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {ongoing.length}/3
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {ongoing.map(r => <ReportCard key={r.id} r={r} typeObj="ongoing" />)}
              </AnimatePresence>
              {ongoing.length === 0 && (
                <div className="text-center py-12 opacity-20">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs font-bold">Clear</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending */}
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden bg-amber-500/[0.03]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> {t('pending')}
              </h3>
              <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {pending.map(r => <ReportCard key={r.id} r={r} typeObj="pending" />)}
              </AnimatePresence>
              {pending.length === 0 && (
                <div className="text-center py-12 opacity-20">
                  <Clock className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs font-bold">No Backlog</p>
                </div>
              )}
            </div>
          </div>

          {/* Resolved */}
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden bg-emerald-500/[0.03]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> {t('resolved')}
              </h3>
              <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500 px-2 py-0.5 rounded-full">
                {resolved.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {[...resolved].reverse().map((r, i) => <ReportCard key={`${r.id}-${i}`} r={r} typeObj="resolved" />)}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
