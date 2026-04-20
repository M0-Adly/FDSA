import { create } from 'zustand';
import { CrisisSystem } from './crisis-system';

interface AppState {
  system: CrisisSystem;
  version: number; // to trigger re-renders since system mutates internally
  selectedNode: string | null;
  theme: 'dark' | 'light';
  lang: 'en' | 'ar';
  
  initSystem: () => void;
  fileReport: (district: string, deptShort: string, type: string, desc: string, priority: number) => void;
  resolveReport: (reportId: number) => void;
  escalatePending: () => void;
  undoAction: () => void;
  transferPending: (fromDept: string, toDept: string, reportId: number) => void;
  incrementSimStep: () => void;
  
  setSelectedNode: (nodeName: string | null) => void;
  toggleTheme: () => void;
  setLang: (lang: 'en' | 'ar') => void;
}

const sys = new CrisisSystem();
// We'll initialize it immediately or inside initSystem
export const useAppStore = create<AppState>((set) => ({
  system: sys,
  version: 0,
  selectedNode: null,
  theme: 'dark',
  lang: 'en',

  initSystem: () => {
    sys.initializeSystem();
    set((state) => ({ version: state.version + 1 }));
  },

  fileReport: (district, deptShort, type, desc, priority) => {
    sys.fileReport(district, deptShort, type, desc, priority);
    set((state) => ({ version: state.version + 1 }));
  },

  resolveReport: (reportId) => {
    sys.resolveReport(reportId);
    set((state) => ({ version: state.version + 1 }));
  },

  escalatePending: () => {
    sys.escalatePendingReports();
    set((state) => ({ version: state.version + 1 }));
  },

  undoAction: () => {
    sys.undoLastAction();
    set((state) => ({ version: state.version + 1 }));
  },

  transferPending: (fromDept, toDept, reportId) => {
    sys.transferPendingReport(fromDept, toDept, reportId);
    set((state) => ({ version: state.version + 1 }));
  },

  incrementSimStep: () => {
    sys.simStep++;
    set((state) => ({ version: state.version + 1 }));
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
