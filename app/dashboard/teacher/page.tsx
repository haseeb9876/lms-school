"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LogOut, BookOpen, ClipboardList, Award } from "lucide-react";

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  const assignments = user?.teacherAssignments || [];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-[#090d16]/90 border-r border-slate-800/80 p-6 flex flex-col justify-between hidden lg:flex backdrop-blur-xl">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              T
            </div>
            <div>
              <div className="font-extrabold text-white text-base tracking-tight">Greenhill LMS</div>
              <div className="text-[11px] text-indigo-400 font-semibold uppercase">Faculty Portal</div>
            </div>
          </div>

          <nav className="space-y-2 text-xs font-semibold">
            <Link href="/dashboard/teacher" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 shadow-sm transition">
              <Award className="w-4 h-4" /> Faculty Workload Scope
            </Link>
            <Link href="/dashboard/teacher/attendance" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
              <ClipboardList className="w-4 h-4" /> Daily Attendance
            </Link>
            <Link href="/dashboard/teacher/grades" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
              <Award className="w-4 h-4" /> Gradebook & Reports
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800/80">
          <Link href="/login" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition">
            <LogOut className="w-4 h-4" /> Exit Faculty Portal
          </Link>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col">
        <header className="h-20 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              Assigned Classes: {assignments.length} Sections
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-bold text-white">{loading ? "Loading..." : user?.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">CNIC: {user?.cnic}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 border border-white/10 flex items-center justify-center font-bold text-sm text-white shadow-md">
              FC
            </div>
          </div>
        </header>

        <main className="p-8 space-y-8 max-w-7xl w-full mx-auto">
          <div className="bg-[#090d16] border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Assigned Teaching Workload
            </h2>
            <p className="text-xs text-slate-400">
              You are restricted strictly to taking attendance and entering grades for your assigned class/subject combinations below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {assignments.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs col-span-3 border border-dashed border-slate-800 rounded-xl">
                  No classes assigned by Principal yet. Contact Principal Office to allocate subject workload.
                </div>
              ) : (
                assignments.map((a: any) => (
                  <div key={a.id} className="bg-[#030712] border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">{a.class?.name} - {a.class?.section}</span>
                      <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">
                        {a.subject}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Link href="/dashboard/teacher/attendance" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg text-center transition">
                        Take Attendance
                      </Link>
                      <Link href="/dashboard/teacher/grades" className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg text-center transition">
                        Enter Marks
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
