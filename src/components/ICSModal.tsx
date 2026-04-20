import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateICSScore, getICSTriage, ICS_MAX_SCORE,
  type ICSAssessment,
} from '../lib/crisis-system';
import { ShieldAlert, Flame, TrendingUp, Users, Siren, Building2, X, ChevronRight, Info } from 'lucide-react';

interface Props {
  onComplete: (priority: number, score: number, assessment: ICSAssessment) => void;
  onCancel: () => void;
}

const CRITERIA = [
  {
    key: 'lifeThreat' as keyof ICSAssessment,
    icon: Flame,
    color: 'red',
    label: 'Immediate Threat to Life',
    weight: 5,
    help: 'How many lives are at immediate risk within the next 5–10 minutes?',
    levels: ['No risk', 'Minimal', 'Moderate', 'Serious', 'Critical / Multiple fatalities imminent'],
  },
  {
    key: 'escalationRate' as keyof ICSAssessment,
    icon: TrendingUp,
    color: 'orange',
    label: 'Rate of Escalation',
    weight: 4,
    help: 'Will the situation double in damage or danger every 15 minutes?',
    levels: ['Static / contained', 'Slow spread', 'Moderate spread', 'Rapid escalation', 'Exponential / uncontrollable'],
  },
  {
    key: 'potentialScale' as keyof ICSAssessment,
    icon: Users,
    color: 'amber',
    label: 'Potential Scale',
    weight: 3,
    help: 'Number of people, critical infrastructure, or economic impact at risk.',
    levels: ['< 5 people', '5–25 people', '25–100 people', '100–500 people', '> 500 people or national infrastructure'],
  },
  {
    key: 'selfResponse' as keyof ICSAssessment,
    icon: Siren,
    color: 'blue',
    label: 'Available Self-Response',
    weight: 2,
    help: 'Does the site already have fire suppression, security, or medical staff?',
    levels: ['Full on-site team', 'Partial coverage', 'Limited equipment', 'Minimal', 'None – fully dependent on response'],
  },
  {
    key: 'facilityType' as keyof ICSAssessment,
    icon: Building2,
    color: 'purple',
    label: 'Criticality of Facility',
    weight: 3,
    help: 'Is this a hospital, power plant, government building, or critical asset?',
    levels: ['Residential / low impact', 'Commercial', 'Industrial', 'Public service (schools, transit)', 'Critical: Hospital / Power / Gov'],
  },
];

const COLOR_CLASSES: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

const TRIAGE_STYLES = {
  RED:    { bg: 'bg-red-600',    text: 'text-white',      border: 'border-red-500'    },
  ORANGE: { bg: 'bg-orange-500', text: 'text-white',      border: 'border-orange-400' },
  YELLOW: { bg: 'bg-yellow-400', text: 'text-slate-900',  border: 'border-yellow-300' },
};

