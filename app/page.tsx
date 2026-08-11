import Link from "next/link";
import { ShieldCheck, ArrowRight, DollarSign, Award, Users, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#080d1a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-emerald-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              G
            </div>
            <div>
              <span className="font-black text-white text-base tracking-tight">Greenhill LMS</span>
              <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Enterprise ERP Edition
              </span>
            </div>
          </div>

          <Link
            href="/login"
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center gap-2"
          >
            Access Portal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 text-center space-y-8 flex-1">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Institutional Operations & Management Platform
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Complete Institutional Oversight for Modern Academic Excellence
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Automate student admissions, multi-class teacher workloads, attendance matrix tracking, 3-copy bank challans, and confidential parent desk communications.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/login"
            className="px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl transition shadow-xl shadow-indigo-600/30 flex items-center gap-2"
          >
            Enter Management Suite <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Real-time Dashboard Indicator Card */}
        <div className="pt-8 max-w-4xl mx-auto">
          <div className="bg-[#080d1a] border border-slate-800/90 rounded-3xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-mono text-slate-500 ml-2">https://portal.school.edu.pk</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> DATABASE OPERATIONAL
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="bg-[#030712] p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> Total Enrolled
                </div>
                <div className="text-lg font-black text-white mt-1 font-mono">1,240 Students</div>
              </div>
              <div className="bg-[#030712] p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Monthly Revenue
                </div>
                <div className="text-lg font-black text-emerald-400 mt-1 font-mono">PKR 4.2M</div>
              </div>
              <div className="bg-[#030712] p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-blue-400" /> Daily Attendance
                </div>
                <div className="text-lg font-black text-blue-400 mt-1 font-mono">96.8%</div>
              </div>
              <div className="bg-[#030712] p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Pending Dues
                </div>
                <div className="text-lg font-black text-amber-400 mt-1 font-mono">PKR 180K</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-medium">
        &copy; 2026 Greenhill LMS. All rights reserved.
      </footer>
    </div>
  );
}
