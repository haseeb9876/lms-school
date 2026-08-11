import React from 'react';
import Link from 'next/link';
import StudentAssignments from '@/app/components/StudentAssignments';
import { ArrowLeft } from 'lucide-react';

export default function AssignmentsPage() {
  return (
    <div className="min-h-screen bg-slate-100/60">
      {/* Top Banner Header */}
      <header className="bg-slate-900 text-white px-6 py-3 text-xs flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono text-slate-300">DEMO MODE • Active Role: <strong className="text-amber-400">STUDENT</strong></span>
        </div>
        <Link 
          href="/dashboard" 
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </header>

      {/* Main Container */}
      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-md flex justify-between items-center">
          <div>
            <span className="bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
              Student Workspace
            </span>
            <h1 className="text-2xl font-bold mt-2">Welcome back, Ali Raza</h1>
            <p className="text-xs text-indigo-100 mt-1">Class 10-A • Admission No: ADM-2026-001</p>
          </div>
        </div>

        <StudentAssignments />
      </main>
    </div>
  );
}
