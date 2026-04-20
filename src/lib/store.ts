import { create } from 'zustand';
import { CrisisSystem, type AuditEntry } from './crisis-system';

interface AppState {
  system: CrisisSystem;
  version: number;
  selectedNode: string | null;
  theme: 'dark' | 'light';
  lang: 'en' | 'ar';
  isMassCrisis: boolean;
  auditLog: AuditEntry[];
  
  initSystem: () => void;
  fileReport: (district: string, deptShort: string, type: string, desc: string, priority: number, secondary?: string, icsScore?: number) => void;
  resolveReport: (reportId: number) => void;
  escalatePending: () => void;
  undoAction: () => void;
  transferPending: (fromDept: string, toDept: string, reportId: number) => void;
  incrementSimStep: () => void;
  toggleMassCrisis: () => void;
  addAudit: (msg: string, type?: AuditEntry['type']) => void;
  
  setSelectedNode: (nodeName: string | null) => void;
  toggleTheme: () => void;
  setLang: (lang: 'en' | 'ar') => void;
}

const sys = new CrisisSystem();

export const useAppStore = create<AppState>((set, get) => ({
  system: sys,
  version: 0,
  selectedNode: null,
  theme: 'dark',
  lang: 'en',
  isMassCrisis: false,
  auditLog: [],

  addAudit: (msg, type = 'info') => {
    const entry: AuditEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      msg,
      type
    };
    set((state) => ({ auditLog: [entry, ...state.auditLog].slice(0, 10) }));
  },

  initSystem: () => {
    sys.initializeSystem();
    get().addAudit("System Initialized", "success");
    set((state) => ({ version: state.version + 1 }));
  },

  fileReport: (district, deptShort, type, desc, priority, secondary, icsScore) => {
    sys.fileReport(district, deptShort, type, desc, priority, get().isMassCrisis, secondary, icsScore);
    get().addAudit(`New report filed in ${deptShort} (ICS score: ${icsScore ?? 'N/A'})`, 'info');
    set((state) => ({ version: state.version + 1 }));
  },

  resolveReport: (reportId) => {
    sys.resolveReport(reportId);
    get().addAudit(`Report #${reportId} resolved`, "success");
    set((state) => ({ version: state.version + 1 }));
  },

  escalatePending: () => {
    sys.escalatePendingReports(); // note: in our logic it calls escalateInTree(root, isMassCrisis)
    // Actually our escalateInTree needs isMassCrisis, we need to fix systemic call
    sys.escalateInTree(sys.root, get().isMassCrisis);
    get().addAudit("Global escalation triggered", "warning");
    set((state) => ({ version: state.version + 1 }));
  },

  undoAction: () => {
    sys.undoLastAction();
    get().addAudit("Last action undone", "info");
    set((state) => ({ version: state.version + 1 }));
  },

  transferPending: (fromDept, toDept, reportId) => {
    sys.transferPendingReport(fromDept, toDept, reportId);
    get().addAudit(`Transferred #${reportId} to ${toDept}`, "info");
    set((state) => ({ version: state.version + 1 }));
  },

  incrementSimStep: () => {
    sys.simStep++;
    // Aging logic: every 5 steps
    if (sys.simStep % 5 === 0) {
      sys.applyAging(sys.root);
      get().addAudit("System Aging: Priorities increased for pending reports", "warning");
    }
    set((state) => ({ version: state.version + 1 }));
  },

  toggleMassCrisis: () => {
    const newVal = !get().isMassCrisis;
    set({ isMassCrisis: newVal });
    get().addAudit(newVal ? "MASS CRISIS MODE ACTIVATED" : "Mass Crisis Mode Deactivated", newVal ? "error" : "success");
  },

  setSelectedNode: (nodeName) => set({ selectedNode: nodeName }),
  
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: newTheme };
  }),

  setLang: (lang) => set({ lang }),
}));
