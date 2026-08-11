"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/Cards";

interface UserRecord {
  id: string;
  name: string;
  cnic: string;
  role: string;
  phone?: string;
  createdAt: string;
}

export default function PrincipalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "register" | "fees">("overview");

  // Registration Form State
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [phone, setPhone] = useState("");
  const [regMsg, setRegMsg] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    async function initDashboard() {
      try {
        const authRes = await fetch("/api/auth/me");
        if (!authRes.ok) {
          router.push("/login");
          return;
        }
        const authJson = await authRes.json();
        if (!authJson.authenticated || authJson.user?.role?.toUpperCase() !== "PRINCIPAL") {
          router.push("/login");
          return;
        }

        const usersRes = await fetch("/api/users");
        if (usersRes.ok) {
          const usersJson = await usersRes.json();
          setUsers(usersJson.users || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    initDashboard();
  }, [router]);

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegMsg("");
    setRegLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cnic, role, phone }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create user");
      }

      setRegMsg("User created successfully!");
      setName("");
      setCnic("");
      setPhone("");

      const uRes = await fetch("/api/users");
      if (uRes.ok) {
        const uJson = await uRes.json();
        setUsers(uJson.users || []);
      }
    } catch (err: any) {
      setRegMsg(`Error: ${err.message}`);
    } finally {
      setRegLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5EE] flex items-center justify-center text-slate-500 font-bold text-sm">
        Loading Executive Desk...
      </div>
    );
  }

  const totalStudents = users.filter((u) => u.role === "STUDENT").length;
  const totalTeachers = users.filter((u) => u.role === "TEACHER").length;

  return (
    <AppShell userRole="PRINCIPAL" userName="Principal Office" userCnic="ADMIN-01">
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-[#050505] text-white p-6 sm:p-8 rounded-4xl shadow-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#9BE870] text-[#050505] font-black text-xs uppercase tracking-wider inline-block">
              EXECUTIVE OVERVIEW
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Institutional Command Center
            </h1>
            <p className="text-sm font-medium text-slate-400">
              Manage student admissions, faculty workloads, fee collections, and system logs.
            </p>
          </div>
        </div>

        {/* Executive Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Students" value={`${totalStudents} Enrolled`} accentColor="lime" />
          <StatCard title="Active Faculty" value={`${totalTeachers} Teachers`} accentColor="gold" />
          <StatCard title="Daily Attendance" value="98.2%" subtitle="Regular Campus Rate" accentColor="lime" />
          <StatCard title="Monthly Revenue" value="PKR 4.2M" subtitle="Fee Streams" accentColor="gold" />
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b border-slate-300 pb-3">
          {[
            { id: "overview", label: "Institutional Roster", icon: "🏛️" },
            { id: "register", label: "Add New User", icon: "➕" },
            { id: "fees", label: "Financial Ledger", icon: "💳" },
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

        {/* Tab Panels */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-soft min-h-[300px]">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-lg font-bold text-[#050505]">Registered Users</h3>
                <span className="text-xs font-mono font-bold text-slate-500">{users.length} Total Records</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-[#FAF9F4] border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-[#050505]">{u.name}</h4>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">CNIC: {u.cnic}</p>
                    </div>
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                        u.role === "PRINCIPAL"
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : u.role === "TEACHER"
                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                          : "bg-[#EAFBDE] text-[#050505] border border-[#B8F28F]"
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "register" && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-lg font-bold text-[#050505]">Create User Account</h3>

              {regMsg && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold border ${
                    regMsg.startsWith("Error")
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-[#EAFBDE] text-[#050505] border-[#B8F28F]"
                  }`}
                >
                  {regMsg}
                </div>
              )}

              <form onSubmit={handleRegisterUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Muhammad Ahmad"
                    className="w-full p-3 rounded-xl bg-[#FAF9F4] border border-slate-200 text-[#050505] text-xs font-medium focus:outline-none focus:border-[#050505]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    CNIC Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="61101-1234567-1"
                    className="w-full p-3 rounded-xl bg-[#FAF9F4] border border-slate-200 text-[#050505] text-xs font-medium focus:outline-none focus:border-[#050505]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[#FAF9F4] border border-slate-200 text-[#050505] text-xs font-bold focus:outline-none"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="PARENT">Parent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full p-3 rounded-xl bg-[#FAF9F4] border border-slate-200 text-[#050505] text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3.5 rounded-xl bg-[#050505] hover:bg-slate-800 text-[#9BE870] font-black text-xs transition-all active:scale-95 shadow-xl disabled:opacity-50 mt-2"
                >
                  {regLoading ? "Creating..." : "Create Account"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#050505]">Financial Overview</h3>
              <div className="p-5 rounded-2xl bg-[#FFF8D6] border border-[#FFE680] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">August 2026 Collection</span>
                  <span className="text-base font-black text-[#050505]">PKR 4,200,000</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs">
                  94% COLLECTED
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
