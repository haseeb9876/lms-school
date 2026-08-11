"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, DollarSign, Lock, Award, TrendingUp, UserPlus, 
  FileText, ShieldCheck, ArrowUpRight, CheckCircle2, Clock, LogOut 
} from "lucide-react";

export default function PrincipalDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 1240,
    monthlyRevenue: "4.2M",
    pendingTickets: 3,
    activeTeachers: 48
  });

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex font-sans selection:bg-blue-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-72 bg-[#090d16]/90 border-r border-slate-800/80 p-6 flex flex-col justify-between hidden lg:flex backdrop-blur-xl">
        <div className="space-y-8">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              G
            </div>
            <div>
              <div className="font-extrabold text-white text-base tracking-tight">Greenhill LMS</div>
              <div className="text-[11px] text-blue-400 font-semibold tracking-wider uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Executive Suite
              </div>
            </div>
          </div>

          <nav className="space-y-2 text-xs font-semibold">
            <Link href="/dashboard/principal" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 shadow-sm transition">
              <TrendingUp className="w-4 h-4" /> Command Overview
            </Link>
            <Link href="/dashboard/principal/users" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
              <Users className="w-4 h-4" /> User Directory & Registration
            </Link>
            <Link href="/dashboard/principal/fees" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
              <DollarSign className="w-4 h-4" /> Fee Ledgers & Challans
            </Link>
            <Link href="/dashboard/principal/desk" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
              <Lock className="w-4 h-4" /> Confidential Desk
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800/80">
          <Link href="/login" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition">
            <LogOut className="w-4 h-4" /> Exit Executive Suite
          </Link>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              Principal Office Desk
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-xs font-mono">CNIC: 1111111111111</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-bold text-white">Dr. Shahab Ud Din</div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3 h-3" /> System Operational
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/10 flex items-center justify-center font-bold text-sm text-white shadow-md">
              PO
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-950/60 to-slate-950 border border-blue-500/20 p-8 shadow-2xl">
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium">
                Enterprise School ERP Active
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Institutional Operations & Oversight Hub
              </h1>
              <p className="text-slate-300 text-xs lg:text-sm max-w-2xl leading-relaxed">
                Real-time financial ledgers, direct confidential parent channels, section roll call metrics, and teacher gradebook validation.
              </p>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-[#090d16] border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-blue-500/40 transition shadow-xl group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Enrolled</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white font-mono">{stats.totalStudents}</div>
              <p className="text-[11px] text-slate-500">14 Active Class Sections</p>
            </div>

            <div className="bg-[#090d16] border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-emerald-500/40 transition shadow-xl group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Monthly Billing</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono">PKR {stats.monthlyRevenue}</div>
              <p className="text-[11px] text-slate-500">88% Ledger Clearance</p>
            </div>

            <div className="bg-[#090d16] border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-amber-500/40 transition shadow-xl group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Parent Escalations</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-400 font-mono">{stats.pendingTickets} Active</div>
              <p className="text-[11px] text-slate-500">Direct Principal Inbox</p>
            </div>

            <div className="bg-[#090d16] border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-purple-500/40 transition shadow-xl group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Active Faculty</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white font-mono">{stats.activeTeachers} Teachers</div>
              <p className="text-[11px] text-slate-500">100% Attendance Verified</p>
            </div>
          </div>

          {/* Quick Core Portal Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/dashboard/principal/users" className="group bg-[#090d16] border border-slate-800/80 hover:border-blue-500/60 rounded-2xl p-6 space-y-4 transition-all duration-300 hover:-translate-y-1 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition">User Enrollment & Directory</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Register new teachers and students, manage role privileges, and assign CNIC credentials.
                </p>
              </div>
              <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5 pt-2">
                Open Directory <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>

            <Link href="/dashboard/principal/fees" className="group bg-[#090d16] border border-slate-800/80 hover:border-emerald-500/60 rounded-2xl p-6 space-y-4 transition-all duration-300 hover:-translate-y-1 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">Fee Operations & Bank Challans</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Batch issue fee vouchers and print 3-copy bank challans for MCB, Allied, or JazzCash.
                </p>
              </div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 pt-2">
                Launch Fee Operations <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>

            <Link href="/dashboard/principal/desk" className="group bg-[#090d16] border border-slate-800/80 hover:border-amber-500/60 rounded-2xl p-6 space-y-4 transition-all duration-300 hover:-translate-y-1 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-amber-600/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl group-hover:scale-110 transition">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition">Confidential Parent Desk</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Encrypted communication inbox to receive notes directly from parents and send official responses.
                </p>
              </div>
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 pt-2">
                Open Executive Inbox <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
