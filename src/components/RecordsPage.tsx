import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../lib/store';
import { type Report } from '../lib/crisis-system';
import { motion } from 'framer-motion';
import { CheckCircle2, Calendar, CalendarDays, CalendarRange, ArrowLeft, Archive } from 'lucide-react';
import { getICSTriage } from '../lib/crisis-system';

type ArchiveFilter = 'all' | 'daily' | 'weekly' | 'monthly';

function PriorityBadge({ priority }: { priority: number }) {
  const cls =
    priority >= 5 ? 'bg-red-600 text-white' :
    priority === 4 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
    priority === 3 ? 'bg-amber-100 text-amber-700' :
    'bg-slate-100 text-slate-500 dark:bg-slate-800';
  return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cls}`}>P{priority}</span>;
}

function TriageBadge({ score }: { score?: number }) {
  if (!score) return null;
  const tri  = getICSTriage(score);
  const clrs = { RED: 'bg-red-500', ORANGE: 'bg-orange-500', YELLOW: 'bg-yellow-400' };
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${clrs[tri.color]}`}>
      {tri.color}
    </span>
  );
}

interface RecordsPageProps {
  onBack: () => void;
}

export function RecordsPage({ onBack }: RecordsPageProps) {
  const { t } = useTranslation();
  const { system, version } = useAppStore();

  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [search, setSearch] = useState('');

  // T3/T8: All resolved across all depts, filtered & sorted by priority (T9)
  const allResolved: Report[] = useMemo(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return system.filterAllResolved(filter);
  }, [system, version, filter]);

  const displayed = useMemo(() => {
    if (!search.trim()) return allResolved;
    const q = search.toLowerCase();
    return allResolved.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        String(r.id).includes(q),
    );
  }, [allResolved, search]);

  const FilterBtn = ({ id, icon: Icon, label }: { id: ArchiveFilter; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setFilter(id)}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition ${
        filter === id
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="glass-panel p-5 flex items-center justify-between gap-4 mb-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            title={t('back')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
              <Archive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black">{t('records_title')}</h2>
              <p className="text-xs text-slate-500">{t('records_subtitle')}</p>
            </div>
          </div>
        </div>
        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
          {displayed.length}
        </span>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterBtn id="all"     icon={CheckCircle2}  label={t('filter_all')} />
        <FilterBtn id="daily"   icon={Calendar}      label={t('filter_daily')} />
        <FilterBtn id="weekly"  icon={CalendarDays}  label={t('filter_weekly')} />
        <FilterBtn id="monthly" icon={CalendarRange} label={t('filter_monthly')} />
        <input
          type="text"
          placeholder={t('records_search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-emerald-500 w-56"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-30">
            <CheckCircle2 className="w-12 h-12" />
            <p className="font-bold">{t('no_resolved')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/80 backdrop-blur">
              <tr>
                {['#ID', t('records_col_type'), t('records_col_desc'), t('records_col_priority'),
                  t('records_col_dept'), t('records_col_step'), t('records_col_duration')].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayed.map((r, idx) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-slate-400 text-xs">#{r.id}</td>
                  <td className="px-4 py-3 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <TriageBadge score={r.icsScore} />
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{r.description}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.supportingDepts?.[0] ? `${r.type} (+ ${r.supportingDepts[0].split(' - ')[0]})` : r.type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{t('step')} {r.timestamp}</td>
                  <td className="px-4 py-3">
                    {r.duration !== undefined ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        ✓ {r.duration} {t('solved_in')}
                      </span>
                    ) : '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
