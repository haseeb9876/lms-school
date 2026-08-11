"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TeacherData {
  id: string;
  name: string;
  cnic: string;
  phone?: string;
  assignments?: any[];
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "classes" | "attendance" | "grading">("overview");

  useEffect(() => {
    async function fetchPortalData() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        if (json.authenticated && json.user?.role?.toUpperCase() === "TEACHER") {
          setData(json.user);
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
        Loading Faculty Portal...
      </div>
    );
  }

  const teacherName = data?.name || "Faculty Member";
  const assignedClassesCount = data?.assignments?.length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans w-full max-w-full overflow-x-hidden pb-24">
      {/* Faculty Top Bar */}
      <header className="w-full bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-base shrink-0 shadow-lg shadow-amber-500/30">
            T
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">Faculty Portal</h1>
            <p className="text-[11px] text-amber-400 font-semibold truncate">Greenhill Academic</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold shrink-0 active:scale-95 transition-all"
        >
          Exit
        </button>
      </header>

      {/* Main Responsive Body */}
      <main className="w-full max-w-xl mx-auto px-3 py-4 space-y-4 box-border">
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 w-full box-border">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Welcome Back
            </span>
            <h2 className="text-xl font-black text-white tracking-tight mt-0.5 break-words">
              {teacherName}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1 break-all">
              CNIC: {data?.cnic || "N/A"}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Assigned Classes
              </span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                {assignedClassesCount} Classes
              </span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Pending Grades
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                All Cleared
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-full box-border min-h-[260px]">
          {activeTab === "overview" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📊</span> Today's Schedule
              </h3>
              <p className="text-xs text-slate-400">Your upcoming classes and tasks.</p>
              <div className="p-5 rounded-lg bg-slate-950 border border-dashed border-slate-800 text-center text-slate-500 text-xs mt-3">
                No classes scheduled for today yet.
              </div>
            </div>
          )}

          {activeTab === "classes" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🏫</span> My Classes
              </h3>
              <p className="text-xs text-slate-400">Classes assigned to you by the Principal.</p>
              <div className="p-5 rounded-lg bg-slate-950 border border-dashed border-slate-800 text-center text-slate-500 text-xs mt-3">
                {assignedClassesCount === 0 
                  ? "You have not been assigned to any classes." 
                  : "Assigned classes will appear here."}
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📅</span> Mark Attendance
              </h3>
              <p className="text-xs text-slate-400">Select a class to mark daily attendance.</p>
              
              <select className="w-full mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 box-border">
                <option value="">-- Select Class --</option>
                <option value="pg_a" disabled>PG - Section A (Not Assigned)</option>
              </select>
              <button className="w-full mt-2 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-md shadow-amber-600/20 disabled:opacity-50">
                Load Roster
              </button>
            </div>
          )}

          {activeTab === "grading" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📝</span> Grading & Exams
              </h3>
              <p className="text-xs text-slate-400">Enter marks and update student transcripts.</p>
              <div className="p-5 rounded-lg bg-slate-950 border border-dashed border-slate-800 text-center text-slate-500 text-xs mt-3">
                Select a class from the dropdown to input term grades.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Teacher Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex items-center justify-around z-50 w-full max-w-full box-border">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[70px] ${
            activeTab === "overview" ? "text-amber-400 font-bold bg-amber-500/10" : "text-slate-400"
          }`}
        >
          <span className="text-base">📊</span>
          <span className="text-[10px] mt-0.5 leading-none">Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("classes")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[70px] ${
            activeTab === "classes" ? "text-amber-400 font-bold bg-amber-500/10" : "text-slate-400"
          }`}
        >
          <span className="text-base">🏫</span>
          <span className="text-[10px] mt-0.5 leading-none">Classes</span>
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[70px] ${
            activeTab === "attendance" ? "text-amber-400 font-bold bg-amber-500/10" : "text-slate-400"
          }`}
        >
          <span className="text-base">📅</span>
          <span className="text-[10px] mt-0.5 leading-none">Roll Call</span>
        </button>

        <button
          onClick={() => setActiveTab("grading")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[70px] ${
            activeTab === "grading" ? "text-amber-400 font-bold bg-amber-500/10" : "text-slate-400"
          }`}
        >
          <span className="text-base">📝</span>
          <span className="text-[10px] mt-0.5 leading-none">Grades</span>
        </button>
      </nav>
    </div>
  );
}
