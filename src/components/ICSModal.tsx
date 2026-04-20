import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateICSScore, getICSTriage, ICS_MAX_SCORE,
  type ICSAssessment,
} from '../lib/crisis-system';
import {
  ShieldAlert, Flame, TrendingUp, Users, Siren, Building2,
  X, ChevronRight, Info,
} from 'lucide-react';

interface Props {
  onComplete: (priority: number, score: number, assessment: ICSAssessment) => void;
  onCancel: () => void;
}

type CriterionKey = keyof ICSAssessment;

const CRITERION_KEYS: CriterionKey[] = [
  'lifeThreat', 'escalationRate', 'potentialScale', 'selfResponse', 'facilityType',
];

const ICONS = {
  lifeThreat:     Flame,
  escalationRate: TrendingUp,
  potentialScale: Users,
  selfResponse:   Siren,
  facilityType:   Building2,
};

const COLORS: Record<CriterionKey, string> = {
  lifeThreat:     'bg-red-500',
  escalationRate: 'bg-orange-500',
  potentialScale: 'bg-amber-500',
  selfResponse:   'bg-blue-500',
  facilityType:   'bg-purple-500',
};

const WEIGHTS: Record<CriterionKey, number> = {
  lifeThreat: 5, escalationRate: 4, potentialScale: 3, selfResponse: 2, facilityType: 3,
};

const TRIAGE_STYLES = {
  RED:    { bg: 'bg-red-600',    text: 'text-white',     },
  ORANGE: { bg: 'bg-orange-500', text: 'text-white',     },
  YELLOW: { bg: 'bg-yellow-400', text: 'text-slate-900', },
};

export function ICSModal({ onComplete, onCancel }: Props) {
  const { t } = useTranslation();

  const [assessment, setAssessment] = useState<ICSAssessment>({
    lifeThreat: 3, escalationRate: 3, potentialScale: 3,
    selfResponse: 3, facilityType: 3,
  });
  const [step, setStep]         = useState(0);
  const [showHelp, setShowHelp] = useState<CriterionKey | null>(null);

  const score  = calculateICSScore(assessment);
  const triage = getICSTriage(score);
  const pct    = Math.round((score / ICS_MAX_SCORE) * 100);

  const update = (key: CriterionKey, val: number) =>
    setAssessment(prev => ({ ...prev, [key]: val }));

  const triageLabel =
    triage.color === 'RED'    ? t('ics.immediate')  :
    triage.color === 'ORANGE' ? t('ics.urgent')     : t('ics.non_urgent');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">
              {t('ics.form_subtitle')}
            </div>
            <h2 className="text-2xl font-black flex items-center gap-3">
              <ShieldAlert className="text-amber-400" /> {t('ics.form_title')}
            </h2>
            <p className="text-slate-400 text-xs mt-1">{t('ics.form_desc')}</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 ? (
            /* ── Scoring Form ── */
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Live Score Bar */}
              <div className="px-6 pt-5 pb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                    {t('ics.live_score')}
                  </span>
                  <span className="font-mono font-black text-sm">
                    {score} / {ICS_MAX_SCORE}&nbsp;
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black ${TRIAGE_STYLES[triage.color].bg} ${TRIAGE_STYLES[triage.color].text}`}>
                      {triage.color} – {triageLabel}
                    </span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      triage.color === 'RED'    ? 'bg-red-500'    :
                      triage.color === 'ORANGE' ? 'bg-orange-500' : 'bg-yellow-400'
                    }`}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  />
                </div>
              </div>

              {/* Criteria */}
              <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto">
                {CRITERION_KEYS.map((key) => {
                  const Icon      = ICONS[key];
                  const colorCls  = COLORS[key];
                  const label     = t(`ics.criteria.${key}.label`);
                  const help      = t(`ics.criteria.${key}.help`);
                  const levels    = t(`ics.criteria.${key}.levels`, { returnObjects: true }) as string[];
                  const weightLbl = t(`ics.criteria.${key}.weight`);

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg ${colorCls} flex items-center justify-center shrink-0`}>
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-bold">{label}</span>
                          <span className="text-[10px] font-mono text-slate-400">{weightLbl}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowHelp(showHelp === key ? null : key)}
                            className="text-slate-400 hover:text-slate-600 transition"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <span className={`w-8 h-8 flex items-center justify-center font-black text-sm rounded-xl ${colorCls} text-white`}>
                            {assessment[key]}
                          </span>
                        </div>
                      </div>

                      <input
                        type="range" min={1} max={5} step={1}
                        value={assessment[key]}
                        onChange={e => update(key, Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5"
                      />

                      {/* Level labels */}
                      <div className="flex justify-between px-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <span
                            key={i}
                            className={`text-[9px] font-medium text-center ${
                              i === assessment[key] ? 'text-indigo-600 font-black' : 'text-slate-400'
                            }`}
                          >
                            {i}
                          </span>
                        ))}
                      </div>

                      {/* Contextual help */}
                      <AnimatePresence>
                        {showHelp === key && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border dark:border-slate-700 text-xs text-slate-500">
                              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{help}</p>
                              <ul className="space-y-1">
                                {levels.map((lvl, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="font-black text-indigo-500 shrink-0">{i + 1}.</span>
                                    <span>{lvl}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-2xl border dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 text-white transition ${
                    triage.color === 'RED'    ? 'bg-red-600 hover:bg-red-700'       :
                    triage.color === 'ORANGE' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  {t('ics.review')} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── Result Summary ── */
            <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className={`${TRIAGE_STYLES[triage.color].bg} ${TRIAGE_STYLES[triage.color].text} p-8 text-center`}>
                <div className="text-5xl font-black mb-2">{triage.color}</div>
                <div className="text-2xl font-bold">{triageLabel} {t('ics.response')}</div>
                <div className="text-sm opacity-80 mt-1">
                  {t('ics.score_label', {
                    score,
                    max: ICS_MAX_SCORE,
                    pct,
                    priority: triage.priority,
                  })}
                </div>
              </div>

              <div className="p-6 space-y-3">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 mb-4">
                  {t('ics.result_title')}
                </h3>
                {CRITERION_KEYS.map(key => {
                  const Icon     = ICONS[key];
                  const colorCls = COLORS[key];
                  const contrib  = assessment[key] * WEIGHTS[key];
                  const max      = 5 * WEIGHTS[key];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className={`w-6 h-6 shrink-0 rounded-lg ${colorCls} flex items-center justify-center`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>{t(`ics.criteria.${key}.label`)}</span>
                          <span className="font-black">{contrib}/{max}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colorCls} rounded-full`}
                            style={{ width: `${(contrib / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 py-3 rounded-2xl border dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  {t('adjust')}
                </button>
                <button
                  onClick={() => onComplete(triage.priority, score, assessment)}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm text-white transition ${
                    triage.color === 'RED'    ? 'bg-red-600 hover:bg-red-700'       :
                    triage.color === 'ORANGE' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  {t('ics.confirm')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
