import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employee Dashboard | National Crisis Management System",
  description: "Internal government portal for crisis management.",
};

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="font-bold text-xl tracking-tight">CrisisCommand <span className="text-emerald-500 font-normal">v1.0</span></span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-mono text-slate-400">System Live</span>
          </div>
          <button className="text-slate-400 hover:text-white transition">
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
