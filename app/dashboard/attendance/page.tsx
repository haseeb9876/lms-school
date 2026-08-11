'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import { UserCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Student {
  id: string;
  admissionNo: string;
  user: { name: string; email: string };
  class: { name: string };
  attendances: { id: string; status: string; date: string }[];
}

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance');
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleMarkAttendance = async (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setUpdatingId(studentId);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status }),
      });

      if (res.ok) {
        await fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60">
      <Navbar />

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md flex justify-between items-center">
          <div>
            <span className="bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
              Faculty Workspace
            </span>
            <h1 className="text-2xl font-bold mt-2">Daily Attendance Registry</h1>
            <p className="text-xs text-teal-100 mt-1">Record and verify daily student attendance status.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Class Roll Call
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Select status to submit attendance for today.</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 font-medium">Loading roster...</div>
          ) : (
            <div className="grid gap-4">
              {students.map((st) => {
                const latestRecord = st.attendances && st.attendances.length > 0 ? st.attendances[0] : null;

                return (
                  <div key={st.id} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-sm">{st.user.name}</h3>
                        <span className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                          {st.admissionNo}
                        </span>
                        <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded">
                          {st.class.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Latest Status:{' '}
                        <strong className="text-slate-800">
                          {latestRecord ? latestRecord.status : 'No record for today'}
                        </strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMarkAttendance(st.id, 'PRESENT')}
                        disabled={updatingId === st.id}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present
                      </button>

                      <button
                        onClick={() => handleMarkAttendance(st.id, 'LATE')}
                        disabled={updatingId === st.id}
                        className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        <Clock className="w-3.5 h-3.5" /> Late
                      </button>

                      <button
                        onClick={() => handleMarkAttendance(st.id, 'ABSENT')}
                        disabled={updatingId === st.id}
                        className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
