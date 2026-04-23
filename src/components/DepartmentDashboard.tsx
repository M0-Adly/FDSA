import { useMemo, useState } from 'react';
import { AswanMap } from './AswanMap';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import { type Report, type ICSAssessment, getICSTriage, DEPT_TOTAL_CAPACITY } from '../lib/crisis-system';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, CheckCircle2, Clock, MapPin, X,
  Shield, Activity, Users, Zap, ArrowRightLeft, TrendingUp,
} from 'lucide-react';
import { ICSModal } from './ICSModal';

// ── T2: Egyptian Flag SVG (replaces eagle) ────────────────────────────────────
function EgyptianFlag({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 600" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Egyptian Flag">
      <rect width="900" height="200" y="0"   fill="#CE1126" />
      <rect width="900" height="200" y="200" fill="#FFFFFF" />
      <rect width="900" height="200" y="400" fill="#000000" />
      {/* Eagle of Saladin simplified */}
      <g transform="translate(450,300)" fill="#C09300">
        <ellipse cx="0" cy="10" rx="28" ry="36" />
        <circle  cx="0" cy="-22" r="16" />
        <polygon points="0,-18 8,-12 0,-6" fill="#b07800" />
        <path d="M-28,5 Q-55,-10 -58,-28 Q-42,-12 -28,0 Z" />
        <path d="M28,5 Q55,-10 58,-28 Q42,-12 28,0 Z" />
        <path d="M-15,46 L-20,58 M-15,46 L-15,58 M-15,46 L-10,56" stroke="#C09300" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M15,46 L10,58 M15,46 L15,58 M15,46 L20,56" stroke="#C09300" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <rect x="-10" y="4" width="20" height="26" rx="3" fill="#fff" opacity="0.9"/>
        <rect x="-7"  y="7" width="14" height="20" rx="2" fill="#CE1126" opacity="0.8"/>
      </g>
    </svg>
  );
}

// ── T2: Governorate Banner — Aswan, Egyptian flag ─────────────────────────────
function GovernorateBanner() {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2557] via-[#1a3a8a] to-[#0e4d2e] p-6 shadow-2xl border border-blue-800/40"
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '24px 24px' }}
      />
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-6 rtl:flex-row-reverse">
        {/* T2: Flag */}
        <div className="shrink-0">
          <EgyptianFlag className="w-24 h-16 rounded-lg shadow-xl border-2 border-white/20 object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-black tracking-[0.35em] text-amber-400/80 uppercase">
            Arab Republic of Egypt
          </span>
          {/* T2: Aswan Governorate */}
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight mt-0.5">
            {t('governorate_name')}
          </h2>
          <p className="mt-2 text-sm text-blue-200/80 max-w-md leading-relaxed">
            {t('governorate_vision')}
          </p>
        </div>

        <div className="hidden sm:flex shrink-0 flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <span className="text-[9px] text-amber-400/70 font-bold uppercase tracking-widest">Emergency<br />Command</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── T4: Active Units bar (5 slots, max 3 ongoing, rest = capacity) ────────────
function ActiveUnitsBar({ ongoing, total = DEPT_TOTAL_CAPACITY }: { ongoing: number; total?: number }) {
  const { t } = useTranslation();
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] font-bold mb-1">
        <span className="text-slate-500">{t('active_reports')}</span>
        <span className={ongoing >= 3 ? 'text-red-500 font-black' : 'text-emerald-500 font-black'}>
          {ongoing}/3 · {t('capacity')}: {total}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-all ${
              i < ongoing
                ? i < 3 ? 'bg-blue-500' : 'bg-red-500'  // >3 only in max-emergency
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}


