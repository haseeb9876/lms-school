'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  currentRole: string;
}

export default function RoleSwitcherBar({ currentRole }: Props) {
  const router = useRouter();

  const handleRoleSwitch = async (role: string) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });

    if (res.ok) {
      router.refresh();
    }
  };

  return (
    <div className="bg-slate-900 text-white px-6 py-2.5 flex justify-between items-center text-xs">
      <div className="flex items-center space-x-2">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
        <span className="font-mono text-slate-300">DEMO MODE • Active Role: <strong className="text-orange-400">{currentRole}</strong></span>
      </div>
      <div className="flex space-x-2">
        {['PRINCIPAL', 'TEACHER', 'STUDENT'].map((role) => (
          <button
            key={role}
            onClick={() => handleRoleSwitch(role)}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              currentRole === role
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Switch to {role}
          </button>
        ))}
      </div>
    </div>
  );
}
