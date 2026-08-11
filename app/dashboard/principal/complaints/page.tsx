'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import { ShieldAlert, CheckCircle2, User, Clock, MessageSquare } from 'lucide-react';

interface Complaint {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  user: { name: string; cnic: string; role: string };
}

export default function PrincipalComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComplaints() {
      try {
        const res = await fetch('/api/complaints');
        const data = await res.json();
        if (data.success) {
          setComplaints(data.complaints);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadComplaints();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/60">
      <Navbar />

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 rounded-2xl p-6 text-white shadow-xl border border-red-900/40 flex justify-between items-center">
          <div>
            <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-3 py-1 rounded-full border border-red-500/30">
              Confidential Principal Channel
            </span>
            <h1 className="text-2xl font-bold mt-2">Student & Parent Grievance Desk</h1>
            <p className="text-xs text-slate-300 mt-1">
              Direct private complaints bypass teachers completely and land directly in executive review.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            Loading confidential complaints...
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
            No complaints logged. Operational compliance at 100%.
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-slate-900 text-xs">{c.user.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({c.user.cnic})</span>
                    <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                      {c.user.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{c.subject}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.message}</p>
                </div>

                <div className="flex justify-end pt-2">
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Reviewed by Executive Office
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
