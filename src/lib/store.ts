import { create } from 'zustand';
import { CrisisSystem, type AuditEntry } from './crisis-system';

// ─── TASK 5: CrisisSystem is created ONCE outside the store factory.
// Theme toggles only mutate `theme` inside the store — they NEVER touch `system`.
// The singleton `sys` is initialized from LocalStorage on app start (TASK 3).
const sys: CrisisSystem = CrisisSystem.loadFromStorage() ?? new CrisisSystem();

// ─── TASK 5: Theme is also persisted separately so it never causes sys re-init.
function loadTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem('crisis_theme');
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function saveTheme(theme: 'dark' | 'light') {
  try { localStorage.setItem('crisis_theme', theme); } catch { /* ignore */ }
}

interface AppState {
  system: CrisisSystem;
  version: number;
  selectedNode: string | null;
  theme: 'dark' | 'light';
  lang: 'en' | 'ar';
  isMassCrisis: boolean;
  auditLog: AuditEntry[];

  initSystem:        () => void;
  fileReport:        (district: string, deptShort: string, type: string, desc: string, priority: number, secondary?: string, icsScore?: number) => void;
  resolveReport:     (reportId: number) => void;
  escalatePending:   () => void;
  undoAction:        () => void;
  transferPending:   (fromDept: string, toDept: string, reportId: number) => void;
  incrementSimStep:  () => void;
  toggleMassCrisis:  () => void;
  addAudit:          (msg: string, type?: AuditEntry['type']) => void;

  setSelectedNode: (nodeName: string | null) => void;
  toggleTheme:     () => void;
  setLang:         (lang: 'en' | 'ar') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  system:       sys,
  version:      0,
  selectedNode: null,
  theme:        loadTheme(),    // TASK 5: loaded from localStorage
  lang:         'en',
  isMassCrisis: false,
  auditLog:     [],

  // ── Audit helper ─────────────────────────────────────────────────────────────
  addAudit: (msg, type = 'info') => {
    const entry: AuditEntry = {
      id:        Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      msg,
      type,
    };
    set((state) => ({ auditLog: [entry, ...state.auditLog].slice(0, 50) }));
  },

  // ── Init (TASK 3 & 5: only init when no saved data exists) ───────────────────
  initSystem: () => {
    // If already loaded from LocalStorage, don't re-seed
    if (sys.root !== null) {
      get().addAudit('System restored from saved state', 'success');
      set((state) => ({ version: state.version + 1 }));
      return;
    }
    sys.initializeSystem();
    get().addAudit('System Initialized', 'success');
    set((state) => ({ version: state.version + 1 }));
  },

  // ── File Report ────────────────────────────────────────────────────────────────
  fileReport: (district, deptShort, type, desc, priority, secondary, icsScore) => {
    sys.fileReport(district, deptShort, type, desc, priority, get().isMassCrisis, secondary, icsScore);
    get().addAudit(`New report filed in ${deptShort} (ICS score: ${icsScore ?? 'N/A'})`, 'info');
    set((state) => ({ version: state.version + 1 }));
  },

  // ── Resolve ────────────────────────────────────────────────────────────────────
  resolveReport: (reportId) => {
    sys.resolveReport(reportId);
    get().addAudit(`Report #${reportId} resolved`, 'success');
    set((state) => ({ version: state.version + 1 }));
  },

  // ── Escalate (TASK 7: escalatePendingReports already increments simStep once) ─
  escalatePending: () => {
    sys.escalatePendingReports(get().isMassCrisis);
    get().addAudit('Global escalation triggered', 'warning');
    set((state) => ({ version: state.version + 1 }));
  },

  // ── Undo ───────────────────────────────────────────────────────────────────────
  undoAction: () => {
    const lastAction = sys.actionHistory.top();
    const desc = lastAction ? `${lastAction.type} #${lastAction.reportId}` : 'nothing';
    sys.undoLastAction();
    get().addAudit(`Undone: ${desc}`, 'info');
    set((state) => ({ version: state.version + 1 }));
  },

  // ── Transfer (TASK 2) ──────────────────────────────────────────────────────────
  transferPending: (fromDept, toDept, reportId) => {
    sys.transferPendingReport(fromDept, toDept, reportId);
    get().addAudit(`Transferred #${reportId} → ${toDept}`, 'info');
    set((state) => ({ version: state.version + 1 }));
  },

  // ── +1 Sim Step (TASK 7) ───────────────────────────────────────────────────────
  incrementSimStep: () => {
    sys.simStep++;
    if (sys.simStep % 5 === 0) {
      sys.applyAging(sys.root);
      get().addAudit('System Aging: Priorities increased for pending reports', 'warning');
    }
    sys.persist();
    set((state) => ({ version: state.version + 1 }));
  },

  // ── Mass Crisis ────────────────────────────────────────────────────────────────
  toggleMassCrisis: () => {
    const newVal = !get().isMassCrisis;
    set({ isMassCrisis: newVal });
    get().addAudit(
      newVal ? 'MASS CRISIS MODE ACTIVATED' : 'Mass Crisis Mode Deactivated',
      newVal ? 'error' : 'success',
    );
  },

  setSelectedNode: (nodeName) => set({ selectedNode: nodeName }),

  // ── TASK 5: Theme toggle is PURELY cosmetic — does NOT touch sys ──────────────
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      saveTheme(newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // system, version, auditLog — all untouched
      return { theme: newTheme };
    }),

  setLang: (lang) => set({ lang }),
}));
