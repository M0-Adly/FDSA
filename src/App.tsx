import { useEffect } from 'react';
import { useAppStore } from './lib/store';
import { Header } from './components/Header';
import { TreeVisualizer } from './components/TreeVisualizer';
import { DepartmentDashboard } from './components/DepartmentDashboard';
import { Chatbot } from './components/Chatbot';
import './lib/i18n';
import { useTranslation } from 'react-i18next';

function App() {
  const { initSystem, theme } = useAppStore();
  const { t } = useTranslation();

  useEffect(() => {
    initSystem();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [initSystem, theme]);

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-hidden bg-slate-50 dark:bg-[#09090b]">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] bg-amber-500/10 dark:bg-amber-600/5 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[0%] left-[20%] w-[30%] h-[40%] bg-emerald-500/10 dark:bg-emerald-600/5 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      <Header />

      <main className="flex-1 container mx-auto p-4 flex flex-col md:flex-row gap-4 relative z-10">
        {/* Tree Sidebar */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="glass-panel p-4 h-full flex flex-col shadow-xl">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">{t('app_title')}</h2>
            <div className="flex-1 min-h-[400px]">
              <TreeVisualizer />
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">{t('stats')}</p>
          </div>
        </div>

        {/* Selected Dashboard */}
        <div className="w-full md:w-2/3 h-full min-h-[600px] flex flex-col">
          <DepartmentDashboard />
        </div>
      </main>

      <Chatbot />
    </div>
  );
}

export default App;
