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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-base font-medium">
        Loading Student Portal...
      </div>
    );
  }

  const studentName = data?.user?.name || "Ali Haseeb";
  const className = data?.classInfo
    ? `${data.classInfo.name} ${data.classInfo.section ? `- Section ${data.classInfo.section}` : ""}`
    : "PG - Section A";

  const tabs = [
    { id: "subjects", label: "Subjects", icon: "📚" },
    { id: "results", label: "Results", icon: "🎗️" },
    { id: "attendance", label: "Attendance", icon: "📅" },
    { id: "fees", label: "Fees", icon: "💳" },
    { id: "helpdesk", label: "Help Desk", icon: "🔒" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans w-full max-w-full overflow-x-hidden pb-20 sm:pb-8">
      {/* Mobile Top Header */}
      <header className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-xl shadow-md">
            S
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Student Portal</h1>
            <p className="text-xs text-emerald-400 font-semibold uppercase">{className}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all active:scale-95"
        >
          Exit
        </button>
      </header>

      {/* Main Responsive Body */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Student Profile Overview Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Welcome Back
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
              {studentName}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              CNIC: {data?.user?.cnic || "N/A"}
            </p>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Fee Status
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                CLEARED
              </span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Attendance
              </span>
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                100.0%
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection Row (Mobile Scrollable) */}
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-900 text-slate-400 border border-slate-800"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Card Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl min-h-[260px]">
          {activeTab === "subjects" && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📖</span> Class Subjects & Faculty
              </h3>
              <p className="text-xs text-slate-400">Enrolled subjects for {className}.</p>
              <div className="p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-slate-500 text-xs mt-4">
                No subject teachers assigned yet by Principal.
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎗️</span> Academic Results
              </h3>
              <p className="text-xs text-slate-400">Term examinations and progress reports.</p>
              <div className="p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-slate-500 text-xs mt-4">
                No exam transcripts published for this session.
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📅</span> Attendance Records
              </h3>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                  <span className="text-sm font-bold text-emerald-400">100% Present</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                  REGULAR
                </span>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>💳</span> Fee Ledger & Challan
              </h3>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">August 2026 Voucher</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    PAID
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">Amount: PKR 15,000</p>
              </div>
            </div>
          )}

          {activeTab === "helpdesk" && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔒</span> Support Help Desk
              </h3>
              <textarea
                placeholder="Message Principal or Administration..."
                rows={4}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
              />
              <button className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all active:scale-95 shadow-lg shadow-blue-600/30">
                Send Message
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 flex items-center justify-around z-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
              activeTab === tab.id ? "text-blue-400 font-bold scale-105" : "text-slate-500"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