export function ICSModal({ onComplete, onCancel }: Props) {
  const [assessment, setAssessment] = useState<ICSAssessment>({
    lifeThreat: 3,
    escalationRate: 3,
    potentialScale: 3,
    selfResponse: 3,
    facilityType: 3,
  });
  const [step, setStep] = useState(0);   // 0 = form, 1 = result
  const [showHelp, setShowHelp] = useState<string | null>(null);

  const score = calculateICSScore(assessment);
  const triage = getICSTriage(score);
  const pct = Math.round((score / ICS_MAX_SCORE) * 100);

  const update = (key: keyof ICSAssessment, val: number) =>
    setAssessment(prev => ({ ...prev, [key]: val }));

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
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
              ICS-201 INCIDENT ASSESSMENT FORM
            </div>
            <h2 className="text-2xl font-black flex items-center gap-3">
              <ShieldAlert className="text-amber-400" /> Priority Scoring Matrix
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Rate each criterion 1–5. The weighted score determines response tier (Red / Orange / Yellow) within 60 seconds.
            </p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Live Score Bar */}
              <div className="px-6 pt-5 pb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Live Score</span>
                  <span className="font-mono font-black text-sm">{score} / {ICS_MAX_SCORE}&nbsp;
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black ${TRIAGE_STYLES[triage.color].bg} ${TRIAGE_STYLES[triage.color].text}`}>
                      {triage.color} – {triage.label}
                    </span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${triage.color === 'RED' ? 'bg-red-500' : triage.color === 'ORANGE' ? 'bg-orange-500' : 'bg-yellow-400'}`}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  />
                </div>
              </div>

              {/* Criteria */}
              <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto">
                {CRITERIA.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg ${COLOR_CLASSES[c.color]} flex items-center justify-center`}>
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-bold">{c.label}</span>
                          <span className="text-[10px] font-mono text-slate-400">×{c.weight}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setShowHelp(showHelp === c.key ? null : c.key)}
                            className="text-slate-400 hover:text-slate-600 transition">
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <span className={`w-8 h-8 flex items-center justify-center font-black text-sm rounded-xl ${COLOR_CLASSES[c.color]} text-white`}>
                            {assessment[c.key]}
                          </span>
                        </div>
                      </div>

                      {/* Slider */}
                      <input
                        type="range" min={1} max={5} step={1}
                        value={assessment[c.key]}
                        onChange={e => update(c.key, Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5"
                      />

                      {/* Labels */}
                      <div className="flex justify-between text-[9px] text-slate-400 font-medium px-0.5">
                        {c.levels.map((_lvl, i) => (
                          <span key={i} className={`text-center ${i + 1 === assessment[c.key] ? 'text-indigo-600 font-black' : ''}`}>
                            {i + 1}
                          </span>
                        ))}
                      </div>

                      {/* Contextual help */}
                      <AnimatePresence>
                        {showHelp === c.key && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-xs text-slate-500 border dark:border-slate-700">
                              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{c.help}</p>
                              <ul className="space-y-1">
                                {c.levels.map((lvl, i) => (
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
                <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  Cancel
                </button>
                <button onClick={() => setStep(1)}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 text-white transition ${
                    triage.color === 'RED' ? 'bg-red-600 hover:bg-red-700' :
                    triage.color === 'ORANGE' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  Review Assessment <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            // ─── Result Summary (ICS-201 style) ───────────────────────────────
            <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className={`${TRIAGE_STYLES[triage.color].bg} ${TRIAGE_STYLES[triage.color].text} p-8 text-center`}>
                <div className="text-6xl font-black mb-2">{triage.color}</div>
                <div className="text-2xl font-bold">{triage.label} Response</div>
                <div className="text-sm opacity-80 mt-1">Score {score}/{ICS_MAX_SCORE} ({pct}%) · Dispatches with Priority {triage.priority}</div>
              </div>

              {/* Decision Flowchart summary */}
              <div className="p-6 space-y-3">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 mb-4">Assessment Breakdown</h3>
                {CRITERIA.map(c => {
                  const Icon = c.icon;
                  const contrib = assessment[c.key] * c.weight;
                  const max = 5 * c.weight;
                  return (
                    <div key={c.key} className="flex items-center gap-3">
                      <div className={`w-6 h-6 shrink-0 rounded-lg ${COLOR_CLASSES[c.color]} flex items-center justify-center`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>{c.label}</span>
                          <span className="font-black">{contrib}/{max}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${COLOR_CLASSES[c.color]} rounded-full`} style={{ width: `${(contrib / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-2xl border dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  ← Adjust
                </button>
                <button
                  onClick={() => onComplete(triage.priority, score, assessment)}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm text-white ${
                    triage.color === 'RED' ? 'bg-red-600 hover:bg-red-700' :
                    triage.color === 'ORANGE' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-yellow-500 hover:bg-yellow-600'
                  } transition`}
                >
                  Confirm & Dispatch Report
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
