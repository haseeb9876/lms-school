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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-sans">
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans w-full max-w-full overflow-x-hidden pb-24">
      {/* Top Header Bar */}
      <header className="w-full bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-base shrink-0">
            S
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">Student Portal</h1>
            <p className="text-[11px] text-emerald-400 font-semibold truncate">{className}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold shrink-0"
        >
          Exit
        </button>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-xl mx-auto px-3 py-4 space-y-4 box-border">
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 w-full box-border">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Welcome Back
            </span>
            <h2 className="text-xl font-black text-white tracking-tight mt-0.5 break-words">
              {studentName}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1 break-all">
              CNIC: {data?.user?.cnic || "N/A"}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Fee Status
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                CLEARED
              </span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Attendance
              </span>
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                100.0%
              </span>
            </div>
          </div>
        </div>

        {/* Tab Content Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-full box-border min-h-[220px]">
          {activeTab === "subjects" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📖</span> Class Subjects & Faculty
              </h3>
              <p className="text-xs text-slate-400">Enrolled subjects for {className}.</p>
              <div className="p-5 rounded-lg bg-slate-950 border border-dashed border-slate-800 text-center text-slate-500 text-xs mt-3">
                No subject teachers assigned yet by Principal.
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🎗️</span> Academic Results
              </h3>
              <p className="text-xs text-slate-400">Term examinations and progress reports.</p>
              <div className="p-5 rounded-lg bg-slate-950 border border-dashed border-slate-800 text-center text-slate-500 text-xs mt-3">
                No exam transcripts published for this session.
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📅</span> Attendance Records
              </h3>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                  <span className="text-xs font-bold text-emerald-400">100% Present</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                  REGULAR
                </span>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>💳</span> Fee Ledger & Challan
              </h3>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">August 2026 Voucher</span>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    PAID
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">Amount: PKR 15,000</p>
              </div>
            </div>
          )}

          {activeTab === "helpdesk" && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔒</span> Support Help Desk
              </h3>
              <textarea
                placeholder="Message Principal or Administration..."
                rows={3}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 box-border"
              />
              <button className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-600/30">
                Send Message
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom App Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-1 py-1.5 flex items-center justify-around z-50 w-full max-w-full box-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[60px] ${
              activeTab === tab.id ? "text-blue-400 font-bold bg-blue-500/10" : "text-slate-400"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
