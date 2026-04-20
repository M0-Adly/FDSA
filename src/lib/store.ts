import { create } from 'zustand';
import { CrisisSystem, type AuditEntry } from './crisis-system';

// Singleton — created ONCE, never recreated on theme/lang change
const sys: CrisisSystem = CrisisSystem.loadFromStorage() ?? new CrisisSystem();

function loadTheme(): 'dark' | 'light' {
  try { return (localStorage.getItem('crisis_theme') === 'light') ? 'light' : 'dark'; } catch { return 'dark'; }
}
function saveTheme(t: 'dark' | 'light') {
  try { localStorage.setItem('crisis_theme', t); } catch { /* ignore */ }
}

interface AppState {
  system: CrisisSystem;
  version: number;
  selectedNode: string | null;
  theme: 'dark' | 'light';
  lang: 'en' | 'ar';
  // T1: renamed from isMassCrisis → isMaxEmergency for clarity
  isMaxEmergency: boolean;
  auditLog: AuditEntry[];
  searchFilter: string;

  initSystem:       () => void;
  fileReport:       (district: string, deptShort: string, type: string, desc: string, priority: number, secondary?: string, icsScore?: number) => void;
  resolveReport:    (reportId: number) => void;
  escalatePending:  () => void;
  undoAction:       () => void;
  // T6: only needs fromDept and reportId — sibling is auto-computed
  transferPending:  (fromDept: string, reportId: number) => void;
  // T7: manual force promote
  forceOngoing:     (deptName: string, reportId: number) => 'ok' | 'full' | 'notfound';
  incrementSimStep: () => void;
  toggleMaxEmergency: () => void;
  addAudit:         (msg: string, type?: AuditEntry['type']) => void;

  setSelectedNode: (n: string | null) => void;
  setSearchFilter: (q: string) => void;
  toggleTheme:     () => void;
  setLang:         (l: 'en' | 'ar') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  system:         sys,
  version:        0,
  selectedNode:   null,
  theme:          loadTheme(),
  lang:           'en',
  isMaxEmergency: false,
  auditLog:       [],
  searchFilter:   '',

  addAudit: (msg, type = 'info') => {
    const entry: AuditEntry = {
      id:        Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      msg,
      type,
    };
    set((s) => ({ auditLog: [entry, ...s.auditLog].slice(0, 100) }));
  },

  initSystem: () => {
    if (sys.root !== null) {
      get().addAudit('System restored from saved state', 'success');
      set((s) => ({ version: s.version + 1 }));
      return;
    }
    sys.initializeSystem();
    get().addAudit('System Initialized', 'success');
    set((s) => ({ version: s.version + 1 }));
  },

  fileReport: (district, deptShort, type, desc, priority, secondary, icsScore) => {
    sys.fileReport(district, deptShort, type, desc, priority, get().isMaxEmergency, secondary, icsScore);
    get().addAudit(`Filed report in ${deptShort} (ICS: ${icsScore ?? 'N/A'})`, 'info');
    set((s) => ({ version: s.version + 1 }));
  },

  resolveReport: (reportId) => {
    sys.resolveReport(reportId, get().isMaxEmergency);
    get().addAudit(`Report #${reportId} resolved`, 'success');
    set((s) => ({ version: s.version + 1 }));
  },

  escalatePending: () => {
    sys.escalatePendingReports(get().isMaxEmergency);
    get().addAudit('Global escalation triggered', 'warning');
    set((s) => ({ version: s.version + 1 }));
  },

  undoAction: () => {
    const last = sys.actionHistory.top();
    const desc = last ? `${last.type} #${last.reportId}` : 'nothing';
    sys.undoLastAction();
    get().addAudit(`Undone: ${desc}`, 'info');
    set((s) => ({ version: s.version + 1 }));
  },

  // T6: forced transfer — only needs fromDept + reportId
  transferPending: (fromDept, reportId) => {
    const result = sys.transferPendingReport(fromDept, reportId);
    if (result === 'ok') {
      const sib = sys.getSiblingDept(fromDept);
      get().addAudit(`Transferred #${reportId} → ${sib?.name ?? 'sibling'}`, 'info');
    } else {
      get().addAudit(`Transfer failed: ${result}`, 'error');
    }
    set((s) => ({ version: s.version + 1 }));
  },

  // T7: manual force promote
  forceOngoing: (deptName, reportId) => {
    const result = sys.forceOngoing(deptName, reportId, get().isMaxEmergency);
    if (result === 'ok')   get().addAudit(`Report #${reportId} forced to Ongoing`, 'success');
    if (result === 'full') get().addAudit(`Cannot promote #${reportId}: ongoing list full`, 'error');
    set((s) => ({ version: s.version + 1 }));
    return result;
  },

  incrementSimStep: () => {
    sys.simStep++;
    if (sys.simStep % 5 === 0) {
      sys.applyAging(sys.root);
      get().addAudit('Aging: priorities increased for pending reports', 'warning');
    }
    sys.persist();
    set((s) => ({ version: s.version + 1 }));
  },

  toggleMaxEmergency: () => {
    const newVal = !get().isMaxEmergency;
    set({ isMaxEmergency: newVal });
    get().addAudit(
      newVal ? '🚨 MAXIMUM EMERGENCY MODE ACTIVATED' : 'Maximum Emergency Mode Deactivated',
      newVal ? 'error' : 'success',
    );
  },

  setSelectedNode: (n) => set({ selectedNode: n }),
  setSearchFilter: (q) => set({ searchFilter: q }),

  toggleTheme: () =>
    set((s) => {
      const t = s.theme === 'dark' ? 'light' : 'dark';
      saveTheme(t);
      document.documentElement.classList.toggle('dark', t === 'dark');
      return { theme: t };
    }),

  setLang: (l) => set({ lang: l }),
}));
