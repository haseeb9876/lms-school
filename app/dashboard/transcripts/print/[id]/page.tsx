'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SubItem {
  id: string;
  marks: number | null;
  feedback: string | null;
  assignment: { title: string; totalMarks: number };
}

interface ReportDetail {
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  gradedSubmissions: SubItem[];
  totalObtained: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  attendanceRate: number;
}

interface SchoolSettings {
  schoolName: string;
  tagline: string;
  address: string;
}

export default function StudentReportCardPrintPage() {
  const params = useParams();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: 'Greenhill Academy',
    tagline: 'Center of Academic Excellence',
    address: 'Sector H-8/4, Islamabad, Pakistan',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [reportRes, settingsRes] = await Promise.all([
          fetch('/api/report-cards'),
          fetch('/api/settings'),
        ]);

        const reportJson = await reportRes.json();
        const settingsJson = await settingsRes.json();

        if (reportJson.success) {
          const match = reportJson.reportCards.find((r: ReportDetail) => r.studentId === params.id) || reportJson.reportCards[0];
          setReport(match);
        }

        if (settingsJson.success && settingsJson.settings) {
          setSettings(settingsJson.settings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-semibold">
        Generating official academic transcript...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 text-xs">
        Report card record not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 p-6">
      {/* Action Header */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link
          href="/dashboard/transcripts"
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-300 shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Transcripts
        </Link>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition"
        >
          <Printer className="w-4 h-4" /> Print Official Report Card
        </button>
      </div>

      {/* Printable Academic Transcript */}
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-xl border border-slate-300 space-y-8 print:p-0 print:shadow-none print:border-none print:max-w-full">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-end">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                {settings.schoolName.charAt(0)}
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">{settings.schoolName}</h1>
            </div>
            <p className="text-xs text-slate-500">{settings.tagline} • {settings.address}</p>
            <p className="text-[11px] font-semibold text-slate-700">Official Term Report Card & Academic Transcript</p>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-block bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider">
              Academic Session 2025-2026
            </span>
            <p className="text-[10px] text-slate-400 font-mono">Issued: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Student Profile Block */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Student Name</span>
            <span className="font-bold text-slate-900">{report.studentName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Admission No</span>
            <span className="font-mono font-semibold text-slate-800">{report.admissionNo}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Class / Section</span>
            <span className="font-semibold text-slate-800">{report.className}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Attendance Rate</span>
            <span className="font-bold text-emerald-700">{report.attendanceRate}% Present</span>
          </div>
        </div>

        {/* Academic Coursework & Grades Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            Course Evaluation & Assessment Breakdown
          </h3>
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3 border-b">Subject / Module Title</th>
                <th className="p-3 border-b text-center">Max Marks</th>
                <th className="p-3 border-b text-center">Obtained Marks</th>
                <th className="p-3 border-b">Faculty Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {report.gradedSubmissions.length > 0 ? (
                report.gradedSubmissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="p-3 font-semibold text-slate-900">{sub.assignment.title}</td>
                    <td className="p-3 text-center font-mono text-slate-600">100</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-900">{sub.marks || 0}</td>
                    <td className="p-3 text-slate-600 text-[11px] italic">
                      {sub.feedback || 'Satisfactory progress maintained throughout term.'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-500 italic">
                    No coursework submissions recorded for this academic period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Overall Summary */}
        <div className="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Final Term Standings</span>
            <div className="text-2xl font-black flex items-baseline gap-3">
              <span>{report.percentage}% Cumulative Grade</span>
              <span className="text-sm font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded border border-emerald-500/30">
                Grade {report.grade}
              </span>
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-xs text-slate-400">Total Marks Secured</div>
            <div className="text-xl font-bold">{report.totalObtained} / {report.totalPossible}</div>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
          <div className="border-t border-slate-300 pt-2 space-y-1">
            <p className="font-semibold text-slate-900">Class Teacher</p>
            <p className="text-[10px] text-slate-400">Signature & Date</p>
          </div>
          <div className="border-t border-slate-300 pt-2 space-y-1">
            <p className="font-semibold text-slate-900">Controller of Exams</p>
            <p className="text-[10px] text-slate-400">Official Institutional Stamp</p>
          </div>
          <div className="border-t border-slate-300 pt-2 space-y-1">
            <p className="font-semibold text-slate-900">Principal Signature</p>
            <p className="text-[10px] text-slate-400">{settings.schoolName} Office</p>
          </div>
        </div>
      </div>
    </div>
  );
}
