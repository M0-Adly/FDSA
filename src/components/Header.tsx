import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import { ShieldAlert, FastForward, Globe, Moon, Sun, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

export function Header() {
  const { t, i18n } = useTranslation();
  const {
    system, lang, theme, toggleTheme, setLang,
    escalatePending, undoAction, incrementSimStep,
    isMassCrisis, toggleMassCrisis,
  } = useAppStore();

  const stats = system.getSystemStats();

  const handleExport = () => {
    const data = {
      simStep: system.simStep,
      stats: system.getSystemStats(),
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crisis_report_step_${system.simStep}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    i18n.changeLanguage(lang);
  }, [lang, i18n]);

  const districtNames = {
    'First District':  t('districts.d1'),
    'Second District': t('districts.d2'),
  } as Record<string, string>;

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

        {/* Stats + Sim Step */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          {Object.entries(stats).map(([distName, data]) => (
            <div
              key={distName}
              className="hidden md:flex flex-col text-xs font-semibold bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-slate-200 dark:border-slate-800"
            >
              <span className="text-slate-500">{districtNames[distName] ?? distName}</span>
              <div className="flex gap-3 mt-1">
                <span className="text-blue-600 dark:text-blue-400">{t('ongoing')[0]}: {data.ongoing}</span>
                <span className="text-amber-500">{t('pending')[0]}: {data.pending}</span>
                <span className="text-emerald-500">{t('resolved')[0]}: {data.resolved}</span>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-mono text-sm border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">{t('sim_step')}:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{system.simStep}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* +1 Sim Step */}
          <button
            onClick={incrementSimStep}
            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            title={t('sim_step_plus')}
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Escalate All */}
          <button
            onClick={escalatePending}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full text-xs transition shadow-lg shadow-amber-500/20"
          >
            {t('escalate_all')}
          </button>

          {/* Undo */}
          <button
            onClick={undoAction}
            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            title={t('undo')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Mass Crisis Toggle */}
          <button
            onClick={toggleMassCrisis}
            className={`px-3 py-2 font-black rounded-full text-xs transition-all flex items-center gap-1.5 border-2 ${
              isMassCrisis
                ? 'bg-red-600 border-red-400 text-white animate-pulse'
                : 'bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${isMassCrisis ? 'animate-bounce' : ''}`} />
            {isMassCrisis ? t('crisis_on') : t('crisis_off')}
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition"
            title={t('export_json')}
          >
            <Globe className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Language */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            <span className="text-xs font-black">{t('language')}</span>
          </button>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
