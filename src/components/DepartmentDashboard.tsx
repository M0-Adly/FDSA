import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import { type Report, type ICSAssessment, getICSTriage } from '../lib/crisis-system';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, CheckCircle2, Clock, MapPin, X,
  Shield, Activity, Users, Zap, ArrowRightLeft,
  Calendar, CalendarDays, CalendarRange,
} from 'lucide-react';
import { ICSModal } from './ICSModal';

// ── TASK 1: Egyptian Eagle SVG (Eagle of Saladin / public domain) ──────────────
function EgyptianEagle({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Egyptian Eagle Emblem"
    >
      {/* Body */}
      <ellipse cx="50" cy="58" rx="18" ry="22" fill="currentColor" />
      {/* Head */}
      <circle cx="50" cy="33" r="10" fill="currentColor" />
      {/* Beak */}
      <polygon points="50,36 56,40 50,44" fill="#f59e0b" />
      {/* Left wing */}
      <path d="M32,52 Q10,38 8,22 Q20,35 32,42 Z" fill="currentColor" opacity="0.9" />
      {/* Right wing */}
      <path d="M68,52 Q90,38 92,22 Q80,35 68,42 Z" fill="currentColor" opacity="0.9" />
      {/* Left wing feathers */}
      <path d="M32,52 Q16,44 12,30" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M32,52 Q14,48 14,36" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Right wing feathers */}
      <path d="M68,52 Q84,44 88,30" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M68,52 Q86,48 86,36" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Talons */}
      <path d="M42,80 L38,90 M42,80 L42,90 M42,80 L46,88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M58,80 L54,90 M58,80 L58,90 M58,80 L62,88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Chest shield */}
      <rect x="43" y="52" width="14" height="18" rx="2" fill="#f59e0b" opacity="0.8" />
      <rect x="45" y="54" width="10" height="14" rx="1" fill="#1e3a8a" opacity="0.9" />
    </svg>
  );
}

// ── TASK 1: Governorate Hero Banner (shown on Central System view) ─────────────
function GovernorateBanner() {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2557] via-[#1a3a8a] to-[#0e4d2e] p-6 shadow-2xl border border-blue-800/40"
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '24px 24px' }}
      />
      {/* Glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-6 rtl:flex-row-reverse">
        {/* Eagle emblem */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <EgyptianEagle className="w-20 h-20 text-amber-400 drop-shadow-xl" />
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-amber-400/60" />
            ))}
          </div>
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black tracking-[0.35em] text-amber-400/80 uppercase">
              Arab Republic of Egypt
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
            {t('governorate_name')}
          </h2>
          <p className="mt-2 text-sm text-blue-200/80 max-w-md leading-relaxed">
            {t('governorate_vision')}
          </p>
        </div>

        {/* Right badge */}
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

// ── Archive filter type ────────────────────────────────────────────────────────
type ArchiveFilter = 'all' | 'daily' | 'weekly' | 'monthly';

