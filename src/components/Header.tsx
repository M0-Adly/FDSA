import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import {
  ShieldAlert, FastForward, Moon, Sun, RotateCcw,
  Archive, Activity, Clock, Zap, Search, X,
} from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// 1.1 Mini Stats Card
// ─────────────────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string; // tailwind gradient classes
  pulse?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, icon, color, pulse, onClick }: StatCardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.02 }}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-sm overflow-hidden
        bg-white/70 dark:bg-white/5 border-white/30 dark:border-white/10 shadow-md min-w-[90px] ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Colour glare */}
      <div className={`absolute inset-0 opacity-10 ${color}`} />
      <div className={`relative shrink-0 p-1.5 rounded-lg ${color} bg-opacity-20`}>
        {icon}
      </div>
      <div className="relative min-w-0">
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-tight truncate">
          {label}
        </p>
        <p className={`text-lg font-black leading-none ${pulse ? 'text-red-500 animate-pulse' : 'text-slate-800 dark:text-white'}`}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1.2 Search result type
// ─────────────────────────────────────────────────────────────────────────────
interface SearchResult {
  id: number;
  type: string;
  description: string;
  priority: number;
  status: 'Pending' | 'Ongoing' | 'Resolved';
  dept: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────────────────────
interface HeaderProps {
  onShowRecords: () => void;
}

export function Header({ onShowRecords }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const {
    system, version, lang, theme,
    toggleTheme, setLang, setSelectedNode, setSearchFilter,
    escalatePending, undoAction, incrementSimStep,
    isMaxEmergency, toggleMaxEmergency, showToast,
  } = useAppStore();

  // ── 1.1: Compute real-time stats ──────────────────────────────────────────
  const miniStats = useMemo(() => {
    let totalOngoing = 0, totalPending = 0, totalCapacity = 0;
    const walk = (node: typeof system.root) => {
      if (!node) return;
      if (!node.isDistrict && node.name !== 'Central Crisis System') {
        totalOngoing  += node.ongoingReports.size();
        totalPending  += node.pendingReports.size();
        // Available capacity = slots left until MAX_ONGOING across all depts
        totalCapacity += Math.max(0, 3 - node.ongoingReports.size());
      }
      let c = node.children.head;
      while (c) { walk(c.data); c = c.next; }
    };
    walk(system.root);
    return { totalOngoing, totalPending, totalCapacity };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, version]);

  // ── 1.2: Search ───────────────────────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults,   setShowResults]   = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Collect all reports (ongoing + pending + resolved) across every dept
  const allReports = useMemo((): SearchResult[] => {
    const list: SearchResult[] = [];
    const walk = (node: typeof system.root) => {
      if (!node) return;
      if (!node.isDistrict && node.name !== 'Central Crisis System') {
        node.ongoingReports.toArray().forEach(r  => list.push({ ...r, dept: node.name }));
        node.pendingReports.toArray().forEach(r  => list.push({ ...r, dept: node.name }));
        node.resolvedArchive.toArray().forEach(r => list.push({ ...r, dept: node.name }));
      }
      let c = node.children.head;
      while (c) { walk(c.data); c = c.next; }
    };
    walk(system.root);
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, version]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); setShowResults(false); return; }
    const lower = q.toLowerCase();
    const matches = allReports.filter(r =>
      String(r.id).includes(q) ||
      r.type.toLowerCase().includes(lower) ||
      r.description.toLowerCase().includes(lower),
    ).slice(0, 8); // cap at 8
    setSearchResults(matches);
    setShowResults(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      const match = allReports.find((r) => r.id.toString() === q);
      if (match) {
        setSelectedNode(match.dept);
        setSearchFilter('');
      } else {
        setSearchFilter(q);
      }
      setShowResults(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Undo tooltip
  const lastAction  = system.actionHistory.top();
  const undoLabel   = lastAction
    ? t('undo_tooltip', { action: lastAction.type, id: lastAction.reportId })
    : t('undo_nothing');

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify({ simStep: system.simStep, stats: system.getSystemStats(), ts: new Date().toISOString() }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = `crisis_step${system.simStep}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    i18n.changeLanguage(lang);
  }, [lang, i18n]);

  const statusColor = (s: SearchResult['status']) =>
    s === 'Ongoing'  ? 'text-blue-500'   :
    s === 'Pending'  ? 'text-amber-500'  :
    'text-emerald-500';

  return (
    <header className="glass shadow-md sticky top-0 z-50">
      {/* ── Row 1: Brand + Controls ── */}
      <div className="container mx-auto px-4 pt-3 pb-2 flex flex-wrap items-center gap-3">

        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <ShieldAlert className="w-7 h-7 text-amber-500" />
          <h1 className="text-base font-black bg-gradient-to-r from-blue-600 to-amber-500 bg-clip-text text-transparent leading-tight hidden md:block">
            {t('app_title')}
          </h1>
        </div>

        {/* ── 1.1 Mini Stats (3 cards) ─────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatCard
            label={t('stats_active')}
            value={miniStats.totalOngoing}
            icon={<Activity className="w-3.5 h-3.5 text-blue-500" />}
            color="bg-blue-500"
            pulse={miniStats.totalOngoing > 9}
            onClick={() => {
              // Option A: Set search filter globally
              setSearchFilter('ongoing');
            }}
          />
          <StatCard
            label={t('stats_pending')}
            value={miniStats.totalPending}
            icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}
            color="bg-amber-500"
            pulse={miniStats.totalPending > 15}
            onClick={() => {
              setSearchFilter('pending');
            }}
          />
          <StatCard
            label={t('stats_capacity')}
            value={`${miniStats.totalCapacity}/30`}
            icon={<Zap className="w-3.5 h-3.5 text-emerald-500" />}
            color="bg-emerald-500"
            onClick={onShowRecords} // Navigates to records page as requested
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sim Step chip */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-mono text-sm border border-slate-200 dark:border-slate-700 shrink-0">
          <span className="text-slate-400 text-xs">{t('sim_step')}:</span>
          <span className="font-black text-indigo-600 dark:text-indigo-400">{system.simStep}</span>
        </div>

        {/* Icon controls */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* +1 sim step */}
          <button onClick={incrementSimStep} title={t('sim_step_plus')}
            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition" id="btn-sim-step">
            <FastForward className="w-4 h-4" />
          </button>

          {/* Escalate */}
          <button id="btn-escalate" title={t('escalate_desc')}
            onClick={() => {
              const count = escalatePending();
              showToast(t('chatbot.qa4_result', { count }), count > 0 ? 'success' : 'warning');
            }}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full text-xs transition shadow-lg shadow-amber-500/20">
            {t('escalate_all')}
          </button>

          {/* Undo */}
          <div className="relative group">
            <button onClick={undoAction} disabled={system.actionHistory.isEmpty()}
              title={undoLabel} id="btn-undo"
              className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition disabled:opacity-40">
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="absolute top-full mt-2 right-0 z-50 hidden group-hover:block">
              <div className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap">
                {undoLabel}
              </div>
            </div>
          </div>

          {/* Records */}
          <button onClick={onShowRecords} title={t('records_title')} id="btn-records"
            className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition">
            <Archive className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />

          {/* Max Emergency */}
          <button onClick={toggleMaxEmergency} id="btn-max-emergency"
            className={`px-3 py-1.5 font-black rounded-full text-xs transition-all flex items-center gap-1 border-2 whitespace-nowrap ${
              isMaxEmergency
                ? 'bg-red-600 border-red-400 text-white animate-pulse'
                : 'bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
            }`}>
            <ShieldAlert className={`w-3.5 h-3.5 ${isMaxEmergency ? 'animate-bounce' : ''}`} />
            {isMaxEmergency ? t('crisis_on') : t('crisis_off')}
          </button>

          <button onClick={handleExport} title={t('export_json')} id="btn-export"
            className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition">
            {/* Globe replaced with download icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />

          <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} id="btn-lang"
            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition">
            <span className="text-xs font-black">{t('language')}</span>
          </button>
          <button onClick={toggleTheme} id="btn-theme"
            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Row 2: 1.2 Global Quick Search ── */}
      <div className="container mx-auto px-4 pb-3">
        <div ref={searchRef} className="relative max-w-xl">
          <div className="relative flex items-center">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery && setShowResults(true)}
              placeholder={t('search_placeholder')}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              className="w-full pl-9 rtl:pl-4 rtl:pr-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700
                bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-sm outline-none
                focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20
                transition placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
                className="absolute right-3 rtl:right-auto rtl:left-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-slate-900
                  border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="p-1.5 max-h-72 overflow-y-auto">
                  {searchResults.map((r) => (
                    <div
                      key={`${r.id}-${r.status}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                      onClick={() => {
                        setShowResults(false);
                        setSearchQuery('');
                        setSelectedNode(r.dept);
                        setSearchFilter('');
                      }}
                    >
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <span className="text-xs font-black text-slate-600 dark:text-slate-300">#{r.id}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold truncate">{r.description}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{r.dept}</span>
                          <span className="text-[10px] font-bold text-slate-500">·</span>
                          <span className={`text-[10px] font-black ${statusColor(r.status)}`}>{r.status}</span>
                          <span className="text-[10px] font-bold text-slate-500">·</span>
                          <span className="text-[10px] font-semibold">{r.type}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full ${
                        r.priority >= 4 ? 'bg-red-100 text-red-600' :
                        r.priority === 3 ? 'bg-amber-100 text-amber-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>P{r.priority}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-[10px] text-slate-400">
                    {searchResults.length} {t('search_results')}
                  </p>
                </div>
              </motion.div>
            )}
            {showResults && searchQuery && searchResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 text-center text-sm text-slate-400"
              >
                {t('search_no_results')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
