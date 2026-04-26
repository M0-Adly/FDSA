import { useEffect, useState } from 'react';
import { useAppStore } from './lib/store';
import { Header } from './components/Header';
import { TreeVisualizer } from './components/TreeVisualizer';
import { DepartmentDashboard } from './components/DepartmentDashboard';
import { RecordsPage } from './components/RecordsPage';
import { Chatbot } from './components/Chatbot';
import { AuditSidebar } from './components/AuditSidebar';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

function App() {
  const { initSystem, theme, isMaxEmergency, toast } = useAppStore();
  const { t } = useTranslation();

  // T3: simple page state — 'dashboard' | 'records'
  const [page, setPage] = useState<'dashboard' | 'records'>('dashboard');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    initSystem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-1000 relative overflow-hidden ${
      isMaxEmergency ? 'bg-red-50 dark:bg-[#1a0505]' : 'bg-slate-50 dark:bg-[#09090b]'
    }`}>

      {/* Dynamic Background blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] mix-blend-screen transition-colors duration-1000 ${
          isMaxEmergency ? 'bg-red-600/20' : 'bg-blue-500/10 dark:bg-blue-600/5'
        }`} />
        <div className={`absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full blur-[120px] mix-blend-screen transition-colors duration-1000 ${
          isMaxEmergency ? 'bg-orange-600/20' : 'bg-amber-500/10 dark:bg-amber-600/5'
        }`} />
      </div>

      {/* T3: pass navigation callback to Header */}
      <Header onShowRecords={() => setPage(page === 'records' ? 'dashboard' : 'records')} />

      {/* T1: Maximum Emergency banner */}
      <AnimatePresence>
        {isMaxEmergency && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center py-1 z-50 overflow-hidden"
          >
            🚨 {t('mass_crisis_banner')} 🚨
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 container mx-auto p-4 grid grid-cols-12 gap-4 relative z-10 overflow-hidden">

        {/* T3: Left sidebar — only shown on dashboard page */}
        {page === 'dashboard' && (
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
        )}

        {/* Right: Main area — switches between DepartmentDashboard and RecordsPage */}
        <div className={`${page === 'dashboard' ? 'col-span-12 lg:col-span-9' : 'col-span-12'} h-full flex flex-col overflow-hidden`}>
          <AnimatePresence mode="wait">
            {page === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 h-full flex flex-col overflow-hidden"
              >
                <DepartmentDashboard />
              </motion.div>
            ) : (
              <motion.div
                key="records"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 h-full flex flex-col overflow-hidden"
              >
                <RecordsPage onBack={() => setPage('dashboard')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Chatbot />
      
      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-3 border backdrop-blur-md
              ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
                toast.type === 'warning' ? 'bg-amber-500/90  border-amber-400  text-white' : 
                                           'bg-red-500/90    border-red-400    text-white'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dot-grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-0"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }}
      />
    </div>
  );
}

export default App;
