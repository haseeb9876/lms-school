import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between overflow-x-hidden w-full max-w-full selection:bg-blue-500 selection:text-white">
      {/* Header Navigation */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
            G
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block text-white">Greenhill LMS</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
              Enterprise ERP Edition
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-blue-600/25 active:scale-95"
        >
          Access Portal &rarr;
        </Link>
      </header>

      {/* Hero Content Section */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col items-center text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight sm:leading-none bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Complete Institutional Oversight for Modern Academic Excellence
        </h1>

        <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Automate student admissions, multi-class teacher workloads, attendance matrix tracking, 3-copy bank challans, and confidential parent desk communications.
        </p>

        <div className="mt-8 w-full sm:w-auto">
          <Link
            href="/login"
            className="inline-block w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all duration-200 shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-95"
          >
            Enter Management Suite &rarr;
          </Link>
        </div>

        {/* Responsive Interactive Dashboard Card Preview */}
        <div className="mt-12 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl text-left overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="ml-2 text-xs font-mono text-slate-400 truncate max-w-[200px] sm:max-w-none">
                https://portal.school.edu.pk
              </span>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              DATABASE OPERATIONAL
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs uppercase font-medium text-slate-400 block mb-1">
                Total Enrolled
              </span>
              <div className="text-xl sm:text-2xl font-bold text-white">1,240 Students</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs uppercase font-medium text-slate-400 block mb-1">
                Monthly Revenue
              </span>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400">PKR 4.2M</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs uppercase font-medium text-slate-400 block mb-1">
                Daily Attendance
              </span>
              <div className="text-xl sm:text-2xl font-bold text-blue-400">96.8%</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs uppercase font-medium text-slate-400 block mb-1">
                Pending Dues
              </span>
              <div className="text-xl sm:text-2xl font-bold text-amber-400">PKR 180K</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-500 border-t border-slate-800/40">
        &copy; 2026 Greenhill LMS. All rights reserved.
      </footer>
    </div>
  );
}