export function DepartmentDashboard() {
  const { t } = useTranslation();
  const {
    system, version, selectedNode, setSelectedNode,
    resolveReport, fileReport, transferPending, forceOngoing, isMaxEmergency, searchFilter,
  } = useAppStore();

  const [showICS,      setShowICS]      = useState(false);
  const [icsResult,    setIcsResult]    = useState<{ priority: number; score: number; assessment: ICSAssessment } | null>(null);
  const [showFileForm, setShowFileForm] = useState(false);
  const [desc,         setDesc]         = useState('');
  const [secondaryDept,setSecondaryDept]= useState('');
  const [forceError,   setForceError]   = useState<string | null>(null);

  const node = useMemo(
    () => (selectedNode ? system.findNode(system.root, selectedNode) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [system, version, selectedNode],
  );

  /* ── Central system / empty state ── */
  if (!node || node.name === 'Central Crisis System') {
    return (
      <div className="flex-1 flex flex-col gap-5 overflow-hidden pr-1">
        <GovernorateBanner />
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4" /> {t('system_ready')}
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">{t('governorate_name')} - Live Map</span>
          </div>
          <div className="flex-1 min-h-[400px]">
            <AswanMap />
          </div>
        </div>
      </div>
    );
  }

  /* ── District Overview ── */
  if (node.isDistrict) {
    const children  = node.children.toArray();
    const distLabel = node.name === 'First District' ? t('districts.d1') : t('districts.d2');

    return (
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="glass-panel p-6 bg-indigo-600 text-white flex justify-between items-center shadow-xl rounded-2xl">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3"><Shield /> {distLabel} {t('district_dashboard')}</h2>
            <p className="opacity-80 text-sm mt-1">{t('district_subtitle')}</p>
          </div>
          <Users className="w-12 h-12 opacity-20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map(dept => {
            const deptKey = dept.name.includes('Fire')      ? 'fire'
                          : dept.name.includes('Police')    ? 'police'
                          : dept.name.includes('Ambulance') ? 'ambulance'
                          : dept.name.includes('Water')     ? 'water'
                          : 'electricity';
            const suffix = dept.name.includes('D1') ? '- D1' : '- D2';

            return (
              <motion.div
                whileHover={{ y: -5 }}
                onClick={() => setSelectedNode(dept.name)}
                key={dept.name}
                className="glass-panel p-5 cursor-pointer hover:border-indigo-500 transition-all"
              >
                <h4 className="font-bold text-lg mb-2">{t(`departments.${deptKey}`)} {suffix}</h4>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-500 font-bold">{t('ongoing')}: {dept.ongoingReports.size()}/3</span>
                  <span className="text-amber-500 font-bold">{t('pending')}: {dept.pendingReports.size()}</span>
                </div>
                {/* T4: visual capacity bar */}
                <ActiveUnitsBar ongoing={dept.ongoingReports.size()} />
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Department Detail ── */
  const filterReports = (reports: Report[]) => {
    if (!searchFilter) return reports;
    const q = searchFilter.toLowerCase();
    return reports.filter(r =>
      r.type.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      String(r.id) === q ||
      (q === 'ongoing' && r.status === 'Ongoing') ||
      (q === 'pending' && r.status === 'Pending') ||
      (q === 'resolved' && r.status === 'Resolved') ||
      (r.supportingDepts && r.supportingDepts.some(d => d.toLowerCase().includes(q)))
    );
  };

  // T9: sort ongoing by priority desc before rendering
  const ongoing = filterReports(node.ongoingReports.toArray().sort((a, b) => b.priority - a.priority));
  // T9: pending is already sorted by DoublyLinkedList.insertSortedByPriority
  const pending = filterReports(node.pendingReports.toArray());
  // T8: resolved column in dept panel — show last 10 only (no filters here)
  const resolved = filterReports(node.resolvedArchive.toArray()).slice(0, 10);

  const deptKey  = node.name.includes('Fire')      ? 'fire'
                 : node.name.includes('Police')    ? 'police'
                 : node.name.includes('Ambulance') ? 'ambulance'
                 : node.name.includes('Water')     ? 'water'
                 : 'electricity';
  const deptType = node.name.includes('Fire')      ? 'Fire'
                 : node.name.includes('Police')    ? 'Theft'
                 : node.name.includes('Ambulance') ? 'Medical'
                 : node.name.includes('Water')     ? 'Water Leak'
                 : 'Power Outage';
  const suffix   = node.name.includes('D1') ? '- D1' : '- D2';
  const deptLabel = `${t(`departments.${deptKey}`)} ${suffix}`;

  // T6: sibling name for display
  const sibling = system.getSiblingDept(node.name);

  const handleICSComplete = (priority: number, score: number, assessment: ICSAssessment) => {
    setIcsResult({ priority, score, assessment });
    setShowICS(false);
    setShowFileForm(true);
  };

  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!icsResult) return;
    const district  = node.name.includes('D1') ? 'First District' : 'Second District';
    const deptShort = node.name.split(' ')[0];
    fileReport(district, deptShort, deptType, desc, icsResult.priority, secondaryDept || undefined, icsResult.score);
    setShowFileForm(false);
    setIcsResult(null);
    setDesc('');
    setSecondaryDept('');
  };

  const TriageBadge = ({ score }: { score?: number }) => {
    if (!score) return null;
    const tri  = getICSTriage(score);
    const clrs = { RED: 'bg-red-500', ORANGE: 'bg-orange-500', YELLOW: 'bg-yellow-400' };
    return <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${clrs[tri.color]}`}>{tri.color}</span>;
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
            r.priority === 3 ? 'bg-amber-100 text-amber-600' :
            'bg-slate-100 text-slate-500'
          }`}>P{r.priority}</span>
        </div>
      </div>

      <h3 className="font-bold text-sm truncate mt-1">{r.description}</h3>

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
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t('step')} {r.timestamp}</span>
        {typeObj === 'resolved' && r.duration !== undefined && (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ {r.duration} {t('solved_in')}</span>
        )}
      </div>

      {typeObj === 'ongoing' && (
        <button
          onClick={() => resolveReport(r.id)}
          className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-black transition"
        >
          {t('mark_resolved')}
        </button>
      )}

      {typeObj === 'pending' && (
        <div className="mt-3 flex gap-2">
          {/* T6: Forced transfer to sibling dept */}
          <button
            onClick={() => transferPending(node.name, r.id)}
            className="flex-1 flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg text-xs font-black transition"
            title={sibling ? `→ ${sibling.name}` : 'No sibling'}
          >
            <ArrowRightLeft className="w-3 h-3" /> {t('transfer_to_other')}
          </button>
          {/* T7: Force to ongoing */}
          <button
            onClick={() => {
              const res = forceOngoing(node.name, r.id);
              if (res === 'full') { setForceError(t('force_ongoing_full')); setTimeout(() => setForceError(null), 3000); }
            }}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-lg text-xs font-black transition"
          >
            <TrendingUp className="w-3 h-3" /> {t('force_ongoing')}
          </button>
        </div>
      )}
    </motion.div>
  );

  return (
    <>
      <AnimatePresence>
        {showICS && <ICSModal onComplete={handleICSComplete} onCancel={() => setShowICS(false)} />}
      </AnimatePresence>

      {/* File form */}
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
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>{t('dispatching_to')}</span>
                    <span className="font-bold text-indigo-500">{deptLabel}</span>
                    <span>·</span>
                    <span className="font-bold">{t('priority_label')} {icsResult.priority}</span>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowFileForm(false); setIcsResult(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block">{t('incident_description')}</label>
                  <textarea
                    autoFocus required value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder={t('describe_emergency')}
                    className="w-full p-4 rounded-2xl border dark:border-slate-800 bg-slate-50 dark:bg-black/20 outline-none focus:border-indigo-500 h-28 resize-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block">{t('support_dept')}</label>
                  <select value={secondaryDept} onChange={e => setSecondaryDept(e.target.value)}
                    className="w-full p-3 rounded-2xl border dark:border-slate-800 bg-slate-50 dark:bg-black/20 text-sm font-medium outline-none">
                    <option value="">{t('no_secondary')}</option>
                    <option value={node.name.includes('D1') ? 'Police Dept - D1' : 'Police Dept - D2'}>{t('secondary_police')}</option>
                    <option value={node.name.includes('D1') ? 'Ambulance - D1'   : 'Ambulance - D2'}>{t('secondary_ambulance')}</option>
                    <option value={node.name.includes('D1') ? 'Fire Dept - D1'   : 'Fire Dept - D2'}>{t('secondary_fire')}</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">{t('support_note')}</p>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl transition active:scale-95">
                  {t('dispatch_incident')}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* T7: Force-ongoing error toast */}
      <AnimatePresence>
        {forceError && (
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm"
          >
            {forceError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN PANEL */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden rounded-2xl border transition-all duration-500 ${
        isMaxEmergency ? 'border-red-500 shadow-2xl shadow-red-500/20' : 'border-slate-200 dark:border-slate-800'
      }`}>
        {/* Dept Header */}
        <div className={`p-5 flex justify-between items-center transition-colors ${
          isMaxEmergency ? 'bg-red-600 text-white' : 'bg-white dark:bg-slate-900'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isMaxEmergency ? 'bg-white/20' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">{deptLabel}</h2>
              <div className="flex items-center gap-3 text-xs opacity-70 mt-0.5">
                {/* T4: show ongoing/3 and total capacity */}
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {t('active_reports')}: {node.ongoingReports.size()}/3 · {t('capacity')}: {node.resources.total}
                </span>
                {node.resources.available === 0 && (
                  <span className="font-black text-red-300 animate-pulse">{t('no_units')}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowICS(true)}
              className={`px-5 py-2.5 rounded-xl font-black text-sm shadow-lg transition active:scale-95 ${
                isMaxEmergency ? 'bg-white text-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {t('actions.file')} →
            </button>
            <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Three columns */}
        <div className="flex-1 overflow-hidden flex bg-slate-50 dark:bg-black/40 divide-x dark:divide-slate-800">
          {/* Ongoing — T9: sorted by priority */}
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />{t('ongoing')}
              </h3>
              <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {node.ongoingReports.size()}/3
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>{ongoing.map(r => <ReportCard key={r.id} r={r} typeObj="ongoing" />)}</AnimatePresence>
              {ongoing.length === 0 && (
                <div className="text-center py-12 opacity-20"><CheckCircle2 className="w-10 h-10 mx-auto mb-2" /><p className="text-xs font-bold">{t('clear')}</p></div>
              )}
            </div>
          </div>

          {/* Pending — T9: already sorted from DoublyLinkedList */}
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden bg-amber-500/[0.03]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" />{t('pending')}
              </h3>
              <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-full">
                {node.pendingReports.size()}
              </span>
            </div>
            {/* T6: Sibling hint */}
            {sibling && (
              <p className="text-[10px] text-slate-400 -mt-2 flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" /> {t('transfer_hint')}: {sibling.name}
              </p>
            )}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>{pending.map(r => <ReportCard key={r.id} r={r} typeObj="pending" />)}</AnimatePresence>
              {pending.length === 0 && (
                <div className="text-center py-12 opacity-20"><Clock className="w-10 h-10 mx-auto mb-2" /><p className="text-xs font-bold">{t('no_backlog')}</p></div>
              )}
            </div>
          </div>

          {/* Resolved — T8: last 10 only, no filters (filters are on RecordsPage) */}
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden bg-emerald-500/[0.03]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />{t('resolved')}
              </h3>
              <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500 px-2 py-0.5 rounded-full">
                {node.resolvedArchive.size()}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 -mt-2">{t('resolved_dept_hint')}</p>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {resolved.map((r, i) => <ReportCard key={`${r.id}-${i}`} r={r} typeObj="resolved" />)}
              </AnimatePresence>
              {resolved.length === 0 && (
                <div className="text-center py-10 opacity-30"><CheckCircle2 className="w-8 h-8 mx-auto mb-1" /><p className="text-xs">{t('no_resolved')}</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
