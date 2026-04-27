import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-50">
      <main className="flex flex-col items-center justify-center p-8 text-center max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-6">
          National Crisis Management System
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl">
          A centralized platform for citizens and government officials to report, track, and manage emergencies across the nation.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <Link href="/citizen" className="group flex flex-col items-center p-8 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500 hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-blue-500/20">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">👥</div>
            <h2 className="text-2xl font-semibold mb-2">Citizen Portal</h2>
            <p className="text-slate-400">Report emergencies and track your active reports.</p>
          </Link>
          
          <Link href="/employee" className="group flex flex-col items-center p-8 bg-slate-900 border border-slate-800 rounded-2xl hover:border-emerald-500 hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🛡️</div>
            <h2 className="text-2xl font-semibold mb-2">Employee Portal</h2>
            <p className="text-slate-400">Manage crisis response, escalate, and resolve reports.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
