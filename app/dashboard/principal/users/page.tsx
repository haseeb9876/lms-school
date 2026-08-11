"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ClassItem {
  id: string;
  name: string;
  section?: string;
}

export default function UserManagementPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [phone, setPhone] = useState("");
  const [classId, setClassId] = useState("");
  const [fatherCnic, setFatherCnic] = useState("");

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/classes");
        if (res.ok) {
          const json = await res.json();
          setClasses(json.classes || []);
        }
      } catch (e) {
        console.error("Failed to load classes", e);
      }
    }
    loadClasses();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cnic,
          role,
          phone,
          classId: classId || null,
          fatherCnic: fatherCnic || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create user account");
      }

      setMsg("Account created and class assigned successfully!");
      setName("");
      setCnic("");
      setPhone("");
      setFatherCnic("");
      setClassId("");
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/principal"
            className="text-xs text-blue-400 hover:underline font-mono"
          >
            &larr; Back to Executive Desk
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Institutional User Management & Class Reassignment
          </h1>
          <p className="text-sm text-slate-400">
            Register users, assign specific classes to students/teachers, and manage workloads.
          </p>
        </div>

        {/* Registration Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
            REGISTER NEW ACCOUNT
          </h2>

          {msg && (
            <div
              className={`mb-4 p-3 rounded text-sm border ${
                msg.startsWith("Error")
                  ? "bg-red-950 text-red-200 border-red-800"
                  : "bg-emerald-950 text-emerald-200 border-emerald-800"
              }`}
            >
              {msg}
            </div>
          )}

          <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                CNIC Identifier
              </label>
              <input
                type="text"
                required
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="CNIC Number"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="TEACHER">TEACHER</option>
                <option value="PARENT">PARENT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03001234567"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Assign Class
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Select Class --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.section ? `- Section ${cls.section}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {role === "STUDENT" && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Father CNIC
                </label>
                <input
                  type="text"
                  value={fatherCnic}
                  onChange={(e) => setFatherCnic(e.target.value)}
                  placeholder="Father CNIC"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className="sm:col-span-2 md:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "Registering..." : "Complete Registration"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
