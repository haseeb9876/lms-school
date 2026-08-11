'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { Award, Printer, BookOpen, CheckCircle2, TrendingUp, Search } from 'lucide-react';

interface ReportCardSummary {
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  totalObtained: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  attendanceRate: number;
}

export default function TranscriptsPage() {
  const [reports, setReports] = useState<ReportCardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch('/api/report-cards');
        const data = await res.json();
        if (data.success) {
          setReports(data.reportCards);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const filteredReports = reports.filter(
    (r) =>
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100/60">
      <Navbar />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-purple-900/40 flex justify-between items-center">
          <div>
            <span className="bg-purple-500/20 text-purple-300 text-xs font-semibold px-3 py-1 rounded-full border border-purple-500/30">
              Academic Assessment Engine
            </span>
            <h1 className="text-2xl font-bold mt-2">Official Transcripts & Report Cards</h1>
            <p className="text-xs text-slate-300 mt-1">
              Automated mark compilation, GPA grade distribution, and official printable report cards.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name or admission number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs outline-none text-slate-800 placeholder-slate-400 bg-transparent"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            Calculating academic averages and percentages...
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Obtained Marks</th>
                  <th className="p-4">Percentage</th>
                  <th className="p-4">Grade</th>
                  <th className="p-4">Attendance</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredReports.map((report) => (
                  <tr key={report.studentId} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-semibold text-slate-900">
                      {report.studentName}
                      <span className="block text-[10px] text-slate-400 font-mono font-normal">
                        ID: {report.admissionNo}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{report.className}</td>
                    <td className="p-4 font-mono font-semibold">
                      {report.totalObtained} / {report.totalPossible}
                    </td>
                    <td className="p-4 font-bold text-slate-900">{report.percentage}%</td>
                    <td className="p-4">
                      <span
                        className={`font-black px-2.5 py-1 rounded-md text-[10px] ${
                          report.grade === 'A+' || report.grade === 'A'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : report.grade === 'B' || report.grade === 'C'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        Grade {report.grade}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{report.attendanceRate}%</td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/transcripts/print/${report.studentId}`}
                        className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition"
                      >
                        <Printer className="w-3.5 h-3.5" /> Printable Report Card
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
