import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import { Globe, Moon, Sun, ShieldAlert, RotateCcw, FastForward } from 'lucide-react';
import { useEffect } from 'react';

export function Header() {
  const { t, i18n } = useTranslation();
  const { system, theme, lang, toggleTheme, setLang, escalatePending, undoAction, incrementSimStep } = useAppStore();

  const stats = system.getSystemStats();

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    i18n.changeLanguage(lang);
  }, [lang, i18n]);

  return (
    <header className="glass shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-amber-500 bg-clip-text text-transparent">
            {t('app_title')}
          </h1>
        </div>

        <div className="flex items-center gap-6 text-sm">
          {Object.entries(stats).map(([distName, data]) => (
            <div key={distName} className="hidden md:flex flex-col text-xs font-semibold bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">{distName}</span>
              <div className="flex gap-3 mt-1">
                <span className="text-blue-600 dark:text-blue-400">O: {data.ongoing}</span>
                <span className="text-amber-500">P: {data.pending}</span>
                <span className="text-emerald-500">R: {data.resolved}</span>
              </div>
            </div>
          ))}
          
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-mono text-sm border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">{t('sim_step')}:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{system.simStep}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={incrementSimStep} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition" title="+1 Step">
            <FastForward className="w-4 h-4" />
          </button>
          
          <button 
            onClick={escalatePending} 
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-full text-sm transition shadow-lg shadow-amber-500/20"
          >
            {t('escalate_all')}
          </button>
          
          <button 
            onClick={undoAction}
            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            title={t('undo')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2"></div>

          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-bold">{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>

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
