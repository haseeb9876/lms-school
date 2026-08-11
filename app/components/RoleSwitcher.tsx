'use client';

import React, { useState } from 'react';
import { Shield, UserCheck, GraduationCap, Award } from 'lucide-react';

export default function RoleSwitcher() {
  const [activeRole, setActiveRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('ADMIN');

  return (
    <div className="bg-slate-950 text-slate-300 text-xs py-1.5 px-6 border-b border-slate-800 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold text-slate-200">System Sandbox Mode</span>
        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono">Simulated RBAC</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-[11px]">View As:</span>
        <button
          onClick={() => setActiveRole('ADMIN')}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
            activeRole === 'ADMIN' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Shield className="w-3 h-3" /> Principal / Admin
        </button>
        <button
          onClick={() => setActiveRole('TEACHER')}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
            activeRole === 'TEACHER' ? 'bg-purple-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Award className="w-3 h-3" /> Teacher
        </button>
        <button
          onClick={() => setActiveRole('STUDENT')}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
            activeRole === 'STUDENT' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <GraduationCap className="w-3 h-3" /> Student
        </button>
      </div>
    </div>
  );
}
