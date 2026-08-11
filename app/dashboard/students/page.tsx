'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import { GraduationCap, Mail, Hash, Search, Filter } from 'lucide-react';

interface Student {
  id: string;
  admissionNo: string;
  user: { name: string; email: string };
  class: { name: string };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/attendance'); // Fetches students with class details
        const data = await res.json();
        if (data.success) {
          setStudents(data.students);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredStudents = students.filter(
    (st) =>
      st.user.name.toLowerCase().includes(search.toLowerCase()) ||
      st.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
      st.class.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100/60">
      <Navbar />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800 flex justify-between items-center">
          <div>
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-500/30">
              Directory Management
            </span>
            <h1 className="text-2xl font-bold mt-2">Enrolled Student Roster</h1>
            <p className="text-xs text-slate-300 mt-1">Search and filter active student records in real time.</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-right">
            <span className="text-2xl font-black text-indigo-300">{filteredStudents.length}</span>
            <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Matching Students</p>
          </div>
        </div>

        {/* Search Engine Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by student name, ID, or class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Instant Filter Active</span>
          </div>
        </div>

        {/* Student Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
            Filtering directory...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition group space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-base group-hover:bg-indigo-600 group-hover:text-white transition">
                    {student.user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition">
                      {student.user.name}
                    </h3>
                    <span className="inline-block text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100 mt-0.5">
                      {student.class.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-slate-700">Admission: {student.admissionNo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{student.user.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
