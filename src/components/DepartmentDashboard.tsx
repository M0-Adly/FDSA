import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import { type Report } from '../lib/crisis-system';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, MapPin, X } from 'lucide-react';

export function DepartmentDashboard() {
  const { t } = useTranslation();
  const { system, version, selectedNode, setSelectedNode, resolveReport, fileReport, transferPending } = useAppStore();
  const [showFileModal, setShowFileModal] = useState(false);
  const [type, setType] = useState('Fire');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState(1);

  const dept = useMemo(() => {
    if (!selectedNode) return null;
    return system.findNode(system.root, selectedNode);
  }, [system, version, selectedNode]);

  if (!dept || dept.isDistrict || dept.name === 'Central Crisis System') {
    return (
      <div className="flex-1 glass-panel p-6 flex items-center justify-center text-slate-500">
        Select a specific department node in the tree to view details.
      </div>
    );
  }

  const ongoing = dept.ongoingReports.toArray();
  const pending = dept.pendingReports.toArray();
  const resolved = dept.resolvedArchive.toArray(); // Array from Circular

  const handleResolve = (id: number) => resolveReport(id);
  const handleTransfer = (id: number) => {
    const siblingName = dept.name.includes('D1') ? dept.name.replace('D1', 'D2') : dept.name.replace('D2', 'D1');
    transferPending(dept.name, siblingName, id);
  };

  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const district = dept.name.includes('D1') ? 'First District' : 'Second District';
    const deptShort = dept.name.split(' ')[0];
    fileReport(district, deptShort, type, desc, priority);
    setShowFileModal(false);
    setDesc('');
    setPriority(1);
    setType('Fire');
  };

  const ReportCard = ({ r, typeObj }: { r: Report, typeObj: 'ongoing' | 'pending' | 'resolved' }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
      className={`p-4 rounded-xl border relative overflow-hidden shadow-sm ${
        typeObj === 'ongoing' ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
        typeObj === 'pending' ? 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
        'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold text-sm tracking-widest text-slate-500">#{r.id}</span>
        <span className="text-xs font-bold px-2 py-1 bg-white/50 dark:bg-black/40 rounded-full">PRIORITY {r.priority}</span>
      </div>
      <h3 className="font-semibold text-lg">{r.type}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{r.description}</p>
      
      <div className="mt-4 flex justify-between items-center bg-white/40 dark:bg-black/20 p-2 rounded-lg backdrop-blur-sm -mx-2 -mb-2 px-4 shadow-inner">
        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Step: {r.timestamp}</span>
        {typeObj === 'ongoing' && (
          <button onClick={() => handleResolve(r.id)} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full transition font-semibold">
            {t('actions.resolve')}
          </button>
        )}
        {typeObj === 'pending' && (
          <button onClick={() => handleTransfer(r.id)} className="text-xs bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-3 py-1.5 rounded-full transition font-semibold">
            {t('actions.transfer')}
          </button>
        )}
        {typeObj === 'resolved' && (
           <span className="text-emerald-600 dark:text-emerald-400 font-bold"><CheckCircle2 className="w-5 h-5"/></span>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="flex-1 glass-panel flex flex-col h-full overflow-hidden border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-black/20 backdrop-blur-md z-10">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <MapPin className="text-indigo-500" /> {dept.name}
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFileModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition shadow-lg shadow-indigo-600/20">
            {t('actions.file')}
          </button>
          <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ongoing */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400 pb-2 border-b border-blue-200 dark:border-blue-900/50">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            {t('ongoing')} ({ongoing.length}/3)
          </h3>
          <AnimatePresence>
            {ongoing.map(r => <ReportCard key={r.id} r={r} typeObj="ongoing" />)}
            {ongoing.length === 0 && <p className="text-sm text-slate-400 italic">No ongoing reports.</p>}
          </AnimatePresence>
        </div>

        {/* Pending */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500 pb-2 border-b border-amber-200 dark:border-amber-900/50">
            <AlertCircle className="w-4 h-4" />
            {t('pending')} ({pending.length})
          </h3>
          <AnimatePresence>
            {pending.map(r => <ReportCard key={r.id} r={r} typeObj="pending" />)}
            {pending.length === 0 && <p className="text-sm text-slate-400 italic">No pending reports.</p>}
          </AnimatePresence>
        </div>

        {/* Resolved */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-500 pb-2 border-b border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="w-4 h-4" />
            {t('resolved')} (Last {resolved.length})
          </h3>
          <AnimatePresence>
            {resolved.map(r => <ReportCard key={r.id} r={r} typeObj="resolved" />)}
            {resolved.length === 0 && <p className="text-sm text-slate-400 italic">No resolved reports.</p>}
          </AnimatePresence>
        </div>
      </div>

      {/* File Modal */}
      {showFileModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onSubmit={handleFileSubmit} className="glass-panel p-6 w-full max-w-sm flex flex-col gap-4">
            <h3 className="text-lg font-bold">{t('actions.file')}</h3>
            
            <label className="text-sm font-semibold">{t('type')}</label>
            <select value={type} onChange={e => setType(e.target.value)} className="p-2 rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-700">
              <option value="Fire">Fire</option>
              <option value="Theft">Theft</option>
              <option value="Accident">Accident</option>
              <option value="Water Leak">Water Leak</option>
              <option value="Power Outage">Power Outage</option>
            </select>

            <label className="text-sm font-semibold">{t('priority')} (1-5)</label>
            <input type="number" min="1" max="5" value={priority} onChange={e => setPriority(Number(e.target.value))} className="p-2 rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-700" />

            <label className="text-sm font-semibold">{t('description')}</label>
            <textarea required value={desc} onChange={e => setDesc(e.target.value)} className="p-2 rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-700 h-24 resize-none"></textarea>

            <div className="flex gap-2 justify-end mt-2">
              <button type="button" onClick={() => setShowFileModal(false)} className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">{t('undo')}</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">{t('submit')}</button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}
