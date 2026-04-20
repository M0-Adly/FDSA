import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import { ShieldAlert, FastForward, Globe, Moon, Sun, RotateCcw, Archive } from 'lucide-react';
import { useEffect } from 'react';

interface HeaderProps {
  onShowRecords: () => void;
}

export function Header({ onShowRecords }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const {
    system, lang, theme, toggleTheme, setLang,
    escalatePending, undoAction, incrementSimStep,
    isMaxEmergency, toggleMaxEmergency,
  } = useAppStore();

  const stats = system.getSystemStats();

  // T6 tooltip: show what will be undone
  const lastAction = system.actionHistory.top();
  const undoLabel  = lastAction
    ? t('undo_tooltip', { action: lastAction.type, id: lastAction.reportId })
    : t('undo_nothing');

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ simStep: system.simStep, stats: system.getSystemStats(), timestamp: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
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

  const districtNames: Record<string, string> = {
    'First District':  t('districts.d1'),
    'Second District': t('districts.d2'),
  };

  return (
    <header className="glass shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0" />
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-amber-500 bg-clip-text text-transparent leading-tight">
            {t('app_title')}
          </h1>
        </div>

        {/* Stats + simStep */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          {Object.entries(stats).map(([distName, data]) => (
            <div key={distName} className="hidden md:flex flex-col text-xs font-semibold bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">{districtNames[distName] ?? distName}</span>
              <div className="flex gap-3 mt-1">
                <span className="text-blue-600 dark:text-blue-400">O:{data.ongoing}</span>
                <span className="text-amber-500">P:{data.pending}</span>
                <span className="text-emerald-500">R:{data.resolved}</span>
              </div>
            </div>
          ))}

          {/* T5: simStep display */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-mono text-sm border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">{t('sim_step')}:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{system.simStep}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* T5: +1 Sim Step */}
          <button onClick={incrementSimStep} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition" title={t('sim_step_plus')} id="btn-sim-step">
            <FastForward className="w-4 h-4" />
          </button>

          {/* T10: Escalate */}
          <button onClick={escalatePending} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full text-xs transition shadow-lg shadow-amber-500/20" id="btn-escalate" title={t('escalate_desc')}>
            {t('escalate_all')}
          </button>

          {/* Undo with tooltip */}
          <div className="relative group">
            <button onClick={undoAction} disabled={system.actionHistory.isEmpty()}
              className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition disabled:opacity-40"
              title={undoLabel} id="btn-undo">
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="absolute top-full mt-2 right-0 z-50 hidden group-hover:block">
              <div className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap">
                {undoLabel}
              </div>
            </div>
          </div>

          {/* T3: Records page button */}
          <button onClick={onShowRecords} className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition" title={t('records_title')} id="btn-records">
            <Archive className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* T1: Maximum Emergency toggle */}
          <button onClick={toggleMaxEmergency} id="btn-max-emergency"
            className={`px-3 py-2 font-black rounded-full text-xs transition-all flex items-center gap-1.5 border-2 ${
              isMaxEmergency
                ? 'bg-red-600 border-red-400 text-white animate-pulse'
                : 'bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
            }`}>
            <ShieldAlert className={`w-4 h-4 ${isMaxEmergency ? 'animate-bounce' : ''}`} />
            {isMaxEmergency ? t('crisis_on') : t('crisis_off')}
          </button>

          {/* Export */}
          <button onClick={handleExport} className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition" title={t('export_json')} id="btn-export">
            <Globe className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

          <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition" id="btn-lang">
            <span className="text-xs font-black">{t('language')}</span>
          </button>

          <button onClick={toggleTheme} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition" id="btn-theme">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
