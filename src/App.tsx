import { useEffect } from 'react';
import { useAppStore } from './lib/store';
import { Header } from './components/Header';
import { TreeVisualizer } from './components/TreeVisualizer';
import { DepartmentDashboard } from './components/DepartmentDashboard';
import { Chatbot } from './components/Chatbot';
import { AuditSidebar } from './components/AuditSidebar';
import './lib/i18n';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  // TASK 5: Only destructure what we need — theme is handled inside Header and store
  const { initSystem, theme, isMassCrisis } = useAppStore();
  const { t } = useTranslation();

  // TASK 5: initSystem only runs ONCE on mount.
  // Theme application is handled in the Header useEffect — NOT here —
  // so toggling theme never re-triggers initSystem.
  useEffect(() => {
    // Apply saved theme on first paint (also repeated in Header, belt-and-suspenders)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    initSystem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: runs once only, never on theme change

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-1000 relative overflow-hidden ${
      isMassCrisis
        ? 'bg-red-50 dark:bg-[#1a0505]'
        : 'bg-slate-50 dark:bg-[#09090b]'
    }`}>

      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] mix-blend-screen transition-colors duration-1000 ${
          isMassCrisis ? 'bg-red-600/20' : 'bg-blue-500/10 dark:bg-blue-600/5'
        }`} />
        <div className={`absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full blur-[120px] mix-blend-screen transition-colors duration-1000 ${
          isMassCrisis ? 'bg-orange-600/20' : 'bg-amber-500/10 dark:bg-amber-600/5'
        }`} />
      </div>

      <Header />

      {/* Mass Crisis Overlay Banner */}
      <AnimatePresence>
        {isMassCrisis && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center py-1 z-50 overflow-hidden"
          >
            {t('mass_crisis_banner')}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 container mx-auto p-4 grid grid-cols-12 gap-4 relative z-10 overflow-hidden">
        {/* Left: Tree & Logs */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="glass-panel p-4 h-[350px] flex flex-col shadow-xl">
            <h2 className="text-sm font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              {t('system_hierarchy')}
            </h2>
            <div className="flex-1 rounded-xl overflow-hidden bg-slate-100 dark:bg-black/20 border dark:border-slate-800">
              <TreeVisualizer />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center px-2">{t('click_to_select')}</p>
          </div>

          <div className="flex-1 min-h-[300px]">
            <AuditSidebar />
          </div>
        </div>

        {/* Right: Main Dashboard */}
        <div className="col-span-12 lg:col-span-9 h-full flex flex-col overflow-hidden">
          <DepartmentDashboard />
        </div>
      </main>

      <Chatbot />

      {/* Grid Overlay for aesthetic */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-0"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }}
      />
    </div>
  );
}

export default App;