export function DepartmentDashboard() {
  const { t } = useTranslation();
  const {
    system, version, selectedNode, setSelectedNode,
    resolveReport, fileReport, transferPending, isMassCrisis,
  } = useAppStore();

  const [showICS,       setShowICS]       = useState(false);
  const [icsResult,     setIcsResult]     = useState<{ priority: number; score: number; assessment: ICSAssessment } | null>(null);
  const [showFileForm,  setShowFileForm]  = useState(false);
  const [desc,          setDesc]          = useState('');
  const [secondaryDept, setSecondaryDept] = useState('');

  // ── TASK 3: archive filter state ──────────────────────────────────────────────
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('all');

  // ── TASK 2: transfer UI state ─────────────────────────────────────────────────
  const [showTransfer,    setShowTransfer]    = useState(false);
  const [transferReportId, setTransferReportId] = useState<number | null>(null);
  const [transferTarget,  setTransferTarget]  = useState('');

  const node = useMemo(
    () => (selectedNode ? system.findNode(system.root, selectedNode) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [system, version, selectedNode],
  );

  /* ── TASK 1: Central System / empty state ── */
  if (!node || node.name === 'Central Crisis System') {
    return (
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
        {/* TASK 1: Governorate banner always visible on central view */}
        <GovernorateBanner />

        {/* System ready hint */}
        <div className="flex-1 glass-panel p-6 flex flex-col items-center justify-center text-slate-500 text-center gap-4 min-h-[220px]">
          <Activity className="w-14 h-14 text-slate-300 animate-pulse" />
          <div>
            <h2 className="text-xl font-bold text-slate-400">{t('system_ready')}</h2>
            <p className="max-w-xs mx-auto text-sm mt-1">{t('system_ready_desc')}</p>
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
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Shield /> {distLabel} {t('district_dashboard')}
            </h2>
            <p className="opacity-80 text-sm mt-1">{t('district_subtitle')}</p>
          </div>
          <Users className="w-12 h-12 opacity-20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map(dept => {
            const resourcePct = dept.resources.total > 0
              ? (dept.resources.available / dept.resources.total) * 100
              : 0;
            const deptKey = dept.name.includes('Fire')        ? 'fire'
                          : dept.name.includes('Police')      ? 'police'
                          : dept.name.includes('Ambulance')   ? 'ambulance'
                          : dept.name.includes('Water')       ? 'water'
                          : 'electricity';
            const suffix = dept.name.includes('D1') ? '- D1' : '- D2';

            return (
              <motion.div
                whileHover={{ y: -5 }}
                onClick={() => setSelectedNode(dept.name)}
                key={dept.name}
                className="glass-panel p-5 cursor-pointer hover:border-indigo-500 transition-all"
              >
                <h4 className="font-bold text-lg mb-3">
                  {t(`departments.${deptKey}`)} {suffix}
                </h4>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-blue-500 font-bold">{t('ongoing')}: {dept.ongoingReports.size()}/3</span>
                  <span className="text-amber-500 font-bold">{t('pending')}: {dept.pendingReports.size()}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium">
                    <span className="text-slate-500">{t('resources')}</span>
                    <span className={dept.resources.available <= 1 ? 'text-red-500 font-black' : 'text-emerald-500 font-black'}>
                      {dept.resources.available}/{dept.resources.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        resourcePct > 50 ? 'bg-emerald-500' : resourcePct > 20 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
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

  /* ── Department Detail ── */
  const ongoing  = node.ongoingReports.toArray();
  const pending  = node.pendingReports.toArray();

  // TASK 3: filter resolved using system method
  const resolved = system.filterResolved(node, archiveFilter);

  const deptKey  = node.name.includes('Fire')        ? 'fire'
                 : node.name.includes('Police')      ? 'police'
                 : node.name.includes('Ambulance')   ? 'ambulance'
                 : node.name.includes('Water')       ? 'water'
                 : 'electricity';
  const deptType = node.name.includes('Fire')        ? 'Fire'
                 : node.name.includes('Police')      ? 'Theft'
                 : node.name.includes('Ambulance')   ? 'Medical'
                 : node.name.includes('Water')       ? 'Water Leak'
                 : 'Power Outage';
  const suffix   = node.name.includes('D1') ? '- D1' : '- D2';
  const deptLabel = `${t(`departments.${deptKey}`)} ${suffix}`;

  // ── Sibling departments for transfer ─────────────────────────────────────────
  const districtSuffix = node.name.includes('D1') ? 'D1' : 'D2';
  const otherSuffix    = districtSuffix === 'D1' ? 'D2' : 'D1';
  const allDeptNames = [
    `Fire Dept - ${districtSuffix}`,
    `Police Dept - ${districtSuffix}`,
    `Ambulance - ${districtSuffix}`,
    `Water Co. - ${districtSuffix}`,
    `Electricity Co. - ${districtSuffix}`,
    `Fire Dept - ${otherSuffix}`,
    `Police Dept - ${otherSuffix}`,
    `Ambulance - ${otherSuffix}`,
    `Water Co. - ${otherSuffix}`,
    `Electricity Co. - ${otherSuffix}`,
  ].filter(n => n !== node.name);

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

  // TASK 2: submit transfer
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferReportId === null || !transferTarget) return;
    transferPending(node.name, transferTarget, transferReportId);
    setShowTransfer(false);
    setTransferReportId(null);
    setTransferTarget('');
  };

  const TriageBadge = ({ score }: { score?: number }) => {
    if (!score) return null;
    const tri  = getICSTriage(score);
    const clrs = { RED: 'bg-red-500', ORANGE: 'bg-orange-500', YELLOW: 'bg-yellow-400' };
    return (
      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${clrs[tri.color]}`}>
        {tri.color}
      </span>
    );
  };

  const ReportCard = ({ r, typeObj }: { r: Report; typeObj: 'ongoing' | 'pending' | 'resolved' }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className={`p-4 rounded-xl border-t-4 shadow-sm ${
        typeObj === 'ongoing'  ? 'bg-white dark:bg-slate-900 border-blue-500'    :
        typeObj === 'pending'  ? 'bg-white dark:bg-slate-900 border-amber-500'   :
                                  'bg-slate-50 dark:bg-slate-900/50 border-emerald-500'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-mono text-slate-400">#{r.id}</span>
        <div className="flex items-center gap-1">
          <TriageBadge score={r.icsScore} />
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            r.priority >= 4 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
            r.priority === 3 ? 'bg-amber-100 text-amber-600'                                  :
                               'bg-slate-100 text-slate-500'
          }`}>
            P{r.priority}
          </span>
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
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {t('step')} {r.timestamp}
        </span>
        {typeObj === 'resolved' && r.duration !== undefined && (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            ✓ {r.duration} {t('solved_in')}
          </span>
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

      {/* TASK 2: Transfer button on pending cards */}
      {typeObj === 'pending' && (
        <button
          onClick={() => {
            setTransferReportId(r.id);
            setTransferTarget(allDeptNames[0] ?? '');
            setShowTransfer(true);
          }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg text-xs font-black transition"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" /> {t('actions.transfer')}
        </button>
      )}
    </motion.div>
  );

  // ── TASK 3: Filter bar component ──────────────────────────────────────────────
  const FilterBtn = ({
    id, icon: Icon, label,
  }: { id: ArchiveFilter; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setArchiveFilter(id)}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition ${
        archiveFilter === id
          ? 'bg-emerald-500 text-white shadow'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
      }`}
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );

  return (
    <>
      {/* ICS SCORING MODAL */}
      <AnimatePresence>
        {showICS && <ICSModal onComplete={handleICSComplete} onCancel={() => setShowICS(false)} />}
      </AnimatePresence>

      {/* DESCRIPTION FORM (after ICS) */}
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
                    <span>·</span>
                    <span>{t('ics_score_label')} {icsResult.score}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowFileForm(false); setIcsResult(null); }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
                    {t('incident_description')}
                  </label>
                  <textarea
                    autoFocus required
                    value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder={t('describe_emergency')}
                    className="w-full p-4 rounded-2xl border dark:border-slate-800 bg-slate-50 dark:bg-black/20 outline-none focus:border-indigo-500 h-28 resize-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
                    {t('support_dept')}
                  </label>
                  <select
                    value={secondaryDept}
                    onChange={e => setSecondaryDept(e.target.value)}
                    className="w-full p-3 rounded-2xl border dark:border-slate-800 bg-slate-50 dark:bg-black/20 text-sm font-medium outline-none"
                  >
                    <option value="">{t('no_secondary')}</option>
                    <option value={node.name.includes('D1') ? 'Police Dept - D1' : 'Police Dept - D2'}>
                      {t('secondary_police')}
                    </option>
                    <option value={node.name.includes('D1') ? 'Ambulance - D1' : 'Ambulance - D2'}>
                      {t('secondary_ambulance')}
                    </option>
                    <option value={node.name.includes('D1') ? 'Fire Dept - D1' : 'Fire Dept - D2'}>
                      {t('secondary_fire')}
                    </option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">{t('support_note')}</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl transition active:scale-95"
                >
                  {t('dispatch_incident')}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* TASK 2: TRANSFER MODAL */}
      <AnimatePresence>
        {showTransfer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.form
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              onSubmit={handleTransferSubmit}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl w-full max-w-sm shadow-2xl border dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                  {t('transfer_title')}
                </h3>
                <button type="button" onClick={() => setShowTransfer(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <X />
                </button>
              </div>

              <div className="space-y-4">
                {/* Report picker */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
                    {t('transfer_select')}
                  </label>
                  {pending.length === 0 ? (
                    <p className="text-sm text-slate-400">{t('transfer_no_pending')}</p>
                  ) : (
                    <select
                      value={transferReportId ?? ''}
                      onChange={e => setTransferReportId(Number(e.target.value))}
                      className="w-full p-3 rounded-2xl border dark:border-slate-800 bg-slate-50 dark:bg-black/20 text-sm font-medium outline-none"
                      required
                    >
                      {pending.map(r => (
                        <option key={r.id} value={r.id}>
                          #{r.id} — {r.description} (P{r.priority})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Target department picker */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
                    {t('transfer_to')}
                  </label>
                  <select
                    value={transferTarget}
                    onChange={e => setTransferTarget(e.target.value)}
                    className="w-full p-3 rounded-2xl border dark:border-slate-800 bg-slate-50 dark:bg-black/20 text-sm font-medium outline-none"
                    required
                  >
                    {allDeptNames.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={pending.length === 0}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-2xl font-black shadow-xl transition active:scale-95"
                >
                  {t('transfer_btn')} →
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
            <div className={`p-3 rounded-xl ${
              isMassCrisis ? 'bg-white/20' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">{deptLabel}</h2>
              <div className="flex items-center gap-3 text-xs opacity-70 mt-0.5">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {t('active_units')}: {node.resources.available}/{node.resources.total}
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
                isMassCrisis ? 'bg-white text-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {t('actions.file')} →
            </button>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
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
              {/* TASK 4: count comes directly from data structure */}
              <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {node.ongoingReports.size()}/3
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {ongoing.map(r => <ReportCard key={r.id} r={r} typeObj="ongoing" />)}
              </AnimatePresence>
              {ongoing.length === 0 && (
                <div className="text-center py-12 opacity-20">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs font-bold">{t('clear')}</p>
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
                {node.pendingReports.size()}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {pending.map(r => <ReportCard key={r.id} r={r} typeObj="pending" />)}
              </AnimatePresence>
              {pending.length === 0 && (
                <div className="text-center py-12 opacity-20">
                  <Clock className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs font-bold">{t('no_backlog')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Resolved — TASK 3: with filter bar */}
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden bg-emerald-500/[0.03]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> {t('resolved')}
              </h3>
              <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500 px-2 py-0.5 rounded-full">
                {node.resolvedArchive.size()}
              </span>
            </div>

            {/* TASK 3: Filter buttons */}
            <div className="flex gap-1 flex-wrap">
              <FilterBtn id="all"     icon={CheckCircle2}  label={t('filter_all')}     />
              <FilterBtn id="daily"   icon={Calendar}      label={t('filter_daily')}   />
              <FilterBtn id="weekly"  icon={CalendarDays}  label={t('filter_weekly')}  />
              <FilterBtn id="monthly" icon={CalendarRange}  label={t('filter_monthly')} />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {resolved.map((r, i) => (
                  <ReportCard key={`${r.id}-${i}`} r={r} typeObj="resolved" />
                ))}
              </AnimatePresence>
              {resolved.length === 0 && (
                <div className="text-center py-10 opacity-30">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-xs">{t('no_resolved')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
