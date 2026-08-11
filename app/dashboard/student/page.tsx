"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StudentData {
  user: {
    id: string;
    name: string;
    cnic: string;
    phone?: string;
  };
  classInfo?: {
    name: string;
    section?: string;
  };
  attendancePercentage: number;
  feeCleared: boolean;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "subjects" | "results" | "attendance" | "fees" | "helpdesk"
  >("subjects");

  useEffect(() => {
    async function fetchPortalData() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        if (json.authenticated && json.user) {
          setData({
            user: json.user,
            classInfo: json.user.studentProfile?.class || { name: "PG", section: "A" },
            attendancePercentage: 100,
            feeCleared: true,
          });
        } else {
          router.push("/login");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchPortalData();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-mono">
        Loading Student Portal...
      </div>
    );
  }

  const studentName = data?.user?.name || "Ali Haseeb";
  const className = data?.classInfo
    ? `${data.classInfo.name} ${data.classInfo.section ? `- Section ${data.classInfo.section}` : ""}`
    : "PG - Section A";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-lg shadow-md shadow-emerald-500/20">
                S
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white leading-none">
                  Student & Parent Portal
                </h1>
                <p className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase mt-0.5">
                  Greenhill LMS Academic Desk
                </p>
              </div>
            </div>

            {/* Mobile Exit Button */}
            <button
              onClick={handleLogout}
              className="sm:hidden px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-all"
            >
              Exit
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <span className="block text-xs font-semibold text-white">{studentName}</span>
              <span className="block text-[10px] text-slate-400 font-mono">
                CNIC: {data?.user?.cnic || "N/A"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>Exit Portal</span> &rarr;
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Profile Info & Status Hero Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {studentName}
                </h2>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                  {className}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                <span>CNIC: {data?.user?.cnic || "N/A"}</span>
                <span>•</span>
                <span>Phone: {data?.user?.phone || "+92 300 0000000"}</span>
              </p>
            </div>

            {/* Status Pills */}
            <div className="grid grid-cols-2 sm:flex items-center gap-3 w-full lg:w-auto">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center lg:text-left flex-1 lg:flex-initial">
                <span className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                  Fee Clearance
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                  CLEARED / PAID
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center lg:text-left flex-1 lg:flex-initial">
                <span className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                  Attendance
                </span>
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                  100.0% Present
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Responsive Nav Tabs */}
        <div className="overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2 min-w-max border-b border-slate-800/80 pb-3">
            {[
              { id: "subjects", label: "Subjects & Faculty", icon: "📚" },
              { id: "results", label: "Term Exam Results", icon: "🎗️" },
              { id: "attendance", label: "Attendance Log", icon: "📅" },
              { id: "fees", label: "Fee Ledger & Vouchers", icon: "💳" },
              { id: "helpdesk", label: "Confidential Desk", icon: "🔒" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "bg-slate-900/80 hover:bg-slate-900 text-slate-400 border border-slate-800/80"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-8 min-h-[300px]">
          {activeTab === "subjects" && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📖</span> Enrolled Subjects & Faculty
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Class subjects and assigned faculty teachers for {className}.
                </p>
              </div>
              <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 text-sm">
                No subject teachers currently assigned to {className} by Principal.
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🎗️</span> Academic Examination Results
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Term mark sheets and progress reports for {studentName}.
                </p>
              </div>
              <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 text-sm">
                No exam result transcripts published for this academic session yet.
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📅</span> Daily Attendance Records
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Monthly attendance status matrix.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">
                    Current Status
                  </span>
                  <span className="text-base font-bold text-emerald-400">100% Regular</span>
                </div>
                <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                  PERFECT RECORD
                </span>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>💳</span> Fee Ledger & Bank Challans
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  View tuition vouchers and payment history.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">August 2026 Monthly Tuition Fee</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Amount: PKR 15,000</p>
                </div>
                <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                  PAID / CLEARED
                </span>
              </div>
            </div>
          )}

          {activeTab === "helpdesk" && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🔒</span> Parent Confidential Help Desk
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Direct communication ticket to School Administration.
                </p>
              </div>
              <textarea
                placeholder="Type your message or inquiry directly to Principal..."
                rows={4}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              />
              <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all active:scale-95 shadow-lg shadow-blue-600/20">
                Submit Support Ticket
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
