"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { StatCard, AchievementCard, ProgressBar } from "@/components/ui/Cards";

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
}

export default function StudentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"courses" | "results" | "attendance" | "fees">("courses");

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5EE] flex items-center justify-center text-slate-500 font-bold text-sm">
        Loading Greenhill Learning Environment...
      </div>
    );
  }

  const studentName = data?.user?.name || "Ali Haseeb";
  const className = data?.classInfo
    ? `${data.classInfo.name} ${data.classInfo.section ? `- Section ${data.classInfo.section}` : ""}`
    : "PG - Section A";

  return (
    <AppShell
      userRole="STUDENT"
      userName={studentName}
      userCnic={data?.user?.cnic}
    >
      <div className="space-y-6">
        {/* Welcome Banner Card */}
        <div className="bg-[#EAFBDE] border border-[#B8F28F] rounded-4xl p-6 sm:p-8 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-[#9BE870] text-[#050505] font-black text-xs uppercase tracking-wider inline-block">
              {className}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#050505] tracking-tight">
              Welcome back, {studentName}!
            </h1>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              You are currently enrolled in {className}. Keep up your 100% attendance momentum to unlock next term's achievement badge!
            </p>
          </div>

          <div className="w-full sm:w-auto bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Overall Completion
            </span>
            <span className="text-2xl font-black text-[#050505] block">82%</span>
            <div className="w-32 mt-2">
              <ProgressBar progress={82} />
            </div>
          </div>
        </div>

        {/* Top Grid Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Daily Attendance" value="100.0%" subtitle="Regular Attendance Record" accentColor="lime" />
          <StatCard title="Tuition Fee Clearance" value="CLEARED" subtitle="August 2026 Voucher Paid" accentColor="gold" />
          <AchievementCard rank="Top Academic Tier" points="1,820 XP" badge="🥇 Gold Scholar" />
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-slate-300 pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: "courses", label: "Enrolled Courses", icon: "📖" },
            { id: "results", label: "Exam Transcripts", icon: "🎗️" },
            { id: "attendance", label: "Attendance Matrix", icon: "📅" },
            { id: "fees", label: "Fee Vouchers", icon: "💳" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${
                activeTab === tab.id
                  ? "bg-[#050505] text-[#9BE870] shadow-2xl"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-soft min-h-[300px]">
          {activeTab === "courses" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#050505]">Assigned Faculty & Class Subjects</h3>
              <div className="p-8 rounded-2xl bg-[#FAF9F4] border border-dashed border-slate-300 text-center text-slate-500 text-sm font-medium">
                No new homework or assignments pending for {className}.
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#050505]">Term Examinations</h3>
              <div className="p-8 rounded-2xl bg-[#FAF9F4] border border-dashed border-slate-300 text-center text-slate-500 text-sm font-medium">
                Final term transcripts will be published upon principal approval.
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#050505]">Daily Attendance Status</h3>
              <div className="p-5 rounded-2xl bg-[#EAFBDE] border border-[#B8F28F] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">Status</span>
                  <span className="text-base font-black text-[#050505]">100% Present & Regular</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#9BE870] text-[#050505] font-black text-xs">
                  PERFECT
                </span>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#050505]">3-Copy Tuition Challan Ledger</h3>
              <div className="p-5 rounded-2xl bg-[#FFF8D6] border border-[#FFE680] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">August 2026 Voucher</span>
                  <span className="text-base font-black text-[#050505]">PKR 15,000</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs">
                  PAID
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
