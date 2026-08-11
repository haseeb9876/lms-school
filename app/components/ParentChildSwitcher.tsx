'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Users } from 'lucide-react';

interface Child {
  studentId: string;
  name: string;
  className: string;
  admissionNo: string;
}

export default function ParentChildSwitcher({ onSelectChild }: { onSelectChild?: (childId: string) => void }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  useEffect(() => {
    const session = localStorage.getItem('currentUser');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.isParentView && parsed.children?.length > 0) {
        setChildren(parsed.children);
        setSelectedChildId(parsed.children[0].studentId);
      }
    }
  }, []);

  if (children.length <= 1) return null;

  return (
    <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-white">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold">Multi-Student Parent View</h4>
          <p className="text-[10px] text-slate-300">Select child profile to review active academic & fee ledger</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {children.map((child) => (
          <button
            key={child.studentId}
            onClick={() => {
              setSelectedChildId(child.studentId);
              if (onSelectChild) onSelectChild(child.studentId);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              selectedChildId === child.studentId
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            {child.name} ({child.className})
          </button>
        ))}
      </div>
    </div>
  );
}
