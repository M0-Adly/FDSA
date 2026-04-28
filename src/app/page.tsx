import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#080c1a] text-white relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-600/15 blur-[150px] animate-pulse" />
        <div className="absolute top-[60%] -right-[10%] w-[45%] h-[55%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] rounded-full bg-emerald-600/8 blur-[100px]" />
      </div>

      {/* Dot Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 dot-grid" />

      <main className="flex flex-col items-center justify-center p-8 text-center max-w-5xl relative z-10">
        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full mb-8">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
            System Live · v2.0
          </span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
            National Crisis
          </span>
          <br />
          <span className="text-white/90">Management System</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/40 mb-14 max-w-2xl leading-relaxed">
          A centralized platform for citizens and government officials to report, 
          track, and manage emergencies across the nation with real-time coordination.
        </p>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Citizen Portal */}
          <Link 
            href="/citizen/login" 
            className="group relative flex flex-col items-center p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl hover:border-indigo-500/50 hover:bg-white/[0.08] transition-all duration-500 shadow-2xl hover:shadow-indigo-500/10"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                <span className="text-3xl">👥</span>
              </div>
              <h2 className="text-2xl font-black mb-2 text-white/90 group-hover:text-white transition-colors">
                Citizen Portal
              </h2>
              <p className="text-sm text-white/30 group-hover:text-white/50 transition-colors leading-relaxed">
                Report emergencies, track your active reports, and stay updated on response status.
              </p>
              <div className="mt-5 flex items-center gap-2 text-indigo-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <span>Access Portal</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </Link>

          {/* Employee Portal */}
          <Link 
            href="/employee/login" 
            className="group relative flex flex-col items-center p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl hover:border-emerald-500/50 hover:bg-white/[0.08] transition-all duration-500 shadow-2xl hover:shadow-emerald-500/10"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
                <span className="text-3xl">🛡️</span>
              </div>
              <h2 className="text-2xl font-black mb-2 text-white/90 group-hover:text-white transition-colors">
                Employee Portal
              </h2>
              <p className="text-sm text-white/30 group-hover:text-white/50 transition-colors leading-relaxed">
                Manage crisis response, escalate reports, coordinate departments, and resolve incidents.
              </p>
              <div className="mt-5 flex items-center gap-2 text-emerald-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <span>Access Dashboard</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer Badge */}
        <div className="mt-14 flex items-center gap-3 text-white/20 text-xs">
          <span>🇪🇬</span>
          <span>Aswan Governorate · Emergency Response Division</span>
        </div>
      </main>
    </div>
  );
}
