import React from 'react';
import Link from 'next/link';
import TeacherGrading from '@/app/components/TeacherGrading';
import { ArrowLeft } from 'lucide-react';

export default function TeacherGradingPage() {
  return (
    <div className="min-h-screen bg-slate-100/60">
      <header className="bg-slate-900 text-white px-6 py-3 text-xs flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="font-mono text-slate-300">DEMO MODE • Active Role: <strong className="text-amber-400">TEACHER</strong></span>
        </div>
        <Link 
          href="/dashboard" 
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-slate-800 to-indigo-900 rounded-2xl p-6 text-white shadow-md flex justify-between items-center">
          <div>
            <span className="bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
              Faculty Workspace
            </span>
            <h1 className="text-2xl font-bold mt-2">Welcome, Ms. Ayesha Malik</h1>
            <p className="text-xs text-indigo-200 mt-1">Department: Mathematics • Class 10-A</p>
          </div>
        </div>

        <TeacherGrading />
      </main>
    </div>
  );
}
