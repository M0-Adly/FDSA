import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export function AuditSidebar() {
  const { auditLog } = useAppStore();
  const { t } = useTranslation();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle  className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500"  />;
      case 'error':   return <AlertCircle  className="w-4 h-4 text-red-500"     />;
      default:        return <Info         className="w-4 h-4 text-blue-500"    />;
    }
  };

  return (
    <div className="glass-panel p-4 flex flex-col h-full shadow-lg border-t-4 border-indigo-500">
      <h3 className="text-xs font-bold flex items-center gap-2 mb-4 text-slate-600 dark:text-slate-400 uppercase tracking-widest">
        <Terminal className="w-4 h-4" /> {t('audit.title')}
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence initial={false}>
          {auditLog.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-2 rounded-lg bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 flex items-start gap-3"
            >
              <div className="mt-1">{getIcon(entry.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold dark:text-slate-200 break-words">{entry.msg}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{entry.timestamp}</p>
              </div>
            </motion.div>
          ))}

          {auditLog.length === 0 && (
            <p className="text-xs text-slate-400 italic text-center mt-10">
              {t('audit.empty')}
            </p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
