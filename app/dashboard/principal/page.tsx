"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "register" | "fees">("overview");

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

        // Fetch User Roster
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

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

      // Refresh list
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-sans">
        Loading Principal Executive Portal...
      </div>
    );
  }

  const totalStudents = users.filter((u) => u.role === "STUDENT").length;
  const totalTeachers = users.filter((u) => u.role === "TEACHER").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans w-full max-w-full overflow-x-hidden pb-24">
      {/* Executive Top Bar */}
      <header className="w-full bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-lg shadow-blue-600/30">
            P
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">Principal Suite</h1>
            <p className="text-[11px] text-blue-400 font-semibold truncate">Greenhill Executive</p>
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
        {/* Executive Quick Metrics */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
              Total Enrolled
            </span>
            <div className="text-lg font-black text-white">{totalStudents} Students</div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
              Active Faculty
            </span>
            <div className="text-lg font-black text-blue-400">{totalTeachers} Teachers</div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
              Daily Attendance
            </span>
            <div className="text-lg font-black text-emerald-400">98.2%</div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
              Revenue Stream
            </span>
            <div className="text-lg font-black text-amber-400">PKR 4.2M</div>
          </div>
        </div>

        {/* Tab Content Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-full box-border min-h-[280px]">
          {/* OVERVIEW / ROSTER TAB */}
          {activeTab === "overview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>🏛️</span> Institutional Roster
                </h3>
                <span className="text-[11px] font-mono text-slate-400">{users.length} Records</span>
              </div>

              <div className="space-y-2 mt-2">
                {users.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No users found.</p>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{u.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate">CNIC: {u.cnic}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                          u.role === "PRINCIPAL"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : u.role === "TEACHER"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* REGISTER USER TAB */}
          {activeTab === "register" && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>➕</span> Register New User / Student
              </h3>

              {regMsg && (
                <div
                  className={`p-2.5 rounded text-xs border ${
                    regMsg.startsWith("Error")
                      ? "bg-red-950 text-red-200 border-red-800"
                      : "bg-emerald-950 text-emerald-200 border-emerald-800"
                  }`}
                >
                  {regMsg}
                </div>
              )}

              <form onSubmit={handleRegisterUser} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Muhammad Ahmad"
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 box-border"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    CNIC Number
                  </label>
                  <input
                    type="text"
                    required
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="61101-1234567-1"
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 box-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 box-border"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="PARENT">Parent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 box-border"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-600/30 disabled:opacity-50 mt-1"
                >
                  {regLoading ? "Registering..." : "Create Account"}
                </button>
              </form>
            </div>
          )}

          {/* FEES MANAGEMENT TAB */}
          {activeTab === "fees" && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>💳</span> Fee Collections & Challans
              </h3>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">August 2026 Collection</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    94% COLLECTED
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">Total Pending: PKR 180,000</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Executive Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex items-center justify-around z-50 w-full max-w-full box-border">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[70px] ${
            activeTab === "overview" ? "text-blue-400 font-bold bg-blue-500/10" : "text-slate-400"
          }`}
        >
          <span className="text-base">🏛️</span>
          <span className="text-[10px] mt-0.5 leading-none">Roster</span>
        </button>

        <button
          onClick={() => setActiveTab("register")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[70px] ${
            activeTab === "register" ? "text-blue-400 font-bold bg-blue-500/10" : "text-slate-400"
          }`}
        >
          <span className="text-base">➕</span>
          <span className="text-[10px] mt-0.5 leading-none">Add User</span>
        </button>

        <button
          onClick={() => setActiveTab("fees")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all min-w-[70px] ${
            activeTab === "fees" ? "text-blue-400 font-bold bg-blue-500/10" : "text-slate-400"
          }`}
        >
          <span className="text-base">💳</span>
          <span className="text-[10px] mt-0.5 leading-none">Fees</span>
        </button>
      </nav>
    </div>
  );
}
